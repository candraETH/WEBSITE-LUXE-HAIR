import "server-only"
import { supabase } from "@/lib/supabase-server"

export function isMissingColumnError(message: string) {
  const normalized = message.trim().toLowerCase()
  return normalized.includes("column") && normalized.includes("does not exist")
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

  return { data: null, error: null }
}
