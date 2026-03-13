import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"
import { supabase } from "@/lib/supabase-server"
import { CATALOG_PRODUCT_BY_SLUG } from "@/lib/catalog-index"

export const runtime = "nodejs"

const DAYS_30_MS = 30 * 24 * 60 * 60 * 1000

function isMissingColumnError(message: string) {
  const normalized = message.trim().toLowerCase()
  return (
    (normalized.includes("column") && normalized.includes("does not exist")) ||
    (normalized.includes("could not find") && normalized.includes("column") && normalized.includes("schema cache")) ||
    (normalized.includes("schema cache") && normalized.includes("column"))
  )
}

async function countOrdersByStatus(status: string) {
  const { count, error } = await supabase
    .from("orders")
    .select("paypal_order_id", { count: "exact", head: true })
    .eq("status", status)

  if (error) {
    return null
  }
  return count ?? 0
}

function normalizeStatus(value: unknown) {
  return typeof value === "string" ? value.trim().toUpperCase() : ""
}

function asNumber(value: unknown) {
  const num = typeof value === "number" ? value : Number(value ?? NaN)
  return Number.isFinite(num) ? num : 0
}

function toIsoDate(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null
  const ms = Date.parse(value)
  if (!Number.isFinite(ms)) return null
  return new Date(ms).toISOString().slice(0, 10)
}

function pctChange(current: number, previous: number): number | null {
  if (!Number.isFinite(current) || !Number.isFinite(previous)) return null
  if (previous <= 0) return current > 0 ? 100 : 0
  return ((current - previous) / previous) * 100
}

