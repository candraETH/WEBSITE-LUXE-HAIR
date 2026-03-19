"use client"

import Image from "next/image"
import { useEffect, useMemo, useState } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { getSupabaseBrowserClient } from "@/lib/supabase-browser"

type StatsResponse = {
  revenue?: { amount: number; currency: string; changePct: number | null } | null
  window30d?: {
    orders: { total: number; changePct: number | null }
    pendingDelivery: { total: number }
  }
  salesSeries?: Array<{ date: string; revenue: number }>
  topProducts?: Array<{ slug: string; name: string; image: string | null; quantity: number }>
  orders: {
    total: number
    pending: number
    paid: number
    processing: number
    shipped: number
    delivered: number
    cancelled: number
  }
  customers: {
    total: number
  }
  topViewedProducts?: Array<{
    slug: string
    name: string
    image: string | null
    views: number
  }>
  analytics?: {
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
  } | null
  error?: string
}

function percent(part: number, total: number) {
  if (!total) return 0
  return Math.round((part / total) * 100)
}

function formatCount(value: number) {
  const safeValue = Number.isFinite(value) ? value : 0
  try {
    return new Intl.NumberFormat(undefined, { notation: "compact" }).format(safeValue)
  } catch {
    return String(safeValue)
  }
}

function formatMoney(amount: number, currency: string) {
  const safeAmount = Number.isFinite(amount) ? amount : 0
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(safeAmount)
  } catch {
    return `${currency} ${safeAmount.toFixed(2)}`
  }
}

function formatPercentValue(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "-"
  const rounded = Math.round(value * 10) / 10
  return `${rounded}%`
}

function formatDuration(seconds: number | null) {
  if (seconds === null || !Number.isFinite(seconds)) return "-"
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const remaining = seconds % 60
  if (minutes < 60) return `${minutes}m ${remaining}s`
  const hours = Math.floor(minutes / 60)
  const minLeft = minutes % 60
  return `${hours}h ${minLeft}m`
}

