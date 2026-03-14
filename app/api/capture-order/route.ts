import { NextResponse } from "next/server"
import { z } from "zod"
import { PayPalHttpError, paypalRequest } from "@/lib/paypal/client"
import { getPayPalOrder, updatePayPalOrderStatus } from "@/lib/paypal/order-store"
import { hasSupabaseEnv, supabase } from "@/lib/supabase-server"
import { enforceRateLimit } from "@/lib/rate-limit"
import { isAllowedRequestOrigin, isValidPayPalOrderId } from "@/lib/security"
import { extractEmailFromCartJson } from "@/lib/order-lookup"

export const runtime = "nodejs"

type CaptureOrderResponse = {
  id: string
  status: string
}

const captureSchema = z.object({
  orderId: z
    .string()
    .trim()
    .min(1)
    .max(80)
    .transform((value) => value.toUpperCase())
    .refine((value) => isValidPayPalOrderId(value), "Invalid order id."),
})

function normalizeStatus(value: string | null | undefined) {
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

function isLikelyAlreadyCapturedError(error: PayPalHttpError) {
  if (error.status !== 422) {
    return false
  }

  const normalizedMessage = error.message.trim().toUpperCase()
  return (
    normalizedMessage.includes("ORDER_ALREADY_CAPTURED") ||
    normalizedMessage.includes("UNPROCESSABLE_ENTITY") ||
    normalizedMessage.includes("ALREADY")
  )
}

export async function POST(request: Request) {
  let orderId = ""

  try {
    const rateLimit = await enforceRateLimit(request, "api:capture-order", {
      max: 30,
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

    const body = await request.json()
    const parsed = captureSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid order capture payload." }, { status: 400 })
    }

    orderId = parsed.data.orderId
    const stored = getPayPalOrder(orderId)

    const authedEmail = normalizeEmail(userData.user.email)
    if (!authedEmail) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data, error } = await supabase
      .from("orders")
      .select("status,customer_email,cart_json")
      .eq("paypal_order_id", orderId)
      .maybeSingle()

    if (error) {
      console.error("Supabase capture-order status query failed:", error.message, `order=${orderId}`)
      return NextResponse.json({ error: "Unable to capture order." }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 })
    }

    const orderEmail = normalizeEmail((data.customer_email ?? extractEmailFromCartJson(data.cart_json) ?? "") as string)
    if (!orderEmail || orderEmail !== authedEmail) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    if (normalizeStatus(data.status) === "PAID") {
      if (stored) {
        updatePayPalOrderStatus(orderId, "PAID")
      }
      return NextResponse.json({
        orderId,
        status: "PAID",
        message: "Order already confirmed.",
      })
    }

    if (stored?.status === "PAID") {
      return NextResponse.json({
        orderId,
        status: "PAID",
        message: "Order already confirmed.",
      })
    }

    if (stored) {
      updatePayPalOrderStatus(orderId, "CAPTURE_REQUESTED")
    }

    const capture = await paypalRequest<CaptureOrderResponse>(`/v2/checkout/orders/${orderId}/capture`, {
      method: "POST",
      body: JSON.stringify({}),
    })

    if (stored) {
      updatePayPalOrderStatus(orderId, "CAPTURED_PENDING_WEBHOOK")
    }

    return NextResponse.json({
      orderId: capture.id,
      paypalStatus: capture.status,
      status: "CAPTURED_PENDING_WEBHOOK",
      message: "Capture submitted. Waiting for verified webhook confirmation.",
    })
  } catch (error) {
    if (error instanceof PayPalHttpError) {
      if (isLikelyAlreadyCapturedError(error)) {
        const stored = getPayPalOrder(orderId)
        if (stored && stored.status !== "PAID") {
          updatePayPalOrderStatus(orderId, "CAPTURED_PENDING_WEBHOOK")
        }

        return NextResponse.json({
          orderId,
          status: "CAPTURED_PENDING_WEBHOOK",
          message: "Capture already submitted. Waiting for verified webhook confirmation.",
        })
      }

      console.error("PayPal capture-order failed:", error.status, error.message)
      return NextResponse.json({ error: "Failed to capture PayPal order." }, { status: 502 })
    }

    console.error("Capture-order error:", error instanceof Error ? error.message : "Unknown error")
    return NextResponse.json({ error: "Unable to capture order." }, { status: 500 })
  }
}
