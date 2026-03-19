import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"
import { supabase } from "@/lib/supabase-server"
import { CATALOG_PRODUCT_BY_SLUG } from "@/lib/catalog-index"

export const runtime = "nodejs"

const DAYS_30_MS = 30 * 24 * 60 * 60 * 1000
const DAYS_7_MS = 7 * 24 * 60 * 60 * 1000
const DAYS_365_MS = 365 * 24 * 60 * 60 * 1000

function isMissingColumnError(message: string) {
  const normalized = message.trim().toLowerCase()
  return (
    (normalized.includes("column") && normalized.includes("does not exist")) ||
    (normalized.includes("could not find") && normalized.includes("column") && normalized.includes("schema cache")) ||
    (normalized.includes("schema cache") && normalized.includes("column"))
  )
}

function isMissingTableError(message: string) {
  const normalized = message.trim().toLowerCase()
  return (
    (normalized.includes("relation") && normalized.includes("does not exist")) ||
    (normalized.includes("schema cache") && normalized.includes("does not exist"))
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

function startOfDayUtc(date: Date): string {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())).toISOString()
}

function diffSeconds(startIso: string | null | undefined, endIso: string | null | undefined): number {
  const startMs = startIso ? Date.parse(startIso) : NaN
  const endMs = endIso ? Date.parse(endIso) : NaN
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs < startMs) return 0
  return Math.floor((endMs - startMs) / 1000)
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
  const last7Start = new Date(now - DAYS_7_MS).toISOString()
  const last365Start = new Date(now - DAYS_365_MS).toISOString()
  const todayStart = startOfDayUtc(new Date())

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

  let topViewedProducts: Array<{ slug: string; name: string; image: string | null; views: number }> = []
  const topViewed = await supabase
    .from("product_views")
    .select("slug,view_count")
    .order("view_count", { ascending: false })
    .limit(8)

  if (!topViewed.error) {
    topViewedProducts = (topViewed.data ?? []).map((row) => {
      const slug = typeof row.slug === "string" ? row.slug : ""
      const views = asNumber((row as { view_count?: unknown }).view_count)
      const catalog = slug ? CATALOG_PRODUCT_BY_SLUG.get(slug) : null
      return {
        slug,
        name: catalog?.name ?? slug,
        image: catalog?.image ?? null,
        views,
      }
    })
  } else if (!isMissingTableError(topViewed.error.message)) {
    console.error("Top viewed products query failed:", topViewed.error.message)
  }

  let analytics: {
    visitors: { today: number; last7: number; last30: number }
    sessions: { today: number; last7: number; last30: number }
    conversionRate: number | null
    newReturning: { new: number; returning: number }
    bounceRate: number | null
    engagementRate: number | null
    avgTimeSeconds: number | null
    topLandingPages: Array<{ path: string; sessions: number }>
    trafficSources: Array<{ source: string; sessions: number }>
    deviceSplit: Array<{ device: string; sessions: number }>
    topCountry: { name: string; sessions: number } | null
    topCity: { name: string; sessions: number } | null
    abandonedCheckoutRate: number | null
    repeatPurchaseRate: number | null
  } | null = null

  const sessionsQuery = await supabase
    .from("analytics_sessions")
    .select(
      "session_id,started_at,last_seen_at,is_returning,page_views,engaged,landing_path,traffic_source,device_type,country,city"
    )
    .gte("started_at", last30Start)
    .limit(5000)

  if (!sessionsQuery.error) {
    const sessions = (sessionsQuery.data ?? []) as Array<Record<string, unknown>>
    const sessionsLast30 = sessions
    const sessionsLast7 = sessions.filter((row) => typeof row.started_at === "string" && row.started_at >= last7Start)
    const sessionsToday = sessions.filter((row) => typeof row.started_at === "string" && row.started_at >= todayStart)

    const sessions30Count = sessionsLast30.length
    const sessions7Count = sessionsLast7.length
    const sessionsTodayCount = sessionsToday.length

    const returningCount = sessionsLast30.filter((row) => row.is_returning === true).length
    const newCount = Math.max(0, sessions30Count - returningCount)

    const bouncedCount = sessionsLast30.filter((row) => {
      const pageViews = asNumber(row.page_views)
      const engaged = row.engaged === true
      return pageViews <= 1 && !engaged
    }).length

    const engagedCount = sessionsLast30.filter((row) => row.engaged === true).length
    const avgTimeSeconds = sessionsLast30.length
      ? Math.round(
          sessionsLast30.reduce((sum, row) => {
            return sum + diffSeconds(row.started_at as string, row.last_seen_at as string)
          }, 0) / sessionsLast30.length
        )
      : null

    const landingMap: Record<string, number> = {}
    const sourceMap: Record<string, number> = {}
    const deviceMap: Record<string, number> = {}
    const countryMap: Record<string, number> = {}
    const cityMap: Record<string, number> = {}

    for (const row of sessionsLast30) {
      const landing = typeof row.landing_path === "string" ? row.landing_path : ""
      if (landing) landingMap[landing] = (landingMap[landing] ?? 0) + 1

      const source = typeof row.traffic_source === "string" ? row.traffic_source : ""
      if (source) sourceMap[source] = (sourceMap[source] ?? 0) + 1

      const device = typeof row.device_type === "string" ? row.device_type : ""
      if (device) deviceMap[device] = (deviceMap[device] ?? 0) + 1

      const country = typeof row.country === "string" ? row.country : ""
      if (country) countryMap[country] = (countryMap[country] ?? 0) + 1

      const city = typeof row.city === "string" ? row.city : ""
      if (city) cityMap[city] = (cityMap[city] ?? 0) + 1
    }

    const topLandingPages = Object.entries(landingMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([path, sessions]) => ({ path, sessions }))

    const trafficSources = Object.entries(sourceMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([source, sessions]) => ({ source, sessions }))

    const deviceSplit = Object.entries(deviceMap)
      .sort((a, b) => b[1] - a[1])
      .map(([device, sessions]) => ({ device, sessions }))

    const topCountryEntry = Object.entries(countryMap).sort((a, b) => b[1] - a[1])[0]
    const topCityEntry = Object.entries(cityMap).sort((a, b) => b[1] - a[1])[0]

    const eventsQuery = await supabase
      .from("analytics_events")
      .select("session_id,event_name,event_at")
      .gte("event_at", last30Start)
      .in("event_name", ["checkout_started", "purchase_completed"])
      .limit(5000)

    let abandonedCheckoutRate: number | null = null
    if (!eventsQuery.error) {
      const events = (eventsQuery.data ?? []) as Array<Record<string, unknown>>
      const checkoutSessions = new Set<string>()
      const purchaseSessions = new Set<string>()
      for (const event of events) {
        const sessionId = typeof event.session_id === "string" ? event.session_id : ""
        if (!sessionId) continue
        const name = typeof event.event_name === "string" ? event.event_name : ""
        if (name === "checkout_started") checkoutSessions.add(sessionId)
        if (name === "purchase_completed") purchaseSessions.add(sessionId)
      }
      if (checkoutSessions.size > 0) {
        const abandoned = Math.max(0, checkoutSessions.size - purchaseSessions.size)
        abandonedCheckoutRate = (abandoned / checkoutSessions.size) * 100
      }
    } else if (!isMissingTableError(eventsQuery.error.message)) {
      console.error("Analytics events query failed:", eventsQuery.error.message)
    }

    let repeatPurchaseRate: number | null = null
    const repeatQuery = await supabase
      .from("orders")
      .select("customer_email,status,created_at")
      .gte("created_at", last365Start)
      .in("status", ["PAID", "PROCESSING", "SHIPPED", "DELIVERED", "COMPLETED"])
      .limit(10000)

    if (!repeatQuery.error) {
      const emailMap: Record<string, number> = {}
      for (const row of (repeatQuery.data ?? []) as Array<Record<string, unknown>>) {
        const email = typeof row.customer_email === "string" ? row.customer_email.trim().toLowerCase() : ""
        if (!email) continue
        emailMap[email] = (emailMap[email] ?? 0) + 1
      }
      const totalCustomers = Object.keys(emailMap).length
      const repeatCustomers = Object.values(emailMap).filter((count) => count > 1).length
      if (totalCustomers > 0) {
        repeatPurchaseRate = (repeatCustomers / totalCustomers) * 100
      }
    } else if (!isMissingColumnError(repeatQuery.error.message)) {
      console.error("Repeat purchase query failed:", repeatQuery.error.message)
    }

    analytics = {
      visitors: { today: sessionsTodayCount, last7: sessions7Count, last30: sessions30Count },
      sessions: { today: sessionsTodayCount, last7: sessions7Count, last30: sessions30Count },
      conversionRate: sessions30Count > 0 ? (ordersLast30 / sessions30Count) * 100 : null,
      newReturning: { new: newCount, returning: returningCount },
      bounceRate: sessions30Count > 0 ? (bouncedCount / sessions30Count) * 100 : null,
      engagementRate: sessions30Count > 0 ? (engagedCount / sessions30Count) * 100 : null,
      avgTimeSeconds,
      topLandingPages,
      trafficSources,
      deviceSplit,
      topCountry: topCountryEntry ? { name: topCountryEntry[0], sessions: topCountryEntry[1] } : null,
      topCity: topCityEntry ? { name: topCityEntry[0], sessions: topCityEntry[1] } : null,
      abandonedCheckoutRate,
      repeatPurchaseRate,
    }
  } else if (!isMissingTableError(sessionsQuery.error.message)) {
    console.error("Analytics sessions query failed:", sessionsQuery.error.message)
  }

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
    topViewedProducts,
    analytics,
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
