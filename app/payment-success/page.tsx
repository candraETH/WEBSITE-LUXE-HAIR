"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Footer } from "@/components/footer"
import { Navbar } from "@/components/navbar"
import { useCart } from "@/context/CartContext"
import { useLocale } from "@/context/LocaleContext"
import { WHATSAPP_ENABLED } from "@/lib/whatsapp-config"
import { markPaymentNotificationSent, removePaymentDraft, wasPaymentNotificationSent } from "@/lib/payment-draft"
import { getSupabaseBrowserClient } from "@/lib/supabase-browser"
import { withLocaleHref } from "@/lib/i18n"

type PaymentUiState = "processing" | "paid" | "pending" | "error"

const POLL_INTERVAL_MS = 2500
const MAX_POLL_ATTEMPTS = 24

type CaptureResponse = {
  error?: string
}

type PaymentStatusResponse = {
  error?: string
  orderId?: string
  status?: string
}

type NotificationUrls = {
  sellerUrl: string
  buyerUrl: string
}

type WhatsAppConfirmationResponse = {
  error?: string
  sellerUrl?: string
  buyerUrl?: string
}

function sleep(ms: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

function normalizeStatus(value: string | null | undefined) {
  return (value ?? "").trim().toUpperCase()
}

function isCaptureAlreadyProcessedError(message: string) {
  const normalized = message.trim().toUpperCase()
  return (
    normalized.includes("ORDER_ALREADY_CAPTURED") ||
    normalized.includes("UNPROCESSABLE_ENTITY") ||
    normalized.includes("ALREADY")
  )
}

function PaymentSuccessContent() {
  const { locale } = useLocale()
  const isRu = locale === "ru"
  const localizedHref = (href: string) => withLocaleHref(href, locale)
  const supabase = useMemo(() => getSupabaseBrowserClient(), [])
  const searchParams = useSearchParams()
  const orderId = useMemo(() => searchParams.get("token")?.trim() ?? "", [searchParams])
  const { clearCart, isCartReady } = useCart()

  const [uiState, setUiState] = useState<PaymentUiState>("processing")
  const [message, setMessage] = useState(isRu ? "Проверяем оплату..." : "Verifying your payment...")
  const [lastStatus, setLastStatus] = useState("")
  const [retryKey, setRetryKey] = useState(0)
  const [notificationInfo, setNotificationInfo] = useState("")
  const [notificationError, setNotificationError] = useState("")
  const [manualNotificationUrls, setManualNotificationUrls] = useState<NotificationUrls | null>(null)
  const didClearCartRef = useRef(false)
  const didNotifyRef = useRef(false)

  const verifyPayment = useCallback(async () => {
    if (!orderId) {
      setUiState("error")
      setMessage(isRu ? "Не найден токен заказа PayPal. Пожалуйста, оформите заказ снова." : "Missing PayPal order token. Please try checkout again.")
      return
    }

    setUiState("processing")
    setMessage(isRu ? "Завершаем оплату..." : "Finalizing your payment...")
    setLastStatus("")

    const sessionResult = supabase ? await supabase.auth.getSession() : null
    const token = sessionResult?.data.session?.access_token ?? ""
    if (!token) {
      setUiState("error")
      setMessage(
        isRu
          ? "Сессия истекла. Пожалуйста, войдите снова, чтобы проверить оплату."
          : "Your session expired. Please sign in again to verify payment."
      )
      return
    }

    const authHeaders = { authorization: `Bearer ${token}` }

    const getCurrentStatus = async () => {
      const statusResponse = await fetch("/api/payment-status", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ orderId }),
      })

      const statusData = (await statusResponse.json().catch(() => ({}))) as PaymentStatusResponse
      if (!statusResponse.ok) {
        return { status: "", data: statusData }
      }

      return { status: normalizeStatus(statusData.status), data: statusData }
    }

    const currentStatus = await getCurrentStatus()
    if (currentStatus.status) {
      setLastStatus(currentStatus.status)

      if (currentStatus.status === "PAID") {
        setUiState("paid")
        setMessage(isRu ? "Оплата прошла успешно. Заказ подтверждён." : "Payment successful. Your order has been confirmed.")
        return
      }

      if (
        currentStatus.status === "FAILED" ||
        currentStatus.status === "REFUNDED" ||
        currentStatus.status === "DENIED"
      ) {
        setUiState("error")
        setMessage(
          isRu
            ? `Статус оплаты: ${currentStatus.status}. Пожалуйста, свяжитесь с поддержкой.`
            : `Payment status: ${currentStatus.status}. Please contact support.`
        )
        return
      }
    }

    const captureResponse = await fetch("/api/capture-order", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders },
      body: JSON.stringify({ orderId }),
    })

    const captureData = (await captureResponse.json().catch(() => ({}))) as CaptureResponse
    if (!captureResponse.ok) {
      throw new Error(captureData.error || (isRu ? "Не удалось подтвердить оплату PayPal." : "Failed to capture PayPal payment."))
    }

    if (captureData.error && !isCaptureAlreadyProcessedError(captureData.error)) {
      throw new Error(captureData.error)
    }

    for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt += 1) {
      const statusResult = await getCurrentStatus()
      if (statusResult.status) {
        setLastStatus(statusResult.status)

        if (statusResult.status === "PAID") {
          setUiState("paid")
          setMessage(isRu ? "Оплата прошла успешно. Заказ подтверждён." : "Payment successful. Your order has been confirmed.")
          return
        }

        if (
          statusResult.status === "FAILED" ||
          statusResult.status === "REFUNDED" ||
          statusResult.status === "DENIED"
        ) {
          setUiState("error")
          setMessage(
            isRu
              ? `Статус оплаты: ${statusResult.status}. Пожалуйста, свяжитесь с поддержкой.`
              : `Payment status: ${statusResult.status}. Please contact support.`
          )
          return
        }
      }

      await sleep(POLL_INTERVAL_MS)
    }

    setUiState("pending")
    setMessage(
      isRu
        ? "Оплата ещё подтверждается. Пожалуйста, проверьте статус чуть позже."
        : "Payment is still being confirmed. Please check again in a moment."
    )
  }, [orderId, supabase, isRu])

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      try {
        await verifyPayment()
      } catch (error) {
        if (cancelled) {
          return
        }
        const safeMessage =
          error instanceof Error ? error.message : isRu ? "Не удалось проверить оплату." : "Unable to verify payment."
        setUiState("error")
        setMessage(safeMessage)
      }
    }

    void run()

    return () => {
      cancelled = true
    }
  }, [retryKey, verifyPayment, isRu])

  useEffect(() => {
    if (uiState !== "paid" || !isCartReady || didClearCartRef.current) {
      return
    }

    clearCart()
    didClearCartRef.current = true
  }, [clearCart, isCartReady, uiState])

  const openNotificationTabs = useCallback((urls: NotificationUrls) => {
    const sellerWindow = window.open(urls.sellerUrl, "_blank", "noopener,noreferrer")
    const buyerWindow = urls.buyerUrl
      ? window.open(urls.buyerUrl, "_blank", "noopener,noreferrer")
      : null

    const sellerBlocked = !sellerWindow
    const buyerBlocked = Boolean(urls.buyerUrl) && !buyerWindow
    return { sellerBlocked, buyerBlocked }
  }, [])

  const sendWhatsAppNotifications = useCallback(async () => {
    if (!orderId || didNotifyRef.current) {
      return
    }

    if (wasPaymentNotificationSent(orderId)) {
      didNotifyRef.current = true
      setNotificationInfo(
        isRu
          ? "Подтверждение WhatsApp для этого заказа уже было открыто."
          : "WhatsApp confirmation for this order was already opened."
      )
      return
    }

    if (!WHATSAPP_ENABLED) {
      didNotifyRef.current = true
      setNotificationInfo(isRu ? "Уведомления WhatsApp отключены в конфигурации." : "WhatsApp notifications are disabled in configuration.")
      return
    }

    const sessionResult = supabase ? await supabase.auth.getSession() : null
    const token = sessionResult?.data.session?.access_token ?? ""
    if (!token) {
      throw new Error(isRu ? "Пожалуйста, войдите снова, чтобы отправить подтверждение WhatsApp." : "Please sign in again to send WhatsApp confirmation.")
    }

    const response = await fetch("/api/whatsapp-confirmation", {
      method: "POST",
      headers: { "Content-Type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({ orderId }),
    })
    const payload = (await response.json().catch(() => ({}))) as WhatsAppConfirmationResponse
    if (!response.ok || !payload.sellerUrl) {
      throw new Error(
        payload.error ||
          (isRu ? "Не удалось подготовить подтверждение WhatsApp." : "Unable to prepare WhatsApp confirmation.")
      )
    }

    const urls: NotificationUrls = {
      sellerUrl: payload.sellerUrl,
      buyerUrl: payload.buyerUrl ?? "",
    }

    const blocked = openNotificationTabs(urls)
    if (blocked.sellerBlocked || blocked.buyerBlocked) {
      setManualNotificationUrls(urls)
      setNotificationInfo(
        isRu
          ? "Браузер заблокировал автоматическое открытие WhatsApp. Нажмите ниже, чтобы отправить вручную."
          : "Browser blocked automatic WhatsApp tabs. Tap below to send manually."
      )
      return
    }

    markPaymentNotificationSent(orderId)
    removePaymentDraft(orderId)
    didNotifyRef.current = true
    setManualNotificationUrls(null)
    setNotificationInfo(
      urls.buyerUrl
        ? isRu
          ? "Подтверждения WhatsApp открыты для продавца и покупателя."
          : "WhatsApp confirmations opened for seller and buyer."
        : isRu
          ? "Подтверждение WhatsApp открыто для продавца."
          : "WhatsApp confirmation opened for seller."
    )
  }, [openNotificationTabs, orderId, supabase, isRu])

  const handleManualNotification = () => {
    if (!manualNotificationUrls || !orderId) {
      return
    }

    const blocked = openNotificationTabs(manualNotificationUrls)
    if (blocked.sellerBlocked || blocked.buyerBlocked) {
      setNotificationError(
        isRu
          ? "Браузер по-прежнему блокирует всплывающие окна WhatsApp. Разрешите popups для этого сайта."
          : "Browser still blocked WhatsApp popups. Please allow popups for this site."
      )
      return
    }

    markPaymentNotificationSent(orderId)
    removePaymentDraft(orderId)
    didNotifyRef.current = true
    setNotificationError("")
    setManualNotificationUrls(null)
    setNotificationInfo(isRu ? "Подтверждения WhatsApp успешно отправлены." : "WhatsApp confirmations sent successfully.")
  }

  useEffect(() => {
    if (uiState !== "paid") {
      return
    }

    const timeoutId = window.setTimeout(() => {
      void sendWhatsAppNotifications().catch((error) => {
        const safeMessage =
          error instanceof Error
            ? error.message
            : isRu
              ? "Не удалось подготовить подтверждение WhatsApp."
              : "Failed to prepare WhatsApp confirmation."
        setNotificationError(safeMessage)
      })
    }, 0)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [sendWhatsAppNotifications, uiState, isRu])

  return (
    <main className="min-h-screen overflow-x-hidden bg-gradient-to-b from-background to-background/50 pt-[102px] lg:pt-[108px]">
      <Navbar />

      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:py-14">
        <div className="rounded-2xl border border-border/40 bg-card/80 p-6 shadow-lg sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            {isRu ? "Статус оплаты" : "Payment Status"}
          </p>

          <h1 className="mt-3 font-serif text-3xl font-bold text-foreground sm:text-4xl">
            {uiState === "paid"
              ? isRu
                ? "Оплата прошла успешно"
                : "Payment Successful"
              : uiState === "processing"
                ? isRu
                  ? "Обработка оплаты"
                  : "Processing Payment"
                : isRu
                  ? "Обновление оплаты"
                  : "Payment Update"}
          </h1>

          <p className="mt-4 text-base text-muted-foreground">{message}</p>

          {orderId && (
            <p className="mt-3 text-sm text-muted-foreground">
              {isRu ? "ID заказа PayPal" : "PayPal Order ID"}:{" "}
              <span className="font-semibold text-foreground">{orderId}</span>
            </p>
          )}

          {lastStatus && (
            <p className="mt-1 text-sm text-muted-foreground">
              {isRu ? "Текущий статус" : "Current status"}:{" "}
              <span className="font-semibold text-foreground">{lastStatus}</span>
            </p>
          )}

          <div className={`mt-8 grid gap-3 ${uiState === "paid" ? "grid-cols-2" : "grid-cols-1"}`}>
            <Link href={localizedHref("/")}>
              <Button className="w-full">{isRu ? "Продолжить покупки" : "Continue Shopping"}</Button>
            </Link>

            {uiState === "paid" && (
              <Link href={localizedHref("/track-order")}>
                <Button variant="outline" className="w-full">
                  {isRu ? "Отследить заказ" : "Track Order"}
                </Button>
              </Link>
            )}
          </div>

          {(uiState === "pending" || uiState === "error") && (
            <button
              type="button"
              onClick={() => setRetryKey((previous) => previous + 1)}
              className="mt-3 w-full rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
            >
              {isRu ? "Проверить статус снова" : "Check Status Again"}
            </button>
          )}

          {uiState === "paid" && notificationInfo && (
            <p className="mt-3 text-sm font-medium text-[#25D366]">{notificationInfo}</p>
          )}

          {uiState === "paid" && notificationError && (
            <p className="mt-3 text-sm font-medium text-red-500">{notificationError}</p>
          )}

          {uiState === "paid" && manualNotificationUrls && (
            <button
              type="button"
              onClick={handleManualNotification}
              className="mt-3 w-full rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
            >
              {isRu ? "Отправить подтверждение WhatsApp" : "Send WhatsApp Confirmation"}
            </button>
          )}
        </div>
      </div>

      <Footer />
    </main>
  )
}

function PaymentSuccessFallback() {
  const { locale } = useLocale()
  const isRu = locale === "ru"
  return (
    <main className="min-h-screen overflow-x-hidden bg-gradient-to-b from-background to-background/50 pt-[102px] lg:pt-[108px]">
      <Navbar />

      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:py-14">
        <div className="rounded-2xl border border-border/40 bg-card/80 p-6 shadow-lg sm:p-8">
          <p className="text-sm text-muted-foreground">
            {isRu ? "Загрузка данных об оплате..." : "Loading payment details..."}
          </p>
        </div>
      </div>

      <Footer />
    </main>
  )
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={<PaymentSuccessFallback />}>
      <PaymentSuccessContent />
    </Suspense>
  )
}
