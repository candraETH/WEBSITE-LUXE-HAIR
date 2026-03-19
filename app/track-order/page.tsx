"use client"

import { useSearchParams } from "next/navigation"
import { FormEvent, Suspense, useEffect, useMemo, useRef, useState } from "react"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { useLocale } from "@/context/LocaleContext"

type TrackedOrder = {
  orderId: string
  status: string
  amount: number
  currency: string
  customerName: string
  customerEmailMasked?: string
  canSendInvoice?: boolean
  phoneNumber: string
  trackingNumber: string
  shippingCarrier: string
  cartJson: unknown
}

type TrackReadResponse = {
  error?: string
  orders?: TrackedOrder[]
}

type SendInvoiceResponse = {
  error?: string
  message?: string
  destination?: string
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
  const [invoiceOptInByOrder, setInvoiceOptInByOrder] = useState<Record<string, boolean>>({})
  const [invoiceLoadingByOrder, setInvoiceLoadingByOrder] = useState<Record<string, boolean>>({})
  const [invoiceSuccessByOrder, setInvoiceSuccessByOrder] = useState<Record<string, string>>({})
  const [invoiceErrorByOrder, setInvoiceErrorByOrder] = useState<Record<string, string>>({})
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
    return normalizedPhoneDigits ? `+${normalizedPhoneDigits}` : ""
  }

  const resetTrackingState = () => {
    setOrders([])
    setSearched(false)
    setError("")
    setInvoiceOptInByOrder({})
    setInvoiceLoadingByOrder({})
    setInvoiceSuccessByOrder({})
    setInvoiceErrorByOrder({})
  }

  const handleTrackOrder = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!canTrackOrder) {
      setError(
        isRu
          ? "\u0412\u0432\u0435\u0434\u0438\u0442\u0435 ID \u0437\u0430\u043a\u0430\u0437\u0430 PayPal \u0438 \u043d\u043e\u043c\u0435\u0440 \u0442\u0435\u043b\u0435\u0444\u043e\u043d\u0430."
          : "Enter both PayPal Order ID and Phone Number."
      )
      return
    }

    const normalizedPhone = normalizePhone()
    if (!normalizedPhone) {
      setError(isRu ? "\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u043a\u043e\u0440\u0440\u0435\u043a\u0442\u043d\u044b\u0439 \u043d\u043e\u043c\u0435\u0440 \u0442\u0435\u043b\u0435\u0444\u043e\u043d\u0430." : "Enter a valid phone number.")
      return
    }

    setLoading(true)
    setError("")
    setOrders([])
    setSearched(false)
    setInvoiceOptInByOrder({})
    setInvoiceLoadingByOrder({})
    setInvoiceSuccessByOrder({})
    setInvoiceErrorByOrder({})

    try {
      const response = await fetch("/api/order-tracking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: orderId.trim().toUpperCase(),
          phoneNumber: normalizedPhone,
        }),
      })

      const data = (await response.json().catch(() => ({}))) as TrackReadResponse
      if (!response.ok) {
        throw new Error(isRu ? "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043e\u0442\u0441\u043b\u0435\u0434\u0438\u0442\u044c \u0437\u0430\u043a\u0430\u0437." : data.error || "Unable to track order.")
      }

      const nextOrders = Array.isArray(data.orders) ? data.orders : []
      setOrders(nextOrders)
      setSearched(true)
      if (nextOrders.length === 0) {
        setError(isRu ? "\u0417\u0430\u043a\u0430\u0437 \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d." : "No order found.")
      }
    } catch (requestError) {
      const safeMessage = isRu
        ? "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043e\u0442\u0441\u043b\u0435\u0434\u0438\u0442\u044c \u0437\u0430\u043a\u0430\u0437."
        : requestError instanceof Error
          ? requestError.message
          : "Unable to track order."
      setError(safeMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleSendInvoice = async (targetOrderId: string) => {
    if (!invoiceOptInByOrder[targetOrderId]) {
      setInvoiceErrorByOrder((prev) => ({
        ...prev,
        [targetOrderId]: isRu
          ? "\u0421\u043d\u0430\u0447\u0430\u043b\u0430 \u043e\u0442\u043c\u0435\u0442\u044c\u0442\u0435 \u043e\u043f\u0446\u0438\u044e \u0434\u043b\u044f \u0441\u0447\u0451\u0442\u0430."
          : "Select the invoice option first.",
      }))
      return
    }

    const normalizedPhone = normalizePhone()
    if (!normalizedPhone) {
      setInvoiceErrorByOrder((prev) => ({
        ...prev,
        [targetOrderId]: isRu
          ? "\u041d\u043e\u043c\u0435\u0440 \u0442\u0435\u043b\u0435\u0444\u043e\u043d\u0430 \u043d\u0435 \u0443\u043a\u0430\u0437\u0430\u043d. \u041f\u043e\u0432\u0442\u043e\u0440\u0438\u0442\u0435 \u043f\u043e\u0438\u0441\u043a \u0437\u0430\u043a\u0430\u0437\u0430."
          : "Phone number is missing. Please search the order again.",
      }))
      return
    }

    setInvoiceLoadingByOrder((prev) => ({ ...prev, [targetOrderId]: true }))
    setInvoiceErrorByOrder((prev) => ({ ...prev, [targetOrderId]: "" }))
    setInvoiceSuccessByOrder((prev) => ({ ...prev, [targetOrderId]: "" }))

    try {
      const response = await fetch("/api/order-tracking/send-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: targetOrderId,
          phoneNumber: normalizedPhone,
        }),
      })

      const data = (await response.json().catch(() => ({}))) as SendInvoiceResponse
      if (!response.ok) {
        throw new Error(isRu ? "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043e\u0442\u043f\u0440\u0430\u0432\u0438\u0442\u044c \u0441\u0447\u0451\u0442." : data.error || "Unable to send invoice.")
      }

      const successMessage = data.destination
        ? `${data.message || (isRu ? "\u0421\u0447\u0451\u0442 \u043e\u0442\u043f\u0440\u0430\u0432\u043b\u0435\u043d." : "Invoice sent successfully.")} (${data.destination})`
        : data.message || (isRu ? "\u0421\u0447\u0451\u0442 \u043e\u0442\u043f\u0440\u0430\u0432\u043b\u0435\u043d." : "Invoice sent successfully.")

      setInvoiceSuccessByOrder((prev) => ({
        ...prev,
        [targetOrderId]: successMessage,
      }))
      setInvoiceOptInByOrder((prev) => ({
        ...prev,
        [targetOrderId]: false,
      }))
    } catch (requestError) {
      const safeMessage = isRu
        ? "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043e\u0442\u043f\u0440\u0430\u0432\u0438\u0442\u044c \u0441\u0447\u0451\u0442."
        : requestError instanceof Error
          ? requestError.message
          : "Unable to send invoice."
      setInvoiceErrorByOrder((prev) => ({
        ...prev,
        [targetOrderId]: safeMessage,
      }))
    } finally {
      setInvoiceLoadingByOrder((prev) => ({ ...prev, [targetOrderId]: false }))
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
                {isRu ? "ID \u0437\u0430\u043a\u0430\u0437\u0430 PayPal" : "PayPal Order ID"}:{" "}
                <span className="font-semibold text-foreground">{primaryOrder.orderId}</span>
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {isRu ? "\u0422\u0435\u043a\u0443\u0449\u0438\u0439 \u0441\u0442\u0430\u0442\u0443\u0441" : "Current status"}:{" "}
                <span className="font-semibold text-foreground">{primaryOrder.status}</span>
              </p>
            </section>
          )}

          <p id="order-tracking" className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            {isRu ? "\u041e\u0442\u0441\u043b\u0435\u0436\u0438\u0432\u0430\u043d\u0438\u0435 \u0437\u0430\u043a\u0430\u0437\u0430" : "Order Tracking"}
          </p>
          <h1 className="mt-3 font-serif text-3xl font-bold text-foreground sm:text-4xl">
            {isRu ? "\u041e\u0442\u0441\u043b\u0435\u0434\u0438\u0442\u044c \u0437\u0430\u043a\u0430\u0437" : "Track Your Order"}
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            {isRu
              ? "\u0412\u0432\u0435\u0434\u0438\u0442\u0435 PayPal Order ID \u0438 \u043d\u043e\u043c\u0435\u0440 WhatsApp, \u0447\u0442\u043e\u0431\u044b \u0443\u0432\u0438\u0434\u0435\u0442\u044c \u0434\u0435\u0442\u0430\u043b\u0438 \u0437\u0430\u043a\u0430\u0437\u0430."
              : "Enter your PayPal Order ID and WhatsApp number to view order details."}
          </p>

          <form className="mt-6 space-y-4" onSubmit={handleTrackOrder}>
            <label className="block text-xs font-medium text-muted-foreground">
              {isRu ? "ID \u0437\u0430\u043a\u0430\u0437\u0430 PayPal" : "PayPal Order ID"}
              <input
                type="text"
                value={orderId}
                onChange={(event) => {
                  setOrderId(event.target.value)
                  resetTrackingState()
                }}
                placeholder={isRu ? "\u041f\u0440\u0438\u043c\u0435\u0440: 5PE7892813655042E" : "Example: 5PE7892813655042E"}
                className="mt-1 h-11 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/40"
              />
            </label>

            <label className="block text-xs font-medium text-muted-foreground">
              {isRu ? "\u041d\u043e\u043c\u0435\u0440 \u0442\u0435\u043b\u0435\u0444\u043e\u043d\u0430" : "Phone Number"}
              <input
                type="tel"
                value={phoneNumber}
                onChange={(event) => {
                  setPhoneNumber(event.target.value)
                  resetTrackingState()
                }}
                placeholder={isRu ? "\u041f\u0440\u0438\u043c\u0435\u0440: +62812xxxxxxx" : "Example: +62812xxxxxxx"}
                className="mt-1 h-11 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/40"
              />
            </label>

            <button
              type="submit"
              disabled={loading || !canTrackOrder}
              className={`w-full rounded-lg bg-foreground px-5 py-3 text-sm font-semibold uppercase tracking-widest text-background transition-colors ${
                loading || !canTrackOrder ? "cursor-not-allowed opacity-70" : "hover:bg-[#2B2722]"
              }`}
            >
              {loading
                ? isRu
                  ? "\u041f\u0440\u043e\u0432\u0435\u0440\u044f\u0435\u043c..."
                  : "Checking..."
                : isRu
                  ? "\u041e\u0442\u0441\u043b\u0435\u0434\u0438\u0442\u044c"
                  : "Track Order"}
            </button>
          </form>

          {error && <p className="mt-4 text-sm font-medium text-red-500">{error}</p>}

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

                  <section className="mt-4 rounded-xl border border-border/40 bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      {isRu ? "\u0421\u0447\u0451\u0442" : "Invoice"}
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {order.canSendInvoice
                        ? isRu
                          ? "\u0415\u0441\u043b\u0438 \u0432\u0430\u043c \u043d\u0443\u0436\u0435\u043d \u0441\u0447\u0451\u0442, \u043c\u044b \u043c\u043e\u0436\u0435\u043c \u043e\u0442\u043f\u0440\u0430\u0432\u0438\u0442\u044c \u0435\u0433\u043e \u043d\u0430 \u0432\u0430\u0448 email."
                          : "If you need an invoice, we can send it to your registered email."
                        : isRu
                          ? "\u041e\u0442\u043f\u0440\u0430\u0432\u043a\u0430 \u0441\u0447\u0451\u0442\u0430 \u043d\u0435\u0434\u043e\u0441\u0442\u0443\u043f\u043d\u0430 \u0434\u043b\u044f \u044d\u0442\u043e\u0433\u043e \u0437\u0430\u043a\u0430\u0437\u0430."
                          : "Invoice email is not available for this order."}
                    </p>

                    <label
                      className={`mt-3 flex items-start gap-2 text-sm ${
                        order.canSendInvoice ? "text-foreground" : "cursor-not-allowed text-muted-foreground"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={Boolean(invoiceOptInByOrder[order.orderId])}
                        onChange={(event) =>
                          setInvoiceOptInByOrder((prev) => ({
                            ...prev,
                            [order.orderId]: event.target.checked,
                          }))
                        }
                        disabled={!order.canSendInvoice || Boolean(invoiceLoadingByOrder[order.orderId])}
                        className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[#1f1f1f] focus:ring-[#D4AF37]/40"
                      />
                      <span>
                        {order.canSendInvoice
                          ? isRu
                            ? `\u041e\u0442\u043f\u0440\u0430\u0432\u0438\u0442\u044c \u0441\u0447\u0451\u0442 \u043d\u0430 ${order.customerEmailMasked || "\u0432\u0430\u0448 email"}`
                            : `Send invoice to ${order.customerEmailMasked || "your registered email"}`
                          : isRu
                            ? "\u0415\u0441\u043b\u0438 \u043d\u0443\u0436\u043d\u0430 \u043f\u043e\u043c\u043e\u0449\u044c \u0441\u043e \u0441\u0447\u0451\u0442\u043e\u043c, \u043d\u0430\u043f\u0438\u0448\u0438\u0442\u0435 \u0432 \u043f\u043e\u0434\u0434\u0435\u0440\u0436\u043a\u0443."
                            : "Please contact support if you need manual invoice assistance."}
                      </span>
                    </label>

                    <button
                      type="button"
                      onClick={() => void handleSendInvoice(order.orderId)}
                      disabled={
                        !order.canSendInvoice ||
                        !invoiceOptInByOrder[order.orderId] ||
                        Boolean(invoiceLoadingByOrder[order.orderId])
                      }
                      className={`mt-3 w-full rounded-lg border border-border px-5 py-3 text-sm font-semibold uppercase tracking-widest text-foreground transition-colors ${
                        !order.canSendInvoice ||
                        !invoiceOptInByOrder[order.orderId] ||
                        Boolean(invoiceLoadingByOrder[order.orderId])
                          ? "cursor-not-allowed opacity-70"
                          : "hover:bg-secondary"
                      }`}
                    >
                      {invoiceLoadingByOrder[order.orderId]
                        ? isRu
                          ? "\u041e\u0442\u043f\u0440\u0430\u0432\u043b\u044f\u0435\u043c \u0441\u0447\u0451\u0442..."
                          : "Sending Invoice..."
                        : isRu
                          ? "\u041e\u0442\u043f\u0440\u0430\u0432\u0438\u0442\u044c \u0441\u0447\u0451\u0442 \u043d\u0430 email"
                          : "Send Invoice to Email"}
                    </button>

                    {invoiceSuccessByOrder[order.orderId] && (
                      <p className="mt-2 text-xs font-medium text-[#2E7D32]">{invoiceSuccessByOrder[order.orderId]}</p>
                    )}

                    {invoiceErrorByOrder[order.orderId] && (
                      <p className="mt-2 text-xs font-medium text-red-500">{invoiceErrorByOrder[order.orderId]}</p>
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
