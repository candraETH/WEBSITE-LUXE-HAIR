"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { format, parseISO } from "date-fns"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { getSupabaseBrowserClient } from "@/lib/supabase-browser"

type AdminOrder = {
  orderId: string
  status: string
  amount: number
  currency: string
  customerName: string
  customerEmail: string
  trackingNumber: string
  shippingCarrier: string
  createdAt: string | null
  updatedAt: string | null
}

type UiState =
  | { status: "loading" }
  | { status: "signed_out" }
  | { status: "error"; message: string }
  | { status: "ready"; orders: AdminOrder[] }

const STATUS_OPTIONS = ["ALL", "PENDING", "PAID", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"] as const
type StatusOption = (typeof STATUS_OPTIONS)[number]

function formatMoney(amount: number, currency: string) {
  const safeAmount = Number.isFinite(amount) ? amount : 0
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(safeAmount)
  } catch {
    return `${currency} ${safeAmount.toFixed(2)}`
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

function formatDate(value: string | null) {
  if (!value) return "-"
  try {
    return format(parseISO(value), "MMM d, yyyy")
  } catch {
    return value
  }
}

export function AdminOrdersClient({ initialQuery, initialStatus }: { initialQuery: string; initialStatus: string }) {
  const supabase = useMemo(() => getSupabaseBrowserClient(), [])
  const [state, setState] = useState<UiState>({ status: "loading" })
  const [status, setStatus] = useState<StatusOption>(
    (STATUS_OPTIONS.includes(initialStatus.toUpperCase() as StatusOption)
      ? (initialStatus.toUpperCase() as StatusOption)
      : "ALL") as StatusOption
  )

  const [dialogOpen, setDialogOpen] = useState(false)
  const [activeOrder, setActiveOrder] = useState<AdminOrder | null>(null)
  const [saveLoading, setSaveLoading] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const [editStatus, setEditStatus] = useState<Exclude<StatusOption, "ALL">>("PROCESSING")
  const [editTrackingNumber, setEditTrackingNumber] = useState("")
  const [editCarrier, setEditCarrier] = useState("")

  useEffect(() => {
    const normalized = initialStatus.trim().toUpperCase()
    const next = STATUS_OPTIONS.includes(normalized as StatusOption) ? (normalized as StatusOption) : "ALL"
    setStatus(next)
  }, [initialStatus])

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
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery, status, supabase])

  const openEdit = (order: AdminOrder) => {
    setSaveError(null)
    setActiveOrder(order)
    const normalized = order.status.trim().toUpperCase()
    const nextStatus = (STATUS_OPTIONS.includes(normalized as StatusOption) && normalized !== "ALL"
      ? (normalized as Exclude<StatusOption, "ALL">)
      : "PROCESSING") as Exclude<StatusOption, "ALL">
    setEditStatus(nextStatus)
    setEditTrackingNumber(order.trackingNumber || "")
    setEditCarrier(order.shippingCarrier || "")
    setDialogOpen(true)
  }

  const saveEdit = async () => {
    if (!activeOrder || !supabase) return

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
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          orderId: activeOrder.orderId,
          status: editStatus,
          trackingNumber: editTrackingNumber,
          shippingCarrier: editCarrier,
        }),
      })

      const payload = (await response.json().catch(() => ({}))) as { error?: string }
      if (!response.ok) {
        throw new Error(payload.error || "Failed to update order.")
      }

      setDialogOpen(false)
      setActiveOrder(null)
      await load()
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Failed to update order.")
    } finally {
      setSaveLoading(false)
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

  return (
    <div className="rounded-2xl border border-border/30 bg-card/60 p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="grid gap-1">
          <p className="text-sm font-semibold text-foreground">All orders</p>
          <p className="text-xs text-muted-foreground">Use the top search bar to filter orders.</p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="w-full sm:w-[200px]">
            <Select value={status} onValueChange={(value) => setStatus(value as StatusOption)}>
              <SelectTrigger className="h-9">
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
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-border/30">
        <div className="grid grid-cols-1 gap-0 divide-y divide-border/30">
          {state.status === "loading" ? (
            <div className="p-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="mt-3 h-10 w-full" />
              <Skeleton className="mt-3 h-10 w-full" />
            </div>
          ) : state.orders.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">No orders found.</div>
          ) : (
            state.orders.map((order) => (
              <div key={order.orderId} className="flex flex-col gap-3 bg-background/40 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">Order #{order.orderId}</p>
                    <Badge className={statusBadgeClass(order.status)}>{order.status}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {order.customerEmail || order.customerName || "-"} • Placed on {formatDate(order.createdAt)}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-foreground">{formatMoney(order.amount, order.currency)}</p>
                  {(order.trackingNumber || order.shippingCarrier) && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Tracking: <span className="font-medium text-foreground">{order.trackingNumber || "-"}</span>{" "}
                      {order.shippingCarrier ? `(${order.shippingCarrier})` : ""}
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Button variant="outline" size="sm" onClick={() => openEdit(order)}>
                    Manage
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/account/orders/${encodeURIComponent(order.orderId)}`}>View (User)</Link>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/track-order?orderId=${encodeURIComponent(order.orderId)}`}>Track</Link>
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>
          <span className="hidden" />
        </DialogTrigger>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit order</DialogTitle>
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
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={saveLoading}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void saveEdit()} disabled={!activeOrder || saveLoading}>
              {saveLoading ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
