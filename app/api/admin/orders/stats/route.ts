import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"
import { logServerError, publicErrorMessage } from "@/lib/api-errors"
import { supabase } from "@/lib/supabase-server"

export const runtime = "nodejs"

function isoDaysAgo(days: number) {
  const ms = Math.max(0, Math.floor(days)) * 24 * 60 * 60 * 1000
  return new Date(Date.now() - ms).toISOString()
}

function isMissingColumnError(message: string) {
  const normalized = message.trim().toLowerCase()
  return (
    (normalized.includes("column") && normalized.includes("does not exist")) ||
    (normalized.includes("could not find") && normalized.includes("column") && normalized.includes("schema cache")) ||
    (normalized.includes("schema cache") && normalized.includes("column"))
  )
}

async function countOrders(where: {
  createdAfterIso: string
  status?: string | string[]
}) {
  type StatusFilterable<T> = {
    in: (column: string, values: string[]) => T
    eq: (column: string, value: string) => T
  }

  const applyStatusFilter = <T extends StatusFilterable<T>>(query: T): T => {
    if (Array.isArray(where.status)) {
      return query.in("status", where.status)
    }
    if (typeof where.status === "string" && where.status.trim()) {
      return query.eq("status", where.status.trim())
    }
    return query
  }

  const tryCount = async (timeColumn: "created_at" | "updated_at" | null) => {
    let query = supabase.from("orders").select("*", { count: "exact", head: true })
    if (timeColumn) {
      query = query.gte(timeColumn, where.createdAfterIso)
    }
    query = applyStatusFilter(query)

    const { count, error } = await query
    if (error) return { ok: false as const, error }
    return { ok: true as const, count: count ?? 0 }
  }

  const first = await tryCount("created_at")
  if (first.ok) return first.count
  if (!isMissingColumnError(first.error.message)) throw first.error

  const second = await tryCount("updated_at")
  if (second.ok) return second.count
  if (!isMissingColumnError(second.error.message)) throw second.error

  const fallback = await tryCount(null)
  if (fallback.ok) return fallback.count
  throw fallback.error
}

export async function GET(request: Request) {
  const auth = await requireAdmin(request)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }

  const windowDays = 365
  const createdAfterIso = isoDaysAgo(windowDays)

  try {
    const [totalOrders, newOrders, completedOrders, cancelledOrders] = await Promise.all([
      countOrders({ createdAfterIso }),
      countOrders({ createdAfterIso, status: "PENDING" }),
      countOrders({ createdAfterIso, status: ["DELIVERED", "COMPLETED"] }),
      countOrders({ createdAfterIso, status: "CANCELLED" }),
    ])

    return NextResponse.json({ windowDays, totalOrders, newOrders, completedOrders, cancelledOrders })
  } catch (err) {
    logServerError("Admin orders stats failed:", err)
    return NextResponse.json({ error: publicErrorMessage(err, "Unable to load order stats.") }, { status: 500 })
  }
}
