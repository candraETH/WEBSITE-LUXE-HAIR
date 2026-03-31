import "server-only"
import { supabase } from "@/lib/supabase-server"

export function isMissingColumnError(message: string) {
  const normalized = message.trim().toLowerCase()
  return (
    (normalized.includes("column") && normalized.includes("does not exist")) ||
    (normalized.includes("could not find") && normalized.includes("column") && normalized.includes("schema cache")) ||
    (normalized.includes("schema cache") && normalized.includes("column"))
  )
}

export function buildPhoneCandidates(rawValue: string): string[] {
  const raw = rawValue.trim()
  const digits = raw.replace(/\D/g, "")
  const values = new Set<string>()

  if (raw) {
    values.add(raw)
  }

  if (digits) {
    values.add(digits)
    values.add(`+${digits}`)

    if (digits.startsWith("00") && digits.length > 2) {
      values.add(`+${digits.slice(2)}`)
    }

    if (digits.startsWith("62")) {
      values.add(`+${digits}`)
    }

    if (digits.startsWith("0") && digits.length > 1) {
      values.add(`+62${digits.slice(1)}`)
    }
  }

  return Array.from(values).filter(Boolean)
}

function normalizePhoneDigits(value: string): string {
  return value.replace(/\D/g, "")
}

export function extractPhoneFromCartJson(value: unknown): string | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null
  }

  const root = value as Record<string, unknown>
  const customer = root.customer
  if (!customer || typeof customer !== "object" || Array.isArray(customer)) {
    return null
  }

  const customerObj = customer as Record<string, unknown>
  const directPhone = customerObj.phone_number
  if (typeof directPhone === "string" && directPhone.trim()) {
    return directPhone.trim()
  }

  const whatsapp = customerObj.whatsapp
  if (typeof whatsapp === "string" && whatsapp.trim()) {
    return whatsapp.trim()
  }

  return null
}

export function extractEmailFromCartJson(value: unknown): string | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null
  }

  const root = value as Record<string, unknown>
  const customer = root.customer
  if (!customer || typeof customer !== "object" || Array.isArray(customer)) {
    return null
  }

  const customerObj = customer as Record<string, unknown>
  const directEmail = customerObj.email
  if (typeof directEmail === "string" && directEmail.trim()) {
    return directEmail.trim()
  }

  return null
}

export async function queryOrderByOrderAndPhone<T extends Record<string, unknown>>(
  orderId: string,
  phoneNumber: string,
  select: string
): Promise<{ data: T | null; error: string | null }> {
  const phoneColumns = ["phone_number", "customer_phone", "customer_whatsapp", "whatsapp"] as const
  const candidates = buildPhoneCandidates(phoneNumber)

  const phoneMatches = (storedPhone: string, inputPhone: string) => {
    const input = normalizePhoneDigits(inputPhone)
    const stored = normalizePhoneDigits(storedPhone)
    if (!input || !stored) return false
    return input === stored
  }

  const extractPhoneFromRow = (row: Record<string, unknown>) => {
    const directCandidates = phoneColumns
      .map((key) => row[key])
      .filter((value): value is string => typeof value === "string" && Boolean(value.trim()))

    if (directCandidates.length > 0) {
      return directCandidates[0].trim()
    }

    return extractPhoneFromCartJson(row.cart_json) ?? ""
  }

  const extractMissingColumnName = (message: string): string | null => {
    const matchSchemaCache = message.match(/'([^']+)'\s+column/i)
    if (matchSchemaCache?.[1]) return matchSchemaCache[1]

    const matchPg = message.match(/column\s+\"([^\"]+)\"\s+does not exist/i)
    if (matchPg?.[1]) return matchPg[1]

    return null
  }

  const parseSelectColumns = (value: string) =>
    value
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean)

  const queryOrderByIdWithSelectFallback = async (): Promise<{ data: T | null; error: string | null }> => {
    const baseColumns = new Set(parseSelectColumns(select))
    baseColumns.add("paypal_order_id")
    baseColumns.add("cart_json")

    let columns = Array.from(baseColumns)
    let attemptsLeft = 12
    let lastError: string | null = null

    while (attemptsLeft > 0) {
      attemptsLeft -= 1

      const selectClause = columns.join(",")
      const { data, error } = await supabase
        .from("orders")
        .select(selectClause)
        .eq("paypal_order_id", orderId)
        .maybeSingle()

      if (!error) {
        return { data: (data as unknown as T) ?? null, error: null }
      }

      lastError = error.message

      if (!isMissingColumnError(error.message)) {
        return { data: null, error: error.message }
      }

      const missing = extractMissingColumnName(error.message)
      if (!missing) {
        return { data: null, error: error.message }
      }

      columns = columns.filter((col) => col !== missing)
      if (columns.length === 0) {
        return { data: null, error: error.message }
      }
    }

    return { data: null, error: lastError ?? "Unable to read order data." }
  }

  for (const candidate of candidates) {
    for (const column of phoneColumns) {
      const { data, error } = await supabase
        .from("orders")
        .select(select)
        .eq("paypal_order_id", orderId)
        .eq(column, candidate)
        .maybeSingle()

      if (error) {
        if (isMissingColumnError(error.message)) {
          continue
        }
        return { data: null, error: error.message }
      }

      if (data) {
        return { data: data as unknown as T, error: null }
      }
    }
  }

  // Fallback: if the orders table doesn't have a phone column, look up by order id and compare against cart_json.
  const fallback = await queryOrderByIdWithSelectFallback()
  if (fallback.error || !fallback.data) {
    return fallback
  }

  const storedPhone = extractPhoneFromRow(fallback.data)
  const match = candidates.some((candidate) => phoneMatches(storedPhone, candidate))
  if (!match) {
    return { data: null, error: null }
  }

  return { data: fallback.data, error: null }
}
