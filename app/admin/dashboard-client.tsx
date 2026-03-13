"use client"

import Image from "next/image"
import Link from "next/link"
import { subDays, format, parseISO } from "date-fns"
import { Activity, Package2, ShoppingBag, TrendingDown, TrendingUp, Truck, Users2 } from "lucide-react"
import { useEffect, useMemo, useState, type ReactNode } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { ALL_CATALOG_PRODUCTS } from "@/lib/catalog-index"
import { listCoupons } from "@/lib/coupon"
import { getSupabaseBrowserClient } from "@/lib/supabase-browser"
import { cn } from "@/lib/utils"

type StatsResponse = {
  revenue: { amount: number; currency: string; changePct: number | null } | null
  window30d: {
    orders: { total: number; changePct: number | null }
    pendingDelivery: { total: number }
  }
  salesSeries: Array<{ date: string; revenue: number }>
  topProducts: Array<{ slug: string; name: string; image: string | null; quantity: number }>
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
  recentOrders: Array<{
    orderId: string
    status: string
    amount: number
    currency: string
    customerEmail: string
    createdAt: string | null
  }>
  error?: string
}

function formatMoney(amount: number, currency: string) {
  const safeAmount = Number.isFinite(amount) ? amount : 0
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(safeAmount)
  } catch {
    return `${currency} ${safeAmount.toFixed(2)}`
  }
}

function formatDate(value: string | null) {
  if (!value) return "-"
  try {
    return format(parseISO(value), "MMM d, yyyy")
  } catch {
    return value
  }
}

function formatCompactNumber(value: number) {
  const safeValue = Number.isFinite(value) ? value : 0
  try {
    return new Intl.NumberFormat(undefined, { notation: "compact" }).format(safeValue)
  } catch {
    return String(safeValue)
  }
}

function formatPercent(value: number | null) {
  if (value === null || !Number.isFinite(value)) return null
  const rounded = Math.round(value * 10) / 10
  const sign = rounded > 0 ? "+" : ""
  return `${sign}${rounded}%`
}

function statusBadgeClass(status: string) {
  const key = status.trim().toUpperCase()
  const base = "border-0 font-medium"
  if (key === "PENDING") return `${base} bg-orange-50 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300`
  if (["PAID", "PROCESSING"].includes(key)) return `${base} bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300`
  if (key === "SHIPPED") return `${base} bg-purple-50 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300`
  if (key === "DELIVERED") return `${base} bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300`
  if (key === "CANCELLED") return `${base} bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300`
  return `${base} bg-muted text-foreground dark:bg-muted/40`
}

