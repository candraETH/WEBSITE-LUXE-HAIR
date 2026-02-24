"use client"

import { FormEvent, useMemo, useState } from "react"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"

type TrackedOrder = {
  orderId: string
  status: string
  amount: number
  currency: string
  customerName: string
  phoneNumber: string
  trackingNumber: string
  shippingCarrier: string
  cartJson: unknown
}

type TrackReadResponse = {
  error?: string
  orders?: TrackedOrder[]
}

type RequestOtpResponse = {
  error?: string
  challengeId?: string
  expiresInSeconds?: number
  destination?: string
  channel?: string
  devOtpCode?: string
}

type VerifyOtpResponse = {
  error?: string
  sessionToken?: string
}

const DHL_TRACKING_BASE_URL = "https://www.dhl.com/global-en/home/tracking.html"

function formatCurrency(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(value)
  } catch {
    return `${currency} ${value.toFixed(2)}`
  }
}

function maskNamePart(value: string): string {
  const token = value.trim()
  if (!token) {
    return ""
  }

  if (token.length === 1) {
    return token
  }

  if (token.length === 2) {
    return `${token[0]}*`
  }

  return `${token[0]}${"*".repeat(token.length - 2)}${token[token.length - 1]}`
}

function maskCustomerName(fullName: string): string {
  const parts = fullName
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  if (parts.length === 0) {
    return "-"
  }

  return parts.map(maskNamePart).join(" ")
}

function maskPhoneNumber(value: string): string {
  const compact = value.trim().replace(/[^\d+]/g, "")
  if (!compact) {
    return "-"
  }

  const digits = compact.replace(/\D/g, "")
  if (digits.length === 0) {
    return "-"
  }

  const countryCodeLength = digits.startsWith("1") ? 1 : 2
  const safeCountryLength = Math.min(countryCodeLength, Math.max(1, digits.length - 3))
  const countryCode = `+${digits.slice(0, safeCountryLength)}`
  const lastThree = digits.slice(-3)
  const maskedDigitsCount = Math.max(2, digits.length - safeCountryLength - 3)

  return `${countryCode}${"*".repeat(maskedDigitsCount)}${lastThree}`
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value
  }

  if (typeof value === "string") {
    const parsed = Number.parseFloat(value)
    if (Number.isFinite(parsed)) {
      return parsed
    }
  }

  return null
}

function statusClass(status: string): string {
  const normalized = status.trim().toUpperCase()
  if (normalized === "PAID") {
    return "bg-green-100 text-green-700"
  }
  if (normalized.startsWith("FAILED")) {
    return "bg-red-100 text-red-700"
  }
  if (normalized === "PENDING") {
    return "bg-amber-100 text-amber-700"
  }
  return "bg-slate-100 text-slate-700"
}

function paymentStatusTitle(status: string): string {
  const normalized = status.trim().toUpperCase()
  if (normalized === "PAID") {
    return "Payment Successful"
  }
  if (normalized.startsWith("FAILED")) {
    return "Payment Failed"
  }
  if (normalized === "PENDING") {
    return "Processing Payment"
  }
  return "Payment Update"
}

function paymentStatusMessage(status: string): string {
  const normalized = status.trim().toUpperCase()
  if (normalized === "PAID") {
    return "Payment completed. Your order has been confirmed."
  }
  if (normalized.startsWith("FAILED")) {
    return "Payment was not completed. Please contact support for assistance."
  }
  if (normalized === "PENDING") {
    return "Finalizing your payment. Please check again shortly."
  }
  return "Payment status update received."
}

function getDhlTrackingUrl(trackingNumber: string): string {
  const normalized = trackingNumber.trim()
  if (!normalized) {
    return DHL_TRACKING_BASE_URL
  }
  return `${DHL_TRACKING_BASE_URL}?tracking-id=${encodeURIComponent(normalized)}&submit=1`
}

function isDhlCarrier(value: string): boolean {
  return value.trim().toUpperCase().includes("DHL")
}

