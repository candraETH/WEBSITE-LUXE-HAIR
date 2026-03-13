const WELCOME_COUPON_CODE = "WELCOME25"
const WELCOME_COUPON_DISCOUNT_RATE = 0.25

export const COUPON_STORAGE_KEYS = {
  activeCode: "candrashair-active-coupon-v1",
  claimedCodes: "candrashair-claimed-coupons-v1",
  popupSeen: "candrashair-coupon-popup-seen-v1",
} as const
export const COUPON_UPDATED_EVENT = "candrashair-coupon-updated"

export type CouponDefinition = {
  code: string
  title: string
  description: string
  discountRate: number
  minimumSubtotal: number
}

const COUPON_MAP: Record<string, CouponDefinition> = {
  [WELCOME_COUPON_CODE]: {
    code: WELCOME_COUPON_CODE,
    title: "Welcome 25% Off",
    description: "25% off for orders with minimum subtotal $1000.",
    discountRate: WELCOME_COUPON_DISCOUNT_RATE,
    minimumSubtotal: 1000,
  },
}

export function normalizeCouponCode(value: string | null | undefined): string {
  if (!value) {
    return ""
  }
  return value.trim().toUpperCase().replace(/\s+/g, "")
}

export function getCouponByCode(value: string | null | undefined): CouponDefinition | null {
  const normalized = normalizeCouponCode(value)
  if (!normalized) {
    return null
  }
  return COUPON_MAP[normalized] ?? null
}

export function calculateCouponDiscountCents(subtotalCents: number, discountRate: number): number {
  if (!Number.isFinite(subtotalCents) || subtotalCents <= 0) {
    return 0
  }
  if (!Number.isFinite(discountRate) || discountRate <= 0) {
    return 0
  }
  return Math.round(subtotalCents * discountRate)
}

export function calculateCouponDiscount(subtotal: number, discountRate: number): number {
  if (!Number.isFinite(subtotal) || subtotal <= 0) {
    return 0
  }
  if (!Number.isFinite(discountRate) || discountRate <= 0) {
    return 0
  }
  return Number((subtotal * discountRate).toFixed(2))
}

export function isCouponEligibleForSubtotal(coupon: CouponDefinition, subtotal: number): boolean {
  if (!Number.isFinite(subtotal) || subtotal <= 0) {
    return false
  }
  return subtotal >= coupon.minimumSubtotal
}

function canUseStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage)
}

function parseStringArray(value: string | null): string[] {
  if (!value) {
    return []
  }

  try {
    const parsed = JSON.parse(value) as unknown
    if (!Array.isArray(parsed)) {
      return []
    }
    return parsed.filter((item): item is string => typeof item === "string")
  } catch {
    return []
  }
}

export function loadActiveCouponCode(): string {
  if (!canUseStorage()) {
    return ""
  }
  return normalizeCouponCode(window.localStorage.getItem(COUPON_STORAGE_KEYS.activeCode))
}

export function saveActiveCouponCode(code: string) {
  if (!canUseStorage()) {
    return
  }

  const normalized = normalizeCouponCode(code)
  if (!normalized) {
    window.localStorage.removeItem(COUPON_STORAGE_KEYS.activeCode)
    return
  }
  window.localStorage.setItem(COUPON_STORAGE_KEYS.activeCode, normalized)
}

export function clearActiveCouponCode() {
  if (!canUseStorage()) {
    return
  }
  window.localStorage.removeItem(COUPON_STORAGE_KEYS.activeCode)
}

export function loadClaimedCouponCodes(): string[] {
  if (!canUseStorage()) {
    return []
  }
  const claimed = parseStringArray(window.localStorage.getItem(COUPON_STORAGE_KEYS.claimedCodes))
  return claimed.map((code) => normalizeCouponCode(code)).filter(Boolean)
}

export function hasClaimedCoupon(code: string): boolean {
  const normalized = normalizeCouponCode(code)
  if (!normalized) {
    return false
  }
  return loadClaimedCouponCodes().includes(normalized)
}

export function markCouponClaimed(code: string) {
  if (!canUseStorage()) {
    return
  }

  const normalized = normalizeCouponCode(code)
  if (!normalized) {
    return
  }

  const existing = loadClaimedCouponCodes()
  if (existing.includes(normalized)) {
    return
  }

  window.localStorage.setItem(COUPON_STORAGE_KEYS.claimedCodes, JSON.stringify([...existing, normalized]))
}

export function hasSeenCouponPopup(): boolean {
  if (!canUseStorage()) {
    return true
  }
  return window.localStorage.getItem(COUPON_STORAGE_KEYS.popupSeen) === "1"
}

export function markCouponPopupSeen() {
  if (!canUseStorage()) {
    return
  }
  window.localStorage.setItem(COUPON_STORAGE_KEYS.popupSeen, "1")
}

export function getWelcomeCoupon(): CouponDefinition {
  return COUPON_MAP[WELCOME_COUPON_CODE]
}

export function listCoupons(): CouponDefinition[] {
  return Object.values(COUPON_MAP)
}
