"use client"

import { useSearchParams } from "next/navigation"
import { FormEvent, Suspense, useEffect, useMemo, useRef, useState } from "react"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"
import { useLocale } from "@/context/LocaleContext"

type TrackedOrder = {
  orderId: string
  status: string
  amount: number
  currency: string
  customerName: string
  customerEmailMasked?: string
  phoneNumber: string
  trackingNumber: string
  shippingCarrier: string
  cartJson: unknown
}

type TrackReadResponse = {
  error?: string
  orders?: TrackedOrder[]
}

type OrderOtpRequestResponse = {
  error?: string
  challengeId?: string
  destination?: string
  devOtpCode?: string
}

type OrderOtpVerifyResponse = {
  error?: string
  sessionToken?: string
}

const DHL_TRACKING_BASE_URL = "https://www.dhl.com/global-en/home/tracking.html"

function formatCurrency(value: number, currency: string, locale: "en" | "ru"): string {
  try {
    return new Intl.NumberFormat(locale === "ru" ? "ru-RU" : "en-US", { style: "currency", currency }).format(value)
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

function paymentStatusTitle(status: string, isRu: boolean): string {
  const normalized = status.trim().toUpperCase()
  if (normalized === "PAID") {
    return isRu ? "\u041e\u043f\u043b\u0430\u0442\u0430 \u043f\u0440\u043e\u0448\u043b\u0430 \u0443\u0441\u043f\u0435\u0448\u043d\u043e" : "Payment Successful"
  }
  if (normalized.startsWith("FAILED")) {
    return isRu ? "\u041e\u043f\u043b\u0430\u0442\u0430 \u043d\u0435 \u0443\u0434\u0430\u043b\u0430\u0441\u044c" : "Payment Failed"
  }
  if (normalized === "PENDING") {
    return isRu ? "\u041e\u0431\u0440\u0430\u0431\u043e\u0442\u043a\u0430 \u043e\u043f\u043b\u0430\u0442\u044b" : "Processing Payment"
  }
  return isRu ? "\u041e\u0431\u043d\u043e\u0432\u043b\u0435\u043d\u0438\u0435 \u043e\u043f\u043b\u0430\u0442\u044b" : "Payment Update"
}

function paymentStatusMessage(status: string, isRu: boolean): string {
  const normalized = status.trim().toUpperCase()
  if (normalized === "PAID") {
    return isRu
      ? "\u041e\u043f\u043b\u0430\u0442\u0430 \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043d\u0430. \u0417\u0430\u043a\u0430\u0437 \u043f\u043e\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0451\u043d."
      : "Payment completed. Your order has been confirmed."
  }
  if (normalized.startsWith("FAILED")) {
    return isRu
      ? "\u041e\u043f\u043b\u0430\u0442\u0430 \u043d\u0435 \u0431\u044b\u043b\u0430 \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043d\u0430. \u041f\u043e\u0436\u0430\u043b\u0443\u0439\u0441\u0442\u0430, \u0441\u0432\u044f\u0436\u0438\u0442\u0435\u0441\u044c \u0441 \u043f\u043e\u0434\u0434\u0435\u0440\u0436\u043a\u043e\u0439."
      : "Payment was not completed. Please contact support for assistance."
  }
  if (normalized === "PENDING") {
    return isRu
      ? "\u0417\u0430\u0432\u0435\u0440\u0448\u0430\u0435\u043c \u043e\u0431\u0440\u0430\u0431\u043e\u0442\u043a\u0443 \u043f\u043b\u0430\u0442\u0435\u0436\u0430. \u041f\u0440\u043e\u0432\u0435\u0440\u044c\u0442\u0435 \u0447\u0443\u0442\u044c \u043f\u043e\u0437\u0436\u0435."
      : "Finalizing your payment. Please check again shortly."
  }
  return isRu ? "\u041f\u043e\u043b\u0443\u0447\u0435\u043d\u043e \u043e\u0431\u043d\u043e\u0432\u043b\u0435\u043d\u0438\u0435 \u0441\u0442\u0430\u0442\u0443\u0441\u0430 \u043e\u043f\u043b\u0430\u0442\u044b." : "Payment status update received."
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

function renderItemsFromCartJson(cartJson: unknown, currency: string, locale: "en" | "ru") {
  if (!cartJson) {
    return null
  }

  const isRu = locale === "ru"

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
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        {isRu ? "\u0422\u043e\u0432\u0430\u0440\u044b" : "Items"}
      </p>
      <div className="space-y-2">
        {items.map((item, index) => {
          const name = typeof item.name === "string" ? item.name : isRu ? "\u0422\u043e\u0432\u0430\u0440" : "Item"
          const lengthValue = asNumber(item.length)
          const category = typeof item.category === "string" ? item.category : "-"
          const quantity =
            typeof item.quantity === "number"
              ? item.quantity
              : typeof item.quantity === "string"
                ? item.quantity
                : "-"
          const lineTotalNumber = asNumber(item.line_total)
          const lineTotal = lineTotalNumber === null ? "-" : formatCurrency(lineTotalNumber, currency, locale)
          const lengthLabel = typeof lengthValue === "number" ? `${lengthValue}"` : "-"

          return (
            <div key={`${name}-${index}`} className="rounded-lg border border-border/40 bg-background/70 px-3 py-2">
              <p className="text-sm font-semibold text-foreground">{name}</p>
              <p className="text-xs text-muted-foreground">
                {isRu
                  ? `${lengthLabel} • ${category} • ${quantity} \u0448\u0442. • ${lineTotal}`
                  : `${lengthLabel} • ${category} • x${quantity} • ${lineTotal}`}
              </p>
            </div>
          )
        })}
      </div>

      {summary && (
        <div className="rounded-lg border border-border/40 bg-white px-3 py-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {isRu ? "\u0421\u0432\u043e\u0434\u043a\u0430 \u0437\u0430\u043a\u0430\u0437\u0430" : "Order Summary"}
          </p>
          <div className="mt-1 grid gap-1 text-xs text-foreground">
            <p>
              {isRu ? "\u041f\u043e\u0434\u044b\u0442\u043e\u0433" : "Subtotal"}:{" "}
              {formatCurrency(asNumber(summary.subtotal) ?? 0, currency, locale)}
            </p>
            <p>
              {isRu ? "\u041d\u0430\u043b\u043e\u0433" : "Tax"}: {formatCurrency(asNumber(summary.tax) ?? 0, currency, locale)}
            </p>
            <p>
              {isRu ? "\u0414\u043e\u0441\u0442\u0430\u0432\u043a\u0430" : "Shipping"}:{" "}
              {formatCurrency(asNumber(summary.shipping) ?? 0, currency, locale)}
            </p>
            <p className="font-semibold">
              {isRu ? "\u0418\u0442\u043e\u0433\u043e" : "Total"}: {formatCurrency(asNumber(summary.total) ?? 0, currency, locale)}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

function TrackOrderContent() {
  const { locale } = useLocale()
  const isRu = locale === "ru"
  const searchParams = useSearchParams()
  const hasPrefilledOrderId = useRef(false)
  const [orderId, setOrderId] = useState("")
  const [phoneNumber, setPhoneNumber] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [orders, setOrders] = useState<TrackedOrder[]>([])
  const [searched, setSearched] = useState(false)
  const [trackChallengeId, setTrackChallengeId] = useState("")
  const [trackOtpCode, setTrackOtpCode] = useState("")
  const [trackOtpInfo, setTrackOtpInfo] = useState("")
  const [trackOtpError, setTrackOtpError] = useState("")
  const [trackOtpLoading, setTrackOtpLoading] = useState(false)
  const [trackOtpDevCode, setTrackOtpDevCode] = useState("")
  const primaryOrder = orders[0] ?? null

  const canTrackOrder = useMemo(() => Boolean(orderId.trim() && phoneNumber.trim()), [orderId, phoneNumber])

  useEffect(() => {
    if (hasPrefilledOrderId.current) return

    const incoming =
      searchParams.get("orderId") || searchParams.get("order_id") || searchParams.get("paypal_order_id") || ""
    const normalized = incoming.trim().toUpperCase()
    if (!normalized) return

    setOrderId((current) => (current.trim() ? current : normalized))
    hasPrefilledOrderId.current = true
  }, [searchParams])

  const normalizePhone = () => {
    const normalizedPhoneDigits = phoneNumber.replace(/\D/g, "")
    if (normalizedPhoneDigits.length < 4) {
      return ""
    }
    return normalizedPhoneDigits.slice(-4)
  }

  const resetTrackingState = () => {
    setOrders([])
    setSearched(false)
    setError("")
    setTrackChallengeId("")
    setTrackOtpCode("")
    setTrackOtpInfo("")
    setTrackOtpError("")
    setTrackOtpDevCode("")
  }

  const handleTrackOrder = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!canTrackOrder) {
      setError(
        isRu
          ? "\u0412\u0432\u0435\u0434\u0438\u0442\u0435 ID \u0437\u0430\u043a\u0430\u0437\u0430 \u0438 \u043f\u043e\u0441\u043b\u0435\u0434\u043d\u0438\u0435 4 \u0446\u0438\u0444\u0440\u044b \u043d\u043e\u043c\u0435\u0440\u0430 \u0442\u0435\u043b\u0435\u0444\u043e\u043d\u0430."
          : "Enter both Order ID and phone number."
      )
      return
    }

    const normalizedPhone = normalizePhone()
    if (!normalizedPhone) {
      setError(
        isRu
          ? "\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u043f\u043e\u0441\u043b\u0435\u0434\u043d\u0438\u0435 4 \u0446\u0438\u0444\u0440\u044b \u043d\u043e\u043c\u0435\u0440\u0430 \u0442\u0435\u043b\u0435\u0444\u043e\u043d\u0430."
          : "Enter the last 4 digits of the phone number."
      )
      return
    }

    setLoading(true)
    setError("")
    setTrackOtpError("")
    setTrackOtpInfo("")
    setOrders([])
    setSearched(false)

    try {
      const response = await fetch("/api/order-tracking/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: orderId.trim().toUpperCase(),
          phoneNumber: normalizedPhone,
          purpose: "track_order",
        }),
      })

      const data = (await response.json().catch(() => ({}))) as OrderOtpRequestResponse
      if (!response.ok || !data.challengeId) {
        throw new Error(isRu ? "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0432\u044b\u0441\u043b\u0430\u0442\u044c OTP." : data.error || "Unable to send OTP.")
      }

      setTrackChallengeId(data.challengeId)
      setTrackOtpCode("")
      setTrackOtpInfo(
        `${data.destination ? `${isRu ? "\u041a\u043e\u0434 \u043e\u0442\u043f\u0440\u0430\u0432\u043b\u0435\u043d \u043d\u0430" : "OTP sent to"} ${data.destination}.` : isRu ? "\u041a\u043e\u0434 \u043e\u0442\u043f\u0440\u0430\u0432\u043b\u0435\u043d \u043d\u0430 \u0432\u0430\u0448 email." : "OTP sent to your registered email."}${data.devOtpCode ? ` Dev code: ${data.devOtpCode}` : ""}`
      )
      setTrackOtpDevCode(data.devOtpCode ?? "")
    } catch (requestError) {
      const safeMessage = isRu
        ? "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043e\u0442\u043f\u0440\u0430\u0432\u0438\u0442\u044c OTP."
        : requestError instanceof Error
          ? requestError.message
          : "Unable to send OTP."
      setTrackOtpError(safeMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyTrackOtp = async () => {
    if (!trackChallengeId) {
      setTrackOtpError(isRu ? "\u0421\u043d\u0430\u0447\u0430\u043b\u0430 \u0437\u0430\u043f\u0440\u043e\u0441\u0438\u0442\u0435 OTP." : "Request an OTP first.")
      return
    }

    const otpCode = trackOtpCode.replace(/\D/g, "")
    if (otpCode.length !== 6) {
      setTrackOtpError(isRu ? "\u0412\u0432\u0435\u0434\u0438\u0442\u0435 6-\u0437\u043d\u0430\u0447\u043d\u044b\u0439 OTP." : "Enter a valid 6-digit OTP.")
      return
    }

    setTrackOtpLoading(true)
    setTrackOtpError("")

    try {
      const verifyResponse = await fetch("/api/order-tracking/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challengeId: trackChallengeId,
          otpCode,
        }),
      })
      const verifyData = (await verifyResponse.json().catch(() => ({}))) as OrderOtpVerifyResponse
      if (!verifyResponse.ok || !verifyData.sessionToken) {
        throw new Error(isRu ? "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043f\u0440\u043e\u0432\u0435\u0440\u0438\u0442\u044c OTP." : verifyData.error || "Unable to verify OTP.")
      }

      const response = await fetch("/api/order-tracking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionToken: verifyData.sessionToken,
        }),
      })

      const data = (await response.json().catch(() => ({}))) as TrackReadResponse
      if (!response.ok) {
        throw new Error(isRu ? "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043e\u0442\u0441\u043b\u0435\u0434\u0438\u0442\u044c \u0437\u0430\u043a\u0430\u0437." : data.error || "Unable to track order.")
      }

      const nextOrders = Array.isArray(data.orders) ? data.orders : []
      setOrders(nextOrders)
      setSearched(true)
      setTrackChallengeId("")
      setTrackOtpCode("")
      setTrackOtpInfo("")
      setTrackOtpDevCode("")
      if (nextOrders.length === 0) {
        setError(isRu ? "\u0417\u0430\u043a\u0430\u0437 \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d." : "No order found.")
      }
    } catch (requestError) {
      const safeMessage = isRu
        ? "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043e\u0442\u0441\u043b\u0435\u0434\u0438\u0442\u044c \u0437\u0430\u043a\u0430\u0437."
        : requestError instanceof Error
          ? requestError.message
          : "Unable to track order."
      setTrackOtpError(safeMessage)
    } finally {
      setTrackOtpLoading(false)
    }
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-gradient-to-b from-background to-background/50 pt-[102px] lg:pt-[108px]">
      <Navbar />

      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:py-14">
        <div className="rounded-2xl border border-border/40 bg-card/80 p-6 shadow-lg sm:p-8">
          {primaryOrder && (
            <section className="mb-6 rounded-xl border border-border/40 bg-white p-4 sm:p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                {isRu ? "\u0421\u0442\u0430\u0442\u0443\u0441 \u043e\u043f\u043b\u0430\u0442\u044b" : "Payment Status"}
              </p>
              <h2 className="mt-2 font-serif text-2xl font-bold text-foreground">
                {paymentStatusTitle(primaryOrder.status, isRu)}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">{paymentStatusMessage(primaryOrder.status, isRu)}</p>
              <p className="mt-3 text-sm text-muted-foreground">
                {isRu ? "ID \u0437\u0430\u043a\u0430\u0437\u0430" : "Order ID"}:{" "}
                <span className="font-semibold text-foreground">{primaryOrder.orderId}</span>
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {isRu ? "\u0422\u0435\u043a\u0443\u0449\u0438\u0439 \u0441\u0442\u0430\u0442\u0443\u0441" : "Current status"}:{" "}
                <span className="font-semibold text-foreground">{primaryOrder.status}</span>
              </p>
            </section>
          )}

          <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
            <p id="order-tracking" className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              {isRu ? "\u041e\u0442\u0441\u043b\u0435\u0436\u0438\u0432\u0430\u043d\u0438\u0435 \u0437\u0430\u043a\u0430\u0437\u0430" : "Order Tracking"}
            </p>
            <h1 className="mt-3 font-serif text-3xl font-bold text-foreground sm:text-4xl">
              {isRu ? "\u041e\u0442\u0441\u043b\u0435\u0434\u0438\u0442\u044c \u0437\u0430\u043a\u0430\u0437" : "Track Your Order"}
            </h1>

            <form className="mt-6 w-full space-y-5" onSubmit={handleTrackOrder}>
              <div className="flex flex-col items-center">
                <label htmlFor="track-order-id" className="text-center text-xs font-medium text-muted-foreground">
                  {isRu ? "ID \u0437\u0430\u043a\u0430\u0437\u0430" : "Order ID"}
                </label>
                <input
                  id="track-order-id"
                  type="text"
                  value={orderId}
                  onChange={(event) => {
                    setOrderId(event.target.value)
                    resetTrackingState()
                  }}
                  placeholder={isRu ? "\u041f\u0440\u0438\u043c\u0435\u0440: 5PE7892813655042E" : "Example: 5PE7892813655042E"}
                  className="mx-auto mt-1 h-12 w-full max-w-[240px] rounded-xl border border-border/60 bg-white px-3.5 text-center text-sm text-foreground shadow-sm outline-none transition-shadow focus:border-[#D4AF37]/60 focus:ring-2 focus:ring-[#D4AF37]/25"
                />
              </div>

              <label className="block text-center text-xs font-medium text-muted-foreground">
                {isRu ? "\u041f\u043e\u0441\u043b\u0435\u0434\u043d\u0438\u0435 4 \u0446\u0438\u0444\u0440\u044b \u043d\u043e\u043c\u0435\u0440\u0430 \u0442\u0435\u043b\u0435\u0444\u043e\u043d\u0430" : "Last 4 digits of phone number"}
                <div className="mt-2 flex justify-center">
                  <InputOTP
                    value={phoneNumber}
                    onChange={(value) => {
                      setPhoneNumber(value.replace(/\D/g, "").slice(0, 4))
                      resetTrackingState()
                    }}
                    maxLength={4}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    containerClassName="justify-center"
                    className="gap-3"
                  >
                    <InputOTPGroup className="gap-3 justify-center">
                      <InputOTPSlot index={0} className="h-12 w-12 rounded-2xl border border-border/70 bg-white text-base font-semibold shadow-sm" />
                      <InputOTPSlot index={1} className="h-12 w-12 rounded-2xl border border-border/70 bg-white text-base font-semibold shadow-sm" />
                      <InputOTPSlot index={2} className="h-12 w-12 rounded-2xl border border-border/70 bg-white text-base font-semibold shadow-sm" />
                      <InputOTPSlot index={3} className="h-12 w-12 rounded-2xl border border-border/70 bg-white text-base font-semibold shadow-sm" />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
              </label>

              <button
                type="submit"
                disabled={loading || !canTrackOrder}
                className={`mx-auto block w-full max-w-[240px] rounded-lg bg-foreground px-5 py-3 text-sm font-semibold uppercase tracking-widest text-background transition-colors ${
                  loading || !canTrackOrder ? "cursor-not-allowed opacity-70" : "hover:bg-[#2B2722]"
                }`}
              >
                {loading
                  ? isRu
                    ? "\u041e\u0442\u043f\u0440\u0430\u0432\u043b\u044f\u0435\u043c OTP..."
                    : "Sending OTP..."
                  : isRu
                    ? trackChallengeId
                      ? "\u041e\u0442\u043f\u0440\u0430\u0432\u0438\u0442\u044c OTP \u0435\u0449\u0451 \u0440\u0430\u0437"
                      : "\u041e\u0442\u043f\u0440\u0430\u0432\u0438\u0442\u044c OTP"
                    : trackChallengeId
                      ? "Resend OTP"
                      : "Send OTP"}
              </button>
            </form>

            {error && <p className="mt-4 text-sm font-medium text-red-500">{error}</p>}
            {trackOtpError && <p className="mt-4 text-sm font-medium text-red-500">{trackOtpError}</p>}
            {trackOtpInfo && <p className="mt-2 text-sm font-medium text-emerald-700">{trackOtpInfo}</p>}
            {trackOtpDevCode && (
              <p className="mt-2 text-xs font-medium text-amber-700">
                {isRu ? "Dev OTP:" : "Dev OTP:"} {trackOtpDevCode}
              </p>
            )}
          </div>

          {trackChallengeId && (
            <div className="mx-auto mt-4 w-full max-w-2xl rounded-xl border border-[#D4AF37]/25 bg-[#FFFDF8] px-3 py-4 sm:px-6 sm:py-5">
              <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-[#A77B15]">
                {isRu ? "\u041f\u043e\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u0438\u0435 OTP" : "OTP Verification"}
              </p>
              <p className="mx-auto mt-2 max-w-lg text-center text-sm text-muted-foreground">
                {isRu
                  ? "\u0412\u0432\u0435\u0434\u0438\u0442\u0435 6-\u0437\u043d\u0430\u0447\u043d\u044b\u0439 \u043a\u043e\u0434, \u043e\u0442\u043f\u0440\u0430\u0432\u043b\u0435\u043d\u043d\u044b\u0439 \u043d\u0430 email."
                  : "Enter the 6-digit code sent to your email to continue."}
              </p>
              <div className="mt-3 space-y-2">
                <p className="text-center text-xs font-medium text-muted-foreground">{isRu ? "\u041a\u043e\u0434 OTP" : "OTP Code"}</p>
                <InputOTP
                  value={trackOtpCode}
                  onChange={(value) => setTrackOtpCode(value.replace(/\D/g, "").slice(0, 6))}
                  maxLength={6}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  containerClassName="justify-center"
                className="gap-1.5 sm:gap-2"
              >
                  <InputOTPGroup className="justify-center gap-1.5 sm:gap-2">
                    <InputOTPSlot index={0} className="h-9 w-9 rounded-xl border border-border/70 bg-white text-sm font-semibold shadow-sm sm:h-14 sm:w-14 sm:text-base" />
                    <InputOTPSlot index={1} className="h-9 w-9 rounded-xl border border-border/70 bg-white text-sm font-semibold shadow-sm sm:h-14 sm:w-14 sm:text-base" />
                    <InputOTPSlot index={2} className="h-9 w-9 rounded-xl border border-border/70 bg-white text-sm font-semibold shadow-sm sm:h-14 sm:w-14 sm:text-base" />
                    <InputOTPSlot index={3} className="h-9 w-9 rounded-xl border border-border/70 bg-white text-sm font-semibold shadow-sm sm:h-14 sm:w-14 sm:text-base" />
                    <InputOTPSlot index={4} className="h-9 w-9 rounded-xl border border-border/70 bg-white text-sm font-semibold shadow-sm sm:h-14 sm:w-14 sm:text-base" />
                    <InputOTPSlot index={5} className="h-9 w-9 rounded-xl border border-border/70 bg-white text-sm font-semibold shadow-sm sm:h-14 sm:w-14 sm:text-base" />
                  </InputOTPGroup>
                </InputOTP>
              </div>
              <div className="mx-auto mt-3 grid w-full max-w-xl grid-cols-1 gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => void handleVerifyTrackOtp()}
                  disabled={trackOtpLoading}
                  className={`h-10 w-full rounded-lg bg-foreground px-3 text-xs font-semibold uppercase tracking-widest text-background transition-colors sm:h-11 sm:text-sm ${
                    trackOtpLoading ? "cursor-not-allowed opacity-70" : "hover:bg-[#2B2722]"
                  }`}
                >
                  {trackOtpLoading
                    ? isRu
                      ? "\u041f\u0440\u043e\u0432\u0435\u0440\u044f\u0435\u043c..."
                      : "Verifying..."
                    : isRu
                      ? "\u041f\u0440\u043e\u0432\u0435\u0440\u0438\u0442\u044c OTP"
                      : "Verify OTP"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTrackChallengeId("")
                    setTrackOtpCode("")
                    setTrackOtpInfo("")
                    setTrackOtpError("")
                    setTrackOtpDevCode("")
                    void handleTrackOrder({ preventDefault: () => undefined } as FormEvent<HTMLFormElement>)
                  }}
                  disabled={trackOtpLoading || loading}
                  className={`h-10 w-full rounded-lg border border-border bg-white px-3 text-xs font-semibold uppercase tracking-widest text-foreground transition-colors sm:h-11 sm:text-sm ${
                    trackOtpLoading || loading ? "cursor-not-allowed opacity-70" : "hover:bg-secondary"
                  }`}
                >
                  {isRu ? "\u041f\u043e\u0432\u0442\u043e\u0440\u043d\u043e OTP" : "Resend OTP"}
                </button>
              </div>
            </div>
          )}

          {!error && searched && !loading && orders.length === 0 && (
            <p className="mt-4 text-sm text-muted-foreground">
              {isRu ? "\u0417\u0430\u043a\u0430\u0437 \u043f\u043e \u0443\u043a\u0430\u0437\u0430\u043d\u043d\u044b\u043c \u0434\u0430\u043d\u043d\u044b\u043c \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d." : "No order found for the provided data."}
            </p>
          )}

          {orders.length > 0 && (
            <div className="mt-6 space-y-4">
              {orders.map((order) => (
                <article key={order.orderId} className="rounded-xl border border-border/40 bg-background/60 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-foreground">
                      {isRu ? "Order ID" : "Order ID"}: {order.orderId}
                    </p>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(order.status)}`}>
                      {order.status}
                    </span>
                  </div>

                  <div className="mt-3 grid gap-1 text-sm text-muted-foreground">
                    {order.customerName && (
                      <p>
                        {isRu ? "\u0418\u043c\u044f" : "Name"}: {maskCustomerName(order.customerName)}
                      </p>
                    )}
                    {order.phoneNumber && (
                      <p>
                        {isRu ? "\u0422\u0435\u043b\u0435\u0444\u043e\u043d" : "Phone"}: {maskPhoneNumber(order.phoneNumber)}
                      </p>
                    )}
                    <p>
                      {isRu ? "\u0421\u0443\u043c\u043c\u0430" : "Amount"}: {order.currency} {Number(order.amount).toFixed(2)}
                    </p>
                  </div>

                  {renderItemsFromCartJson(order.cartJson, order.currency, locale)}

                  <section className="mt-4 rounded-xl border border-[#D4AF37]/30 bg-[#FFFDF8] p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#A77B15]">
                      {isRu ? "\u041e\u0442\u0441\u043b\u0435\u0436\u0438\u0432\u0430\u043d\u0438\u0435 \u0434\u043e\u0441\u0442\u0430\u0432\u043a\u0438" : "Shipment Tracking"}
                    </p>

                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-lg border border-[#D4AF37]/20 bg-white px-3 py-2">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                          {isRu ? "\u0422\u0440\u0435\u043a-\u043d\u043e\u043c\u0435\u0440" : "Tracking Number"}
                        </p>
                        <p className="mt-1 break-all text-sm font-semibold text-foreground">{order.trackingNumber || "-"}</p>
                      </div>

                      <div className="rounded-lg border border-[#D4AF37]/20 bg-white px-3 py-2">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                          {isRu ? "\u041f\u0435\u0440\u0435\u0432\u043e\u0437\u0447\u0438\u043a" : "Carrier"}
                        </p>
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
                        {isRu ? "\u041e\u0442\u0441\u043b\u0435\u0434\u0438\u0442\u044c \u0432 DHL" : "Track on DHL"}
                      </a>
                    )}

                    {!order.trackingNumber && (
                      <p className="mt-3 text-xs text-muted-foreground">
                        {isRu
                          ? "\u0422\u0440\u0435\u043a-\u0438\u043d\u0444\u043e\u0440\u043c\u0430\u0446\u0438\u044f \u043f\u043e\u044f\u0432\u0438\u0442\u0441\u044f \u0437\u0434\u0435\u0441\u044c \u043f\u043e\u0441\u043b\u0435 \u043e\u0442\u043f\u0440\u0430\u0432\u043a\u0438 \u043f\u043e\u0441\u044b\u043b\u043a\u0438."
                          : "Tracking info will appear here once your shipment is dispatched."}
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

export default function TrackOrderPage() {
  return (
    <Suspense fallback={null}>
      <TrackOrderContent />
    </Suspense>
  )
}