function buildLinePath(values: number[], width: number, height: number) {
  if (values.length === 0) return ""
  const max = Math.max(...values, 1)
  const min = Math.min(...values, 0)
  const range = Math.max(max - min, 1)
  const points = values.map((value, idx) => {
    const x = (idx / Math.max(values.length - 1, 1)) * width
    const y = height - ((value - min) / range) * height
    return { x, y }
  })

  return points.map((point, idx) => `${idx === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(" ")
}

function buildAreaPath(values: number[], width: number, height: number) {
  const line = buildLinePath(values, width, height)
  if (!line) return ""
  return `${line} L ${width.toFixed(2)} ${height.toFixed(2)} L 0 ${height.toFixed(2)} Z`
}

function StatCard(props: {
  title: string
  subtitle: string
  value: string
  changeLabel?: string | null
  changeTone?: "up" | "down" | "flat"
  icon: ReactNode
}) {
  const tone = props.changeTone ?? "flat"
  return (
    <div className="rounded-2xl border border-border/30 bg-card/60 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{props.title}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">{props.subtitle}</p>
          <p className="mt-3 truncate text-2xl font-semibold text-foreground">{props.value}</p>
        </div>
        <div className="grid h-10 w-10 place-items-center rounded-2xl border border-border/30 bg-background/40 text-muted-foreground">
          {props.icon}
        </div>
      </div>

      {props.changeLabel ? (
        <div
          className={cn(
            "mt-3 inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold",
            tone === "up" && "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
            tone === "down" && "bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300",
            tone === "flat" && "bg-muted text-foreground dark:bg-muted/40"
          )}
        >
          {tone === "up" ? <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" /> : null}
          {tone === "down" ? <TrendingDown className="h-3.5 w-3.5" aria-hidden="true" /> : null}
          <span>{props.changeLabel}</span>
        </div>
      ) : null}
    </div>
  )
}

export function AdminDashboardClient() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), [])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<StatsResponse | null>(null)
  const [range, setRange] = useState<"7d" | "30d">("30d")

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
        setError(payload.error || "Failed to load stats.")
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
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-80 w-full lg:col-span-2" />
          <Skeleton className="h-80 w-full" />
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-72 w-full lg:col-span-2" />
          <Skeleton className="h-72 w-full" />
        </div>
      </div>
    )
  }

  if (error) {
    return <div className="rounded-2xl border border-border/30 bg-card/60 p-6 text-sm text-destructive shadow-sm">{error}</div>
  }

  const stats = data
  if (!stats) return null

  const coupons = listCoupons().slice(0, 3)
  const revenue = stats.revenue
  const revenueChangeLabel = formatPercent(revenue?.changePct ?? null)
  const revenueTone =
    revenue?.changePct && revenue.changePct !== 0 ? (revenue.changePct > 0 ? "up" : "down") : "flat"

  const ordersChangeLabel = formatPercent(stats.window30d.orders.changePct)
  const ordersTone =
    stats.window30d.orders.changePct && stats.window30d.orders.changePct !== 0
      ? stats.window30d.orders.changePct > 0
        ? "up"
        : "down"
      : "flat"

  const series = (() => {
    if (stats.salesSeries.length === 0) return []
    if (range === "7d") {
      const threshold = subDays(new Date(), 6).toISOString().slice(0, 10)
      return stats.salesSeries.filter((point) => point.date >= threshold)
    }
    return stats.salesSeries
  })()

  const seriesValues = series.map((point) => point.revenue)
  const chartWidth = 520
  const chartHeight = 140
  const linePath = buildLinePath(seriesValues, chartWidth, chartHeight)
  const areaPath = buildAreaPath(seriesValues, chartWidth, chartHeight)

  const income = revenue?.amount ?? 0
  const expenses = Number((income * 0.35).toFixed(2))
  const balance = Number((income - expenses).toFixed(2))

  const monthlyTarget = 14500
  const dailyTarget = 650
  const monthlyProgress = Math.max(0, Math.min(1, monthlyTarget > 0 ? income / monthlyTarget : 0))
  const donutAngle = Math.round(monthlyProgress * 360)
  const donutStyle = {
    background: `conic-gradient(hsl(var(--accent)) 0deg ${donutAngle}deg, rgba(148, 163, 184, 0.25) ${donutAngle}deg 360deg)`,
  } as const

  const topProducts = stats.topProducts.length
    ? stats.topProducts
    : ALL_CATALOG_PRODUCTS.slice(0, 8).map((product) => ({
        slug: product.slug,
        name: product.name,
        image: product.image ?? null,
        quantity: 0,
      }))

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total Revenue"
          subtitle="Last 30 days"
          value={revenue ? formatMoney(revenue.amount, revenue.currency) : "-"}
          changeLabel={revenueChangeLabel ? `${revenueChangeLabel} vs prev 30d` : null}
          changeTone={revenueTone}
          icon={<Activity className="h-5 w-5" aria-hidden="true" />}
        />
        <StatCard
          title="Total Orders"
          subtitle="Last 30 days"
          value={formatCompactNumber(stats.window30d.orders.total)}
          changeLabel={ordersChangeLabel ? `${ordersChangeLabel} vs prev 30d` : null}
          changeTone={ordersTone}
          icon={<ShoppingBag className="h-5 w-5" aria-hidden="true" />}
        />
        <StatCard
          title="Total Customers"
          subtitle="All time"
          value={formatCompactNumber(stats.customers.total)}
          icon={<Users2 className="h-5 w-5" aria-hidden="true" />}
        />
        <StatCard
          title="Pending Delivery"
          subtitle="Last 30 days"
          value={formatCompactNumber(stats.window30d.pendingDelivery.total)}
          icon={<Truck className="h-5 w-5" aria-hidden="true" />}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-border/30 bg-card/60 p-6 shadow-sm lg:col-span-2">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">Sales Analytic</p>
              <p className="mt-1 text-xs text-muted-foreground">Revenue trend based on paid orders.</p>
            </div>
            <div className="w-fit">
              <Select value={range} onValueChange={(value) => setRange(value as "7d" | "30d")}>
                <SelectTrigger className="h-8 w-max justify-start gap-2 px-3 text-xs">
                  <SelectValue placeholder="Last 30 days" />
                </SelectTrigger>
                <SelectContent className="w-max min-w-[0]" position="item-aligned">
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-border/30 bg-background/30 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Income</p>
              <p className="mt-2 text-lg font-semibold text-foreground">{formatMoney(income, "USD")}</p>
            </div>
            <div className="rounded-xl border border-border/30 bg-background/30 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Expenses</p>
              <p className="mt-2 text-lg font-semibold text-foreground">{formatMoney(expenses, "USD")}</p>
            </div>
            <div className="rounded-xl border border-border/30 bg-background/30 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Balance</p>
              <p className="mt-2 text-lg font-semibold text-foreground">{formatMoney(balance, "USD")}</p>
            </div>
          </div>

          <div className="mt-4 overflow-hidden rounded-xl border border-border/30 bg-background/40 p-4">
            {series.length === 0 ? (
              <div className="text-sm text-muted-foreground">Sales analytics is not available yet.</div>
            ) : (
              <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="h-40 w-full">
                <defs>
                  <linearGradient id="salesFill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity="0.02" />
                  </linearGradient>
                </defs>
                <path d={areaPath} fill="url(#salesFill)" />
                <path d={linePath} fill="none" stroke="hsl(var(--accent))" strokeWidth="3" strokeLinecap="round" />
              </svg>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-border/30 bg-card/60 p-6 shadow-sm">
          <p className="text-sm font-semibold text-foreground">Sales Target</p>
          <p className="mt-1 text-xs text-muted-foreground">Progress vs monthly target.</p>

          <div className="mt-6 grid place-items-center">
            <div
              className="relative grid h-44 w-44 place-items-center rounded-full p-3"
              style={donutStyle}
              aria-label="Monthly sales target progress"
            >
              <div className="grid h-full w-full place-items-center rounded-full bg-background/90">
                <div className="text-center">
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Progress</p>
                  <p className="mt-2 text-3xl font-semibold text-foreground">{Math.round(monthlyProgress * 100)}%</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 space-y-2">
            <div className="flex items-center justify-between rounded-xl border border-border/30 bg-background/30 p-3">
              <p className="text-sm font-medium text-foreground">Daily Target</p>
              <p className="text-sm font-semibold text-foreground">{formatCompactNumber(dailyTarget)}</p>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border/30 bg-background/30 p-3">
              <p className="text-sm font-medium text-foreground">Monthly Target</p>
              <p className="text-sm font-semibold text-foreground">{formatCompactNumber(monthlyTarget)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-border/30 bg-card/60 p-6 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-foreground">Top Selling Products</p>
              <p className="mt-1 text-xs text-muted-foreground">Based on the last 30 days of paid orders.</p>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/products">View products</Link>
            </Button>
          </div>

          <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
            {topProducts.map((product) => (
              <div
                key={product.slug}
                className="min-w-[180px] flex-1 rounded-2xl border border-border/30 bg-background/40 p-3 shadow-sm"
              >
                <div className="relative h-24 w-full overflow-hidden rounded-xl bg-background/60">
                  {product.image ? (
                    <Image src={product.image} alt={product.name} fill sizes="200px" className="object-cover" />
                  ) : (
                    <div className="grid h-full w-full place-items-center text-muted-foreground">
                      <Package2 className="h-6 w-6" aria-hidden="true" />
                    </div>
                  )}
                </div>
                <p className="mt-3 line-clamp-2 text-sm font-semibold text-foreground">{product.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Sold <span className="font-semibold text-foreground">{formatCompactNumber(product.quantity)}</span>
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border/30 bg-card/60 p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-foreground">Current Offer</p>
              <p className="mt-1 text-xs text-muted-foreground">Active coupon codes.</p>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/discounts">View discounts</Link>
            </Button>
          </div>

          <div className="mt-4 space-y-3">
            {coupons.length === 0 ? (
              <div className="rounded-xl border border-border/30 bg-background/40 p-4 text-sm text-muted-foreground">
                No active offers yet.
              </div>
            ) : (
              coupons.map((coupon) => (
                <div key={coupon.code} className="rounded-2xl border border-border/30 bg-background/40 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{coupon.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{coupon.description}</p>
                    </div>
                    <Badge className="border-0 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                      {Math.round(coupon.discountRate * 100)}% OFF
                    </Badge>
                  </div>
                  <div className="mt-3 text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">{coupon.code}</span> • Min subtotal ${coupon.minimumSubtotal}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border/30 bg-card/60 p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">Recent Orders</p>
            <p className="mt-1 text-xs text-muted-foreground">Latest 5 orders.</p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/orders">Open orders</Link>
          </Button>
        </div>

        <div className="mt-4 overflow-hidden rounded-xl border border-border/30">
          {stats.recentOrders.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">No recent orders.</div>
          ) : (
            <div className="divide-y divide-border/30">
              {stats.recentOrders.map((order) => (
                <div
                  key={order.orderId}
                  className="flex flex-col gap-2 bg-background/40 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-semibold text-foreground">Order #{order.orderId}</p>
                      <Badge className={statusBadgeClass(order.status)}>{order.status}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {order.customerEmail || "-"} • {formatDate(order.createdAt)}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-foreground">{formatMoney(order.amount, order.currency)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
