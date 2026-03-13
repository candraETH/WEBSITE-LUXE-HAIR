import { NextResponse } from "next/server"
import { z } from "zod"
import { paypalRequest, PayPalHttpError } from "@/lib/paypal/client"
import { supabase } from "@/lib/supabase-server"

export const runtime = "nodejs"

const PENDING_EXPIRES_AFTER_MS = 6 * 60 * 60 * 1000

type PayPalOrderDetails = {
  status?: string
  links?: Array<{ href?: string; rel?: string; method?: string }>
}

function getBearerToken(request: Request): string | null {
  const header = request.headers.get("authorization") ?? ""
  if (!header.toLowerCase().startsWith("bearer ")) {
    return null
  }
  const token = header.slice(7).trim()
  return token || null
}

function safeString(value: unknown): string {
  return typeof value === "string" ? value : ""
}

function extractCreatedAt(row: Record<string, unknown>): string | null {
  const direct = safeString(row.created_at).trim()
  if (direct) return direct

  const cartJson = row.cart_json
  if (!cartJson || typeof cartJson !== "object" || Array.isArray(cartJson)) return null
  const root = cartJson as Record<string, unknown>
  const order = root.order
  if (!order || typeof order !== "object" || Array.isArray(order)) return null
  const orderObj = order as Record<string, unknown>
  const created = safeString(orderObj.created_at).trim()
  return created || null
}

function normalizeStatus(value: unknown): string {
  return safeString(value).trim().toUpperCase()
}

function isExpired(createdAt: string | null) {
  if (!createdAt) return false
  const createdMs = Date.parse(createdAt)
  if (!Number.isFinite(createdMs)) return false
  return Date.now() - createdMs > PENDING_EXPIRES_AFTER_MS
}

const resumeSchema = z.object({
  orderId: z.string().trim().min(1).max(80).transform((value) => value.toUpperCase()),
})

export async function POST(request: Request) {
  try {
    const token = getBearerToken(request)
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: userData, error: userError } = await supabase.auth.getUser(token)
    if (userError || !userData.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const email = userData.user.email.trim().toLowerCase()
    const body = await request.json().catch(() => null)
    const parsed = resumeSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid resume payment payload." }, { status: 400 })
    }

    const orderId = parsed.data.orderId
    const { data: orderRow, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("customer_email", email)
      .eq("paypal_order_id", orderId)
      .maybeSingle()

    if (orderError) {
      return NextResponse.json({ error: "Unable to read order data." }, { status: 500 })
    }

    if (!orderRow) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 })
    }

    const persistedStatus = normalizeStatus(orderRow.status)
    if (persistedStatus && persistedStatus !== "PENDING") {
      return NextResponse.json(
        { error: "This order is no longer pending payment.", status: persistedStatus },
        { status: 409 }
      )
    }

    const createdAt = extractCreatedAt(orderRow as Record<string, unknown>)
    if (isExpired(createdAt)) {
      await supabase
        .from("orders")
        .update({ status: "CANCELLED" })
        .eq("paypal_order_id", orderId)
        .in("status", ["PENDING", "pending", "Pending"])

      return NextResponse.json(
        { error: "This pending payment has expired (over 6 hours). Please place a new order.", status: "CANCELLED" },
        { status: 410 }
      )
    }

    const paypalOrder = await paypalRequest<PayPalOrderDetails>(`/v2/checkout/orders/${orderId}`, {
      method: "GET",
    })

    const paypalStatus = normalizeStatus(paypalOrder.status)
    const approveUrl = paypalOrder.links?.find((link) => safeString(link.rel).toLowerCase() === "approve")?.href ?? ""

    if (paypalStatus === "CREATED" && approveUrl) {
      return NextResponse.json({ orderId, action: "APPROVE", approveUrl })
    }

    if (paypalStatus === "APPROVED") {
      return NextResponse.json({ orderId, action: "FINALIZE", finalizeUrl: `/payment-success?token=${orderId}` })
    }

    if (paypalStatus === "COMPLETED") {
      return NextResponse.json({ orderId, action: "VIEW", viewUrl: `/account/orders/${orderId}` })
    }

    if (approveUrl) {
      return NextResponse.json({ orderId, action: "APPROVE", approveUrl })
    }

    return NextResponse.json(
      { error: "Unable to resume payment for this order.", paypalStatus: paypalStatus || null },
      { status: 409 }
    )
  } catch (error) {
    if (error instanceof PayPalHttpError) {
      return NextResponse.json({ error: "PayPal order lookup failed." }, { status: 502 })
    }
    return NextResponse.json({ error: "Unable to resume payment." }, { status: 500 })
  }
}

