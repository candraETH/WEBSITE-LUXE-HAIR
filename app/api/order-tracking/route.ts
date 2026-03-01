import { NextResponse } from "next/server"
import { z } from "zod"
import { hasSupabaseEnv } from "@/lib/supabase-server"
import { enforceRateLimit } from "@/lib/rate-limit"
import { isAllowedRequestOrigin, isValidPayPalOrderId } from "@/lib/security"
import { getSecurityStoreValue } from "@/lib/security-store"
import { queryOrderByOrderAndPhone, extractPhoneFromCartJson, extractEmailFromCartJson } from "@/lib/order-lookup"

export const runtime = "nodejs"

const trackBySessionSchema = z.object({
  sessionToken: z.string().trim().min(20).max(200),
})

const trackByIdentitySchema = z.object({
  orderId: z
    .string()
    .trim()
    .min(1)
    .max(80)
    .transform((value) => value.toUpperCase())
    .refine((value) => isValidPayPalOrderId(value), "Invalid order id."),
  phoneNumber: z.string().trim().regex(/^\+\d{8,15}$/),
})

const trackOrderSchema = z.union([trackBySessionSchema, trackByIdentitySchema])

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

    let queryOrderId = ""
    let queryPhoneNumber = ""

    if ("sessionToken" in parsed.data) {
      const session = await getSecurityStoreValue<TrackSession>(`track-session:${parsed.data.sessionToken}`)
      if (!session) {
        return NextResponse.json({ error: "Tracking session expired. Track your order again." }, { status: 401 })
      }

      queryOrderId = session.orderId
      queryPhoneNumber = session.phoneNumber
    } else {
      queryOrderId = parsed.data.orderId
      queryPhoneNumber = parsed.data.phoneNumber
    }

    const { data, error } = await queryOrderByOrderAndPhone<OrderRow>(
      queryOrderId,
      queryPhoneNumber,
      ORDER_SELECT
    )

    if (error) {
      console.error("Order-tracking read query failed:", error, `order=${queryOrderId}`)
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
