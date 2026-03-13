"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { getSupabaseBrowserClient } from "@/lib/supabase-browser"

type ProductSummary = {
  slug: string
  name: string
  category: string
}

type InventoryRow = {
  slug: string
  stock: number
  updatedAt: string | null
}

type UiState =
  | { status: "loading" }
  | { status: "signed_out" }
  | { status: "error"; message: string }
  | { status: "ready"; configured: boolean; rows: InventoryRow[] }

function stockBadge(stock: number) {
  if (stock <= 0) return "border-0 bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300"
  if (stock <= 5) return "border-0 bg-orange-50 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300"
  return "border-0 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
}

function stockLabel(stock: number) {
  if (stock <= 0) return "Out of stock"
  if (stock <= 5) return "Low stock"
  return "In stock"
}

export function AdminInventoryClient({ products }: { products: ProductSummary[] }) {
  const supabase = useMemo(() => getSupabaseBrowserClient(), [])
  const [state, setState] = useState<UiState>({ status: "loading" })
  const [savingSlug, setSavingSlug] = useState<string | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [editSlug, setEditSlug] = useState("")
  const [editName, setEditName] = useState("")
  const [editStock, setEditStock] = useState("0")
  const [editError, setEditError] = useState("")

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
    const response = await fetch("/api/admin/inventory", {
      headers: { authorization: `Bearer ${token}` },
    })

    const payload = (await response.json().catch(() => ({}))) as {
      error?: string
      configured?: boolean
      rows?: InventoryRow[]
    }

    if (!response.ok) {
      setState({ status: "error", message: payload.error || "Failed to load inventory." })
      return
    }

    setState({ status: "ready", configured: Boolean(payload.configured), rows: payload.rows ?? [] })
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase])

  const openEdit = (product: ProductSummary, currentStock: number) => {
    setEditSlug(product.slug)
    setEditName(product.name)
    setEditStock(String(currentStock))
    setEditError("")
    setEditOpen(true)
  }

  const saveStock = async () => {
    if (!supabase) return
    const trimmedSlug = editSlug.trim()
    if (!trimmedSlug) return

    const nextStock = Number(editStock)
    if (!Number.isFinite(nextStock) || !Number.isInteger(nextStock) || nextStock < 0) {
      setEditError("Stock must be a whole number (0 or higher).")
      return
    }

    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData.session?.access_token ?? ""
    if (!token) {
      setEditError("Your session expired. Please sign in again.")
      return
    }

    setSavingSlug(trimmedSlug)
    setEditError("")
    try {
      const response = await fetch("/api/admin/inventory", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", authorization: `Bearer ${token}` },
        body: JSON.stringify({ slug: trimmedSlug, stock: nextStock }),
      })

      const payload = (await response.json().catch(() => ({}))) as { error?: string }
      if (!response.ok) {
        throw new Error(payload.error || "Failed to update stock.")
      }

      setEditOpen(false)
      await load()
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Failed to update stock.")
    } finally {
      setSavingSlug(null)
    }
  }

  if (state.status === "signed_out") {
    return (
      <div className="rounded-2xl border border-border/30 bg-card/60 p-6 text-sm text-muted-foreground shadow-sm">
        You are not signed in.{" "}
        <Link href="/login?next=%2Fadmin%2Finventory" className="font-medium text-foreground underline underline-offset-4">
          Sign in
        </Link>
      </div>
    )
  }

  if (state.status === "error") {
    return <div className="rounded-2xl border border-border/30 bg-card/60 p-6 text-sm text-destructive shadow-sm">{state.message}</div>
  }

  const configured = state.status === "ready" ? state.configured : true
  const rows = state.status === "ready" ? state.rows : []
  const stockBySlug = new Map(rows.map((row) => [row.slug, row.stock] as const))

  return (
    <div className="rounded-2xl border border-border/30 bg-card/60 p-4 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">Inventory</p>
          <p className="mt-1 text-xs text-muted-foreground">Manually set stock per product slug.</p>
        </div>
      </div>

      {!configured ? (
        <div className="mt-4 rounded-xl border border-border/30 bg-background/40 p-4 text-sm text-muted-foreground">
          Inventory database is not configured yet. Run the SQL file{" "}
          <span className="font-medium text-foreground">supabase/sql/20260313_add_inventory_and_coupons.sql</span> in Supabase SQL Editor.
        </div>
      ) : null}

      <div className="mt-4 overflow-hidden rounded-xl border border-border/30">
        {state.status === "loading" ? (
          <div className="p-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="mt-3 h-10 w-full" />
            <Skeleton className="mt-3 h-10 w-full" />
          </div>
        ) : products.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">No products found.</div>
        ) : (
          <div className="divide-y divide-border/30">
            {products.map((product) => {
              const stock = stockBySlug.get(product.slug) ?? 0
              return (
                <div key={product.slug} className="flex flex-col gap-3 bg-background/40 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-semibold text-foreground">{product.name}</p>
                      <Badge className={stockBadge(stock)}>{stockLabel(stock)}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{product.category}</p>
                    <p className="mt-2 text-xs text-muted-foreground">Slug: {product.slug}</p>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <div className="rounded-lg border border-border/40 bg-background px-3 py-2 text-xs text-muted-foreground sm:text-right">
                      Stock: <span className="font-semibold text-foreground">{stock}</span>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEdit(product, stock)}
                      disabled={!configured}
                    >
                      Edit stock
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit stock</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div className="rounded-xl border border-border/30 bg-background/40 p-3">
              <p className="text-sm font-semibold text-foreground">{editName || editSlug}</p>
              {editSlug ? <p className="mt-1 text-xs text-muted-foreground">Slug: {editSlug}</p> : null}
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Stock</p>
              <Input
                inputMode="numeric"
                value={editStock}
                onChange={(e) => setEditStock(e.target.value.replace(/[^\d]/g, ""))}
                placeholder="0"
              />
              {editError ? <p className="text-sm font-medium text-destructive">{editError}</p> : null}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void saveStock()} disabled={Boolean(savingSlug)}>
              {savingSlug ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
