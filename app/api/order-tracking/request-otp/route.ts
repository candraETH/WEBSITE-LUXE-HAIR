import { NextResponse } from "next/server"
import { z } from "zod"
import { hasSupabaseEnv } from "@/lib/supabase-server"
import { enforceRateLimit } from "@/lib/rate-limit"
import { isAllowedRequestOrigin, isValidPayPalOrderId } from "@/lib/security"
import { deliverOtpCode } from "@/lib/otp-delivery"
import { generateOtpCode, hashOtpCode, maskEmail } from "@/lib/otp-utils"
import {
  ORDER_OTP_TTL_SECONDS,
  isOrderOtpPurpose,
  storeOrderOtpChallenge,
} from "@/lib/order-otp"
import { queryOrderByOrderAndPhone } from "@/lib/order-lookup"

export const runtime = "nodejs"

const requestOtpSchema = z.object({
  orderId: z
    .string()
    .trim()
    .min(1)
    .max(80)
    .transform((value) => value.toUpperCase())
    .refine((value) => isValidPayPalOrderId(value), "Invalid order id."),
  phoneNumber: z.string().trim().regex(/^\+?\d{4,15}$/),
  purpose: z.enum(["track_order", "send_invoice"]).default("track_order"),
})

type OrderRow = {
  paypal_order_id?: string | null
  customer_name?: string | null
  customer_email?: string | null
  phone_number?: string | null
  cart_json?: unknown
}

const ORDER_SELECT = "paypal_order_id,customer_name,customer_email,cart_json"
function mapOtpErrorToMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : ""
  const message = raw.toLowerCase()

  if (message.includes("brevo otp delivery failed with status 401") || message.includes("status 403")) {
    return "OTP email authentication failed. Please contact support."
  }
  if (message.includes("sender")) {
    return "OTP sender email is not verified. Please contact support."
  }
  if (message.includes("not configured")) {
    return "OTP delivery is not configured."
  }

  return "Unable to send OTP."
}

function extractCustomerPhone(row: OrderRow): string {
  if (row.phone_number?.trim()) {
    return row.phone_number.trim()
  }

  const root = row.cart_json
  if (!root || typeof root !== "object" || Array.isArray(root)) {
    return ""
  }
  const customer = (root as Record<string, unknown>).customer
  if (!customer || typeof customer !== "object" || Array.isArray(customer)) {
    return ""
  }
  const direct = (customer as Record<string, unknown>).phone_number
  return typeof direct === "string" ? direct.trim() : ""
}

function extractCustomerEmail(row: OrderRow): string {
  if (row.customer_email?.trim()) {
    return row.customer_email.trim()
  }

  const root = row.cart_json
  if (!root || typeof root !== "object" || Array.isArray(root)) {
    return ""
  }
  const customer = (root as Record<string, unknown>).customer
  if (!customer || typeof customer !== "object" || Array.isArray(customer)) {
    return ""
  }
  const direct = (customer as Record<string, unknown>).email
  return typeof direct === "string" ? direct.trim() : ""
}

export async function POST(request: Request) {
  try {
    const rateLimit = await enforceRateLimit(request, "api:order-tracking:request-otp", {
      max: 8,
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
    const parsed = requestOtpSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request payload." }, { status: 400 })
    }

    const { orderId, phoneNumber, purpose } = parsed.data
    if (!isOrderOtpPurpose(purpose)) {
      return NextResponse.json({ error: "Invalid OTP purpose." }, { status: 400 })
    }

    const { data, error } = await queryOrderByOrderAndPhone<OrderRow>(orderId, phoneNumber, ORDER_SELECT)
    if (error) {
      console.error("Order-tracking request-otp query failed:", error, `order=${orderId}`)
      const isProd = process.env.NODE_ENV === "production"
      return NextResponse.json(
        { error: isProd ? "Unable to read order data." : `Unable to read order data. (${error})` },
        { status: 500 }
      )
    }

    if (!data) {
      return NextResponse.json({ error: "Order not found for the provided details." }, { status: 404 })
    }

    const otpCode = generateOtpCode()
    const challengeId = crypto.randomUUID()
    const context = `${orderId}|${phoneNumber}`
    const otpHash = hashOtpCode(otpCode, context)
    const challengePayload = {
      orderId,
      phoneNumber,
      purpose,
      otpHash,
      attemptsLeft: 3,
      expiresAt: Date.now() + ORDER_OTP_TTL_SECONDS * 1000,
    }

    await storeOrderOtpChallenge(challengeId, challengePayload)

    const customerPhone = extractCustomerPhone(data) || phoneNumber
    const customerEmail = extractCustomerEmail(data)
    if (!customerEmail && !process.env.OTP_DELIVERY_WEBHOOK_URL?.trim()) {
      return NextResponse.json(
        { error: "No email is available for this order. Please contact support to verify your order." },
        { status: 400 }
      )
    }

    const delivery = await deliverOtpCode({
      purpose,
      orderId,
      code: otpCode,
      customerName: data.customer_name ?? "",
      customerEmail,
      customerPhone,
    })

    return NextResponse.json({
      challengeId,
      expiresInSeconds: ORDER_OTP_TTL_SECONDS,
      destination: customerEmail ? maskEmail(customerEmail) : "your registered email",
      channel: delivery.channel,
      devOtpCode: delivery.devOtpCode,
      purpose,
    })
  } catch (error) {
    console.error("Order-tracking request-otp error:", error instanceof Error ? error.message : "Unknown error")
    return NextResponse.json({ error: mapOtpErrorToMessage(error) }, { status: 500 })
  }
}
