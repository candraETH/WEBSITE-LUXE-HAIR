import { NextResponse } from "next/server"
import { z } from "zod"
import { hasSupabaseEnv } from "@/lib/supabase-server"
import { enforceRateLimit } from "@/lib/rate-limit"
import { isAllowedRequestOrigin } from "@/lib/security"
import { getSecurityStoreValue } from "@/lib/security-store"
import { queryOrderByOrderAndPhone, extractPhoneFromCartJson } from "@/lib/order-lookup"

export const runtime = "nodejs"

const trackOrderSchema = z.object({
  sessionToken: z.string().trim().min(20).max(200),
})

type TrackSession = {
  orderId: string
  phoneNumber: string
}

type OrderRow = {
  paypal_order_id?: string | null
  status?: string | null
  amount?: number | null
  currency?: string | null
  customer_name?: string | null
  phone_number?: string | null
  tracking_number?: string | null
  shipping_carrier?: string | null
  cart_json?: unknown
}

const ORDER_SELECT =
  "paypal_order_id,status,amount,currency,customer_name,phone_number,tracking_number,shipping_carrier,cart_json"

function normalizeStatus(value: string | null | undefined): string {
  return (value ?? "").trim().toUpperCase() || "UNKNOWN"
}

function normalizeOrderRow(row: OrderRow) {
  return {
    orderId: row.paypal_order_id ?? "",
    status: normalizeStatus(row.status),
    amount: row.amount ?? 0,
    currency: row.currency ?? "USD",
    customerName: row.customer_name ?? "",
    phoneNumber: row.phone_number ?? extractPhoneFromCartJson(row.cart_json) ?? "",
    trackingNumber: row.tracking_number ?? "",
    shippingCarrier: row.shipping_carrier ?? "",
    cartJson: row.cart_json ?? null,
  }
}

export async function POST(request: Request) {
  try {
    const rateLimit = await enforceRateLimit(request, "api:order-tracking:read", {
      max: 40,
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

    const body = await request.json()
    const parsed = trackOrderSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid tracking payload." }, { status: 400 })
    }

    const session = await getSecurityStoreValue<TrackSession>(`track-session:${parsed.data.sessionToken}`)
    if (!session) {
      return NextResponse.json({ error: "Tracking session expired. Request a new OTP." }, { status: 401 })
    }

    const { data, error } = await queryOrderByOrderAndPhone<OrderRow>(
      session.orderId,
      session.phoneNumber,
      ORDER_SELECT
    )

    if (error) {
      console.error("Order-tracking read query failed:", error, `order=${session.orderId}`)
      return NextResponse.json({ error: "Unable to read order data." }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 })
    }

    return NextResponse.json({
      orders: [normalizeOrderRow(data)],
    })
  } catch (error) {
    console.error("Order-tracking read error:", error instanceof Error ? error.message : "Unknown error")
    return NextResponse.json({ error: "Unable to track order." }, { status: 500 })
  }
}

