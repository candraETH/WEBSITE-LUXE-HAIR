import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase-server"

export const runtime = "nodejs"

function getBearerToken(request: Request): string | null {
  const header = request.headers.get("authorization") ?? ""
  if (!header.toLowerCase().startsWith("bearer ")) {
    return null
  }
  const token = header.slice(7).trim()
  return token || null
}

function normalizeStatus(value: unknown) {
  return typeof value === "string" ? value.trim().toUpperCase() : ""
}

function asNumber(value: unknown) {
  const num = typeof value === "number" ? value : Number(value ?? NaN)
  return Number.isFinite(num) ? num : 0
}

export async function GET(request: Request) {
  const token = getBearerToken(request)
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data: userData, error: userError } = await supabase.auth.getUser(token)
  if (userError || !userData.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const email = userData.user.email.trim().toLowerCase()
  const paidStatuses = new Set(["PAID", "PROCESSING", "SHIPPED", "DELIVERED", "COMPLETED"])

  const { data, error } = await supabase
    .from("orders")
    .select("amount,status,currency")
    .eq("customer_email", email)
    .limit(500)

  if (error) {
    return NextResponse.json({ error: "Unable to read loyalty data." }, { status: 500 })
  }

  let total = 0
  for (const row of data ?? []) {
    const status = normalizeStatus((row as { status?: unknown }).status)
    if (!paidStatuses.has(status)) continue

    const currency = (row as { currency?: unknown }).currency
    if (typeof currency === "string" && currency.trim() && currency.trim().toUpperCase() !== "USD") {
      continue
    }

    total += asNumber((row as { amount?: unknown }).amount)
  }

  const totalSpent = Number(total.toFixed(2))
  const totalPoints = Math.max(0, Math.floor(totalSpent))

  return NextResponse.json({ totalSpent, totalPoints, currency: "USD" })
}
