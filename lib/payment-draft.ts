"use client"

export type CheckoutDetails = {
  fullName: string
  email: string
  whatsapp: string
  addressLine: string
  city: string
  province: string
  postalCode: string
  country: string
}

export type PaymentDraftItem = {
  slug: string
  name: string
  length: number
  variant?: string
  quantity: number
  unitPrice: number
}

export type PaymentDraft = {
  orderId: string
  status: "PAID" | "PENDING"
  currency: "USD"
  subtotal: number
  tax: number
  total: number
  customer: CheckoutDetails
  items: PaymentDraftItem[]
  createdAt: number
}

export const CHECKOUT_DETAILS_STORAGE_KEY = "candrashair-checkout-details-v1"
const PAYMENT_DRAFTS_STORAGE_KEY = "candrashair-payment-drafts-v1"
const PAYMENT_NOTIFICATION_SENT_KEY = "candrashair-payment-notified-v1"

export const EMPTY_CHECKOUT_DETAILS: CheckoutDetails = {
  fullName: "",
  email: "",
  whatsapp: "",
  addressLine: "",
  city: "",
  province: "",
  postalCode: "",
  country: "",
}

function canUseStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage)
}

function getSensitiveStorage() {
  if (typeof window === "undefined") {
    return null
  }

  return window.sessionStorage ?? window.localStorage
}

function parseRecord(value: string | null): Record<string, unknown> {
  if (!value) {
    return {}
  }

  try {
    const parsed = JSON.parse(value) as unknown
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {}
    }
    return parsed as Record<string, unknown>
  } catch {
    return {}
  }
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

export function loadCheckoutDetails(): CheckoutDetails {
  if (!canUseStorage()) {
    return EMPTY_CHECKOUT_DETAILS
  }

  const storage = getSensitiveStorage()
  const parsed = parseRecord(storage?.getItem(CHECKOUT_DETAILS_STORAGE_KEY) ?? null)
  return {
    fullName: typeof parsed.fullName === "string" ? parsed.fullName : "",
    email: typeof parsed.email === "string" ? parsed.email : "",
    whatsapp: typeof parsed.whatsapp === "string" ? parsed.whatsapp : "",
    addressLine: typeof parsed.addressLine === "string" ? parsed.addressLine : "",
    city: typeof parsed.city === "string" ? parsed.city : "",
    province: typeof parsed.province === "string" ? parsed.province : "",
    postalCode: typeof parsed.postalCode === "string" ? parsed.postalCode : "",
    country: typeof parsed.country === "string" ? parsed.country : "",
  }
}

export function saveCheckoutDetails(details: CheckoutDetails) {
  if (!canUseStorage()) {
    return
  }

  const storage = getSensitiveStorage()
  storage?.setItem(CHECKOUT_DETAILS_STORAGE_KEY, JSON.stringify(details))
}

function loadPaymentDraftRecord(): Record<string, PaymentDraft> {
  if (!canUseStorage()) {
    return {}
  }

  const storage = getSensitiveStorage()
  const parsed = parseRecord(storage?.getItem(PAYMENT_DRAFTS_STORAGE_KEY) ?? null)
  const entries = Object.entries(parsed)
  const result: Record<string, PaymentDraft> = {}

  for (const [orderId, draft] of entries) {
    if (!draft || typeof draft !== "object") {
      continue
    }

    const payload = draft as Partial<PaymentDraft>
    if (typeof payload.orderId !== "string" || payload.orderId !== orderId) {
      continue
    }

    result[orderId] = {
      orderId,
      status: payload.status === "PAID" ? "PAID" : "PENDING",
      currency: "USD",
      subtotal: typeof payload.subtotal === "number" ? payload.subtotal : 0,
      tax: typeof payload.tax === "number" ? payload.tax : 0,
      total: typeof payload.total === "number" ? payload.total : 0,
      createdAt: typeof payload.createdAt === "number" ? payload.createdAt : Date.now(),
      customer: {
        fullName: payload.customer?.fullName ?? "",
        email: payload.customer?.email ?? "",
        whatsapp: payload.customer?.whatsapp ?? "",
        addressLine: payload.customer?.addressLine ?? "",
        city: payload.customer?.city ?? "",
        province: payload.customer?.province ?? "",
        postalCode: payload.customer?.postalCode ?? "",
        country: payload.customer?.country ?? "",
      },
      items: Array.isArray(payload.items)
        ? payload.items
            .filter((item): item is PaymentDraftItem => Boolean(item && typeof item === "object"))
            .map((item) => ({
              slug: typeof item.slug === "string" ? item.slug : "",
              name: typeof item.name === "string" ? item.name : "",
              length: typeof item.length === "number" ? item.length : 0,
              variant: typeof item.variant === "string" && item.variant.trim() ? item.variant : undefined,
              quantity: typeof item.quantity === "number" ? item.quantity : 1,
              unitPrice: typeof item.unitPrice === "number" ? item.unitPrice : 0,
            }))
        : [],
    }
  }

  return result
}

function savePaymentDraftRecord(record: Record<string, PaymentDraft>) {
  if (!canUseStorage()) {
    return
  }

  const storage = getSensitiveStorage()
  storage?.setItem(PAYMENT_DRAFTS_STORAGE_KEY, JSON.stringify(record))
}

export function savePaymentDraft(draft: PaymentDraft) {
  const record = loadPaymentDraftRecord()
  record[draft.orderId] = draft
  savePaymentDraftRecord(record)
}

export function getPaymentDraft(orderId: string): PaymentDraft | null {
  const record = loadPaymentDraftRecord()
  return record[orderId] ?? null
}

export function updatePaymentDraftStatus(orderId: string, status: "PAID" | "PENDING") {
  const record = loadPaymentDraftRecord()
  const existing = record[orderId]
  if (!existing) {
    return
  }

  record[orderId] = { ...existing, status }
  savePaymentDraftRecord(record)
}

export function removePaymentDraft(orderId: string) {
  const record = loadPaymentDraftRecord()
  if (!record[orderId]) {
    return
  }

  delete record[orderId]
  savePaymentDraftRecord(record)
}

export function wasPaymentNotificationSent(orderId: string): boolean {
  if (!canUseStorage()) {
    return false
  }

  const notified = parseStringArray(window.localStorage.getItem(PAYMENT_NOTIFICATION_SENT_KEY))
  return notified.includes(orderId)
}

export function markPaymentNotificationSent(orderId: string) {
  if (!canUseStorage()) {
    return
  }

  const notified = parseStringArray(window.localStorage.getItem(PAYMENT_NOTIFICATION_SENT_KEY))
  if (notified.includes(orderId)) {
    return
  }

  window.localStorage.setItem(PAYMENT_NOTIFICATION_SENT_KEY, JSON.stringify([...notified, orderId]))
}

export function normalizeWhatsAppNumber(value: string): string {
  const digits = value.replace(/\D/g, "")
  if (!digits) {
    return ""
  }

  if (digits.startsWith("00")) {
    return digits.slice(2)
  }

  if (digits.startsWith("0")) {
    return `62${digits.slice(1)}`
  }

  return digits
}

export function isValidEmail(value: string): boolean {
  const normalized = value.trim()
  if (!normalized) {
    return false
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)
}
