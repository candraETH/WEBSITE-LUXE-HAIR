import "server-only"

import { supabase } from "@/lib/supabase-server"
import { getCouponByCode, normalizeCouponCode, type CouponDefinition } from "@/lib/coupon"
import type { LoyaltyTierKey } from "@/lib/loyalty-tier"

function isMissingRelationError(message: string) {
  const normalized = message.trim().toLowerCase()
  return normalized.includes("relation") && normalized.includes("does not exist")
}

function asNumber(value: unknown) {
  const num = typeof value === "number" ? value : Number(value ?? NaN)
  return Number.isFinite(num) ? num : 0
}

function safeString(value: unknown) {
  return typeof value === "string" ? value : ""
}

function isWithinWindow(nowMs: number, startsAt: string | null, endsAt: string | null) {
  if (startsAt) {
    const startMs = Date.parse(startsAt)
    if (Number.isFinite(startMs) && nowMs < startMs) return false
  }
  if (endsAt) {
    const endMs = Date.parse(endsAt)
    if (Number.isFinite(endMs) && nowMs > endMs) return false
  }
  return true
}

export async function resolveCouponDefinition(code: string | null | undefined): Promise<CouponDefinition | null> {
  const normalized = normalizeCouponCode(code)
  if (!normalized) return null

  const builtIn = getCouponByCode(normalized)
  if (builtIn) return builtIn

  const { data, error } = await supabase
    .from("coupons")
    .select("code,title,description,discount_rate,minimum_subtotal,active,starts_at,ends_at,max_uses_total,max_uses_per_customer,min_tier_key")
    .eq("code", normalized)
    .maybeSingle()

  if (error) {
    if (isMissingRelationError(error.message)) {
      return null
    }
    throw new Error(error.message)
  }

  if (!data) return null
  if (!data.active) return null

  const nowMs = Date.now()
  const startsAt = (data.starts_at as string | null) ?? null
  const endsAt = (data.ends_at as string | null) ?? null
  if (!isWithinWindow(nowMs, startsAt, endsAt)) return null

  const discountRate = asNumber(data.discount_rate)
  const minimumSubtotal = asNumber(data.minimum_subtotal)
  if (discountRate <= 0 || discountRate >= 1) return null
  if (minimumSubtotal < 0) return null

  const maxUsesTotal = (data as { max_uses_total?: unknown }).max_uses_total
  const maxUsesPerCustomer = (data as { max_uses_per_customer?: unknown }).max_uses_per_customer
  const minTierKeyRaw = safeString((data as { min_tier_key?: unknown }).min_tier_key).trim().toLowerCase()

  return {
    code: (data.code as string) ?? normalized,
    title: (data.title as string) ?? normalized,
    description: (data.description as string) ?? "",
    discountRate,
    minimumSubtotal,
    maxUsesTotal: maxUsesTotal == null ? null : asNumber(maxUsesTotal),
    maxUsesPerCustomer: maxUsesPerCustomer == null ? null : asNumber(maxUsesPerCustomer),
    minTierKey: (minTierKeyRaw || null) as LoyaltyTierKey | null,
  }
}
