"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { format, parseISO } from "date-fns"
import { Badge } from "@/components/ui/badge"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { getSupabaseBrowserClient } from "@/lib/supabase-browser"
import { getCouponByCode, listCoupons, normalizeCouponCode, type CouponDefinition } from "@/lib/coupon"
import { LOYALTY_TIERS, type LoyaltyTierKey } from "@/lib/loyalty-tier"

type DbCoupon = {
  code: string
  title: string
  description: string
  discountRate: number
  minimumSubtotal: number
  maxUsesTotal: number | null
  maxUsesPerCustomer: number | null
  minTierKey: LoyaltyTierKey | null
  active: boolean
  startsAt: string | null
  endsAt: string | null
  updatedAt: string | null
}

type UiState =
  | { status: "loading" }
  | { status: "signed_out" }
  | { status: "error"; message: string }
  | { status: "ready"; configured: boolean; coupons: DbCoupon[] }

function formatDateTime(value: string | null) {
  if (!value) return ""
  try {
    return format(parseISO(value), "MMM d, yyyy p")
  } catch {
    return value
  }
}

function discountLabel(rate: number) {
  const pct = Math.round(rate * 100)
  return `${pct}% OFF`
}

function activeBadge(active: boolean) {
  return active
    ? "border-0 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
    : "border-0 bg-muted text-foreground dark:bg-muted/40"
}

