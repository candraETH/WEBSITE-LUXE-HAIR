"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { format, parseISO } from "date-fns"
import { Package } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { getSupabaseBrowserClient } from "@/lib/supabase-browser"

type OrderSummary = {
  orderId: string
  status: string
  total: number
  currency: string
  createdAt: string | null
  products: string[]
  phoneNumber: string
}

type UiState =
  | { status: "loading" }
  | { status: "signed_out" }
  | { status: "error"; message: string }
  | { status: "ready"; orders: OrderSummary[] }

type StatusKey = "pending" | "processing" | "shipped" | "delivered" | "cancelled" | "other"

const PENDING_EXPIRES_AFTER_MS = 6 * 60 * 60 * 1000

function formatDate(value: string | null): string {
  if (!value) return "-"
  try {
    return format(parseISO(value), "MMM d, yyyy")
  } catch {
    return value
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

function normalizeStatus(status: string): StatusKey {
  const raw = status.trim().toLowerCase()
  const normalized = raw === "canceled" ? "cancelled" : raw

  if (normalized === "pending") return "pending"
  if (["processing", "paid"].includes(normalized)) return "processing"
  if (normalized === "shipped") return "shipped"
  if (["delivered", "completed"].includes(normalized)) return "delivered"
  if (["cancelled", "failed", "refunded"].includes(normalized)) return "cancelled"
  return "other"
}

function statusLabel(status: string): string {
  const key = normalizeStatus(status)
  if (key === "other") return status.trim() || "Unknown"
  return key.charAt(0).toUpperCase() + key.slice(1)
}

function statusBadgeClass(key: StatusKey): string {
  const base = "border-0 font-medium"
  switch (key) {
    case "pending":
      return `${base} bg-orange-50 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300`
    case "processing":
      return `${base} bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300`
    case "shipped":
      return `${base} bg-purple-50 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300`
    case "delivered":
      return `${base} bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300`
    case "cancelled":
      return `${base} bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300`
    default:
      return `${base} bg-muted text-foreground dark:bg-muted/40`
  }
}

function isExpired(createdAt: string | null) {
  if (!createdAt) return false
  const createdMs = Date.parse(createdAt)
  if (!Number.isFinite(createdMs)) return false
  return Date.now() - createdMs > PENDING_EXPIRES_AFTER_MS
}

export function OrdersClient() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), [])
  const [state, setState] = useState<UiState>({ status: "loading" })
  const [filter, setFilter] = useState<"all" | StatusKey>("all")
  const [resumingOrderId, setResumingOrderId] = useState<string | null>(null)
  const [resumeError, setResumeError] = useState("")
  const [invoiceLoadingByOrder, setInvoiceLoadingByOrder] = useState<Record<string, boolean>>({})
  const [invoiceSuccessByOrder, setInvoiceSuccessByOrder] = useState<Record<string, string>>({})
  const [invoiceErrorByOrder, setInvoiceErrorByOrder] = useState<Record<string, string>>({})

  useEffect(() => {
    let cancelled = false
    if (!supabase) {
      setState({ status: "signed_out" })
      return
    }
    const client = supabase

    async function load() {
      const { data: sessionData } = await client.auth.getSession()
      const token = sessionData.session?.access_token
      if (!token) {
        if (!cancelled) setState({ status: "signed_out" })
        return
      }

      const response = await fetch("/api/account/orders", {
        headers: { authorization: `Bearer ${token}` },
      })

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string }
        if (!cancelled) {
          setState({ status: "error", message: payload.error || "Failed to load orders." })
        }
        return
      }

      const payload = (await response.json().catch(() => ({}))) as { orders?: OrderSummary[] }
      if (!cancelled) {
        setState({ status: "ready", orders: payload.orders ?? [] })
      }
    }

    void load()
    const { data: subscription } = client.auth.onAuthStateChange(() => void load())
    return () => {
      cancelled = true
      subscription.subscription.unsubscribe()
    }
  }, [supabase])

  async function handleResumePayment(orderId: string) {
    if (!supabase) return
    setResumeError("")
    setResumingOrderId(orderId)

    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      if (!token) {
        setResumeError("Your session expired. Please sign in again.")
        return
      }

      const response = await fetch("/api/account/orders/resume", {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ orderId }),
      })

      const payload = (await response.json().catch(() => ({}))) as {
        error?: string
        action?: "APPROVE" | "FINALIZE" | "VIEW"
        approveUrl?: string
        finalizeUrl?: string
        viewUrl?: string
      }

      if (!response.ok) {
        setResumeError(payload.error || "Unable to resume payment.")
        return
      }

      const redirectUrl = payload.approveUrl || payload.finalizeUrl || payload.viewUrl
      if (!redirectUrl) {
        setResumeError("Unable to resume payment.")
        return
      }

      window.location.href = redirectUrl
    } finally {
      setResumingOrderId(null)
    }
  }

  async function handleSendInvoice(orderId: string, phoneNumber: string) {
    const phone = phoneNumber.trim()
    setInvoiceErrorByOrder((prev) => ({ ...prev, [orderId]: "" }))
    setInvoiceSuccessByOrder((prev) => ({ ...prev, [orderId]: "" }))

    if (!phone) {
      setInvoiceErrorByOrder((prev) => ({ ...prev, [orderId]: "Phone number is required to send an invoice." }))
      return
    }

    setInvoiceLoadingByOrder((prev) => ({ ...prev, [orderId]: true }))

    try {
      const response = await fetch("/api/order-tracking/send-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, phoneNumber: phone }),
      })
      const data = (await response.json().catch(() => ({}))) as { error?: string; message?: string; destination?: string }
      if (!response.ok) {
        throw new Error(data.error || "Unable to send invoice.")
      }
      const message = data.destination ? `${data.message || "Invoice sent."} (${data.destination})` : data.message || "Invoice sent."
      setInvoiceSuccessByOrder((prev) => ({ ...prev, [orderId]: message }))
    } catch (error) {
      setInvoiceErrorByOrder((prev) => ({
        ...prev,
        [orderId]: error instanceof Error ? error.message : "Unable to send invoice.",
      }))
    } finally {
      setInvoiceLoadingByOrder((prev) => ({ ...prev, [orderId]: false }))
    }
  }

  if (state.status === "loading") {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-2">
            <Skeleton className="h-7 w-40" />
            <Skeleton className="h-4 w-56" />
          </div>
          <Skeleton className="h-10 w-44" />
        </div>

        <div className="grid gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="rounded-2xl border border-border/30 bg-card/60 p-4 shadow-sm">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="mt-2 h-7 w-16" />
            </div>
          ))}
        </div>

        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div key={idx} className="rounded-2xl border border-border/30 bg-card/60 p-5 shadow-sm">
              <div className="space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-40" />
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
                <div className="space-y-2">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-4 w-full max-w-[360px]" />
                  <Skeleton className="h-4 w-full max-w-[280px]" />
                </div>
                <div className="rounded-xl border border-border/30 bg-background/30 p-4 sm:text-right">
                  <Skeleton className="h-3 w-16 sm:ml-auto" />
                  <Skeleton className="mt-2 h-6 w-24 sm:ml-auto" />
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-2 sm:justify-end">
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (state.status === "signed_out") {
    return (
      <div className="rounded-xl border border-border/30 bg-background/40 p-4 text-sm text-muted-foreground">
        You are not signed in.{" "}
        <Link href="/login" className="font-medium text-foreground underline underline-offset-4">
          Sign in
        </Link>
      </div>
    )
  }

  if (state.status === "error") {
    return <div className="rounded-xl border border-border/30 bg-background/40 p-4 text-sm text-destructive">{state.message}</div>
  }

  const orders = state.orders

  const stats = (() => {
    const counts: Record<StatusKey, number> = {
      pending: 0,
      processing: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0,
      other: 0,
    }

    for (const order of orders) {
      counts[normalizeStatus(order.status)] += 1
    }

    return {
      total: orders.length,
      processing: counts.processing,
      delivered: counts.delivered,
      cancelled: counts.cancelled,
    }
  })()

  const filteredOrders = filter === "all" ? orders : orders.filter((order) => normalizeStatus(order.status) === filter)

  const filterOptions: Array<{ key: "all" | StatusKey; label: string }> = [
    { key: "all", label: "All Orders" },
    { key: "pending", label: "Pending" },
    { key: "processing", label: "Processing" },
    { key: "shipped", label: "Shipped" },
    { key: "delivered", label: "Delivered" },
    { key: "cancelled", label: "Cancelled" },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-serif text-2xl font-bold text-foreground">Order list</h2>
          <p className="text-sm text-muted-foreground">Your recent orders.</p>
        </div>
      </div>

      {resumeError ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{resumeError}</div>
      ) : null}

      <div className="rounded-2xl border border-border/30 bg-card/60 p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">Orders Summary</p>
          </div>
          <div className="w-fit">
            <Select value={filter} onValueChange={(value) => setFilter(value as "all" | StatusKey)}>
              <SelectTrigger className="h-8 w-max justify-start gap-2 px-3 text-xs">
                <SelectValue placeholder="All Orders" />
              </SelectTrigger>
              <SelectContent position="item-aligned" className="min-w-[0] w-max">
                {filterOptions.map((option) => (
                  <SelectItem key={option.key} value={option.key}>
                     {option.label}
                   </SelectItem>
                 ))}
               </SelectContent>
             </Select>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="rounded-xl border border-border/30 bg-background/30 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Total orders</p>
            <p className="mt-1 text-xl font-semibold leading-none text-foreground">{stats.total}</p>
          </div>
          <div className="rounded-xl border border-border/30 bg-background/30 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Processing</p>
            <p className="mt-1 text-xl font-semibold leading-none text-foreground">{stats.processing}</p>
          </div>
          <div className="rounded-xl border border-border/30 bg-background/30 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Delivered</p>
            <p className="mt-1 text-xl font-semibold leading-none text-foreground">{stats.delivered}</p>
          </div>
          <div className="rounded-xl border border-border/30 bg-background/30 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Cancelled</p>
            <p className="mt-1 text-xl font-semibold leading-none text-foreground">{stats.cancelled}</p>
          </div>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="rounded-2xl border border-border/30 bg-card/60 p-8 text-center shadow-sm">
          <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-background/40">
            <Package className="h-7 w-7 text-muted-foreground" aria-hidden="true" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">No Orders Yet</h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            You haven&apos;t placed any orders yet. Start exploring our premium hair collections.
          </p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="rounded-xl border border-border/30 bg-background/40 p-4 text-sm text-muted-foreground">No orders match this filter.</div>
      ) : (
        <div className="space-y-3">
          {filteredOrders.map((order) => {
            const key = normalizeStatus(order.status)
            const products = order.products.filter(Boolean)
            const visibleProducts = products.slice(0, 3)
            const remaining = Math.max(0, products.length - visibleProducts.length)
            const canContinuePayment = key === "pending" && !isExpired(order.createdAt)
            const isResuming = resumingOrderId === order.orderId
            const invoiceLoading = Boolean(invoiceLoadingByOrder[order.orderId])
            const invoiceError = invoiceErrorByOrder[order.orderId]
            const invoiceSuccess = invoiceSuccessByOrder[order.orderId]

            return (
              <div key={order.orderId} className="rounded-2xl border border-border/30 bg-card/60 p-5 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-foreground">Order #{order.orderId}</p>
                      <Badge className={statusBadgeClass(key)}>{statusLabel(order.status)}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">Placed on {formatDate(order.createdAt)}</p>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Products</p>
                    {visibleProducts.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No products found.</p>
                    ) : (
                      <ul className="space-y-1 text-sm text-foreground">
                        {visibleProducts.map((name, idx) => (
                          <li key={`${order.orderId}-${idx}`} className="break-words">
                            {name}
                          </li>
                        ))}
                        {remaining > 0 && <li className="text-sm text-muted-foreground">+ {remaining} more item(s)</li>}
                      </ul>
                    )}
                  </div>

                  <div className="rounded-xl border border-border/30 bg-background/30 p-4 sm:text-right">
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Total</p>
                    <p className="mt-1 text-lg font-semibold text-foreground">{formatMoney(order.total, order.currency)}</p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:justify-end">
                  <Button asChild size="sm" variant="outline" className="w-full">
                    <Link href={`/track-order?orderId=${encodeURIComponent(order.orderId)}`}>Track Order</Link>
                  </Button>
                  <Button asChild size="sm" variant="outline" className="w-full">
                    <Link href={`/account/orders/${encodeURIComponent(order.orderId)}`}>View Order</Link>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    disabled={!order.phoneNumber || invoiceLoading}
                    onClick={() => void handleSendInvoice(order.orderId, order.phoneNumber)}
                  >
                    {invoiceLoading ? "Sending..." : "Send Invoice"}
                  </Button>
                </div>

                {canContinuePayment ? (
                  <div className="mt-3">
                    <Button
                      size="sm"
                      className="w-full sm:w-auto"
                      disabled={isResuming}
                      onClick={() => void handleResumePayment(order.orderId)}
                    >
                      {isResuming ? "Opening PayPal..." : "Continue Payment"}
                    </Button>
                  </div>
                ) : null}

                {invoiceSuccess ? (
                  <p className="mt-2 text-xs font-medium text-[#2E7D32]">{invoiceSuccess}</p>
                ) : null}
                {invoiceError ? (
                  <p className="mt-2 text-xs font-medium text-red-500">{invoiceError}</p>
                ) : null}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