export async function GET(request: Request) {
  const auth = await requireAdmin(request)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }

  const [{ count: ordersTotal }, { count: customersTotal }] = await Promise.all([
    supabase.from("orders").select("paypal_order_id", { count: "exact", head: true }),
    supabase.from("profiles").select("id", { count: "exact", head: true }),
  ])

  const [pending, paid, processing, shipped, delivered, cancelled] = await Promise.all([
    countOrdersByStatus("PENDING"),
    countOrdersByStatus("PAID"),
    countOrdersByStatus("PROCESSING"),
    countOrdersByStatus("SHIPPED"),
    countOrdersByStatus("DELIVERED"),
    countOrdersByStatus("CANCELLED"),
  ])

  const now = Date.now()
  const last30Start = new Date(now - DAYS_30_MS).toISOString()
  const prev30Start = new Date(now - 2 * DAYS_30_MS).toISOString()

  let orderRows: Array<Record<string, unknown>> = []
  let revenueAvailable = true

  const ordersWindowBase = supabase
    .from("orders")
    .select("created_at,amount,currency,status,cart_json")
    .gte("created_at", prev30Start)
    .limit(500)

  const ordersWindowOrdered = await ordersWindowBase.order("created_at", { ascending: true })
  const ordersWindow =
    ordersWindowOrdered.error && isMissingColumnError(ordersWindowOrdered.error.message)
      ? await supabase.from("orders").select("amount,currency,status,cart_json").limit(500)
      : ordersWindowOrdered

  if (ordersWindow.error) {
    revenueAvailable = false
  } else {
    orderRows = (ordersWindow.data ?? []) as Array<Record<string, unknown>>
    if (!orderRows.some((row) => typeof row.created_at === "string" && row.created_at)) {
      revenueAvailable = false
    }
  }

  const revenueStatuses = new Set(["PAID", "PROCESSING", "SHIPPED", "DELIVERED"])
  let revenueLast30 = 0
  let revenuePrev30 = 0
  let ordersLast30 = 0
  let ordersPrev30 = 0
  let pendingDeliveryLast30 = 0

  const seriesMap: Record<string, number> = {}

  const topProductCounts: Record<string, number> = {}

  for (const row of orderRows) {
    const status = normalizeStatus(row.status)
    const createdAt = typeof row.created_at === "string" ? row.created_at : ""
    const createdMs = createdAt ? Date.parse(createdAt) : NaN
    const inPrevWindow = Number.isFinite(createdMs) && createdMs >= Date.parse(prev30Start) && createdMs < Date.parse(last30Start)
    const inLastWindow = Number.isFinite(createdMs) && createdMs >= Date.parse(last30Start)

    if (inLastWindow) {
      ordersLast30 += 1
      if (status === "PROCESSING" || status === "SHIPPED") {
        pendingDeliveryLast30 += 1
      }
    } else if (inPrevWindow) {
      ordersPrev30 += 1
    }

    const amount = asNumber(row.amount)
    const hasRevenue = revenueStatuses.has(status)

    if (hasRevenue && inLastWindow) {
      revenueLast30 += amount
      const dayKey = toIsoDate(row.created_at)
      if (dayKey) {
        seriesMap[dayKey] = (seriesMap[dayKey] ?? 0) + amount
      }
    } else if (hasRevenue && inPrevWindow) {
      revenuePrev30 += amount
    }

    if (!hasRevenue || !inLastWindow) {
      continue
    }

    const cartJson = row.cart_json
    if (!cartJson || typeof cartJson !== "object" || Array.isArray(cartJson)) {
      continue
    }

    const root = cartJson as Record<string, unknown>
    const items = root.items
    if (!Array.isArray(items)) {
      continue
    }

    for (const item of items) {
      if (!item || typeof item !== "object" || Array.isArray(item)) continue
      const obj = item as Record<string, unknown>
      const slug = typeof obj.slug === "string" ? obj.slug.trim() : ""
      if (!slug) continue
      const qty = typeof obj.quantity === "number" ? obj.quantity : Number(obj.quantity ?? 0)
      const safeQty = Number.isFinite(qty) && qty > 0 ? qty : 0
      if (safeQty <= 0) continue
      topProductCounts[slug] = (topProductCounts[slug] ?? 0) + safeQty
    }
  }

  const revenueCurrency = "USD"
  const series = (() => {
    if (!revenueAvailable) return []
    const days: Array<{ date: string; revenue: number }> = []
    for (let i = 29; i >= 0; i -= 1) {
      const date = new Date(now - i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
      days.push({ date, revenue: seriesMap[date] ?? 0 })
    }
    return days
  })()

  const topProducts = Object.entries(topProductCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([slug, quantity]) => {
      const catalog = CATALOG_PRODUCT_BY_SLUG.get(slug)
      return {
        slug,
        name: catalog?.name ?? slug,
        image: catalog?.image ?? null,
        quantity,
      }
    })

  const recentBase = supabase
    .from("orders")
    .select("paypal_order_id,status,amount,currency,customer_email,created_at")
    .limit(5)

  const recentOrdered = await recentBase.order("created_at", { ascending: false })
  const recent =
    recentOrdered.error && isMissingColumnError(recentOrdered.error.message) ? await recentBase : recentOrdered

  return NextResponse.json({
    revenue: revenueAvailable
      ? {
          amount: Number(revenueLast30.toFixed(2)),
          currency: revenueCurrency,
          changePct: pctChange(revenueLast30, revenuePrev30),
        }
      : null,
    window30d: {
      orders: {
        total: ordersLast30,
        changePct: revenueAvailable ? pctChange(ordersLast30, ordersPrev30) : null,
      },
      pendingDelivery: {
        total: pendingDeliveryLast30,
      },
    },
    salesSeries: series,
    topProducts,
    orders: {
      total: ordersTotal ?? 0,
      pending: pending ?? 0,
      paid: paid ?? 0,
      processing: processing ?? 0,
      shipped: shipped ?? 0,
      delivered: delivered ?? 0,
      cancelled: cancelled ?? 0,
    },
    customers: {
      total: customersTotal ?? 0,
    },
    recentOrders: (recent.data ?? []).map((row) => ({
      orderId: row.paypal_order_id ?? "",
      status: row.status ?? "UNKNOWN",
      amount: typeof row.amount === "number" ? row.amount : Number(row.amount ?? 0),
      currency: row.currency ?? "USD",
      customerEmail: row.customer_email ?? "",
      createdAt: row.created_at ?? null,
    })),
  })
}
