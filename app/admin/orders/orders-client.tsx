"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { format, parseISO } from "date-fns"
import { MoreHorizontal } from "lucide-react"
import { TierBadge } from "@/components/loyalty/tier-badge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getSupabaseBrowserClient } from "@/lib/supabase-browser"
import type { LoyaltyTierKey } from "@/lib/loyalty-tier"

type AdminOrder = {
  orderId: string
  status: string
  amount: number
  currency: string
  customerName: string
  customerEmail: string
  customerTierKey: LoyaltyTierKey
  customerTierName: string
  trackingNumber: string
  shippingCarrier: string
  createdAt: string | null
  updatedAt: string | null
}

type AdminOrderDetail = {
  order: AdminOrder
  customer: {
    name: string
    email: string
    phone: string
    addressLine: string
    city: string
    province: string
    postalCode: string
    country: string
  } | null
  summary: {
    itemCount: number
    lineItemsSubtotal: number
    discount: number
    subtotal: number
    tax: number
    shipping: number
    total: number
  } | null
  items: Array<{
    name: string
    category: string
    length: number | null
    quantity: number
    unitPrice: number
    lineTotal: number
  }>
  cartText: string
}

type UiState =
  | { status: "loading" }
  | { status: "signed_out" }
  | { status: "error"; message: string }
  | { status: "ready"; orders: AdminOrder[] }

type OrderStatsState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | {
      status: "ready"
      windowDays: number
      totalOrders: number
      newOrders: number
      completedOrders: number
      cancelledOrders: number
    }

