"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { getSupabaseBrowserClient } from "@/lib/supabase-browser"

type UiState =
  | { status: "loading" }
  | { status: "signed_out" }
  | { status: "error"; message: string }
  | { status: "ready"; order: Record<string, unknown> }

function safeString(value: unknown): string {
  return typeof value === "string" ? value : ""
}

type StatusKey = "pending" | "processing" | "shipped" | "delivered" | "cancelled" | "paid" | "other"

function normalizeStatus(status: string): StatusKey {
  const raw = status.trim().toLowerCase()
  const normalized = raw === "canceled" ? "cancelled" : raw

  if (normalized === "pending") return "pending"
  if (normalized === "processing") return "processing"
  if (normalized === "shipped") return "shipped"
  if (normalized === "delivered") return "delivered"
  if (normalized === "paid") return "paid"
  if (["cancelled", "failed", "refunded"].includes(normalized)) return "cancelled"
  return "other"
}

function statusLabel(status: string): string {
  const key = normalizeStatus(status)
  if (key === "other") return status.trim() || "Unknown"
  return key.toUpperCase()
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
    case "paid":
      return `${base} bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300`
    case "cancelled":
      return `${base} bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300`
    default:
      return `${base} bg-muted text-foreground dark:bg-muted/40`
  }
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount)
  } catch {
    return `${currency} ${amount.toFixed(2)}`
  }
}

function maskNamePart(value: string): string {
  const token = value.trim()
  if (!token) return ""
  if (token.length <= 2) return token[0] ? `${token[0]}*` : "*"
  return `${token[0]}${"*".repeat(Math.max(2, token.length - 2))}${token[token.length - 1]}`
}

function maskCustomerName(fullName: string): string {
  const parts = fullName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (parts.length === 0) return "-"
  return parts.map(maskNamePart).join(" ")
}

function maskPhoneNumber(value: string): string {
  const compact = value.trim().replace(/[^\d+]/g, "")
  if (!compact) return "-"
  const digits = compact.replace(/\D/g, "")
  if (!digits) return "-"

  const countryCodeLength = digits.startsWith("1")
    ? 1
    : digits.startsWith("971")
      ? 3
      : digits.startsWith("966")
        ? 3
        : digits.startsWith("62")
          ? 2
          : 2

  const safeCountryLength = Math.min(countryCodeLength, Math.max(1, digits.length - 3))
  const countryCode = `+${digits.slice(0, safeCountryLength)}`
  const lastThree = digits.slice(-3)
  const maskedDigitsCount = Math.max(2, digits.length - safeCountryLength - 3)
  return `${countryCode}${"*".repeat(maskedDigitsCount)}${lastThree}`
}

type CartJsonItem = {
  name?: unknown
  length?: unknown
  category?: unknown
  quantity?: unknown
  line_total?: unknown
}

type CartJsonRoot = {
  customer?: {
    name?: unknown
    phone_number?: unknown
  }
  summary?: {
    subtotal?: unknown
    tax?: unknown
    shipping?: unknown
    total?: unknown
  }
  items?: unknown
}

function getCartJsonRoot(value: unknown): CartJsonRoot {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {}
  return value as CartJsonRoot
}

function extractItems(cartJson: unknown): Array<{ name: string; lengthLabel: string; category: string; quantity: number; lineTotal: number | null }> {
  const root = getCartJsonRoot(cartJson)
  const itemsSource = Array.isArray(root.items) ? root.items : []
  const items = itemsSource.filter((item): item is CartJsonItem => Boolean(item && typeof item === "object"))

  return items
    .map((item) => {
      const name = safeString(item.name).trim()
      if (!name) return null
      const lengthValue = asNumber(item.length)
      const lengthLabel = typeof lengthValue === "number" && lengthValue > 0 ? `${lengthValue}"` : "-"
      const category = safeString(item.category).trim() || "-"
      const quantityRaw = asNumber(item.quantity)
      const quantity = quantityRaw && quantityRaw > 0 ? Math.floor(quantityRaw) : 1
      const lineTotal = asNumber(item.line_total)
      return { name, lengthLabel, category, quantity, lineTotal }
    })
    .filter(Boolean) as Array<{ name: string; lengthLabel: string; category: string; quantity: number; lineTotal: number | null }>
}

