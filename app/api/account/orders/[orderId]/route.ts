import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase-server"

const PENDING_EXPIRES_AFTER_MS = 6 * 60 * 60 * 1000

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

function normalizeStatus(value: unknown) {
  return safeString(value).trim().toUpperCase()
}

function isExpired(createdAt: string | null) {
  if (!createdAt) return false
  const createdMs = Date.parse(createdAt)
  if (!Number.isFinite(createdMs)) return false
  return Date.now() - createdMs > PENDING_EXPIRES_AFTER_MS
}

export async function GET(request: Request, context: { params: Promise<{ orderId: string }> }) {
  const token = getBearerToken(request)
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data: userData, error: userError } = await supabase.auth.getUser(token)
  if (userError || !userData.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const email = userData.user.email
  const { orderId } = await context.params

  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("customer_email", email)
    .eq("paypal_order_id", orderId)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!data) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 })
  }

  const row = data as Record<string, unknown>
  const createdAt = extractCreatedAt(row)
  const statusValue = normalizeStatus(row.status)
  if (statusValue === "PENDING" && isExpired(createdAt)) {
    const { error: cancelError } = await supabase
      .from("orders")
      .update({ status: "CANCELLED" })
      .eq("paypal_order_id", orderId)
      .in("status", ["PENDING", "pending", "Pending"])

    if (cancelError) {
      console.error("Supabase pending order auto-cancel failed:", cancelError.message, `order=${orderId}`)
    } else {
      ;(data as Record<string, unknown>).status = "CANCELLED"
    }
  }

  return NextResponse.json({ order: data })
}