function renderItemsFromCartJson(cartJson: unknown, currency: string) {
  if (!cartJson) {
    return null
  }

  let items: Array<Record<string, unknown>> = []
  let summary: Record<string, unknown> | null = null

  if (Array.isArray(cartJson)) {
    items = cartJson.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"))
  } else if (typeof cartJson === "object") {
    const root = cartJson as Record<string, unknown>
    const nestedItems = root.items
    if (Array.isArray(nestedItems)) {
      items = nestedItems.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"))
    }

    const nestedSummary = root.summary
    if (nestedSummary && typeof nestedSummary === "object" && !Array.isArray(nestedSummary)) {
      summary = nestedSummary as Record<string, unknown>
    }
  }

  if (items.length === 0) {
    return null
  }

  return (
    <div className="mt-4 space-y-2">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Items</p>
      <div className="space-y-2">
        {items.map((item, index) => {
          const name = typeof item.name === "string" ? item.name : "Item"
          const lengthValue = asNumber(item.length)
          const category = typeof item.category === "string" ? item.category : "-"
          const quantity =
            typeof item.quantity === "number"
              ? item.quantity
              : typeof item.quantity === "string"
                ? item.quantity
                : "-"
          const lineTotalNumber = asNumber(item.line_total)
          const lineTotal = lineTotalNumber === null ? "-" : formatCurrency(lineTotalNumber, currency)
          const lengthLabel = typeof lengthValue === "number" ? `${lengthValue}"` : "-"

          return (
            <div key={`${name}-${index}`} className="rounded-lg border border-border/40 bg-background/70 px-3 py-2">
              <p className="text-sm font-semibold text-foreground">{name}</p>
              <p className="text-xs text-muted-foreground">
                {lengthLabel} - {category} - x{quantity} - {lineTotal}
              </p>
            </div>
          )
        })}
      </div>

      {summary && (
        <div className="rounded-lg border border-border/40 bg-white px-3 py-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Order Summary</p>
          <div className="mt-1 grid gap-1 text-xs text-foreground">
            <p>Subtotal: {formatCurrency(asNumber(summary.subtotal) ?? 0, currency)}</p>
            <p>Tax: {formatCurrency(asNumber(summary.tax) ?? 0, currency)}</p>
            <p>Shipping: {formatCurrency(asNumber(summary.shipping) ?? 0, currency)}</p>
            <p className="font-semibold">Total: {formatCurrency(asNumber(summary.total) ?? 0, currency)}</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default function TrackOrderPage() {
  const [orderId, setOrderId] = useState("")
  const [phoneNumber, setPhoneNumber] = useState("")
  const [otpChallengeId, setOtpChallengeId] = useState("")
  const [otpCode, setOtpCode] = useState("")
  const [otpInfo, setOtpInfo] = useState("")
  const [otpDevCode, setOtpDevCode] = useState("")
  const [trackingSessionToken, setTrackingSessionToken] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [orders, setOrders] = useState<TrackedOrder[]>([])
  const [searched, setSearched] = useState(false)
  const primaryOrder = orders[0] ?? null

  const canRequestOtp = useMemo(() => Boolean(orderId.trim() && phoneNumber.trim()), [orderId, phoneNumber])
  const canVerifyOtp = useMemo(() => Boolean(otpChallengeId && /^\d{6}$/.test(otpCode.trim())), [otpChallengeId, otpCode])

  const normalizePhone = () => {
    const normalizedPhoneDigits = phoneNumber.replace(/\D/g, "")
    return normalizedPhoneDigits ? `+${normalizedPhoneDigits}` : ""
  }

  const resetTrackingState = () => {
    setOtpChallengeId("")
    setOtpCode("")
    setOtpInfo("")
    setOtpDevCode("")
    setTrackingSessionToken("")
    setOrders([])
    setSearched(false)
  }

  const fetchTrackedOrder = async (sessionToken: string) => {
    const response = await fetch("/api/order-tracking", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionToken }),
    })

    const data = (await response.json().catch(() => ({}))) as TrackReadResponse
    if (!response.ok) {
      throw new Error(data.error || "Unable to track order.")
    }

    const nextOrders = Array.isArray(data.orders) ? data.orders : []
    setOrders(nextOrders)
    setSearched(true)
    if (nextOrders.length === 0) {
      setError("No order found.")
    }
  }

  const handleRequestOtp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!canRequestOtp) {
      setError("Enter both Order ID and Phone Number.")
      return
    }

    const normalizedPhone = normalizePhone()
    if (!normalizedPhone) {
      setError("Enter a valid phone number.")
      return
    }

    setLoading(true)
    setError("")
    setOrders([])
    setSearched(false)

    try {
      const response = await fetch("/api/order-tracking/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: orderId.trim(),
          phoneNumber: normalizedPhone,
        }),
      })

      const data = (await response.json().catch(() => ({}))) as RequestOtpResponse
      if (!response.ok) {
        throw new Error(data.error || "Unable to send OTP.")
      }

      if (!data.challengeId) {
        throw new Error("Unable to initialize OTP verification.")
      }

      setOtpChallengeId(data.challengeId)
      setOtpCode("")
      setOtpInfo(data.destination ? `Verification code sent to ${data.destination}.` : "Verification code sent.")
      setOtpDevCode(data.devOtpCode ?? "")
      setTrackingSessionToken("")
    } catch (requestError) {
      const safeMessage = requestError instanceof Error ? requestError.message : "Unable to send OTP."
      setError(safeMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async () => {
    if (!canVerifyOtp) {
      setError("Enter the 6-digit OTP code.")
      return
    }

    setLoading(true)
    setError("")
    setOrders([])

    try {
      const verifyResponse = await fetch("/api/order-tracking/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challengeId: otpChallengeId,
          otpCode: otpCode.trim(),
        }),
      })

      const verifyData = (await verifyResponse.json().catch(() => ({}))) as VerifyOtpResponse
      if (!verifyResponse.ok || !verifyData.sessionToken) {
        throw new Error(verifyData.error || "Unable to verify OTP.")
      }

      setTrackingSessionToken(verifyData.sessionToken)
      await fetchTrackedOrder(verifyData.sessionToken)
    } catch (requestError) {
      const safeMessage = requestError instanceof Error ? requestError.message : "Unable to verify OTP."
      setError(safeMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-gradient-to-b from-background to-background/50 pt-[72px] lg:pt-[78px]">
      <Navbar />

      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:py-14">
        <div className="rounded-2xl border border-border/40 bg-card/80 p-6 shadow-lg sm:p-8">
          {primaryOrder && (
            <section className="mb-6 rounded-xl border border-border/40 bg-white p-4 sm:p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Payment Status</p>
              <h2 className="mt-2 font-serif text-2xl font-bold text-foreground">{paymentStatusTitle(primaryOrder.status)}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{paymentStatusMessage(primaryOrder.status)}</p>
              <p className="mt-3 text-sm text-muted-foreground">
                PayPal Order ID: <span className="font-semibold text-foreground">{primaryOrder.orderId}</span>
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Current status: <span className="font-semibold text-foreground">{primaryOrder.status}</span>
              </p>
            </section>
          )}

          <p id="order-tracking" className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Order Tracking
          </p>
          <h1 className="mt-3 font-serif text-3xl font-bold text-foreground sm:text-4xl">Track Your Order</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Enter your PayPal Order ID and WhatsApp number, then verify OTP before viewing order details.
          </p>

          <form className="mt-6 space-y-4" onSubmit={handleRequestOtp}>
            <label className="block text-xs font-medium text-muted-foreground">
              Order ID
              <input
                type="text"
                value={orderId}
                onChange={(event) => {
                  setOrderId(event.target.value)
                  resetTrackingState()
                }}
                placeholder="Example: 5PE7892813655042E"
                className="mt-1 h-11 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/40"
              />
            </label>

            <label className="block text-xs font-medium text-muted-foreground">
              Phone Number
              <input
                type="tel"
                value={phoneNumber}
                onChange={(event) => {
                  setPhoneNumber(event.target.value)
                  resetTrackingState()
                }}
                placeholder="Example: +62812xxxxxxx"
                className="mt-1 h-11 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/40"
              />
            </label>

            <button
              type="submit"
              disabled={loading || !canRequestOtp}
              className={`w-full rounded-lg bg-foreground px-5 py-3 text-sm font-semibold uppercase tracking-widest text-background transition-colors ${
                loading || !canRequestOtp ? "cursor-not-allowed opacity-70" : "hover:bg-[#2B2722]"
              }`}
            >
              {loading ? "Sending OTP..." : "Send OTP Code"}
            </button>
          </form>

          {otpInfo && (
            <div className="mt-4 rounded-md border border-[#D4AF37]/30 bg-[#FFFDF8] p-3">
              <p className="text-sm font-medium text-foreground">{otpInfo}</p>
              {otpDevCode && (
                <p className="mt-1 text-xs text-amber-700">
                  Dev OTP code: <span className="font-semibold">{otpDevCode}</span>
                </p>
              )}
            </div>
          )}

          {otpChallengeId && (
            <div className="mt-4 space-y-3 rounded-md border border-border/40 bg-white p-4">
              <label className="block text-xs font-medium text-muted-foreground">
                Verification Code (OTP)
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={otpCode}
                  onChange={(event) => setOtpCode(event.target.value.replace(/\D/g, ""))}
                  placeholder="Enter 6-digit code"
                  className="mt-1 h-11 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/40"
                />
              </label>

              <button
                type="button"
                onClick={() => void handleVerifyOtp()}
                disabled={loading || !canVerifyOtp}
                className={`w-full rounded-lg border border-border px-5 py-3 text-sm font-semibold uppercase tracking-widest text-foreground transition-colors ${
                  loading || !canVerifyOtp ? "cursor-not-allowed opacity-70" : "hover:bg-secondary"
                }`}
              >
                {loading ? "Verifying..." : "Verify OTP & Track Order"}
              </button>
            </div>
          )}

          {trackingSessionToken && orders.length > 0 && (
            <p className="mt-3 text-xs font-medium text-[#2E7D32]">OTP verified successfully.</p>
          )}

          {error && <p className="mt-4 text-sm font-medium text-red-500">{error}</p>}

          {!error && searched && !loading && orders.length === 0 && (
            <p className="mt-4 text-sm text-muted-foreground">No order found for the provided data.</p>
          )}

          {orders.length > 0 && (
            <div className="mt-6 space-y-4">
              {orders.map((order) => (
                <article key={order.orderId} className="rounded-xl border border-border/40 bg-background/60 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-foreground">Order ID: {order.orderId}</p>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(order.status)}`}>
                      {order.status}
                    </span>
                  </div>

                  <div className="mt-3 grid gap-1 text-sm text-muted-foreground">
                    {order.customerName && <p>Name: {maskCustomerName(order.customerName)}</p>}
                    {order.phoneNumber && <p>Phone: {maskPhoneNumber(order.phoneNumber)}</p>}
                    <p>
                      Amount: {order.currency} {Number(order.amount).toFixed(2)}
                    </p>
                  </div>

                  {renderItemsFromCartJson(order.cartJson, order.currency)}

                  <section className="mt-4 rounded-xl border border-[#D4AF37]/30 bg-[#FFFDF8] p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#A77B15]">Shipment Tracking</p>

                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-lg border border-[#D4AF37]/20 bg-white px-3 py-2">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Tracking Number</p>
                        <p className="mt-1 break-all text-sm font-semibold text-foreground">{order.trackingNumber || "-"}</p>
                      </div>

                      <div className="rounded-lg border border-[#D4AF37]/20 bg-white px-3 py-2">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Carrier</p>
                        <p className="mt-1 text-sm font-semibold text-foreground">{order.shippingCarrier || "-"}</p>
                      </div>
                    </div>

                    {isDhlCarrier(order.shippingCarrier) && order.trackingNumber && (
                      <a
                        href={getDhlTrackingUrl(order.trackingNumber)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 inline-flex items-center justify-center rounded-lg bg-[#FFCC00] px-4 py-2 text-xs font-semibold uppercase tracking-widest text-[#1F1F1F] transition-colors hover:bg-[#E7B900]"
                      >
                        Track on DHL
                      </a>
                    )}

                    {!order.trackingNumber && (
                      <p className="mt-3 text-xs text-muted-foreground">
                        Tracking info will appear here once your shipment is dispatched.
                      </p>
                    )}
                  </section>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>

      <Footer />
    </main>
  )
}

