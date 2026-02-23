import { NextResponse } from "next/server"
import { centsToDollars, dollarsToCents } from "@/lib/paypal/catalog"
import { PayPalHttpError, verifyWebhookSignature } from "@/lib/paypal/client"
import { getPayPalOrder, updatePayPalOrderStatus } from "@/lib/paypal/order-store"
import { hasSupabaseEnv, supabase } from "@/lib/supabase-server"

export const runtime = "nodejs"

type PayPalWebhookEvent = {
  event_type?: string
  resource?: {
    id?: string
    amount?: { value?: string; currency_code?: string }
    supplementary_data?: {
      related_ids?: {
        order_id?: string
      }
    }
  }
}

function extractOrderIdFromEvent(event: PayPalWebhookEvent): string | undefined {
  if (!event.event_type) {
    return undefined
  }

  if (event.event_type.startsWith("CHECKOUT.ORDER.")) {
    return event.resource?.id
  }

  if (event.event_type.startsWith("PAYMENT.CAPTURE.")) {
    return event.resource?.supplementary_data?.related_ids?.order_id
  }

  return undefined
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as PayPalWebhookEvent
    const isVerified = await verifyWebhookSignature(payload, request.headers)

    if (!isVerified) {
      return NextResponse.json({ error: "Invalid webhook signature." }, { status: 400 })
    }

    const eventType = payload.event_type ?? ""
    const orderId = extractOrderIdFromEvent(payload)

    if (!orderId) {
      return NextResponse.json({ ok: true, message: "Webhook verified, no order id found." })
    }

    const stored = getPayPalOrder(orderId)

    if (eventType === "CHECKOUT.ORDER.APPROVED") {
      if (stored) {
        updatePayPalOrderStatus(orderId, "CAPTURE_REQUESTED")
      }
      return NextResponse.json({ ok: true })
    }

    if (eventType === "PAYMENT.CAPTURE.COMPLETED") {
      const amountValue = payload.resource?.amount?.value
      const currencyCode = payload.resource?.amount?.currency_code
      const receivedAmountCents =
        typeof amountValue === "string" ? dollarsToCents(Number.parseFloat(amountValue)) : NaN

      if (stored) {
        if (!Number.isFinite(receivedAmountCents) || currencyCode !== stored.currencyCode) {
          updatePayPalOrderStatus(orderId, "FAILED")
          return NextResponse.json({ ok: true, message: "Webhook verified but payment payload invalid." })
        }

        if (receivedAmountCents !== stored.totalCents) {
          console.error(
            "PayPal amount mismatch:",
            `order=${orderId} expected=${centsToDollars(stored.totalCents)} got=${centsToDollars(receivedAmountCents)}`
          )
          updatePayPalOrderStatus(orderId, "FAILED")
          return NextResponse.json({ ok: true, message: "Webhook verified but amount mismatch." })
        }
      }

      if (!hasSupabaseEnv) {
        return NextResponse.json({ error: "Supabase environment variables are not configured." }, { status: 500 })
      }

      const { error: updateError } = await supabase
        .from("orders")
        .update({ status: "PAID" })
        .eq("paypal_order_id", orderId)

      if (updateError) {
        console.error("Supabase update order failed:", updateError.message, `order=${orderId}`)
        return NextResponse.json({ error: "Failed to update order status." }, { status: 500 })
      }

      if (stored) {
        updatePayPalOrderStatus(orderId, "PAID")
      }
      console.log("Order marked as PAID:", orderId)
      return NextResponse.json({ ok: true })
    }

    if (
      eventType === "PAYMENT.CAPTURE.DENIED" ||
      eventType === "PAYMENT.CAPTURE.REVERSED" ||
      eventType === "PAYMENT.CAPTURE.REFUNDED"
    ) {
      if (stored) {
        updatePayPalOrderStatus(orderId, "FAILED")
      }
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ ok: true, message: "Webhook verified and ignored." })
  } catch (error) {
    if (error instanceof PayPalHttpError) {
      console.error("PayPal webhook verification failed:", error.status, error.message)
      return NextResponse.json({ error: "Failed to verify webhook." }, { status: 502 })
    }

    console.error("PayPal webhook error:", error instanceof Error ? error.message : "Unknown error")
    return NextResponse.json({ error: "Webhook handling failed." }, { status: 500 })
  }
}
