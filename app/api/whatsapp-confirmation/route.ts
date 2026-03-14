import { NextResponse } from "next/server"
import { z } from "zod"
import { hasSupabaseEnv, supabase } from "@/lib/supabase-server"
import { buildWhatsAppUrl, buildWhatsAppUrlForNumber, WHATSAPP_ENABLED } from "@/lib/whatsapp-config"
import { enforceRateLimit } from "@/lib/rate-limit"
import { isAllowedRequestOrigin, isValidPayPalOrderId } from "@/lib/security"

export const runtime = "nodejs"

const confirmationSchema = z.object({
  orderId: z
    .string()
    .trim()
    .min(1)
    .max(80)
    .transform((value) => value.toUpperCase())
    .refine((value) => isValidPayPalOrderId(value), "Invalid order id."),
})

type OrderRow = {
  paypal_order_id?: string | null
  status?: string | null
  amount?: number | null
  currency?: string | null
  customer_name?: string | null
  customer_email?: string | null
  phone_number?: string | null
  cart_json?: unknown
}

type CartJsonItem = {
  name?: unknown
  length?: unknown
  category?: unknown
  quantity?: unknown
  line_total?: unknown
}

type CartJsonRoot = {
  customer?: {
    name?: unknown
    email?: unknown
    phone_number?: unknown
    address_line?: unknown
    city?: unknown
    province?: unknown
    postal_code?: unknown
    country?: unknown
  }
  summary?: {
    subtotal?: unknown
    tax?: unknown
    shipping?: unknown
    total?: unknown
  }
  items?: unknown
}

function normalizeStatus(value: string | null | undefined): string {
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

function isMissingColumnError(message: string) {
  const normalized = message.trim().toLowerCase()
  return normalized.includes("column") && normalized.includes("does not exist")
}

function normalizeWhatsAppNumber(value: string): string {
  const digits = value.replace(/\D/g, "")
  if (!digits) {
    return ""
  }
  if (digits.startsWith("00")) {
    return digits.slice(2)
  }
  if (digits.startsWith("0")) {
    return `62${digits.slice(1)}`
  }
  return digits
}

function asNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value
  }
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

function formatAmount(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(value)
  } catch {
    return `$${value.toFixed(2)}`
  }
}

function getCartJsonRoot(value: unknown): CartJsonRoot {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {}
  }
  return value as CartJsonRoot
}

function buildAddress(root: CartJsonRoot): string {
  const customer = root.customer
  if (!customer || typeof customer !== "object") {
    return "-"
  }

  const parts = [
    asString(customer.address_line),
    asString(customer.city),
    asString(customer.province),
    asString(customer.postal_code),
    asString(customer.country),
  ].filter(Boolean)

  return parts.length > 0 ? parts.join(", ") : "-"
}

function extractBuyerPhone(row: OrderRow, root: CartJsonRoot): string {
  const direct = asString(row.phone_number)
  if (direct) {
    return direct
  }

  const customer = root.customer
  if (!customer || typeof customer !== "object") {
    return ""
  }

  return asString(customer.phone_number)
}

function buildItemLines(root: CartJsonRoot, currency: string): string[] {
  const rawItems = root.items
  if (!Array.isArray(rawItems)) {
    return ["-"]
  }

  const lines = rawItems
    .filter((item): item is CartJsonItem => Boolean(item && typeof item === "object"))
    .map((item) => {
      const name = asString(item.name) || "Item"
      const length = asNumber(item.length)
      const category = asString(item.category)
      const quantity = Math.max(1, Math.floor(asNumber(item.quantity) || 1))
      const lineTotal = asNumber(item.line_total)
      const lengthLabel = length > 0 ? `${length}"` : "-"
      return `- ${name} | ${lengthLabel} | ${category || "-"} | x${quantity} | ${formatAmount(lineTotal, currency)}`
    })

  return lines.length > 0 ? lines : ["-"]
}

function buildSummaryLines(root: CartJsonRoot, row: OrderRow): string[] {
  const currency = asString(row.currency) || "USD"
  const summary = root.summary ?? {}
  const subtotal = asNumber(summary.subtotal)
  const tax = asNumber(summary.tax)
  const shipping = asNumber(summary.shipping)
  const total = asNumber(summary.total) || asNumber(row.amount)

  return [
    `Subtotal: ${formatAmount(subtotal, currency)}`,
    `Tax: ${formatAmount(tax, currency)}`,
    `Shipping: ${formatAmount(shipping, currency)}`,
    `Total: ${formatAmount(total, currency)}`,
  ]
}

