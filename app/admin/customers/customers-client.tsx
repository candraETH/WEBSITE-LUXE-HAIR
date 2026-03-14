"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { format, parseISO } from "date-fns"
import { Badge } from "@/components/ui/badge"
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
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

