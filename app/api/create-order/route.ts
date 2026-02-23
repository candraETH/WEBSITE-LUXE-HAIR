import { NextResponse } from "next/server"
import { z } from "zod"
import {
  calculateOrderFromItems,
  centsToDollars,
  checkoutItemSchema,
  MAX_CHECKOUT_ITEMS,
} from "@/lib/paypal/catalog"
import { paypalRequest, PayPalHttpError } from "@/lib/paypal/client"
import { savePayPalOrder } from "@/lib/paypal/order-store"
import { hasSupabaseEnv, supabase } from "@/lib/supabase-server"

export const runtime = "nodejs"

type PayPalCreateOrderResponse = {
  id: string
  status: string
  links?: Array<{ href: string; rel: string; method: string }>
}

const createOrderSchema = z.object({
  items: z.array(checkoutItemSchema).min(1).max(MAX_CHECKOUT_ITEMS),
})

function getOrigin(request: Request) {
  const requestOrigin = request.headers.get("origin")
  if (requestOrigin) {
    return requestOrigin
  }
  return new URL(request.url).origin
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = createOrderSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid order payload." }, { status: 400 })
    }

    const calculated = calculateOrderFromItems(parsed.data.items)
    const internalOrderId = crypto.randomUUID()
    const origin = getOrigin(request)

    const payload = {
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: internalOrderId,
          custom_id: internalOrderId,
          amount: {
            currency_code: "USD",
            value: centsToDollars(calculated.totalCents),
            breakdown: {
              item_total: { currency_code: "USD", value: centsToDollars(calculated.subtotalCents) },
              tax_total: { currency_code: "USD", value: centsToDollars(calculated.taxCents) },
              shipping: { currency_code: "USD", value: centsToDollars(calculated.shippingCents) },
            },
          },
          items: calculated.lineItems.map((item) => ({
            name: item.displayName.slice(0, 127),
            quantity: String(item.quantity),
            category: "PHYSICAL_GOODS",
            unit_amount: {
              currency_code: "USD",
              value: centsToDollars(item.unitPriceCents),
            },
          })),
        },
      ],
      application_context: {
        user_action: "PAY_NOW",
        shipping_preference: "NO_SHIPPING",
        return_url: `${origin}/cart?paypal=success`,
        cancel_url: `${origin}/cart?paypal=cancel`,
      },
    }

    const response = await paypalRequest<PayPalCreateOrderResponse>("/v2/checkout/orders", {
      method: "POST",
      body: JSON.stringify(payload),
    })

    const approveUrl = response.links?.find((link) => link.rel === "approve")?.href
    if (!approveUrl) {
      return NextResponse.json({ error: "Unable to create PayPal approval link." }, { status: 502 })
    }

    savePayPalOrder({
      paypalOrderId: response.id,
      internalOrderId,
      status: "CREATED",
      subtotalCents: calculated.subtotalCents,
      taxCents: calculated.taxCents,
      shippingCents: calculated.shippingCents,
      totalCents: calculated.totalCents,
      currencyCode: "USD",
    })

    const totalAmount = Number(centsToDollars(calculated.totalCents))
    if (!hasSupabaseEnv) {
      return NextResponse.json({ error: "Supabase environment variables are not configured." }, { status: 500 })
    }

    const { error: insertError } = await supabase.from("orders").insert([
      {
        paypal_order_id: response.id,
        amount: totalAmount,
        currency: "USD",
        status: "PENDING",
      },
    ])

    if (insertError) {
      console.error("Supabase insert order failed:", insertError.message)
      return NextResponse.json({ error: "Unable to save order." }, { status: 500 })
    }

    return NextResponse.json({
      orderId: response.id,
      status: response.status,
      approveUrl,
    })
  } catch (error) {
    if (error instanceof PayPalHttpError) {
      console.error("PayPal create-order failed:", error.status, error.message)
      return NextResponse.json({ error: "Failed to create PayPal order." }, { status: 502 })
    }

    console.error("Create-order error:", error instanceof Error ? error.message : "Unknown error")
    return NextResponse.json({ error: "Unable to create order." }, { status: 500 })
  }
}