async function loadOrder(orderId: string): Promise<{ data: OrderRow | null; error: string | null }> {
  const select = "paypal_order_id,status,amount,currency,customer_name,customer_email,phone_number,cart_json"
  const { data, error } = await supabase
    .from("orders")
    .select(select)
    .eq("paypal_order_id", orderId)
    .maybeSingle()

  if (!error) {
    return { data: (data as OrderRow | null) ?? null, error: null }
  }

  // Backward-compat if the table uses a different phone column.
  if (isMissingColumnError(error.message)) {
    const fallbackSelect = "paypal_order_id,status,amount,currency,customer_name,customer_email,cart_json"
    const fallback = await supabase
      .from("orders")
      .select(fallbackSelect)
      .eq("paypal_order_id", orderId)
      .maybeSingle()

    if (fallback.error) {
      return { data: null, error: fallback.error.message }
    }

    return { data: (fallback.data as OrderRow | null) ?? null, error: null }
  }

  return { data: null, error: error.message }
}

export async function POST(request: Request) {
  try {
    const rateLimit = await enforceRateLimit(request, "api:whatsapp-confirmation", {
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

    if (!WHATSAPP_ENABLED) {
      return NextResponse.json({ error: "WhatsApp notifications are disabled." }, { status: 400 })
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

    const authedEmail = normalizeEmail(userData.user.email)
    if (!authedEmail) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const parsed = confirmationSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request payload." }, { status: 400 })
    }

    const { data, error } = await loadOrder(parsed.data.orderId)
    if (error) {
      console.error("WhatsApp confirmation order query failed:", error, `order=${parsed.data.orderId}`)
      return NextResponse.json({ error: "Unable to read order data." }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 })
    }

    // Prevent leaking PII for someone who only knows an order id.
    const cartRoot = getCartJsonRoot(data.cart_json)
    const customer = cartRoot.customer ?? {}
    const customerEmailFromCart = asString(customer.email)
    const customerEmailFromRow = asString(data.customer_email)
    const orderEmail = normalizeEmail(customerEmailFromRow || customerEmailFromCart)
    if (!orderEmail || orderEmail !== authedEmail) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    if (normalizeStatus(data.status) !== "PAID") {
      return NextResponse.json({ error: "Order payment is not confirmed yet." }, { status: 409 })
    }

    const currency = asString(data.currency) || "USD"
    const customerName = asString(customer.name) || asString(data.customer_name) || "-"
    const customerEmail = customerEmailFromCart || customerEmailFromRow || "-"
    const customerPhone = extractBuyerPhone(data, cartRoot)
    const address = buildAddress(cartRoot)

    const sellerMessage = [
      "Payment successful notification",
      `Order ID: ${asString(data.paypal_order_id) || parsed.data.orderId}`,
      "Status: PAID",
      "",
      "Customer Details",
      `Name: ${customerName}`,
      `Email: ${customerEmail}`,
      `WhatsApp: ${customerPhone || "-"}`,
      `Address: ${address}`,
      "",
      "Order Items",
      ...buildItemLines(cartRoot, currency),
      "",
      ...buildSummaryLines(cartRoot, data),
    ].join("\n")

    const buyerMessage = [
      `Hi ${customerName === "-" ? "Customer" : customerName},`,
      "Your payment has been received successfully.",
      `Order ID: ${asString(data.paypal_order_id) || parsed.data.orderId}`,
      "Status: PAID",
      "",
      "Thank you for shopping with CANDRA'S HAIR.",
    ].join("\n")

    const normalizedBuyerNumber = normalizeWhatsAppNumber(customerPhone)
    return NextResponse.json({
      sellerUrl: buildWhatsAppUrl(sellerMessage),
      buyerUrl: normalizedBuyerNumber ? buildWhatsAppUrlForNumber(normalizedBuyerNumber, buyerMessage) : "",
    })
  } catch (error) {
    console.error("WhatsApp confirmation error:", error instanceof Error ? error.message : "Unknown error")
    return NextResponse.json({ error: "Unable to prepare WhatsApp confirmation." }, { status: 500 })
  }
}
