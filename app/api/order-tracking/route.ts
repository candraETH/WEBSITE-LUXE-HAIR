import { NextResponse } from "next/server"
import { z } from "zod"
import { hasSupabaseEnv } from "@/lib/supabase-server"
import { enforceRateLimit } from "@/lib/rate-limit"
import { isAllowedRequestOrigin } from "@/lib/security"
import { getOrderOtpSession } from "@/lib/order-otp"
import { extractPhoneFromCartJson, extractEmailFromCartJson, queryOrderByOrderAndPhone } from "@/lib/order-lookup"

export const runtime = "nodejs"

const trackBySessionSchema = z.object({
  sessionToken: z.string().trim().min(20).max(200),
})

type TrackSession = {
  orderId: string
  phoneNumber: string
  purpose: "track_order" | "send_invoice"
}

type OrderRow = {
  paypal_order_id?: string | null
  status?: string | null
  amount?: number | null
  currency?: string | null
  customer_name?: string | null
  customer_email?: string | null
  phone_number?: string | null
  tracking_number?: string | null
  shipping_carrier?: string | null
  cart_json?: unknown
}

const ORDER_SELECT =
  "paypal_order_id,status,amount,currency,customer_name,customer_email,phone_number,tracking_number,shipping_carrier,cart_json"

function normalizeStatus(value: string | null | undefined): string {
  return (value ?? "").trim().toUpperCase() || "UNKNOWN"
}

function sanitizeCartJsonForTracking(value: unknown): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null
  }

  const root = value as Record<string, unknown>
  const safe: Record<string, unknown> = {}

  const order = root.order
  if (order && typeof order === "object" && !Array.isArray(order)) {
    const createdAt = (order as Record<string, unknown>).created_at
    safe.order = createdAt ? { created_at: createdAt } : {}
  }

  const summary = root.summary
  if (summary && typeof summary === "object" && !Array.isArray(summary)) {
    safe.summary = summary
  }

  if (Array.isArray(root.items)) {
    safe.items = root.items
  }

  return safe
}

function maskEmail(value: string): string {
  const email = value.trim()
  if (!email.includes("@")) {
    return "-"
  }

  const [local, domain] = email.split("@")
  if (!local || !domain) {
    return "-"
  }

  if (local.length <= 2) {
    return `${local[0] ?? "*"}***@${domain}`
  }

  return `${local[0]}${"*".repeat(Math.max(2, local.length - 2))}${local[local.length - 1]}@${domain}`
}

function normalizeOrderRow(row: OrderRow) {
  const customerEmail = row.customer_email ?? extractEmailFromCartJson(row.cart_json) ?? ""

  return {
    orderId: row.paypal_order_id ?? "",
    status: normalizeStatus(row.status),
    amount: row.amount ?? 0,
    currency: row.currency ?? "USD",
    customerName: row.customer_name ?? "",
    customerEmailMasked: customerEmail ? maskEmail(customerEmail) : "",
    canSendInvoice: Boolean(customerEmail),
    phoneNumber: row.phone_number ?? extractPhoneFromCartJson(row.cart_json) ?? "",
    trackingNumber: row.tracking_number ?? "",
    shippingCarrier: row.shipping_carrier ?? "",
    cartJson: sanitizeCartJsonForTracking(row.cart_json),
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
    const parsed = trackBySessionSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid tracking payload." }, { status: 400 })
    }

    const session = await getOrderOtpSession(parsed.data.sessionToken)
    if (!session) {
      return NextResponse.json({ error: "Tracking session expired. Request a new verification code." }, { status: 401 })
    }

    if (session.purpose !== "track_order") {
      return NextResponse.json({ error: "Invalid tracking session." }, { status: 403 })
    }

    const { data, error } = await queryOrderByOrderAndPhone<OrderRow>(session.orderId, session.phoneNumber, ORDER_SELECT)

    if (error) {
      console.error("Order-tracking read query failed:", error, `order=${session.orderId}`)
      const isProd = process.env.NODE_ENV === "production"
      return NextResponse.json(
        { error: isProd ? "Unable to read order data." : `Unable to read order data. (${error})` },
        { status: 500 }
      )
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