export function OrderDetailClient({ orderId }: { orderId: string }) {
  const supabase = useMemo(() => getSupabaseBrowserClient(), [])
  const [state, setState] = useState<UiState>({ status: "loading" })

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

      const response = await fetch(`/api/account/orders/${encodeURIComponent(orderId)}`, {
        headers: { authorization: `Bearer ${token}` },
      })

      const payload = (await response.json().catch(() => ({}))) as { error?: string; order?: Record<string, unknown> }
      if (!response.ok || !payload.order) {
        if (!cancelled) setState({ status: "error", message: payload.error || "Failed to load order." })
        return
      }

      if (!cancelled) setState({ status: "ready", order: payload.order })
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [orderId, supabase])

  if (state.status === "loading") {
    return <div className="rounded-xl border border-border/30 bg-background/40 p-4 text-sm text-muted-foreground">Loading...</div>
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
    return (
      <div className="space-y-3">
        <div className="rounded-xl border border-border/30 bg-background/40 p-4 text-sm text-destructive">{state.message}</div>
        <Button asChild variant="outline" size="sm">
          <Link href="/account/orders">Back to orders</Link>
        </Button>
      </div>
    )
  }

  const order = state.order
  const status = safeString(order.status).trim() || "UNKNOWN"
  const amount = typeof order.amount === "number" ? order.amount : Number(order.amount ?? 0)
  const currency = safeString(order.currency).trim() || "USD"
  const cartRoot = getCartJsonRoot(order.cart_json)
  const customerName = safeString(order.customer_name).trim() || safeString(cartRoot.customer?.name).trim()
  const customerPhone = safeString(cartRoot.customer?.phone_number).trim()
  const items = extractItems(order.cart_json)

  const summarySubtotal = asNumber(cartRoot.summary?.subtotal) ?? null
  const summaryTax = asNumber(cartRoot.summary?.tax) ?? null
  const summaryShipping = asNumber(cartRoot.summary?.shipping) ?? null
  const summaryTotal = asNumber(cartRoot.summary?.total) ?? (Number.isFinite(amount) ? amount : null)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Button asChild variant="outline" size="sm">
          <Link href="/account/orders">Back</Link>
        </Button>
        <Badge className={statusBadgeClass(normalizeStatus(status))}>{statusLabel(status)}</Badge>
      </div>

      <div className="rounded-2xl border border-border/30 bg-card/60 p-6 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <p className="text-sm font-semibold text-foreground">
            Order ID: <span className="font-mono">{orderId}</span>
          </p>
        </div>

        <div className="mt-4 space-y-1 text-sm text-muted-foreground">
          <p>
            Name: <span className="text-foreground">{customerName ? maskCustomerName(customerName) : "-"}</span>
          </p>
          <p>
            Phone: <span className="text-foreground">{customerPhone ? maskPhoneNumber(customerPhone) : "-"}</span>
          </p>
          <p>
            Amount: <span className="text-foreground">{summaryTotal === null ? "-" : `${currency} ${summaryTotal.toFixed(2)}`}</span>
          </p>
        </div>

        <div className="mt-6 space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">Items</p>
            {items.length === 0 ? (
              <div className="mt-2 rounded-xl border border-border/30 bg-background/40 p-4 text-sm text-muted-foreground">
                No items found for this order.
              </div>
            ) : (
              <div className="mt-2 space-y-2">
                {items.map((item, idx) => (
                  <div key={`${item.name}-${idx}`} className="rounded-xl border border-border/40 bg-background/60 p-4">
                    <p className="text-sm font-semibold text-foreground">{item.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {item.lengthLabel} - {item.category} - x{item.quantity} -{" "}
                      {item.lineTotal === null ? "-" : formatMoney(item.lineTotal, currency)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-border/40 bg-background/60 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">Order summary</p>
            <div className="mt-3 grid gap-1 text-sm text-muted-foreground">
              <p>
                Subtotal:{" "}
                <span className="text-foreground">{summarySubtotal === null ? "-" : formatMoney(summarySubtotal, currency)}</span>
              </p>
              <p>
                Tax: <span className="text-foreground">{summaryTax === null ? "-" : formatMoney(summaryTax, currency)}</span>
              </p>
              <p>
                Shipping:{" "}
                <span className="text-foreground">{summaryShipping === null ? "-" : formatMoney(summaryShipping, currency)}</span>
              </p>
              <p className="font-semibold text-foreground">
                Total: <span>{summaryTotal === null ? "-" : formatMoney(summaryTotal, currency)}</span>
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <Button asChild variant="outline" size="sm">
            <Link href="/track-order">Track order</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
