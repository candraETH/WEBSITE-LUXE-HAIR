import { NextResponse } from "next/server"
import { z } from "zod"
import { getPayPalOrder } from "@/lib/paypal/order-store"
import { hasSupabaseEnv, supabase } from "@/lib/supabase-server"
import { enforceRateLimit } from "@/lib/rate-limit"
import { isAllowedRequestOrigin, isValidPayPalOrderId } from "@/lib/security"

export const runtime = "nodejs"

const paymentStatusSchema = z.object({
  orderId: z
    .string()
    .trim()
    .min(1)
    .max(80)
    .transform((value) => value.toUpperCase())
    .refine((value) => isValidPayPalOrderId(value), "Invalid order id."),
})

function normalizeStatus(value: string | null | undefined): string {
  return (value ?? "").trim().toUpperCase()
}

export async function POST(request: Request) {
  try {
    const rateLimit = await enforceRateLimit(request, "api:payment-status", {
      max: 120,
      windowMs: 10 * 60 * 1000,
    })
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } }
      )
    }

    if (!isAllowedRequestOrigin(request)) {
      return NextResponse.json({ error: "Forbidden origin." }, { status: 403 })
    }

    const body = await request.json()
    const parsed = paymentStatusSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payment status payload." }, { status: 400 })
    }

    const { orderId } = parsed.data

    if (hasSupabaseEnv) {
      const { data, error } = await supabase
        .from("orders")
        .select("paypal_order_id, status, amount, currency")
        .eq("paypal_order_id", orderId)
        .maybeSingle()

      if (error) {
        console.error("Supabase payment-status query failed:", error.message, `order=${orderId}`)
        return NextResponse.json({ error: "Unable to read payment status." }, { status: 500 })
      }

      if (data) {
        return NextResponse.json({
          orderId: data.paypal_order_id,
          status: normalizeStatus(data.status),
          amount: data.amount,
          currency: data.currency,
          source: "supabase",
        })
      }
    }

    const stored = getPayPalOrder(orderId)
    if (stored) {
      return NextResponse.json({
        orderId: stored.paypalOrderId,
        status: normalizeStatus(stored.status),
        amount: Number((stored.totalCents / 100).toFixed(2)),
        currency: stored.currencyCode,
        source: "memory",
      })
    }

    return NextResponse.json({ error: "Order not found." }, { status: 404 })
  } catch (error) {
    console.error("Payment-status error:", error instanceof Error ? error.message : "Unknown error")
    return NextResponse.json({ error: "Unable to get payment status." }, { status: 500 })
  }
}