export function AdminAnalyticsClient() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), [])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<StatsResponse | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!supabase) {
        setError("Auth is not configured.")
        setLoading(false)
        return
      }

      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token ?? ""
      if (!token) {
        setError("You are not signed in.")
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)
      const response = await fetch("/api/admin/stats", { headers: { authorization: `Bearer ${token}` } })
      const payload = (await response.json().catch(() => ({}))) as StatsResponse
      if (cancelled) return

      if (!response.ok) {
        setError(payload.error || "Failed to load analytics.")
        setLoading(false)
        return
      }

      setData(payload)
      setLoading(false)
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [supabase])

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
        <Skeleton className="h-56 w-full" />
      </div>
    )
  }

  if (error) {
    return <div className="rounded-2xl border border-border/30 bg-card/60 p-6 text-sm text-destructive shadow-sm">{error}</div>
  }

  if (!data) return null

  const total = data.orders.total
  const rows = [
    { label: "Pending", value: data.orders.pending, color: "bg-orange-500" },
    { label: "Paid", value: data.orders.paid, color: "bg-blue-500" },
    { label: "Processing", value: data.orders.processing, color: "bg-blue-500" },
    { label: "Shipped", value: data.orders.shipped, color: "bg-purple-500" },
    { label: "Delivered", value: data.orders.delivered, color: "bg-emerald-500" },
    { label: "Cancelled", value: data.orders.cancelled, color: "bg-red-500" },
  ]

  const revenueAmount = data.revenue?.amount ?? 0
  const revenueCurrency = data.revenue?.currency ?? "USD"
  const orders30d = data.window30d?.orders.total ?? 0
  const aov = orders30d > 0 ? revenueAmount / orders30d : 0
  const cancelRate = total > 0 ? (data.orders.cancelled / total) * 100 : 0
  const topViewed = data.topViewedProducts ?? []
  const topSelling = data.topProducts ?? []
  const revenueSeries = data.salesSeries ?? []
  const maxRevenue = Math.max(1, ...revenueSeries.map((point) => point.revenue))
  const analytics = data.analytics ?? null
  const visitors = analytics?.visitors
  const sessions = analytics?.sessions
  const trafficSources = analytics?.trafficSources ?? []
  const deviceSplit = analytics?.deviceSplit ?? []
  const topLandingPages = analytics?.topLandingPages ?? []

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-foreground">Priority KPIs</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-border/30 bg-card/60 p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Visitors</p>
            <div className="mt-3 space-y-1 text-sm">
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Today</span>
                <span className="font-semibold text-foreground">{visitors ? formatCount(visitors.today) : "-"}</span>
              </div>
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Last 7 days</span>
                <span className="font-semibold text-foreground">{visitors ? formatCount(visitors.last7) : "-"}</span>
              </div>
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Last 30 days</span>
                <span className="font-semibold text-foreground">{visitors ? formatCount(visitors.last30) : "-"}</span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border/30 bg-card/60 p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Sessions</p>
            <div className="mt-3 space-y-1 text-sm">
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Today</span>
                <span className="font-semibold text-foreground">{sessions ? formatCount(sessions.today) : "-"}</span>
              </div>
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Last 7 days</span>
                <span className="font-semibold text-foreground">{sessions ? formatCount(sessions.last7) : "-"}</span>
              </div>
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Last 30 days</span>
                <span className="font-semibold text-foreground">{sessions ? formatCount(sessions.last30) : "-"}</span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border/30 bg-card/60 p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Conversion rate</p>
            <p className="mt-3 text-2xl font-semibold text-foreground">
              {formatPercentValue(analytics?.conversionRate ?? null)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Order / Session</p>
          </div>

          <div className="rounded-2xl border border-border/30 bg-card/60 p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Revenue + AOV</p>
            <p className="mt-3 text-2xl font-semibold text-foreground">{formatMoney(revenueAmount, revenueCurrency)}</p>
            <p className="mt-1 text-xs text-muted-foreground">AOV {orders30d > 0 ? formatMoney(aov, revenueCurrency) : "-"}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border/30 bg-card/60 p-6 shadow-sm">
          <p className="text-sm font-semibold text-foreground">Revenue trend (30 days)</p>
          <p className="mt-1 text-xs text-muted-foreground">Paid, processing, shipped, delivered orders.</p>
          {revenueSeries.length > 0 ? (
            <div className="mt-4 flex h-24 items-end gap-1">
              {revenueSeries.map((point) => (
                <div
                  key={point.date}
                  className="flex-1 rounded-md bg-primary/70"
                  style={{ height: `${Math.max(4, (point.revenue / maxRevenue) * 100)}%` }}
                  title={`${point.date}: ${formatMoney(point.revenue, revenueCurrency)}`}
                />
              ))}
            </div>
          ) : (
            <p className="mt-4 text-xs text-muted-foreground">No revenue data yet.</p>
          )}
        </div>

        <div className="rounded-2xl border border-border/30 bg-card/60 p-6 shadow-sm">
          <p className="text-sm font-semibold text-foreground">Order status distribution</p>
          <p className="mt-1 text-xs text-muted-foreground">Based on the current orders table.</p>

          <div className="mt-4 space-y-3">
            {rows.map((row) => {
              const pct = percent(row.value, total)
              return (
                <div key={row.label} className="grid gap-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-foreground">{row.label}</span>
                    <span className="text-muted-foreground">
                      {row.value} - {pct}%
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div className={`h-full ${row.color}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border/30 bg-card/60 p-6 shadow-sm">
          <p className="text-sm font-semibold text-foreground">Top viewed products</p>
          <p className="mt-1 text-xs text-muted-foreground">Most visited product pages.</p>
          {topViewed.length > 0 ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {topViewed.slice(0, 6).map((product) => (
                <div key={product.slug} className="rounded-xl border border-border/40 bg-background/70 p-3">
                  <div className="relative h-24 w-full overflow-hidden rounded-lg bg-muted">
                    {product.image ? (
                      <Image src={product.image} alt={product.name} fill sizes="220px" className="object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                        No image
                      </div>
                    )}
                  </div>
                  <p className="mt-3 line-clamp-2 text-sm font-semibold text-foreground">{product.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Views <span className="font-semibold text-foreground">{formatCount(product.views)}</span>
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-xs text-muted-foreground">No product view data yet.</p>
          )}
        </div>

        <div className="rounded-2xl border border-border/30 bg-card/60 p-6 shadow-sm">
          <p className="text-sm font-semibold text-foreground">Top selling products</p>
          <p className="mt-1 text-xs text-muted-foreground">Based on last 30 days of orders.</p>
          {topSelling.length > 0 ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {topSelling.slice(0, 6).map((product) => (
                <div key={product.slug} className="rounded-xl border border-border/40 bg-background/70 p-3">
                  <div className="relative h-24 w-full overflow-hidden rounded-lg bg-muted">
                    {product.image ? (
                      <Image src={product.image} alt={product.name} fill sizes="220px" className="object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                        No image
                      </div>
                    )}
                  </div>
                  <p className="mt-3 line-clamp-2 text-sm font-semibold text-foreground">{product.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Sold <span className="font-semibold text-foreground">{formatCount(product.quantity)}</span>
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-xs text-muted-foreground">No sales data yet.</p>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border/30 bg-card/60 p-6 shadow-sm">
          <p className="text-sm font-semibold text-foreground">Traffic sources</p>
          <p className="mt-1 text-xs text-muted-foreground">Organic, Ads, Social, Direct.</p>
          {trafficSources.length > 0 ? (
            <div className="mt-4 space-y-2 text-sm text-muted-foreground">
              {trafficSources.slice(0, 4).map((source) => (
                <div key={source.source} className="flex items-center justify-between">
                  <span>{source.source}</span>
                  <span className="font-semibold text-foreground">{formatCount(source.sessions)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-xs text-muted-foreground">No traffic source data yet.</p>
          )}
        </div>

        <div className="rounded-2xl border border-border/30 bg-card/60 p-6 shadow-sm">
          <p className="text-sm font-semibold text-foreground">Device + location</p>
          <p className="mt-1 text-xs text-muted-foreground">Mobile/Desktop, Country/City.</p>
          <div className="mt-4 space-y-2 text-sm text-muted-foreground">
            {deviceSplit.length > 0 ? (
              <div className="flex items-center justify-between">
                <span>{deviceSplit.map((item) => item.device).join(" / ")}</span>
                <span className="font-semibold text-foreground">
                  {deviceSplit.map((item) => formatCount(item.sessions)).join(" / ")}
                </span>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <span>Mobile vs Desktop</span>
                <span className="font-semibold text-foreground">-</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span>Top Country</span>
              <span className="font-semibold text-foreground">
                {analytics?.topCountry ? `${analytics.topCountry.name} (${formatCount(analytics.topCountry.sessions)})` : "-"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Top City</span>
              <span className="font-semibold text-foreground">
                {analytics?.topCity ? `${analytics.topCity.name} (${formatCount(analytics.topCity.sessions)})` : "-"}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border/30 bg-card/60 p-6 shadow-sm">
          <p className="text-sm font-semibold text-foreground">Engagement</p>
          <p className="mt-1 text-xs text-muted-foreground">New vs returning, bounce, time on site.</p>
          <div className="mt-4 space-y-2 text-sm text-muted-foreground">
            <div className="flex items-center justify-between">
              <span>New vs Returning</span>
              <span className="font-semibold text-foreground">
                {analytics ? `${formatCount(analytics.newReturning.new)} / ${formatCount(analytics.newReturning.returning)}` : "-"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Bounce / Engagement rate</span>
              <span className="font-semibold text-foreground">
                {analytics
                  ? `${formatPercentValue(analytics.bounceRate)} / ${formatPercentValue(analytics.engagementRate)}`
                  : "-"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Avg time on site</span>
              <span className="font-semibold text-foreground">
                {formatDuration(analytics?.avgTimeSeconds ?? null)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Top landing pages</span>
              <span className="font-semibold text-foreground">
                {topLandingPages.length > 0
                  ? `${topLandingPages[0].path} (${formatCount(topLandingPages[0].sessions)})`
                  : "-"}
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border/30 bg-card/60 p-6 shadow-sm">
          <p className="text-sm font-semibold text-foreground">Operations</p>
          <p className="mt-1 text-xs text-muted-foreground">Checkout drop-off and repeat customers.</p>
          <div className="mt-4 space-y-2 text-sm text-muted-foreground">
            <div className="flex items-center justify-between">
              <span>Abandoned checkout rate</span>
              <span className="font-semibold text-foreground">
                {formatPercentValue(analytics?.abandonedCheckoutRate ?? null)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Repeat purchase rate</span>
              <span className="font-semibold text-foreground">
                {formatPercentValue(analytics?.repeatPurchaseRate ?? null)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Refund / Cancel rate</span>
              <span className="font-semibold text-foreground">{formatPercentValue(cancelRate)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
