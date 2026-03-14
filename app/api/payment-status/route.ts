import { NextResponse } from "next/server"
import { z } from "zod"
import { hasSupabaseEnv, supabase } from "@/lib/supabase-server"
import { enforceRateLimit } from "@/lib/rate-limit"
import { isAllowedRequestOrigin, isValidPayPalOrderId } from "@/lib/security"
import { extractEmailFromCartJson } from "@/lib/order-lookup"

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

function getBearerToken(request: Request): string | null {
  const header = request.headers.get("authorization") ?? ""
  if (!header.toLowerCase().startsWith("bearer ")) {
    return null
  }
  const token = header.slice(7).trim()
  return token || null
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase()
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

    if (!hasSupabaseEnv) {
      return NextResponse.json({ error: "Supabase environment variables are not configured." }, { status: 500 })
    }

    const token = getBearerToken(request)
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: userData, error: userError } = await supabase.auth.getUser(token)
    if (userError || !userData.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const authedEmail = normalizeEmail(userData.user.email)
    if (!authedEmail) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const parsed = paymentStatusSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payment status payload." }, { status: 400 })
    }

    const { orderId } = parsed.data

    const { data, error } = await supabase
      .from("orders")
      .select("paypal_order_id, status, amount, currency, customer_email, cart_json")
      .eq("paypal_order_id", orderId)
      .maybeSingle()

    if (error) {
      console.error("Supabase payment-status query failed:", error.message, `order=${orderId}`)
      return NextResponse.json({ error: "Unable to read payment status." }, { status: 500 })
    }

    if (data) {
      const orderEmail = normalizeEmail((data.customer_email ?? extractEmailFromCartJson(data.cart_json) ?? "") as string)
      if (!orderEmail || orderEmail !== authedEmail) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }

      return NextResponse.json({
        orderId: data.paypal_order_id,
        status: normalizeStatus(data.status),
        amount: data.amount,
        currency: data.currency,
        source: "supabase",
      })
    }

    return NextResponse.json({ error: "Order not found." }, { status: 404 })
  } catch (error) {
    console.error("Payment-status error:", error instanceof Error ? error.message : "Unknown error")
    return NextResponse.json({ error: "Unable to get payment status." }, { status: 500 })
  }
}
