"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { Check, ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"
import type { CheckoutCustomerInput } from "@/lib/checkout-customer"
import { BULK_PRODUCTS } from "@/lib/bulk-products"
import { getSupabaseBrowserClient } from "@/lib/supabase-browser"
import { WEFT_PRODUCTS } from "@/lib/weft-products"

type UiState =
  | { status: "loading" }
  | { status: "signed_out" }
  | { status: "error"; message: string }
  | { status: "ready"; order: Record<string, unknown> }

function safeString(value: unknown): string {
  return typeof value === "string" ? value : ""
}

type StatusKey = "pending" | "processing" | "shipped" | "delivered" | "cancelled" | "paid" | "other"

function normalizeStatus(status: string): StatusKey {
  const raw = status.trim().toLowerCase()
  const normalized = raw === "canceled" ? "cancelled" : raw

  if (normalized === "pending") return "pending"
  if (normalized === "processing") return "processing"
  if (normalized === "shipped") return "shipped"
  if (normalized === "delivered") return "delivered"
  if (normalized === "paid") return "paid"
  if (["cancelled", "failed", "refunded"].includes(normalized)) return "cancelled"
  return "other"
}

function statusLabel(status: string): string {
  const key = normalizeStatus(status)
  if (key === "other") return status.trim() || "Unknown"
  return key.toUpperCase()
}

type PaymentStatusKey = "pending" | "paid"

type CheckoutOtpRequestResponse = {
  error?: string
  challengeId?: string
  destination?: string
  devOtpCode?: string
}

type CheckoutOtpVerifyResponse = {
  error?: string
  verificationToken?: string
}

function normalizePaymentStatus(status: string): PaymentStatusKey {
  const normalized = status.trim().toLowerCase()
  if (["paid", "processing", "shipped", "delivered", "completed"].includes(normalized)) {
    return "paid"
  }
  return "pending"
}

function statusBadgeClass(key: StatusKey): string {
  const base = "border-0 font-medium"
  switch (key) {
    case "pending":
      return `${base} bg-orange-50 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300`
    case "processing":
      return `${base} bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300`
    case "shipped":
      return `${base} bg-purple-50 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300`
    case "delivered":
    case "paid":
      return `${base} bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300`
    case "cancelled":
      return `${base} bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300`
    default:
      return `${base} bg-muted text-foreground dark:bg-muted/40`
  }
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount)
  } catch {
    return `${currency} ${amount.toFixed(2)}`
  }
}

function maskNamePart(value: string): string {
  const token = value.trim()
  if (!token) return ""
  if (token.length <= 2) return token[0] ? `${token[0]}*` : "*"
  return `${token[0]}${"*".repeat(Math.max(2, token.length - 2))}${token[token.length - 1]}`
}

function maskCustomerName(fullName: string): string {
  const parts = fullName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (parts.length === 0) return "-"
  return parts.map(maskNamePart).join(" ")
}

function maskPhoneNumber(value: string): string {
  const compact = value.trim().replace(/[^\d+]/g, "")
  if (!compact) return "-"
  const digits = compact.replace(/\D/g, "")
  if (!digits) return "-"

  const countryCodeLength = digits.startsWith("1")
    ? 1
    : digits.startsWith("971")
      ? 3
      : digits.startsWith("966")
        ? 3
        : digits.startsWith("62")
          ? 2
          : 2

  const safeCountryLength = Math.min(countryCodeLength, Math.max(1, digits.length - 3))
  const countryCode = `+${digits.slice(0, safeCountryLength)}`
  const lastThree = digits.slice(-3)
  const maskedDigitsCount = Math.max(2, digits.length - safeCountryLength - 3)
  return `${countryCode}${"*".repeat(maskedDigitsCount)}${lastThree}`
}

type CartJsonItem = {
  name?: unknown
  slug?: unknown
  length?: unknown
  category?: unknown
  quantity?: unknown
  line_total?: unknown
}

type CartJsonRoot = {
  customer?: {
    name?: unknown
    email?: unknown
    phone_number?: unknown
    address_line?: unknown
    city?: unknown
    province?: unknown
    postal_code?: unknown
    country?: unknown
  }
  summary?: {
    subtotal?: unknown
    tax?: unknown
    shipping?: unknown
    total?: unknown
  }
  items?: unknown
}

