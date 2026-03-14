import { NextResponse } from "next/server"
import { centsToDollars, dollarsToCents } from "@/lib/paypal/catalog"
import { PayPalHttpError, verifyWebhookSignature } from "@/lib/paypal/client"
import { getPayPalOrder, updatePayPalOrderStatus } from "@/lib/paypal/order-store"
import { hasSupabaseEnv, supabase } from "@/lib/supabase-server"
import { enforceRateLimit } from "@/lib/rate-limit"
import { logError, logEvent, redactOrderId } from "@/lib/observability"

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

type PersistedOrderStatus = "PAID" | "FAILED"
type FailedReason = "DENIED" | "REVERSED" | "REFUNDED" | null

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

function buildStatusDisplay(status: PersistedOrderStatus, failedReason: FailedReason): string {
  if (status === "FAILED" && failedReason) {
    return `FAILED (${failedReason})`
  }
  return status
}

function buildPaymentNote(status: PersistedOrderStatus, failedReason: FailedReason): string {
  if (status === "PAID") {
    return "Payment captured and verified via webhook."
  }

  if (failedReason === "REFUNDED") {
    return "Payment was refunded."
  }

  if (failedReason === "DENIED") {
    return "Payment was denied by the payment provider."
  }

  if (failedReason === "REVERSED") {
    return "Payment was reversed."
  }

  return "Payment failed."
}

function withUpdatedCartTextStatus(
  value: unknown,
  status: PersistedOrderStatus,
  failedReason: FailedReason
): string | null {
  if (typeof value !== "string" || !value.trim()) {
    return null
  }

  const statusDisplay = buildStatusDisplay(status, failedReason)
  const paymentNoteLine = `Payment Note: ${buildPaymentNote(status, failedReason)}`

  let updated = value
  if (/^Status:\s*/m.test(value)) {
    updated = value.replace(/^Status:\s*.*/m, `Status: ${statusDisplay}`)
  } else {
    updated = `Status: ${statusDisplay}\n${value}`
  }

  if (/^Payment Note:\s*/m.test(updated)) {
    updated = updated.replace(/^Payment Note:\s*.*/m, paymentNoteLine)
  } else {
    updated = `${updated}\n${paymentNoteLine}`
  }

  return updated
}

function withUpdatedCartJsonStatus(
  value: unknown,
  status: PersistedOrderStatus,
  failedReason: FailedReason
): unknown {
  if (!value || typeof value !== "object") {
    return value
  }

  if (Array.isArray(value)) {
    return value
  }

  const statusDisplay = buildStatusDisplay(status, failedReason)
  const paymentNote = buildPaymentNote(status, failedReason)
  const root = { ...(value as Record<string, unknown>) }
  const order = root.order
  if (order && typeof order === "object" && !Array.isArray(order)) {
    root.order = {
      ...(order as Record<string, unknown>),
      status,
      status_display: statusDisplay,
    }
    root.payment_note = paymentNote
    return root
  }

  root.status = status
  root.status_display = statusDisplay
  root.payment_note = paymentNote
  return root
}

async function syncOrderStatusInSupabase(
  orderId: string,
  status: PersistedOrderStatus,
  failedReason: FailedReason = null
) {
  const { data: existingOrder, error: readError } = await supabase
    .from("orders")
    .select("cart_text, cart_json")
    .eq("paypal_order_id", orderId)
    .maybeSingle()

  if (readError) {
    return { error: readError.message }
  }

  const updatePayload: Record<string, unknown> = {
    status,
  }

  const updatedCartText = withUpdatedCartTextStatus(existingOrder?.cart_text, status, failedReason)
  if (updatedCartText) {
    updatePayload.cart_text = updatedCartText
  }

  const updatedCartJson = withUpdatedCartJsonStatus(existingOrder?.cart_json, status, failedReason)
  if (updatedCartJson !== undefined && updatedCartJson !== null) {
    updatePayload.cart_json = updatedCartJson
  }

  const { error: updateError } = await supabase
    .from("orders")
    .update(updatePayload)
    .eq("paypal_order_id", orderId)

  if (updateError) {
    return { error: updateError.message }
  }

  return { error: null as string | null }
}

