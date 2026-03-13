"use client"

import { useEffect, useMemo, useState } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { getSupabaseBrowserClient } from "@/lib/supabase-browser"

type StatsResponse = {
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
  error?: string
}

function percent(part: number, total: number) {
  if (!total) return 0
  return Math.round((part / total) * 100)
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

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-border/30 bg-card/60 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Total orders</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{total}</p>
        </div>
        <div className="rounded-2xl border border-border/30 bg-card/60 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Delivered</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">
            {data.orders.delivered} <span className="text-sm text-muted-foreground">({percent(data.orders.delivered, total)}%)</span>
          </p>
        </div>
        <div className="rounded-2xl border border-border/30 bg-card/60 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Shipped</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">
            {data.orders.shipped} <span className="text-sm text-muted-foreground">({percent(data.orders.shipped, total)}%)</span>
          </p>
        </div>
        <div className="rounded-2xl border border-border/30 bg-card/60 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Cancelled</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">
            {data.orders.cancelled} <span className="text-sm text-muted-foreground">({percent(data.orders.cancelled, total)}%)</span>
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-border/30 bg-card/60 p-6 shadow-sm">
        <p className="text-sm font-semibold text-foreground">Order status distribution</p>
        <p className="mt-1 text-xs text-muted-foreground">Based on the current `orders` table.</p>

        <div className="mt-4 space-y-3">
          {rows.map((row) => {
            const pct = percent(row.value, total)
            return (
              <div key={row.label} className="grid gap-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-foreground">{row.label}</span>
                  <span className="text-muted-foreground">
                    {row.value} • {pct}%
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
  )
}