function getCartJsonRoot(value: unknown): CartJsonRoot {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {}
  return value as CartJsonRoot
}

const PRODUCT_IMAGE_BY_SLUG = new Map(
  [...BULK_PRODUCTS, ...WEFT_PRODUCTS]
    .map((product) => [product.slug, product.image ?? product.images?.[0] ?? ""] as const)
    .filter((entry) => Boolean(entry[1]))
)

function extractItems(
  cartJson: unknown,
): Array<{ name: string; slug: string; lengthLabel: string; category: string; quantity: number; lineTotal: number | null }> {
  const root = getCartJsonRoot(cartJson)
  const itemsSource = Array.isArray(root.items) ? root.items : []
  const items = itemsSource.filter((item): item is CartJsonItem => Boolean(item && typeof item === "object"))

  return items
    .map((item) => {
      const name = safeString(item.name).trim()
      if (!name) return null
      const slug = safeString(item.slug).trim()
      const lengthValue = asNumber(item.length)
      const lengthLabel = typeof lengthValue === "number" && lengthValue > 0 ? `${lengthValue}"` : "-"
      const category = safeString(item.category).trim() || "-"
      const quantityRaw = asNumber(item.quantity)
      const quantity = quantityRaw && quantityRaw > 0 ? Math.floor(quantityRaw) : 1
      const lineTotal = asNumber(item.line_total)
      return { name, slug, lengthLabel, category, quantity, lineTotal }
    })
    .filter(Boolean) as Array<{
    name: string
    slug: string
    lengthLabel: string
    category: string
    quantity: number
    lineTotal: number | null
  }>
}

function buildCheckoutCustomer(order: Record<string, unknown>, root: CartJsonRoot): CheckoutCustomerInput | null {
  const customer = root.customer ?? {}
  const fullName = safeString(customer.name).trim() || safeString(order.customer_name).trim()
  const email = safeString(customer.email).trim() || safeString(order.customer_email).trim()
  const whatsapp = safeString(customer.phone_number).trim()
  const addressLine = safeString(customer.address_line).trim()
  const city = safeString(customer.city).trim()
  const province = safeString(customer.province).trim()
  const postalCode = safeString(customer.postal_code).trim()
  const country = safeString(customer.country).trim()

  if (!fullName || !email || !whatsapp || !addressLine || !city || !province || !postalCode || !country) {
    return null
  }

  return {
    fullName,
    email,
    whatsapp,
    addressLine,
    city,
    province,
    postalCode,
    country,
  }
}