const STATUS_OPTIONS = ["ALL", "PENDING", "PAID", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"] as const
type StatusOption = (typeof STATUS_OPTIONS)[number]

function formatCount(value: number) {
  const safe = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0
  try {
    return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(safe)
  } catch {
    return String(safe)
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

function formatDate(value: string | null) {
  if (!value) return "-"
  try {
    return format(parseISO(value), "MMM d, yyyy")
  } catch {
    return value
  }
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

export function AdminOrdersClient({ initialQuery, initialStatus }: { initialQuery: string; initialStatus: string }) {
  const supabase = useMemo(() => getSupabaseBrowserClient(), [])
  const [state, setState] = useState<UiState>({ status: "loading" })
  const [stats, setStats] = useState<OrderStatsState>({ status: "loading" })
  const [status, setStatus] = useState<StatusOption>(
    (STATUS_OPTIONS.includes(initialStatus.toUpperCase() as StatusOption)
      ? (initialStatus.toUpperCase() as StatusOption)
      : "ALL") as StatusOption
  )

  const [manageOpen, setManageOpen] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [activeOrder, setActiveOrder] = useState<AdminOrder | null>(null)

  const [saveLoading, setSaveLoading] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [editStatus, setEditStatus] = useState<Exclude<StatusOption, "ALL">>("PROCESSING")
  const [editTrackingNumber, setEditTrackingNumber] = useState("")
  const [editCarrier, setEditCarrier] = useState("")

  const [detailsLoading, setDetailsLoading] = useState(false)
  const [detailsError, setDetailsError] = useState<string | null>(null)
  const [details, setDetails] = useState<AdminOrderDetail | null>(null)
  const [copyStatus, setCopyStatus] = useState<string | null>(null)

  useEffect(() => {
    const normalized = initialStatus.trim().toUpperCase()
    const next = STATUS_OPTIONS.includes(normalized as StatusOption) ? (normalized as StatusOption) : "ALL"
    setStatus(next)
  }, [initialStatus])

  const loadStats = async () => {
    if (!supabase) {
      setStats({ status: "error", message: "Not signed in." })
      return
    }

    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData.session?.access_token ?? ""
    if (!token) {
      setStats({ status: "error", message: "Not signed in." })
      return
    }

    setStats({ status: "loading" })
    const response = await fetch("/api/admin/orders/stats", {
      headers: { authorization: `Bearer ${token}` },
    })

    const payload = (await response.json().catch(() => ({}))) as {
      error?: string
      windowDays?: number
      totalOrders?: number
      newOrders?: number
      completedOrders?: number
      cancelledOrders?: number
    }

    if (!response.ok) {
      setStats({ status: "error", message: payload.error || "Failed to load order stats." })
      return
    }

    setStats({
      status: "ready",
      windowDays: typeof payload.windowDays === "number" ? payload.windowDays : 365,
      totalOrders: typeof payload.totalOrders === "number" ? payload.totalOrders : Number(payload.totalOrders ?? 0),
      newOrders: typeof payload.newOrders === "number" ? payload.newOrders : Number(payload.newOrders ?? 0),
      completedOrders:
        typeof payload.completedOrders === "number" ? payload.completedOrders : Number(payload.completedOrders ?? 0),
      cancelledOrders:
        typeof payload.cancelledOrders === "number" ? payload.cancelledOrders : Number(payload.cancelledOrders ?? 0),
    })
  }

  const load = async () => {
    if (!supabase) {
      setState({ status: "signed_out" })
      return
    }

    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData.session?.access_token ?? ""
    if (!token) {
      setState({ status: "signed_out" })
      return
    }

    setState({ status: "loading" })
    const params = new URLSearchParams()
    if (initialQuery.trim()) params.set("q", initialQuery.trim())
    if (status && status !== "ALL") params.set("status", status)
    params.set("limit", "100")

    const response = await fetch(`/api/admin/orders?${params.toString()}`, {
      headers: { authorization: `Bearer ${token}` },
    })

    const payload = (await response.json().catch(() => ({}))) as { error?: string; orders?: AdminOrder[] }
    if (!response.ok) {
      setState({ status: "error", message: payload.error || "Failed to load orders." })
      return
    }

    setState({ status: "ready", orders: payload.orders ?? [] })
  }

  useEffect(() => {
    void loadStats()
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery, status, supabase])

  const openManage = (order: AdminOrder) => {
    setSaveError(null)
    setActiveOrder(order)
    const normalized = order.status.trim().toUpperCase()
    const nextStatus = (STATUS_OPTIONS.includes(normalized as StatusOption) && normalized !== "ALL"
      ? (normalized as Exclude<StatusOption, "ALL">)
      : "PROCESSING") as Exclude<StatusOption, "ALL">
    setEditStatus(nextStatus)
    setEditTrackingNumber(order.trackingNumber || "")
    setEditCarrier(order.shippingCarrier || "")
    setManageOpen(true)
  }

  const saveManage = async () => {
    if (!supabase || !activeOrder) return

    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData.session?.access_token ?? ""
    if (!token) {
      setSaveError("Your session expired. Please sign in again.")
      return
    }

    setSaveLoading(true)
    setSaveError(null)
    try {
      const response = await fetch("/api/admin/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", authorization: `Bearer ${token}` },
        body: JSON.stringify({
          orderId: activeOrder.orderId,
          status: editStatus,
          trackingNumber: editTrackingNumber.trim(),
          shippingCarrier: editCarrier.trim(),
        }),
      })
      const payload = (await response.json().catch(() => ({}))) as { error?: string }
      if (!response.ok) {
        throw new Error(payload.error || "Failed to update order.")
      }

      setManageOpen(false)
      setActiveOrder(null)
      await load()
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to update order.")
    } finally {
      setSaveLoading(false)
    }
  }

  const openDetails = async (order: AdminOrder) => {
    if (!supabase) return

    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData.session?.access_token ?? ""
    if (!token) {
      setDetailsError("Your session expired. Please sign in again.")
      setDetailsOpen(true)
      return
    }

    setActiveOrder(order)
    setDetailsOpen(true)
    setDetails(null)
    setDetailsError(null)
    setDetailsLoading(true)
    setCopyStatus(null)

    try {
      const response = await fetch(`/api/admin/orders/${encodeURIComponent(order.orderId)}`, {
        headers: { authorization: `Bearer ${token}` },
      })
      const payload = (await response.json().catch(() => ({}))) as { error?: string } & Partial<AdminOrderDetail>
      if (!response.ok) {
        throw new Error(payload.error || "Unable to load order details.")
      }
      setDetails(payload as AdminOrderDetail)
    } catch (err) {
      setDetailsError(err instanceof Error ? err.message : "Unable to load order details.")
    } finally {
      setDetailsLoading(false)
    }
  }

  if (state.status === "signed_out") {
    return (
      <div className="rounded-2xl border border-border/30 bg-card/60 p-6 text-sm text-muted-foreground shadow-sm">
        You are not signed in.{" "}
        <Link href="/login?next=%2Fadmin%2Forders" className="font-medium text-foreground underline underline-offset-4">
          Sign in
        </Link>
      </div>
    )
  }

  if (state.status === "error") {
    return <div className="rounded-2xl border border-border/30 bg-card/60 p-6 text-sm text-destructive shadow-sm">{state.message}</div>
  }

  const orders = state.status === "ready" ? state.orders : []

  const formatShippingLabel = (payload: AdminOrderDetail) => {
    const customer = payload.customer
    const fallbackName = payload.order.customerName || customer?.name || ""
    const name = (customer?.name || fallbackName).trim()
    const phone = (customer?.phone || "").trim()
    const addressLine = (customer?.addressLine || "").trim()
    const city = (customer?.city || "").trim()
    const province = (customer?.province || "").trim()
    const postalCode = (customer?.postalCode || "").trim()
    const country = (customer?.country || "").trim()

    const line2Parts = [city, province, postalCode].filter(Boolean)
    const line2 = line2Parts.join(", ")

    return [name, phone, addressLine, line2, country].filter(Boolean).join("\n")
  }

  const shippingLabelText = details ? formatShippingLabel(details) : ""
  const hasShippingAddress = Boolean(
    details?.customer &&
      (details.customer.addressLine ||
        details.customer.city ||
        details.customer.province ||
        details.customer.postalCode ||
        details.customer.country)
  )

  const copyToClipboard = async (text: string) => {
    const value = text.trim()
    if (!value) {
      setCopyStatus("Alamat belum tersedia untuk disalin.")
      return
    }

    try {
      await navigator.clipboard.writeText(value)
      setCopyStatus("Tersalin.")
      window.setTimeout(() => setCopyStatus(null), 1800)
      return
    } catch {
      // Fallback for older browsers / permission restrictions
    }

    try {
      const el = document.createElement("textarea")
      el.value = value
      el.setAttribute("readonly", "true")
      el.style.position = "fixed"
      el.style.left = "-9999px"
      document.body.appendChild(el)
      el.select()
      const ok = document.execCommand("copy")
      document.body.removeChild(el)
      setCopyStatus(ok ? "Tersalin." : "Gagal menyalin.")
      window.setTimeout(() => setCopyStatus(null), 1800)
    } catch {
      setCopyStatus("Gagal menyalin.")
      window.setTimeout(() => setCopyStatus(null), 1800)
    }
  }

  const printLabel = (labelText: string) => {
    const value = labelText.trim()
    if (!value) {
      setCopyStatus("Alamat belum tersedia untuk dicetak.")
      window.setTimeout(() => setCopyStatus(null), 1800)
      return
    }

    const escapeHtml = (input: string) =>
      input
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;")

    const win = window.open("", "_blank", "noopener,noreferrer,width=480,height=640")
    if (!win) {
      setCopyStatus("Popup diblokir.")
      window.setTimeout(() => setCopyStatus(null), 1800)
      return
    }

    const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Shipping Label</title>
    <style>
      * { box-sizing: border-box; }
      body { margin: 0; padding: 24px; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; }
      .label { border: 2px solid #111; border-radius: 12px; padding: 18px; }
      pre { margin: 0; white-space: pre-wrap; font-size: 16px; line-height: 1.35; color: #111; }
      @media print {
        body { padding: 0; }
        .label { border: 0; border-radius: 0; padding: 0; }
      }
    </style>
  </head>
  <body>
    <div class="label"><pre>${escapeHtml(value)}</pre></div>
    <script>
      window.addEventListener('load', () => {
        window.focus();
        window.print();
      });
    </script>
  </body>
</html>`

    win.document.open()
    win.document.write(html)
    win.document.close()
  }

  return (
    <div className="rounded-2xl border border-border/30 bg-card/60 p-4 shadow-sm">
      <div className="mb-4 overflow-hidden rounded-xl border border-border/30 bg-background/40">
        <div className="grid grid-cols-2 divide-y divide-border/30 sm:grid-cols-4 sm:divide-x sm:divide-y-0">
          <div className="p-4">
            <p className="text-xs font-medium text-muted-foreground">Total Orders</p>
            {stats.status === "ready" ? (
              <p className="mt-2 text-xl font-semibold text-foreground">{formatCount(stats.totalOrders)}</p>
            ) : (
              <Skeleton className="mt-3 h-6 w-24" />
            )}
            <p className="mt-1 text-xs text-muted-foreground">
              Total Orders last {stats.status === "ready" ? stats.windowDays : 365} days
            </p>
          </div>

          <div className="p-4">
            <p className="text-xs font-medium text-muted-foreground">New Orders</p>
            {stats.status === "ready" ? (
              <p className="mt-2 text-xl font-semibold text-foreground">{formatCount(stats.newOrders)}</p>
            ) : (
              <Skeleton className="mt-3 h-6 w-24" />
            )}
            <p className="mt-1 text-xs text-muted-foreground">
              New Orders last {stats.status === "ready" ? stats.windowDays : 365} days
            </p>
          </div>

          <div className="p-4">
            <p className="text-xs font-medium text-muted-foreground">Completed Orders</p>
            {stats.status === "ready" ? (
              <p className="mt-2 text-xl font-semibold text-foreground">{formatCount(stats.completedOrders)}</p>
            ) : (
              <Skeleton className="mt-3 h-6 w-24" />
            )}
            <p className="mt-1 text-xs text-muted-foreground">
              Completed Order last {stats.status === "ready" ? stats.windowDays : 365} days
            </p>
          </div>

          <div className="p-4">
            <p className="text-xs font-medium text-muted-foreground">Cancelled Orders</p>
            {stats.status === "ready" ? (
              <p className="mt-2 text-xl font-semibold text-foreground">{formatCount(stats.cancelledOrders)}</p>
            ) : (
              <Skeleton className="mt-3 h-6 w-24" />
            )}
            <p className="mt-1 text-xs text-muted-foreground">
              Cancelled Order last {stats.status === "ready" ? stats.windowDays : 365} days
            </p>
          </div>
        </div>

        {stats.status === "error" ? (
          <div className="border-t border-border/30 px-4 py-2 text-xs text-muted-foreground">{stats.message}</div>
        ) : null}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">All orders</p>
          <p className="mt-1 text-xs text-muted-foreground">Use the top search bar to filter orders.</p>
        </div>

        <div className="w-full sm:w-[200px]">
          <Select value={status} onValueChange={(value) => setStatus(value as StatusOption)}>
            <SelectTrigger className="h-9 w-full">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((option) => (
                <SelectItem key={option} value={option}>
                  {option === "ALL" ? "All statuses" : option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto overflow-y-hidden rounded-xl border border-border/30">
        {state.status === "loading" ? (
          <div className="p-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="mt-3 h-10 w-full" />
            <Skeleton className="mt-3 h-10 w-full" />
          </div>
        ) : orders.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">No orders found.</div>
        ) : (
          <Table className="min-w-[900px] w-full table-fixed">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[170px] px-2 whitespace-nowrap">Customer name</TableHead>
                <TableHead className="w-[165px] px-2 whitespace-nowrap">Order ID</TableHead>
                <TableHead className="w-[110px] px-2 whitespace-nowrap">Amount</TableHead>
                <TableHead className="w-[110px] px-2 whitespace-nowrap">Status</TableHead>
                <TableHead className="w-[180px] px-2 whitespace-nowrap">Shipment</TableHead>
                <TableHead className="w-[96px] px-2 whitespace-nowrap text-right">Action</TableHead>
                <TableHead className="w-[44px] px-2 whitespace-nowrap text-right"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => {
                const customerLine = order.customerName.trim() || order.customerEmail.trim() || "Customer"
                const tierKey = (order.customerTierKey || "bronze") as LoyaltyTierKey
                const tierLabel = order.customerTierName.trim() || "Bronze"
                const trackingLine = order.trackingNumber ? order.trackingNumber : "-"
                const carrierLine = order.shippingCarrier ? order.shippingCarrier : "-"

                return (
                  <TableRow key={order.orderId}>
                    <TableCell className="min-w-0 overflow-hidden px-2 py-3 align-top">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">{customerLine}</p>
                        <div className="mt-1">
                          <TierBadge tier={tierKey} label={tierLabel} className="align-middle" />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="min-w-0 overflow-hidden px-2 py-3 align-top">
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-foreground">#{order.orderId}</p>
                        <p className="text-xs text-muted-foreground">Placed on {formatDate(order.createdAt)}</p>
                      </div>
                    </TableCell>
                    <TableCell className="min-w-0 overflow-hidden px-2 py-3 align-top">
                      <p className="text-sm font-semibold text-foreground">{formatMoney(order.amount, order.currency)}</p>
                    </TableCell>
                    <TableCell className="min-w-0 overflow-hidden px-2 py-3 align-top">
                      <Badge className={statusBadgeClass(order.status)}>{order.status}</Badge>
                    </TableCell>
                    <TableCell className="min-w-0 overflow-hidden px-2 py-3 align-top">
                      <div className="space-y-1 text-xs text-muted-foreground">
                        <p className="flex min-w-0 items-baseline gap-1">
                          <span className="shrink-0 font-medium text-foreground">Tracking:</span>
                          <span className="min-w-0 truncate">{trackingLine}</span>
                        </p>
                        <p className="flex min-w-0 items-baseline gap-1">
                          <span className="shrink-0 font-medium text-foreground">Carrier:</span>
                          <span className="min-w-0 truncate">{carrierLine}</span>
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="min-w-0 overflow-hidden px-2 py-3 align-top text-right">
                      <Button variant="outline" size="sm" onClick={() => void openDetails(order)}>
                        Details
                      </Button>
                    </TableCell>
                    <TableCell className="min-w-0 overflow-hidden px-2 py-3 align-top text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="icon" className="h-8 w-8" aria-label="More actions">
                            <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => openManage(order)}>Manage</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={manageOpen} onOpenChange={(open) => (!open ? setManageOpen(false) : null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Manage order</DialogTitle>
          </DialogHeader>

          {!activeOrder ? (
            <p className="text-sm text-muted-foreground">Select an order.</p>
          ) : (
            <div className="grid gap-4">
              <div className="rounded-xl border border-border/30 bg-background/40 p-3 text-xs text-muted-foreground">
                Order ID: <span className="font-semibold text-foreground">{activeOrder.orderId}</span>
              </div>

              <div className="grid gap-2">
                <Label>Status</Label>
                <Select value={editStatus} onValueChange={(value) => setEditStatus(value as Exclude<StatusOption, "ALL">)}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.filter((value) => value !== "ALL").map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Tracking number</Label>
                <Input value={editTrackingNumber} onChange={(e) => setEditTrackingNumber(e.target.value)} className="h-9" />
              </div>

              <div className="grid gap-2">
                <Label>Carrier</Label>
                <Input value={editCarrier} onChange={(e) => setEditCarrier(e.target.value)} className="h-9" placeholder="DHL, FedEx, UPS..." />
              </div>

              {saveError && <p className="text-sm font-medium text-destructive">{saveError}</p>}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setManageOpen(false)} disabled={saveLoading}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void saveManage()} disabled={!activeOrder || saveLoading}>
              {saveLoading ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={detailsOpen} onOpenChange={(open) => (!open ? setDetailsOpen(false) : null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Order details</DialogTitle>
          </DialogHeader>

          {detailsLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : detailsError ? (
            <p className="text-sm font-medium text-destructive">{detailsError}</p>
          ) : !details ? (
            <p className="text-sm text-muted-foreground">No data.</p>
          ) : (
            <div className="grid gap-4">
              <div className="flex flex-col gap-3 rounded-xl border border-border/30 bg-background/40 p-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">Order #{details.order.orderId}</p>
                    <Badge className={statusBadgeClass(details.order.status)}>{details.order.status}</Badge>
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {details.order.customerName || details.customer?.name || "-"} • {details.order.customerEmail || details.customer?.email || "-"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Placed on <span className="font-medium text-foreground">{formatDate(details.order.createdAt)}</span> • Amount{" "}
                    <span className="font-medium text-foreground">{formatMoney(details.order.amount, details.order.currency)}</span>
                  </p>
                </div>
              </div>

              <div className="grid gap-3 rounded-xl border border-border/30 bg-background/40 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Shipping address</p>
                    <p className="mt-1 text-xs text-muted-foreground">Copy/print label untuk ditempel di paket.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => void copyToClipboard(hasShippingAddress ? shippingLabelText : "")}
                      disabled={!hasShippingAddress}
                    >
                      Copy
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => printLabel(hasShippingAddress ? shippingLabelText : "")}
                      disabled={!hasShippingAddress}
                    >
                      Print
                    </Button>
                  </div>
                </div>

                {copyStatus ? <p className="text-xs text-muted-foreground">{copyStatus}</p> : null}

                {hasShippingAddress ? (
                  <div className="rounded-lg border border-border/30 bg-background/60 p-3">
                    <pre className="m-0 whitespace-pre-wrap text-sm leading-relaxed text-foreground">{shippingLabelText}</pre>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Alamat belum tersedia untuk order ini.</p>
                )}
              </div>

              <div className="grid gap-3 rounded-xl border border-border/30 bg-background/40 p-4">
                <p className="text-sm font-semibold text-foreground">Items</p>
                {details.items.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No items found in this order.</p>
                ) : (
                  <div className="divide-y divide-border/30 rounded-lg border border-border/30">
                    {details.items.map((item, idx) => (
                      <div key={`${item.name}-${idx}`} className="flex flex-col gap-1 p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <p className="truncate font-medium text-foreground">{item.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.length ? `${item.length}"` : ""}{item.category ? (item.length ? ` • ${item.category}` : item.category) : ""}{" "}
                            {item.quantity > 1 ? `• x${item.quantity}` : ""}
                          </p>
                        </div>
                        <p className="text-sm font-semibold text-foreground">
                          {formatMoney(item.lineTotal || item.unitPrice * item.quantity, details.order.currency)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-3 rounded-xl border border-border/30 bg-background/40 p-4">
                  <p className="text-sm font-semibold text-foreground">Order summary</p>
                  <div className="grid gap-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Amount</span>
                      <span className="font-semibold text-foreground">{formatMoney(details.order.amount, details.order.currency)}</span>
                    </div>
                    {details.summary ? (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Subtotal</span>
                          <span className="text-foreground">{formatMoney(details.summary.subtotal, details.order.currency)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Tax</span>
                          <span className="text-foreground">{formatMoney(details.summary.tax, details.order.currency)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Shipping</span>
                          <span className="text-foreground">{formatMoney(details.summary.shipping, details.order.currency)}</span>
                        </div>
                        {details.summary.discount ? (
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Discount</span>
                            <span className="text-foreground">-{formatMoney(details.summary.discount, details.order.currency)}</span>
                          </div>
                        ) : null}
                        <div className="flex items-center justify-between pt-2">
                          <span className="font-semibold text-foreground">Total</span>
                          <span className="font-semibold text-foreground">{formatMoney(details.summary.total, details.order.currency)}</span>
                        </div>
                      </>
                    ) : null}
                  </div>
                </div>

                <div className="grid gap-3 rounded-xl border border-border/30 bg-background/40 p-4">
                  <p className="text-sm font-semibold text-foreground">Shipment</p>
                  <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                    <div className="rounded-lg border border-border/30 bg-background/40 p-3">
                      <p className="text-xs font-medium text-muted-foreground">Tracking number</p>
                      <p className="mt-1 break-words font-semibold text-foreground">{details.order.trackingNumber || "-"}</p>
                    </div>
                    <div className="rounded-lg border border-border/30 bg-background/40 p-3">
                      <p className="text-xs font-medium text-muted-foreground">Carrier</p>
                      <p className="mt-1 break-words font-semibold text-foreground">{details.order.shippingCarrier || "-"}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDetailsOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
