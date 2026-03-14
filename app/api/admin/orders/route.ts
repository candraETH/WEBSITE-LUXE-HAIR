import { NextResponse } from "next/server"
import { z } from "zod"
import { requireAdmin } from "@/lib/admin-auth"
import { logServerError, publicErrorMessage } from "@/lib/api-errors"
import { getTierForSpend } from "@/lib/loyalty-tier"
import { supabase } from "@/lib/supabase-server"

export const runtime = "nodejs"

const listQuerySchema = z.object({
  q: z.string().trim().max(80).optional(),
  status: z.string().trim().max(20).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
})

const updateOrderSchema = z.object({
  orderId: z.string().trim().min(1).max(80),
  status: z.enum(["PENDING", "PAID", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"]).optional(),
  trackingNumber: z.string().trim().max(120).optional(),
  shippingCarrier: z.string().trim().max(60).optional(),
})

function safeString(value: unknown) {
  return typeof value === "string" ? value : ""
}

function sanitizeOrFilterValue(value: string) {
  // Supabase `.or()` uses a comma-separated filter string; strip separators and grouping chars
  // to prevent filter injection via user-provided query text.
  return value.replace(/[(),]/g, " ").replace(/[%_]/g, " ").trim()
}

function normalizeStatus(value: string | undefined) {
  const raw = (value ?? "").trim()
  if (!raw) return ""
  return raw.toUpperCase()
}

function isMissingColumnError(message: string) {
  const normalized = message.trim().toLowerCase()
  return (
    (normalized.includes("column") && normalized.includes("does not exist")) ||
    (normalized.includes("could not find") && normalized.includes("column") && normalized.includes("schema cache")) ||
    (normalized.includes("schema cache") && normalized.includes("column"))
  )
}

function buildOrdersQuery(selectClause: string, limit: number) {
  return supabase.from("orders").select(selectClause).limit(limit)
}

const PAID_STATUSES = ["PAID", "PROCESSING", "SHIPPED", "DELIVERED", "COMPLETED"] as const
const PAID_STATUSES_SET = new Set(PAID_STATUSES)

function normalizeEmail(value: string) {
  return value.trim().toLowerCase()
}

function asNumber(value: unknown) {
  const num = typeof value === "number" ? value : Number(value ?? NaN)
  return Number.isFinite(num) ? num : 0
}

function normalizeRowStatus(value: unknown) {
  return typeof value === "string" ? value.trim().toUpperCase() : ""
}

function shouldCountUsd(currency: unknown) {
  if (typeof currency !== "string") return true
  const trimmed = currency.trim()
  if (!trimmed) return true
  return trimmed.toUpperCase() === "USD"
}

export async function GET(request: Request) {
  const auth = await requireAdmin(request)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }

  const url = new URL(request.url)
  const parsed = listQuerySchema.safeParse({
    q: url.searchParams.get("q") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined,
  })
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query." }, { status: 400 })
  }

  const q = sanitizeOrFilterValue(safeString(parsed.data.q).trim())
  const status = normalizeStatus(parsed.data.status)
  const limit = parsed.data.limit ?? 50

  const selectClause =
    "paypal_order_id,status,amount,currency,customer_name,customer_email,tracking_number,shipping_carrier,created_at,updated_at"

  const baseQuery = buildOrdersQuery(selectClause, limit)
  let filteredQuery = baseQuery

  if (q) {
    filteredQuery = filteredQuery.or(
      `paypal_order_id.ilike.%${q}%,customer_email.ilike.%${q}%,customer_name.ilike.%${q}%`
    )
  }

  if (status && status !== "ALL") {
    filteredQuery = filteredQuery.eq("status", status)
  }

  const ordered = await filteredQuery.order("created_at", { ascending: false })
  const result =
    ordered.error && isMissingColumnError(ordered.error.message) ? await filteredQuery : ordered

  if (result.error) {
    logServerError("Admin orders list failed:", result.error)
    return NextResponse.json({ error: publicErrorMessage(result.error, "Unable to load orders.") }, { status: 500 })
  }

  const rows = (result.data ?? []) as unknown as Array<Record<string, unknown>>
  const baseOrders = rows.map((row) => ({
    orderId: safeString(row["paypal_order_id"]).trim(),
    status: safeString(row["status"]).trim() || "UNKNOWN",
    amount: typeof row["amount"] === "number" ? row["amount"] : Number(row["amount"] ?? 0),
    currency: safeString(row["currency"]).trim() || "USD",
    customerName: safeString(row["customer_name"]).trim(),
    customerEmail: safeString(row["customer_email"]).trim(),
    trackingNumber: safeString(row["tracking_number"]).trim(),
    shippingCarrier: safeString(row["shipping_carrier"]).trim(),
    createdAt: safeString(row["created_at"]).trim() || null,
    updatedAt: safeString(row["updated_at"]).trim() || null,
  }))

  const emailsForQuery = Array.from(
    new Set(
      baseOrders
        .map((order) => normalizeEmail(safeString(order.customerEmail)))
        .filter((email) => Boolean(email))
    )
  )

  const totalsByEmail = new Map<string, number>()

  if (emailsForQuery.length) {
    const { data: loyaltyRows, error: loyaltyError } = await supabase
      .from("orders")
      .select("customer_email,amount,status,currency")
      .in("customer_email", emailsForQuery)
      .limit(10000)

    if (loyaltyError) {
      logServerError("Admin orders tier calculation failed:", loyaltyError)
    } else {
      for (const row of (loyaltyRows ?? []) as unknown as Array<Record<string, unknown>>) {
        const status = normalizeRowStatus(row["status"])
        if (!PAID_STATUSES_SET.has(status as (typeof PAID_STATUSES)[number])) continue

        const email = normalizeEmail(safeString(row["customer_email"]))
        if (!email) continue
        if (!shouldCountUsd(row["currency"])) continue
        totalsByEmail.set(email, (totalsByEmail.get(email) ?? 0) + asNumber(row["amount"]))
      }
    }
  }

  const orders = baseOrders.map((order) => {
    const total = totalsByEmail.get(normalizeEmail(order.customerEmail)) ?? 0
    const tier = getTierForSpend(total)

    return {
      ...order,
      customerTierKey: tier.key,
      customerTierName: tier.name,
    }
  })

  return NextResponse.json({ orders })
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin(request)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }

  const body = await request.json().catch(() => null)
  const parsed = updateOrderSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 })
  }

  const { orderId, status, trackingNumber, shippingCarrier } = parsed.data

  const updatePayload: Record<string, unknown> = {}
  if (status) updatePayload.status = status

  if (typeof trackingNumber === "string") {
    updatePayload.tracking_number = trackingNumber
  }
  if (typeof shippingCarrier === "string") {
    updatePayload.shipping_carrier = shippingCarrier
  }

  if (Object.keys(updatePayload).length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 })
  }

  const { error } = await supabase.from("orders").update(updatePayload).eq("paypal_order_id", orderId)
  if (error) {
    logServerError("Admin order update failed:", error)
    return NextResponse.json({ error: publicErrorMessage(error, "Unable to update order.") }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
