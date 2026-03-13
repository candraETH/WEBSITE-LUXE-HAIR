"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { format, parseISO } from "date-fns"
import { Badge } from "@/components/ui/badge"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { getSupabaseBrowserClient } from "@/lib/supabase-browser"

type CustomerRow = {
  id: string
  fullName: string
  email?: string
  phone: string
  role: "admin" | "user" | string
  createdAt: string | null
  updatedAt: string | null
}

type UiState =
  | { status: "loading" }
  | { status: "signed_out" }
  | { status: "error"; message: string }
  | { status: "ready"; customers: CustomerRow[] }

function formatDate(value: string | null): string {
  if (!value) return "-"
  try {
    return format(parseISO(value), "MMM d, yyyy")
  } catch {
    return value
  }
}

function roleBadge(role: string) {
  const normalized = role.trim().toLowerCase()
  if (normalized === "admin") return "border-0 bg-foreground text-background"
  return "border-0 bg-muted text-foreground"
}

function shortId(value: string) {
  const id = value.trim()
  if (id.length <= 10) return id
  return `${id.slice(0, 2)}.....${id.slice(-4)}`
}

export function AdminCustomersClient({ initialQuery }: { initialQuery: string }) {
  const supabase = useMemo(() => getSupabaseBrowserClient(), [])
  const [state, setState] = useState<UiState>({ status: "loading" })
  const [savingId, setSavingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [confirmChange, setConfirmChange] = useState<{
    userId: string
    currentRole: "admin" | "user"
    nextRole: "admin" | "user"
    label: string
  } | null>(null)

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
    params.set("limit", "100")

    const response = await fetch(`/api/admin/customers?${params.toString()}`, {
      headers: { authorization: `Bearer ${token}` },
    })

    const payload = (await response.json().catch(() => ({}))) as { error?: string; customers?: CustomerRow[] }
    if (!response.ok) {
      setState({ status: "error", message: payload.error || "Failed to load customers." })
      return
    }

    setState({ status: "ready", customers: payload.customers ?? [] })
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery, supabase])

  const updateRole = async (userId: string, role: "admin" | "user") => {
    if (!supabase) return

    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData.session?.access_token ?? ""
    if (!token) {
      setError("Your session expired. Please sign in again.")
      return
    }

    setSavingId(userId)
    setError(null)
    try {
      const response = await fetch("/api/admin/customers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId, role }),
      })
      const payload = (await response.json().catch(() => ({}))) as { error?: string }
      if (!response.ok) {
        throw new Error(payload.error || "Failed to update role.")
      }
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update role.")
    } finally {
      setSavingId(null)
    }
  }

  const confirmRoleChange = (customer: CustomerRow, nextRole: "admin" | "user") => {
    const currentRole = customer.role.trim().toLowerCase() === "admin" ? "admin" : "user"
    if (currentRole === nextRole) {
      return
    }
    setConfirmChange({
      userId: customer.id,
      currentRole,
      nextRole,
      label: nextRole === "admin" ? "Change role to admin?" : "Change role to user?",
    })
  }

  const commitRoleChange = async () => {
    if (!confirmChange) return
    const { userId, nextRole } = confirmChange
    await updateRole(userId, nextRole)
    setConfirmChange(null)
  }

  if (state.status === "signed_out") {
    return (
      <div className="rounded-2xl border border-border/30 bg-card/60 p-6 text-sm text-muted-foreground shadow-sm">
        You are not signed in.{" "}
        <Link href="/login?next=%2Fadmin%2Fcustomers" className="font-medium text-foreground underline underline-offset-4">
          Sign in
        </Link>
      </div>
    )
  }

  if (state.status === "error") {
    return <div className="rounded-2xl border border-border/30 bg-card/60 p-6 text-sm text-destructive shadow-sm">{state.message}</div>
  }

  const customers = state.status === "ready" ? state.customers : []

  return (
    <div className="rounded-2xl border border-border/30 bg-card/60 p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">All customers</p>
          <p className="mt-1 text-xs text-muted-foreground">Use the top search bar to filter customers.</p>
        </div>
      </div>

      {error && <p className="mt-3 text-sm font-medium text-destructive">{error}</p>}

      <div className="mt-4 overflow-hidden rounded-xl border border-border/30">
        {state.status === "loading" ? (
          <div className="p-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="mt-3 h-10 w-full" />
            <Skeleton className="mt-3 h-10 w-full" />
          </div>
        ) : customers.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">No customers found.</div>
        ) : (
          <div className="divide-y divide-border/30">
            {customers.map((customer) => {
              const currentRole = customer.role.trim().toLowerCase() === "admin" ? "admin" : "user"
              return (
                <div key={customer.id} className="flex flex-col gap-3 bg-background/40 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-semibold text-foreground">{customer.fullName || "Unnamed customer"}</p>
                      <Badge className={roleBadge(customer.role)}>{currentRole}</Badge>
                    </div>
                    {customer.email?.trim() && <p className="mt-1 text-xs text-muted-foreground">{customer.email.trim()}</p>}
                    <p className="mt-1 text-xs text-muted-foreground">
                      {customer.phone || "-"} • Joined {formatDate(customer.createdAt)}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">ID: {shortId(customer.id)}</p>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <div className="w-full sm:w-[160px]">
                      <Select
                        value={currentRole}
                        onValueChange={(value) => confirmRoleChange(customer, value as "admin" | "user")}
                        disabled={Boolean(savingId) && savingId === customer.id}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">user</SelectItem>
                          <SelectItem value="admin">admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <AlertDialog open={Boolean(confirmChange)} onOpenChange={(open) => (!open ? setConfirmChange(null) : null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmChange?.label ?? "Confirm change"}</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmChange(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void commitRoleChange()} disabled={Boolean(savingId)}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
