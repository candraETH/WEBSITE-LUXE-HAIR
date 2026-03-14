import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"
import { logServerError, publicErrorMessage } from "@/lib/api-errors"
import { supabase } from "@/lib/supabase-server"

export const runtime = "nodejs"

function safeString(value: unknown) {
  return typeof value === "string" ? value : ""
}

function asNumber(value: unknown) {
  const num = typeof value === "number" ? value : Number(value ?? NaN)
  return Number.isFinite(num) ? num : 0
}

function extractItems(cartJson: unknown) {
  if (!cartJson || typeof cartJson !== "object" || Array.isArray(cartJson)) return []
  const root = cartJson as Record<string, unknown>
  const items = root.items
  if (!Array.isArray(items)) return []

  return items
    .map((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return null
      const obj = item as Record<string, unknown>
      const name = safeString(obj.name).trim()
      if (!name) return null
      const quantity = typeof obj.quantity === "number" ? obj.quantity : asNumber(obj.quantity)
      const unitPrice = asNumber(obj.unit_price)
      const lineTotal = asNumber(obj.line_total)
      const length = typeof obj.length === "number" ? obj.length : asNumber(obj.length)
      const category = safeString(obj.category).trim()
      return {
        name,
        category,
        length: length > 0 ? length : null,
        quantity: quantity > 0 ? quantity : 1,
        unitPrice,
        lineTotal,
      }
    })
    .filter(Boolean) as Array<{
    name: string
    category: string
    length: number | null
    quantity: number
    unitPrice: number
    lineTotal: number
  }>
}

function extractSummary(cartJson: unknown) {
  if (!cartJson || typeof cartJson !== "object" || Array.isArray(cartJson)) return null
  const root = cartJson as Record<string, unknown>
  const summary = root.summary
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) return null
  const obj = summary as Record<string, unknown>
  return {
    itemCount: Math.max(0, Math.floor(asNumber(obj.item_count))),
    lineItemsSubtotal: asNumber(obj.line_items_subtotal),
    discount: asNumber(obj.discount),
    subtotal: asNumber(obj.subtotal),
    tax: asNumber(obj.tax),
    shipping: asNumber(obj.shipping),
    total: asNumber(obj.total),
  }
}

function extractCustomer(cartJson: unknown) {
  if (!cartJson || typeof cartJson !== "object" || Array.isArray(cartJson)) return null
  const root = cartJson as Record<string, unknown>
  const customer = root.customer
  if (!customer || typeof customer !== "object" || Array.isArray(customer)) return null
  const obj = customer as Record<string, unknown>
  return {
    name: safeString(obj.name).trim(),
    email: safeString(obj.email).trim(),
    phone: safeString(obj.phone_number).trim(),
    addressLine: safeString(obj.address_line).trim(),
    city: safeString(obj.city).trim(),
    province: safeString(obj.province).trim(),
    postalCode: safeString(obj.postal_code).trim(),
    country: safeString(obj.country).trim(),
  }
}

export async function GET(request: Request, context: { params: Promise<{ orderId: string }> }) {
  const auth = await requireAdmin(request)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }

  const { orderId } = await context.params
  const id = (orderId ?? "").trim()
  if (!id) {
    return NextResponse.json({ error: "Invalid order id." }, { status: 400 })
  }

  try {
    const { data, error } = await supabase.from("orders").select("*").eq("paypal_order_id", id).maybeSingle()
    if (error) {
      logServerError("Admin order detail load failed:", error)
      return NextResponse.json({ error: publicErrorMessage(error, "Unable to load order.") }, { status: 500 })
    }
    if (!data) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 })
    }

    const row = data as Record<string, unknown>
    const cartJson = row.cart_json
    const customerFromCart = extractCustomer(cartJson)

    const result = {
      order: {
        orderId: safeString(row.paypal_order_id).trim(),
        status: safeString(row.status).trim() || "UNKNOWN",
        amount: asNumber(row.amount),
        currency: safeString(row.currency).trim() || "USD",
        createdAt: safeString(row.created_at).trim() || null,
        updatedAt: safeString(row.updated_at).trim() || null,
        customerName: safeString(row.customer_name).trim() || customerFromCart?.name || "",
        customerEmail: safeString(row.customer_email).trim() || customerFromCart?.email || "",
        trackingNumber: safeString(row.tracking_number).trim(),
        shippingCarrier: safeString(row.shipping_carrier).trim(),
      },
      customer: customerFromCart,
      summary: extractSummary(cartJson),
      items: extractItems(cartJson),
      cartText: safeString(row.cart_text),
    }

    return NextResponse.json(result)
  } catch (err) {
    logServerError("Admin order detail unexpected error:", err)
    return NextResponse.json({ error: publicErrorMessage(err, "Unable to load order.") }, { status: 500 })
  }
}