export async function POST(request: Request) {
  try {
    const rateLimit = await enforceRateLimit(request, "api:paypal-webhook", {
      max: 300,
      windowMs: 10 * 60 * 1000,
    })
    if (!rateLimit.allowed) {
      logEvent("warn", "paypal_webhook_rate_limited", { retryAfterSeconds: rateLimit.retryAfterSeconds })
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } }
      )
    }

    const payload = (await request.json()) as PayPalWebhookEvent
    const isVerified = await verifyWebhookSignature(payload, request.headers)

    if (!isVerified) {
      logEvent("warn", "paypal_webhook_invalid_signature")
      return NextResponse.json({ error: "Invalid webhook signature." }, { status: 400 })
    }

    const eventType = payload.event_type ?? ""
    const orderId = extractOrderIdFromEvent(payload)
    const orderIdHint = orderId ? redactOrderId(orderId) : ""

    if (!orderId) {
      logEvent("info", "paypal_webhook_verified_no_order_id", { eventType })
      return NextResponse.json({ ok: true, message: "Webhook verified, no order id found." })
    }

    const stored = getPayPalOrder(orderId)

    if (eventType === "CHECKOUT.ORDER.APPROVED") {
      if (stored) {
        updatePayPalOrderStatus(orderId, "CAPTURE_REQUESTED")
      }
      logEvent("info", "paypal_webhook_order_approved", { orderId: orderIdHint })
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
          logEvent("warn", "paypal_webhook_invalid_payment_payload", { orderId: orderIdHint })
          return NextResponse.json({ ok: true, message: "Webhook verified but payment payload invalid." })
        }

        if (receivedAmountCents !== stored.totalCents) {
          logEvent("warn", "paypal_webhook_amount_mismatch", {
            orderId: orderIdHint,
            expected: centsToDollars(stored.totalCents),
            got: centsToDollars(receivedAmountCents),
          })
          updatePayPalOrderStatus(orderId, "FAILED")
          return NextResponse.json({ ok: true, message: "Webhook verified but amount mismatch." })
        }
      }

      if (!hasSupabaseEnv) {
        logEvent("error", "paypal_webhook_missing_supabase_env", { orderId: orderIdHint })
        return NextResponse.json({ error: "Supabase environment variables are not configured." }, { status: 500 })
      }

      const { error: updateError } = await syncOrderStatusInSupabase(orderId, "PAID")

      if (updateError) {
        logEvent("error", "paypal_webhook_supabase_update_failed", { orderId: orderIdHint })
        return NextResponse.json({ error: "Failed to update order status." }, { status: 500 })
      }

      if (stored) {
        updatePayPalOrderStatus(orderId, "PAID")
      }
      logEvent("info", "paypal_webhook_order_paid", { orderId: orderIdHint })
      return NextResponse.json({ ok: true })
    }

    if (eventType === "PAYMENT.CAPTURE.DENIED") {
      if (hasSupabaseEnv) {
        const { error: updateError } = await syncOrderStatusInSupabase(orderId, "FAILED", "DENIED")
        if (updateError) {
          logEvent("error", "paypal_webhook_supabase_update_failed", { orderId: orderIdHint, reason: "DENIED" })
          return NextResponse.json({ error: "Failed to update order status." }, { status: 500 })
        }
      }

      if (stored) {
        updatePayPalOrderStatus(orderId, "FAILED")
      }
      logEvent("info", "paypal_webhook_order_failed", { orderId: orderIdHint, reason: "DENIED" })
      return NextResponse.json({ ok: true })
    }

    if (eventType === "PAYMENT.CAPTURE.REVERSED") {
      if (hasSupabaseEnv) {
        const { error: updateError } = await syncOrderStatusInSupabase(orderId, "FAILED", "REVERSED")
        if (updateError) {
          logEvent("error", "paypal_webhook_supabase_update_failed", { orderId: orderIdHint, reason: "REVERSED" })
          return NextResponse.json({ error: "Failed to update order status." }, { status: 500 })
        }
      }

      if (stored) {
        updatePayPalOrderStatus(orderId, "FAILED")
      }
      logEvent("info", "paypal_webhook_order_failed", { orderId: orderIdHint, reason: "REVERSED" })
      return NextResponse.json({ ok: true })
    }

    if (eventType === "PAYMENT.CAPTURE.REFUNDED") {
      if (hasSupabaseEnv) {
        const { error: updateError } = await syncOrderStatusInSupabase(orderId, "FAILED", "REFUNDED")
        if (updateError) {
          logEvent("error", "paypal_webhook_supabase_update_failed", { orderId: orderIdHint, reason: "REFUNDED" })
          return NextResponse.json({ error: "Failed to update order status." }, { status: 500 })
        }
      }

      if (stored) {
        updatePayPalOrderStatus(orderId, "FAILED")
      }
      logEvent("info", "paypal_webhook_order_failed", { orderId: orderIdHint, reason: "REFUNDED" })
      return NextResponse.json({ ok: true })
    }

    logEvent("info", "paypal_webhook_ignored", { orderId: orderIdHint, eventType })
    return NextResponse.json({ ok: true, message: "Webhook verified and ignored." })
  } catch (error) {
    if (error instanceof PayPalHttpError) {
      logError("paypal_webhook_paypal_error", error, { status: error.status })
      return NextResponse.json({ error: "Failed to verify webhook." }, { status: 502 })
    }

    logError("paypal_webhook_unhandled_error", error)
    return NextResponse.json({ error: "Webhook handling failed." }, { status: 500 })
  }
}
