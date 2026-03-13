import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase-server"

type OrderSummary = {
  orderId: string
  status: string
  total: number
  currency: string
  createdAt: string | null
  products: string[]
}

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

function extractProducts(cartJson: unknown): string[] {
  if (!cartJson || typeof cartJson !== "object" || Array.isArray(cartJson)) {
    return []
  }
  const root = cartJson as Record<string, unknown>
  const items = root.items
  if (!Array.isArray(items)) {
    return []
  }
  return items
    .map((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return ""
      const obj = item as Record<string, unknown>
      const name = safeString(obj.name).trim()
      const qty = typeof obj.quantity === "number" ? obj.quantity : null
      if (!name) return ""
      return qty && qty > 1 ? `${name} x ${qty}` : name
    })
    .filter(Boolean)
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

export async function GET(request: Request) {
  const token = getBearerToken(request)
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data: userData, error: userError } = await supabase.auth.getUser(token)
  if (userError || !userData.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const email = userData.user.email

  const query = supabase.from("orders").select("*").eq("customer_email", email).limit(50)

  // `created_at` may not exist depending on the schema. If ordering fails, fallback to unordered list.
  const ordered = await query.order("created_at", { ascending: false })
  const result = ordered.error ? await query : ordered

  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: 500 })
  }

  const rows = (result.data ?? []) as Array<Record<string, unknown>>
  const expiredPendingOrderIds: string[] = []
  const orders: OrderSummary[] = rows
    .map((row) => {
      const orderId = safeString(row.paypal_order_id).trim()
      if (!orderId) return null

      const createdAt = extractCreatedAt(row)
      const statusValue = normalizeStatus(row.status) || "UNKNOWN"
      const expiredPending = statusValue === "PENDING" && isExpired(createdAt)
      if (expiredPending) {
        expiredPendingOrderIds.push(orderId)
      }

      return {
        orderId,
        status: expiredPending ? "CANCELLED" : safeString(row.status).trim() || "UNKNOWN",
        total: typeof row.amount === "number" ? row.amount : Number(row.amount ?? 0),
        currency: safeString(row.currency).trim() || "USD",
        createdAt,
        products: extractProducts(row.cart_json),
      }
    })
    .filter(Boolean) as OrderSummary[]

  if (expiredPendingOrderIds.length > 0) {
    const { error: cancelError } = await supabase
      .from("orders")
      .update({ status: "CANCELLED" })
      .in("paypal_order_id", expiredPendingOrderIds)
      .in("status", ["PENDING", "pending", "Pending"])

    if (cancelError) {
      console.error("Supabase pending order auto-cancel failed:", cancelError.message)
    }
  }

  return NextResponse.json({ orders })
}
