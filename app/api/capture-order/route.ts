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

type PersistedOrderStatus = "PAID" | "FAILED"
type FailedReason = "DENIED" | "REVERSED" | "REFUNDED" | null

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

function buildStatusDisplay(status: PersistedOrderStatus, failedReason: FailedReason): string {
  if (status === "FAILED" && failedReason) {
    return `FAILED (${failedReason})`
  }
  return status
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
  let updated = value
  if (/^Status:\s*/m.test(value)) {
    updated = value.replace(/^Status:\s*.*/m, `Status: ${statusDisplay}`)
  } else {
    updated = `Status: ${statusDisplay}\n${value}`
  }

  return updated
}

function withUpdatedCartJsonStatus(value: unknown, status: PersistedOrderStatus, failedReason: FailedReason): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return value
  }

  const statusDisplay = buildStatusDisplay(status, failedReason)
  const root = { ...(value as Record<string, unknown>) }
  const order = root.order
  if (order && typeof order === "object" && !Array.isArray(order)) {
    root.order = {
      ...(order as Record<string, unknown>),
      status,
      status_display: statusDisplay,
    }
    return root
  }

  root.status = status
  root.status_display = statusDisplay
  return root
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
      .select("status,customer_email,cart_json,cart_text")
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

    const captureStatus = normalizeStatus(capture.status)
    if (stored) {
      updatePayPalOrderStatus(orderId, captureStatus === "COMPLETED" ? "PAID" : "CAPTURED_PENDING_WEBHOOK")
    }

    if (captureStatus === "COMPLETED" && hasSupabaseEnv) {
      const updatePayload: Record<string, unknown> = { status: "PAID" }

      const updatedCartText = withUpdatedCartTextStatus(data.cart_text, "PAID", null)
      if (updatedCartText) {
        updatePayload.cart_text = updatedCartText
      }

      const updatedCartJson = withUpdatedCartJsonStatus(data.cart_json, "PAID", null)
      if (updatedCartJson !== undefined && updatedCartJson !== null) {
        updatePayload.cart_json = updatedCartJson
      }

      const { error: updateError } = await supabase
        .from("orders")
        .update(updatePayload)
        .eq("paypal_order_id", orderId)

      if (updateError) {
        console.error("Supabase capture-order update failed:", updateError.message, `order=${orderId}`)
      }
    }

    return NextResponse.json({
      orderId: capture.id,
      paypalStatus: capture.status,
      status: captureStatus === "COMPLETED" ? "PAID" : "CAPTURED_PENDING_WEBHOOK",
      message:
        captureStatus === "COMPLETED"
          ? "Payment captured and confirmed."
          : "Capture submitted. Waiting for verified webhook confirmation.",
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