function toDateTimeLocal(value: string | null) {
  if (!value) return ""
  const ms = Date.parse(value)
  if (!Number.isFinite(ms)) return ""
  const d = new Date(ms)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function fromDateTimeLocal(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return null
  const ms = Date.parse(trimmed)
  if (!Number.isFinite(ms)) return null
  return new Date(ms).toISOString()
}

export function AdminDiscountsClient() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), [])
  const [state, setState] = useState<UiState>({ status: "loading" })
  const [saving, setSaving] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<"create" | "edit">("create")
  const [formError, setFormError] = useState("")
  const [deleteConfirm, setDeleteConfirm] = useState<DbCoupon | null>(null)

  const [code, setCode] = useState("")
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [discountPercent, setDiscountPercent] = useState("25")
  const [minimumSubtotal, setMinimumSubtotal] = useState("0")
  const [maxUsesTotal, setMaxUsesTotal] = useState("")
  const [maxUsesPerCustomer, setMaxUsesPerCustomer] = useState("")
  const [minTierKey, setMinTierKey] = useState<LoyaltyTierKey | "all">("all")
  const [active, setActive] = useState(true)
  const [startsAt, setStartsAt] = useState("")
  const [endsAt, setEndsAt] = useState("")

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
    const response = await fetch("/api/admin/coupons", { headers: { authorization: `Bearer ${token}` } })
    const payload = (await response.json().catch(() => ({}))) as { error?: string; configured?: boolean; coupons?: DbCoupon[] }
    if (!response.ok) {
      setState({ status: "error", message: payload.error || "Failed to load coupons." })
      return
    }
    setState({ status: "ready", configured: Boolean(payload.configured), coupons: payload.coupons ?? [] })
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase])

  const openCreate = () => {
    setFormMode("create")
    setCode("")
    setTitle("")
    setDescription("")
    setDiscountPercent("25")
    setMinimumSubtotal("0")
    setMaxUsesTotal("")
    setMaxUsesPerCustomer("")
    setMinTierKey("all")
    setActive(true)
    setStartsAt("")
    setEndsAt("")
    setFormError("")
    setFormOpen(true)
  }

  const openEdit = (coupon: DbCoupon) => {
    setFormMode("edit")
    setCode(coupon.code)
    setTitle(coupon.title)
    setDescription(coupon.description)
    setDiscountPercent(String(Math.round(coupon.discountRate * 100)))
    setMinimumSubtotal(String(coupon.minimumSubtotal))
    setMaxUsesTotal(coupon.maxUsesTotal == null ? "" : String(coupon.maxUsesTotal))
    setMaxUsesPerCustomer(coupon.maxUsesPerCustomer == null ? "" : String(coupon.maxUsesPerCustomer))
    setMinTierKey(coupon.minTierKey ?? "all")
    setActive(coupon.active)
    setStartsAt(toDateTimeLocal(coupon.startsAt))
    setEndsAt(toDateTimeLocal(coupon.endsAt))
    setFormError("")
    setFormOpen(true)
  }

  const saveCoupon = async () => {
    if (!supabase) return
    setFormError("")

    const normalizedCode = normalizeCouponCode(code)
    if (!normalizedCode) {
      setFormError("Coupon code is required.")
      return
    }
    if (!title.trim()) {
      setFormError("Title is required.")
      return
    }

    const pct = Number(discountPercent)
    if (!Number.isFinite(pct) || pct <= 0 || pct >= 100) {
      setFormError("Discount must be between 1 and 99.")
      return
    }
    const rate = pct / 100

    const min = Number(minimumSubtotal)
    if (!Number.isFinite(min) || min < 0) {
      setFormError("Minimum subtotal must be 0 or higher.")
      return
    }

    const maxTotal = maxUsesTotal.trim() ? Number(maxUsesTotal) : null
    if (maxTotal != null) {
      if (!Number.isFinite(maxTotal) || maxTotal < 1) {
        setFormError("Max total uses must be 1 or higher.")
        return
      }
      if (!Number.isInteger(maxTotal)) {
        setFormError("Max total uses must be a whole number.")
        return
      }
    }

    const maxPerCustomer = maxUsesPerCustomer.trim() ? Number(maxUsesPerCustomer) : null
    if (maxPerCustomer != null) {
      if (!Number.isFinite(maxPerCustomer) || maxPerCustomer < 1) {
        setFormError("Max uses per customer must be 1 or higher.")
        return
      }
      if (!Number.isInteger(maxPerCustomer)) {
        setFormError("Max uses per customer must be a whole number.")
        return
      }
    }

    const normalizedMinTierKey = minTierKey === "all" ? null : (minTierKey as LoyaltyTierKey)

    const startsIso = fromDateTimeLocal(startsAt)
    const endsIso = fromDateTimeLocal(endsAt)

    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData.session?.access_token ?? ""
    if (!token) {
      setFormError("Your session expired. Please sign in again.")
      return
    }

    setSaving(true)
    try {
      const response = await fetch("/api/admin/coupons", {
        method: formMode === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json", authorization: `Bearer ${token}` },
        body: JSON.stringify({
          code: normalizedCode,
          title: title.trim(),
          description: description.trim(),
          discountRate: rate,
          minimumSubtotal: min,
          maxUsesTotal: maxTotal,
          maxUsesPerCustomer: maxPerCustomer,
          minTierKey: normalizedMinTierKey,
          active,
          startsAt: startsIso,
          endsAt: endsIso,
        }),
      })
      const payload = (await response.json().catch(() => ({}))) as { error?: string }
      if (!response.ok) {
        throw new Error(payload.error || "Failed to save coupon.")
      }
      setFormOpen(false)
      await load()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to save coupon.")
    } finally {
      setSaving(false)
    }
  }

  const deleteCoupon = async (coupon: DbCoupon) => {
    if (!supabase) return
    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData.session?.access_token ?? ""
    if (!token) {
      setState({ status: "error", message: "Your session expired. Please sign in again." })
      return
    }

    setSaving(true)
    try {
      const response = await fetch("/api/admin/coupons", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", authorization: `Bearer ${token}` },
        body: JSON.stringify({ code: coupon.code }),
      })
      const payload = (await response.json().catch(() => ({}))) as { error?: string }
      if (!response.ok) {
        throw new Error(payload.error || "Failed to delete coupon.")
      }
      await load()
    } catch (err) {
      setState({ status: "error", message: err instanceof Error ? err.message : "Failed to delete coupon." })
    } finally {
      setSaving(false)
    }
  }

  if (state.status === "signed_out") {
    return (
      <div className="rounded-2xl border border-border/30 bg-card/60 p-6 text-sm text-muted-foreground shadow-sm">
        You are not signed in.{" "}
        <Link href="/login?next=%2Fadmin%2Fdiscounts" className="font-medium text-foreground underline underline-offset-4">
          Sign in
        </Link>
      </div>
    )
  }

  if (state.status === "error") {
    return <div className="rounded-2xl border border-border/30 bg-card/60 p-6 text-sm text-destructive shadow-sm">{state.message}</div>
  }

  const configured = state.status === "ready" ? state.configured : true
  const dbCoupons = state.status === "ready" ? state.coupons : []
  const builtInCoupons = listCoupons()

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border/30 bg-card/60 p-4 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">Coupons</p>
            <p className="mt-1 text-xs text-muted-foreground">Create and manage coupon codes.</p>
          </div>
          <Button size="sm" onClick={openCreate} disabled={!configured}>
            Add coupon
          </Button>
        </div>

        {!configured ? (
          <div className="mt-4 rounded-xl border border-border/30 bg-background/40 p-4 text-sm text-muted-foreground">
            Coupons database is not configured yet. Run the SQL file{" "}
            <span className="font-medium text-foreground">supabase/sql/20260313_add_inventory_and_coupons.sql</span>{" "}
            (and then{" "}
            <span className="font-medium text-foreground">supabase/sql/20260314_harden_coupons_limits_and_visibility.sql</span>
            ) in Supabase SQL Editor.
          </div>
        ) : null}

        <div className="mt-4 overflow-hidden rounded-xl border border-border/30">
          {state.status === "loading" ? (
            <div className="p-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="mt-3 h-10 w-full" />
              <Skeleton className="mt-3 h-10 w-full" />
            </div>
          ) : dbCoupons.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">No database coupons yet.</div>
          ) : (
            <div className="divide-y divide-border/30">
              {dbCoupons.map((coupon) => (
                <div key={coupon.code} className="flex flex-col gap-3 bg-background/40 p-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-semibold text-foreground">{coupon.title}</p>
                      <Badge className={activeBadge(coupon.active)}>{coupon.active ? "Active" : "Inactive"}</Badge>
                      <Badge className="border-0 bg-foreground text-background">{coupon.code}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{coupon.description}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span className="rounded-full border border-border bg-background px-3 py-1">
                        Discount: <span className="font-semibold text-foreground">{discountLabel(coupon.discountRate)}</span>
                      </span>
                      <span className="rounded-full border border-border bg-background px-3 py-1">
                        Min subtotal: <span className="font-semibold text-foreground">${coupon.minimumSubtotal.toFixed(0)}</span>
                      </span>
                      {coupon.minTierKey ? (
                        <span className="rounded-full border border-border bg-background px-3 py-1">
                          Min tier:{" "}
                          <span className="font-semibold text-foreground">
                            {LOYALTY_TIERS.find((tier) => tier.key === coupon.minTierKey)?.name ?? coupon.minTierKey}
                          </span>
                        </span>
                      ) : null}
                      {coupon.maxUsesTotal != null ? (
                        <span className="rounded-full border border-border bg-background px-3 py-1">
                          Max uses: <span className="font-semibold text-foreground">{coupon.maxUsesTotal}</span>
                        </span>
                      ) : null}
                      {coupon.maxUsesPerCustomer != null ? (
                        <span className="rounded-full border border-border bg-background px-3 py-1">
                          Max/customer: <span className="font-semibold text-foreground">{coupon.maxUsesPerCustomer}</span>
                        </span>
                      ) : null}
                      {coupon.startsAt ? (
                        <span className="rounded-full border border-border bg-background px-3 py-1">
                          Starts: <span className="font-semibold text-foreground">{formatDateTime(coupon.startsAt)}</span>
                        </span>
                      ) : null}
                      {coupon.endsAt ? (
                        <span className="rounded-full border border-border bg-background px-3 py-1">
                          Ends: <span className="font-semibold text-foreground">{formatDateTime(coupon.endsAt)}</span>
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <Button size="sm" variant="outline" onClick={() => openEdit(coupon)} disabled={!configured}>
                      Edit
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => setDeleteConfirm(coupon)} disabled={!configured}>
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-border/30 bg-card/60 p-4 shadow-sm">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">Built-in coupons</p>
            <p className="mt-1 text-xs text-muted-foreground">These are defined in code.</p>
          </div>
        </div>

        <div className="mt-4 overflow-hidden rounded-xl border border-border/30">
          {builtInCoupons.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">No built-in coupons configured.</div>
          ) : (
            <div className="divide-y divide-border/30">
              {builtInCoupons.map((coupon) => (
                <BuiltInCouponRow key={coupon.code} coupon={coupon} />
              ))}
            </div>
          )}
        </div>
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>{formMode === "create" ? "Add coupon" : "Edit coupon"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Code</p>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase().replace(/\s+/g, ""))}
                placeholder="WELCOME25"
                disabled={formMode === "edit"}
              />
              <p className="text-xs text-muted-foreground">Uppercase letters and numbers. No spaces.</p>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Title</p>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Welcome 25% Off" />
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Description</p>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Short description..." />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Discount (%)</p>
                <Input
                  inputMode="numeric"
                  value={discountPercent}
                  onChange={(e) => setDiscountPercent(e.target.value.replace(/[^\d]/g, ""))}
                  placeholder="25"
                />
              </div>
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Minimum subtotal (USD)</p>
                <Input
                  inputMode="decimal"
                  value={minimumSubtotal}
                  onChange={(e) => setMinimumSubtotal(e.target.value.replace(/[^\d.]/g, ""))}
                  placeholder="1000"
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Max uses (optional)</p>
                <Input
                  inputMode="numeric"
                  value={maxUsesTotal}
                  onChange={(e) => setMaxUsesTotal(e.target.value.replace(/[^\d]/g, ""))}
                  placeholder="Unlimited"
                />
              </div>
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Max/customer (optional)</p>
                <Input
                  inputMode="numeric"
                  value={maxUsesPerCustomer}
                  onChange={(e) => setMaxUsesPerCustomer(e.target.value.replace(/[^\d]/g, ""))}
                  placeholder="Unlimited"
                />
              </div>
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Minimum tier (optional)</p>
                <Select value={minTierKey} onValueChange={(value) => setMinTierKey(value as LoyaltyTierKey | "all")}>
                  <SelectTrigger>
                    <SelectValue placeholder="All tiers" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All tiers</SelectItem>
                    {LOYALTY_TIERS.map((tier) => (
                      <SelectItem key={tier.key} value={tier.key}>
                        {tier.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Starts at (optional)</p>
                <Input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
              </div>
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Ends at (optional)</p>
                <Input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-border/30 bg-background/40 p-3">
              <div>
                <p className="text-sm font-medium text-foreground">Active</p>
                <p className="mt-1 text-xs text-muted-foreground">Inactive coupons cannot be used at checkout.</p>
              </div>
              <Switch checked={active} onCheckedChange={setActive} />
            </div>

            {formError ? <p className="text-sm font-medium text-destructive">{formError}</p> : null}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void saveCoupon()} disabled={saving || !configured}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteConfirm)} onOpenChange={(open) => (!open ? setDeleteConfirm(null) : null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete coupon {deleteConfirm?.code}?</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteConfirm(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => (deleteConfirm ? void deleteCoupon(deleteConfirm) : null)}
              disabled={saving || !configured}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function BuiltInCouponRow({ coupon }: { coupon: CouponDefinition }) {
  const resolved = getCouponByCode(coupon.code)
  const status = resolved ? "Enabled" : "Disabled"
  return (
    <div className="bg-background/40 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-foreground">{coupon.title}</p>
            <Badge className="border-0 bg-muted text-foreground dark:bg-muted/40">{status}</Badge>
            <Badge className="border-0 bg-foreground text-background">{coupon.code}</Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{coupon.description}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="rounded-full border border-border bg-background px-3 py-1">
              Discount: <span className="font-semibold text-foreground">{discountLabel(coupon.discountRate)}</span>
            </span>
            <span className="rounded-full border border-border bg-background px-3 py-1">
              Minimum subtotal: <span className="font-semibold text-foreground">${coupon.minimumSubtotal.toFixed(0)}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