export function OrderDetailClient({ orderId }: { orderId: string }) {
  const supabase = useMemo(() => getSupabaseBrowserClient(), [])
  const [state, setState] = useState<UiState>({ status: "loading" })
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [whatsappOtpChallengeId, setWhatsappOtpChallengeId] = useState("")
  const [whatsappOtpCode, setWhatsappOtpCode] = useState("")
  const [whatsappOtpInfo, setWhatsappOtpInfo] = useState("")
  const [whatsappOtpError, setWhatsappOtpError] = useState("")
  const [whatsappOtpLoading, setWhatsappOtpLoading] = useState(false)
  const [whatsappOtpVerifying, setWhatsappOtpVerifying] = useState(false)
  const [whatsappOtpVerified, setWhatsappOtpVerified] = useState(false)
  const [whatsappLoading, setWhatsappLoading] = useState(false)
  const [whatsappError, setWhatsappError] = useState("")

  useEffect(() => {
    let cancelled = false
    if (!supabase) {
      setState({ status: "signed_out" })
      return
    }
    const client = supabase

    async function load() {
      const { data: sessionData } = await client.auth.getSession()
      const token = sessionData.session?.access_token
      if (!token) {
        if (!cancelled) setState({ status: "signed_out" })
        return
      }

      const response = await fetch(`/api/account/orders/${encodeURIComponent(orderId)}`, {
        headers: { authorization: `Bearer ${token}` },
      })

      const payload = (await response.json().catch(() => ({}))) as { error?: string; order?: Record<string, unknown> }
      if (!response.ok || !payload.order) {
        if (!cancelled) setState({ status: "error", message: payload.error || "Failed to load order." })
        return
      }

      if (!cancelled) setState({ status: "ready", order: payload.order })
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [orderId, supabase])

  async function handleRequestWhatsappOtp() {
    setWhatsappError("")
    setWhatsappOtpError("")
    setWhatsappOtpInfo("")
    setWhatsappOtpLoading(true)

    try {
      if (!supabase) {
        throw new Error("Authentication is unavailable.")
      }

      const customer = buildCheckoutCustomer(order, cartRoot)
      if (!customer) {
        throw new Error("Customer details are incomplete for OTP verification.")
      }

      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      if (!token) {
        throw new Error("You are not signed in.")
      }

      const response = await fetch("/api/checkout/request-verification", {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ customer }),
      })

      const payload = (await response.json().catch(() => ({}))) as CheckoutOtpRequestResponse
      if (!response.ok || !payload.challengeId) {
        throw new Error(payload.error || "Unable to send OTP.")
      }

      setWhatsappOtpChallengeId(payload.challengeId)
      setWhatsappOtpCode("")
      setWhatsappOtpVerified(false)
      setWhatsappOtpInfo(
        `${payload.destination ? `OTP sent to ${payload.destination}.` : "OTP sent to your registered email."}${
          payload.devOtpCode ? ` Dev code: ${payload.devOtpCode}` : ""
        }`
      )
    } catch (error) {
      setWhatsappOtpError(error instanceof Error ? error.message : "Unable to send OTP.")
    } finally {
      setWhatsappOtpLoading(false)
    }
  }

  async function handleVerifyWhatsappOtp() {
    setWhatsappError("")
    setWhatsappOtpError("")
    setWhatsappOtpLoading(false)

    if (!whatsappOtpChallengeId) {
      setWhatsappOtpError("Request an OTP first.")
      return
    }

    const code = whatsappOtpCode.replace(/\D/g, "")
    if (!/^\d{6}$/.test(code)) {
      setWhatsappOtpError("Enter the 6-digit OTP from your email.")
      return
    }

    setWhatsappOtpVerifying(true)
    try {
      if (!supabase) {
        throw new Error("Authentication is unavailable.")
      }

      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      if (!token) {
        throw new Error("You are not signed in.")
      }

      const response = await fetch("/api/checkout/verify-verification", {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          challengeId: whatsappOtpChallengeId,
          otpCode: code,
        }),
      })

      const payload = (await response.json().catch(() => ({}))) as CheckoutOtpVerifyResponse
      if (!response.ok || !payload.verificationToken) {
        throw new Error(payload.error || "Unable to verify OTP.")
      }

      setWhatsappOtpVerified(true)
      setWhatsappOtpInfo("OTP verified. You can send the WhatsApp confirmation now.")
      setWhatsappOtpChallengeId("")
      setWhatsappOtpCode("")
    } catch (error) {
      setWhatsappOtpError(error instanceof Error ? error.message : "Unable to verify OTP.")
    } finally {
      setWhatsappOtpVerifying(false)
    }
  }

  async function handleSendToWhatsapp() {
    setWhatsappError("")
    setWhatsappLoading(true)

    try {
      if (!supabase) {
        throw new Error("Authentication is unavailable.")
      }

      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      if (!token) {
        throw new Error("You are not signed in.")
      }

      if (!whatsappOtpVerified) {
        throw new Error("Verify the OTP first.")
      }

      const response = await fetch("/api/whatsapp-confirmation", {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ orderId }),
      })

      const payload = (await response.json().catch(() => ({}))) as { error?: string; sellerUrl?: string }
      if (!response.ok || !payload.sellerUrl) {
        throw new Error(payload.error || "Unable to prepare WhatsApp confirmation.")
      }

      window.location.href = payload.sellerUrl
      setWhatsappOtpVerified(false)
      setWhatsappOtpInfo("")
      setWhatsappOtpCode("")
    } catch (error) {
      setWhatsappError(error instanceof Error ? error.message : "Unable to prepare WhatsApp confirmation.")
    } finally {
      setWhatsappLoading(false)
    }
  }

  if (state.status === "loading") {
    return <div className="rounded-xl border border-border/30 bg-background/40 p-4 text-sm text-muted-foreground">Loading...</div>
  }

  if (state.status === "signed_out") {
    return (
      <div className="rounded-xl border border-border/30 bg-background/40 p-4 text-sm text-muted-foreground">
        You are not signed in.{" "}
        <Link href="/login" className="font-medium text-foreground underline underline-offset-4">
          Sign in
        </Link>
      </div>
    )
  }

  if (state.status === "error") {
    return (
      <div className="space-y-3">
        <div className="rounded-xl border border-border/30 bg-background/40 p-4 text-sm text-destructive">{state.message}</div>
        <Button asChild variant="outline" size="sm">
          <Link href="/account/orders">Back to orders</Link>
        </Button>
      </div>
    )
  }

  const order = state.order
  const status = safeString(order.status).trim() || "UNKNOWN"
  const amount = typeof order.amount === "number" ? order.amount : Number(order.amount ?? 0)
  const currency = safeString(order.currency).trim() || "USD"
  const cartRoot = getCartJsonRoot(order.cart_json)
  const items = extractItems(order.cart_json)

  const summarySubtotal = asNumber(cartRoot.summary?.subtotal) ?? null
  const summaryTax = asNumber(cartRoot.summary?.tax) ?? null
  const summaryShipping = asNumber(cartRoot.summary?.shipping) ?? null
  const summaryTotal = asNumber(cartRoot.summary?.total) ?? (Number.isFinite(amount) ? amount : null)

  const statusKey = normalizeStatus(status)
  const paymentStatusKey = normalizePaymentStatus(status)
  const paymentStatusLabel = paymentStatusKey.toUpperCase()
  const paymentTitle =
    paymentStatusKey === "paid"
      ? "Payment Successful"
      : statusKey === "cancelled"
        ? "Payment Pending"
        : "Processing Payment"

  const paymentDescription =
    paymentStatusKey === "paid"
      ? "Payment completed. Your order has been confirmed."
      : statusKey === "cancelled"
        ? "Payment was not completed. Please contact support if you believe this is an error."
        : "Finalizing your payment..."

  return (
    <div className="min-h-screen bg-[#f5f2ed] px-4 py-10 sm:px-6 lg:py-14">
      <div className="mx-auto w-full max-w-3xl">
        <div className="overflow-hidden rounded-[20px] bg-white shadow-[0_1px_0_rgba(255,255,255,0.9)_inset,0_2px_4px_rgba(26,24,20,0.04),0_8px_32px_rgba(26,24,20,0.08),0_24px_64px_rgba(26,24,20,0.06)]">
          <div className="relative overflow-hidden bg-gradient-to-br from-[#1a1814] to-[#2d2822] px-6 py-8 sm:px-9 sm:py-10">
            <p className="mb-3 text-[10px] font-medium uppercase tracking-[0.2em] text-[#b8956a]">Payment Status</p>
            <h2 className="max-w-xl font-serif text-4xl font-normal leading-tight tracking-[-0.01em] text-[#f5f2ed] sm:text-5xl">
              Confirm Your Order
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[rgba(245,242,237,0.72)]">
              Review the payment status, items, and order summary below. When everything looks correct, send the confirmation
              to WhatsApp for a quick and professional handoff.
            </p>
            <div className="absolute right-6 top-6 grid h-12 w-12 place-items-center rounded-full border border-[#b8956a]/30 bg-[rgba(184,149,106,0.12)]">
              <Check className="h-6 w-6 text-[#b8956a]" />
            </div>
          </div>

          <div className="border-b border-[#ddd8d0] bg-[#ede9e2] px-6 py-5 sm:px-9">
            <div className="flex flex-wrap gap-x-8 gap-y-4">
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#a09890]">PayPal Order ID</span>
                <span className="text-[14px] font-medium tracking-[0.03em] text-[#1a1814]">{orderId}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#a09890]">Status</span>
                <span className="text-[14px] font-semibold uppercase tracking-[0.12em] text-[#4a7c59]">Paid</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#a09890]">Total</span>
                <span className="text-[14px] font-medium tracking-[0.03em] text-[#1a1814]">
                  {summaryTotal === null ? "-" : formatMoney(summaryTotal, currency)}
                </span>
              </div>
            </div>
          </div>

          <div className="px-6 py-8 sm:px-9">
            <button
              type="button"
              onClick={() => setDetailsOpen((value) => !value)}
              className="flex h-10 w-full items-center justify-center gap-2 border-2 border-black bg-white px-4 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#1a1814] transition hover:bg-[#f7f4ef]"
              aria-expanded={detailsOpen}
              aria-controls="order-details-section"
            >
              <span>{detailsOpen ? "Hide Order Details" : "Show Order Details"}</span>
              {detailsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>

            <div id="order-details-section" className={detailsOpen ? "block" : "hidden"}>
            <div className="mt-8 mb-6 flex items-center gap-3 text-[9px] font-medium uppercase tracking-[0.2em] text-[#a09890]">
              <span>Items Ordered</span>
              <span className="h-px flex-1 bg-[#ddd8d0]" />
            </div>

            {items.length === 0 ? (
              <div className="rounded-[14px] border border-[#ddd8d0] bg-[#f5f2ed] px-5 py-4 text-sm text-[#7a7268]">
                No items found for this order.
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((item, idx) => (
                  <div
                    key={`${item.name}-${idx}`}
                    className="flex gap-4 rounded-[14px] border border-[#ddd8d0] bg-[#f5f2ed] px-5 py-4"
                  >
                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-[#b8956a]/20 bg-[#f0e8dc] sm:h-14 sm:w-14">
                      {PRODUCT_IMAGE_BY_SLUG.get(item.slug) ? (
                        <Image
                          src={PRODUCT_IMAGE_BY_SLUG.get(item.slug) ?? ""}
                          alt={item.name}
                          fill
                          sizes="56px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[18px] sm:text-[20px]">🧶</div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-serif text-[16px] font-semibold text-[#1a1814]">{item.name}</p>
                      <p className="mt-1 text-[12px] text-[#a09890]">
                        {item.lengthLabel} · {item.category} · ×{item.quantity}
                      </p>
                    </div>
                    <div className="whitespace-nowrap font-serif text-[16px] font-medium text-[#1a1814]">
                      {item.lineTotal === null ? "-" : formatMoney(item.lineTotal, currency)}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-8 mb-6 flex items-center gap-3 text-[9px] font-medium uppercase tracking-[0.2em] text-[#a09890]">
              <span>Order Summary</span>
              <span className="h-px flex-1 bg-[#ddd8d0]" />
            </div>

              <div className="rounded-[14px] border border-[#ddd8d0] bg-[#f5f2ed] p-5">
                <div className="flex items-center justify-between py-1 text-sm text-[#7a7268]">
                  <span className="font-light">Subtotal</span>
                  <span>{summarySubtotal === null ? "-" : formatMoney(summarySubtotal, currency)}</span>
                </div>
              <div className="flex items-center justify-between border-t border-[#ddd8d0] py-1 text-sm text-[#7a7268]">
                <span className="font-light">Tax</span>
                <span>{summaryTax === null ? "-" : formatMoney(summaryTax, currency)}</span>
              </div>
              <div className="flex items-center justify-between border-t border-[#ddd8d0] py-1 text-sm text-[#7a7268]">
                <span className="font-light">Shipping</span>
                <span>{summaryShipping === null ? "-" : formatMoney(summaryShipping, currency)}</span>
              </div>
              <div className="mt-2 flex items-center justify-between border-t border-[#ddd8d0] pt-4">
                <span className="text-[11px] font-medium uppercase tracking-[0.05em] text-[#1a1814]">Total</span>
                <span className="font-serif text-[22px] font-semibold tracking-[-0.01em] text-[#1a1814]">
                  {summaryTotal === null ? "-" : formatMoney(summaryTotal, currency)}
                </span>
              </div>
              </div>
            </div>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-12 w-full rounded-xl border-[#ddd8d0] bg-transparent px-4 text-sm font-medium tracking-[0.04em] text-[#7a7268] sm:flex-1 sm:text-[13px]"
                onClick={() => void handleRequestWhatsappOtp()}
                disabled={whatsappOtpLoading || whatsappOtpVerifying}
              >
                {whatsappOtpLoading ? "Sending OTP..." : whatsappOtpChallengeId ? "Resend OTP" : "OTP"}
              </Button>
              <Button
                type="button"
                size="sm"
                className="h-12 w-full rounded-xl bg-[#25D366] px-4 text-sm font-medium tracking-[0.04em] text-white hover:bg-[#1EBE57] sm:flex-[2] sm:text-[13px]"
                onClick={() => void handleSendToWhatsapp()}
                disabled={whatsappLoading || whatsappOtpLoading || whatsappOtpVerifying || !whatsappOtpVerified}
              >
                {whatsappLoading ? "Preparing..." : "Send Confirmation to WhatsApp"}
              </Button>
            </div>

            {whatsappOtpChallengeId ? (
              <div className="mt-4 rounded-[14px] border border-[#D4AF37]/25 bg-[#FFFDF8] px-4 py-5 shadow-sm sm:px-6">
                <p className="text-center text-[11px] font-medium uppercase tracking-[0.2em] text-[#a09890]">
                  OTP Verification
                </p>
                <p className="mx-auto mt-2 max-w-lg text-center text-sm text-[#7a7268]">
                  {whatsappOtpInfo || "We sent a 6-digit code to your registered email."}
                </p>
                <div className="mt-4 space-y-2">
                  <p className="text-center text-xs font-medium text-[#7a7268]">Enter OTP</p>
                  <InputOTP
                    value={whatsappOtpCode}
                    onChange={(value) => setWhatsappOtpCode(value.replace(/\D/g, "").slice(0, 6))}
                    maxLength={6}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    containerClassName="justify-center"
                    className="gap-1.5 sm:gap-2"
                  >
                    <InputOTPGroup className="justify-center gap-1.5 sm:gap-2">
                      <InputOTPSlot index={0} className="h-9 w-9 rounded-xl border border-border/70 bg-white text-sm font-semibold shadow-sm sm:h-12 sm:w-12 sm:text-base" />
                      <InputOTPSlot index={1} className="h-9 w-9 rounded-xl border border-border/70 bg-white text-sm font-semibold shadow-sm sm:h-12 sm:w-12 sm:text-base" />
                      <InputOTPSlot index={2} className="h-9 w-9 rounded-xl border border-border/70 bg-white text-sm font-semibold shadow-sm sm:h-12 sm:w-12 sm:text-base" />
                      <InputOTPSlot index={3} className="h-9 w-9 rounded-xl border border-border/70 bg-white text-sm font-semibold shadow-sm sm:h-12 sm:w-12 sm:text-base" />
                      <InputOTPSlot index={4} className="h-9 w-9 rounded-xl border border-border/70 bg-white text-sm font-semibold shadow-sm sm:h-12 sm:w-12 sm:text-base" />
                      <InputOTPSlot index={5} className="h-9 w-9 rounded-xl border border-border/70 bg-white text-sm font-semibold shadow-sm sm:h-12 sm:w-12 sm:text-base" />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                <div className="mx-auto mt-4 grid w-full max-w-xl grid-cols-1 gap-2 sm:grid-cols-2">
                  <Button
                    size="sm"
                    className="h-10 w-full px-3 text-xs sm:h-11 sm:text-sm"
                    disabled={whatsappOtpVerifying}
                    onClick={() => void handleVerifyWhatsappOtp()}
                  >
                    {whatsappOtpVerifying ? "Verifying..." : "Verify OTP"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-10 w-full px-3 text-xs sm:h-11 sm:text-sm"
                    disabled={whatsappOtpLoading || whatsappOtpVerifying}
                    onClick={() => void handleRequestWhatsappOtp()}
                  >
                    Resend OTP
                  </Button>
                </div>
              </div>
            ) : whatsappOtpVerified ? (
              <p className="mt-4 text-sm font-medium text-[#4a7c59]">OTP verified. You can send the WhatsApp confirmation now.</p>
            ) : null}

            {whatsappError ? <p className="mt-3 text-sm font-medium text-red-500">{whatsappError}</p> : null}
            {whatsappOtpError ? <p className="mt-2 text-sm font-medium text-red-500">{whatsappOtpError}</p> : null}
          </div>
        </div>
    </div>
    </div>
  )
}
