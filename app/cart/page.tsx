"use client"

import Link from "next/link"
import Image from "next/image"
import { useEffect, useMemo, useState } from "react"
import { MAX_ITEM_QUANTITY, useCart } from "@/context/CartContext"
import { useLocale } from "@/context/LocaleContext"
import { Button } from "@/components/ui/button"
import { Footer } from "@/components/footer"
import { LAST_VISITED_ROUTE_KEY } from "@/lib/navigation-state"
import { withLocaleHref } from "@/lib/i18n"
import {
  EMPTY_CHECKOUT_DETAILS,
  isValidEmail,
  loadCheckoutDetails,
  saveCheckoutDetails,
  savePaymentDraft,
  type CheckoutDetails,
} from "@/lib/payment-draft"
import { containsDisallowedAddressMarker, hasAddressLettersAndNumbers } from "@/lib/checkout-customer"
import { formatUsdPrice, recoverOriginalPriceFromDiscounted } from "@/lib/pricing"
import { readAddresses } from "@/lib/address-book"
import { getSupabaseBrowserClient } from "@/lib/supabase-browser"
import { getProductDisplayCopy } from "@/lib/product-copy"
import { formatVariantDisplay } from "@/lib/variant-display"
import {
  calculateCouponDiscount,
  clearActiveCouponCode,
  COUPON_UPDATED_EVENT,
  getCouponByCode,
  isCouponEligibleForSubtotal,
  loadActiveCouponCode,
  normalizeCouponCode,
  saveActiveCouponCode,
  type CouponDefinition,
} from "@/lib/coupon"

type RequestVerificationResponse = {
  error?: string
  challengeId?: string
  destination?: string
  devOtpCode?: string
}

type VerifyVerificationResponse = {
  error?: string
  verificationToken?: string
}

export default function CartPage() {
  const { items, isCartReady, removeFromCart, updateQuantity, clearCart, getTotalPrice, getTotalItems } = useCart()
  const { locale } = useLocale()
  const isRu = locale === "ru"
  const localizedHref = (href: string) => withLocaleHref(href, locale)
  const supabase = useMemo(() => getSupabaseBrowserClient(), [])
  const [continueShoppingHref, setContinueShoppingHref] = useState("/")
  const [showCheckoutForm, setShowCheckoutForm] = useState(false)
  const [checkoutDetails, setCheckoutDetails] = useState<CheckoutDetails>(EMPTY_CHECKOUT_DETAILS)
  const [isCheckoutDetailsReady, setIsCheckoutDetailsReady] = useState(false)
  const [checkoutError, setCheckoutError] = useState("")
  const [paypalError, setPaypalError] = useState("")
  const [paypalInfo, setPaypalInfo] = useState("")
  const [paypalLoading, setPaypalLoading] = useState(false)
  const [verificationChallengeId, setVerificationChallengeId] = useState("")
  const [verificationCode, setVerificationCode] = useState("")
  const [verificationToken, setVerificationToken] = useState("")
  const [verificationLoading, setVerificationLoading] = useState(false)
  const [verificationInfo, setVerificationInfo] = useState("")
  const [verificationError, setVerificationError] = useState("")
  const [verificationDevCode, setVerificationDevCode] = useState("")
  const [couponInput, setCouponInput] = useState("")
  const [resolvedCouponDefinition, setResolvedCouponDefinition] = useState<CouponDefinition | null>(null)
  const [couponInfo, setCouponInfo] = useState("")
  const [couponError, setCouponError] = useState("")
  const [didAutofillAddress, setDidAutofillAddress] = useState(false)

  const ui = {
    loadingCart: isRu ? "\u0417\u0430\u0433\u0440\u0443\u0437\u043a\u0430 \u043a\u043e\u0440\u0437\u0438\u043d\u044b..." : "Loading cart...",
    backToShop: isRu ? "\u041d\u0430\u0437\u0430\u0434 \u0432 \u043c\u0430\u0433\u0430\u0437\u0438\u043d" : "Back to Shop",
    cartEmptyTitle: isRu ? "\u041a\u043e\u0440\u0437\u0438\u043d\u0430 \u043f\u0443\u0441\u0442\u0430" : "Your Cart is Empty",
    cartEmptyDescription: isRu
      ? "\u041f\u043e\u0441\u043c\u043e\u0442\u0440\u0438\u0442\u0435 \u043a\u043e\u043b\u043b\u0435\u043a\u0446\u0438\u044e \u0438 \u0434\u043e\u0431\u0430\u0432\u044c\u0442\u0435 \u0442\u043e\u0432\u0430\u0440\u044b, \u0447\u0442\u043e\u0431\u044b \u043d\u0430\u0447\u0430\u0442\u044c."
      : "Browse our collection and add some items to get started.",
    continueShopping: isRu ? "\u041f\u0440\u043e\u0434\u043e\u043b\u0436\u0438\u0442\u044c \u043f\u043e\u043a\u0443\u043f\u043a\u0438" : "Continue Shopping",
    shoppingCartTitle: isRu ? "\u041a\u043e\u0440\u0437\u0438\u043d\u0430" : "Shopping Cart",
    lengthLabel: isRu ? "\u0414\u043b\u0438\u043d\u0430" : "Length",
    eachLabel: isRu ? "\u0437\u0430 \u0448\u0442." : "each",
    orderSummary: isRu ? "\u0418\u0442\u043e\u0433 \u0437\u0430\u043a\u0430\u0437\u0430" : "Order Summary",
    couponCode: isRu ? "\u041f\u0440\u043e\u043c\u043e\u043a\u043e\u0434" : "Coupon Code",
    enterCoupon: isRu ? "\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u043f\u0440\u043e\u043c\u043e\u043a\u043e\u0434" : "Enter coupon",
    apply: isRu ? "\u041f\u0440\u0438\u043c\u0435\u043d\u0438\u0442\u044c" : "Apply",
    removeCoupon: isRu ? "\u0423\u0434\u0430\u043b\u0438\u0442\u044c \u043f\u0440\u043e\u043c\u043e\u043a\u043e\u0434" : "Remove coupon",
    subtotal: isRu ? "\u041f\u043e\u0434\u044b\u0442\u043e\u0433" : "Subtotal",
    shipping: isRu ? "\u0414\u043e\u0441\u0442\u0430\u0432\u043a\u0430" : "Shipping",
    shippingFree: isRu ? "\u0411\u0435\u0441\u043f\u043b\u0430\u0442\u043d\u043e" : "Free",
    shippingCalc: isRu ? "\u0420\u0430\u0441\u0447\u0438\u0442\u044b\u0432\u0430\u0435\u0442\u0441\u044f \u043f\u0440\u0438 \u043e\u0444\u043e\u0440\u043c\u043b\u0435\u043d\u0438\u0438" : "Calculated at checkout",
    tax: isRu ? "\u041d\u0430\u043b\u043e\u0433" : "Tax",
    total: isRu ? "\u0418\u0442\u043e\u0433\u043e:" : "Total:",
    clearCart: isRu ? "\u041e\u0447\u0438\u0441\u0442\u0438\u0442\u044c \u043a\u043e\u0440\u0437\u0438\u043d\u0443" : "Clear Cart",
    paypalCancelled: isRu ? "\u041f\u043b\u0430\u0442\u0451\u0436 PayPal \u0431\u044b\u043b \u043e\u0442\u043c\u0435\u043d\u0451\u043d." : "PayPal payment was cancelled.",
  } as const

  const continueShoppingLocalized = localizedHref(continueShoppingHref)

  const cartItemsLabel = (count: number) => {
    if (!isRu) return `${count} item(s) in your cart`
    const n = Math.abs(count)
    const mod10 = n % 10
    const mod100 = n % 100
    const word =
      mod10 === 1 && mod100 !== 11
        ? "\u0442\u043e\u0432\u0430\u0440"
        : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)
          ? "\u0442\u043e\u0432\u0430\u0440\u0430"
          : "\u0442\u043e\u0432\u0430\u0440\u043e\u0432"
    return `${count} ${word} \u0432 \u043a\u043e\u0440\u0437\u0438\u043d\u0435`
  }

  const getAnalyticsSessionId = () => {
    if (typeof window === "undefined") return ""
    return window.localStorage.getItem("analytics_session_id") ?? ""
  }

  useEffect(() => {
    const storedRoute = window.localStorage.getItem(LAST_VISITED_ROUTE_KEY)
    if (storedRoute && !storedRoute.startsWith("/cart")) {
      setContinueShoppingHref(storedRoute)
      return
    }

    const referrer = document.referrer
    if (!referrer) {
      return
    }

    try {
      const refUrl = new URL(referrer)
      if (refUrl.origin === window.location.origin && !refUrl.pathname.startsWith("/cart")) {
        setContinueShoppingHref(`${refUrl.pathname}${refUrl.search}${refUrl.hash}`)
      }
    } catch {
      // ignore invalid referrer
    }
  }, [])

  useEffect(() => {
    if (!isCartReady || items.length === 0) return
    const sessionId = getAnalyticsSessionId()
    if (!sessionId) return

    const sentKey = `analytics_checkout_started:${sessionId}`
    if (window.sessionStorage.getItem(sentKey)) return
    window.sessionStorage.setItem(sentKey, "1")

    fetch("/api/analytics/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
        name: "checkout_started",
        metadata: { items: getTotalItems(), total: getTotalPrice() },
      }),
    }).catch(() => {})
  }, [isCartReady, items.length, getTotalItems, getTotalPrice])

  useEffect(() => {
    setCheckoutDetails(loadCheckoutDetails())
    setIsCheckoutDetailsReady(true)
  }, [])

  useEffect(() => {
    if (!showCheckoutForm || !isCheckoutDetailsReady || didAutofillAddress || !supabase) {
      return
    }

    const client = supabase
    let cancelled = false

    async function tryAutofill() {
      const { data } = await client.auth.getUser()
      if (cancelled) return
      const user = data.user
      if (!user) {
        return
      }

      const addresses = readAddresses(user.id)
      if (addresses.length === 0) {
        setDidAutofillAddress(true)
        return
      }

      const selected = addresses.find((address) => address.isDefault) ?? addresses[0]
      if (!selected) {
        setDidAutofillAddress(true)
        return
      }

      let changed = false
      setCheckoutDetails((previous) => {
        const next: CheckoutDetails = { ...previous }

        if (!next.fullName.trim() && selected.fullName.trim()) {
          next.fullName = selected.fullName
          changed = true
        }
        if (!next.whatsapp.trim() && selected.phone.trim()) {
          next.whatsapp = selected.phone
          changed = true
        }
        if (!next.addressLine.trim() && selected.address.trim()) {
          next.addressLine = selected.address
          changed = true
        }
        if (!next.city.trim() && selected.city.trim()) {
          next.city = selected.city
          changed = true
        }
        if (!next.province.trim() && selected.province.trim()) {
          next.province = selected.province
          changed = true
        }
        if (!next.postalCode.trim() && selected.postalCode.trim()) {
          next.postalCode = selected.postalCode
          changed = true
        }
        if (!next.country.trim() && selected.country.trim()) {
          next.country = selected.country
          changed = true
        }

        return changed ? next : previous
      })

      setDidAutofillAddress(true)
      if (changed) setCheckoutError("")
    }

    void tryAutofill()
    const { data: subscription } = client.auth.onAuthStateChange(() => void tryAutofill())
    return () => {
      cancelled = true
      subscription.subscription.unsubscribe()
    }
  }, [didAutofillAddress, isCheckoutDetailsReady, showCheckoutForm, supabase])

  useEffect(() => {
    if (!isCheckoutDetailsReady) {
      return
    }

    saveCheckoutDetails(checkoutDetails)
  }, [checkoutDetails, isCheckoutDetailsReady])

  useEffect(() => {
    setVerificationToken("")
    setVerificationChallengeId("")
    setVerificationCode("")
    setVerificationInfo("")
    setVerificationError("")
    setVerificationDevCode("")
  }, [
    checkoutDetails.fullName,
    checkoutDetails.email,
    checkoutDetails.whatsapp,
    checkoutDetails.addressLine,
    checkoutDetails.city,
    checkoutDetails.province,
    checkoutDetails.postalCode,
    checkoutDetails.country,
  ])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const paypalStatus = params.get("paypal")

    if (paypalStatus === "cancel") {
      setPaypalInfo(
        isRu ? "\u041f\u043b\u0430\u0442\u0451\u0436 PayPal \u0431\u044b\u043b \u043e\u0442\u043c\u0435\u043d\u0451\u043d." : "PayPal payment was cancelled."
      )
      setPaypalError("")
      window.history.replaceState({}, "", withLocaleHref("/cart", locale))
      return
    }
  }, [isRu, locale])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get("checkout") !== "1") {
      return
    }

    if (!supabase) {
      return
    }

    let cancelled = false
    const client = supabase

    async function tryOpenCheckout() {
      const { data } = await client.auth.getUser()
      if (cancelled) return
      const user = data.user
      if (!user) return

      const addresses = readAddresses(user.id)
      if (addresses.length === 0) return

      setShowCheckoutForm(true)

      try {
        const nextUrl = new URL(window.location.href)
        nextUrl.searchParams.delete("checkout")
        window.history.replaceState({}, "", `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`)
      } catch {
        // ignore invalid URL
      }
    }

    void tryOpenCheckout()
    return () => {
      cancelled = true
    }
  }, [supabase])

  useEffect(() => {
    let cancelled = false

    const lookupCoupon = async (code: string): Promise<CouponDefinition | null> => {
      const builtIn = getCouponByCode(code)
      if (builtIn) return builtIn

      const response = await fetch("/api/coupons/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      })

      if (!response.ok) {
        return null
      }

      const payload = (await response.json().catch(() => ({}))) as { coupon?: CouponDefinition }
      return payload.coupon ?? null
    }

    const syncCouponFromStorage = async () => {
      const activeCode = loadActiveCouponCode()
      if (!activeCode) {
        setCouponInput("")
        setResolvedCouponDefinition(null)
        return
      }

      const resolvedCoupon = await lookupCoupon(activeCode)
      if (cancelled) return

      if (!resolvedCoupon) {
        setCouponInput("")
        setResolvedCouponDefinition(null)
        return
      }

      setCouponInput(resolvedCoupon.code)
      setResolvedCouponDefinition(resolvedCoupon)
    }

    void syncCouponFromStorage()
    const handler = () => void syncCouponFromStorage()
    window.addEventListener(COUPON_UPDATED_EVENT, handler)

    return () => {
      cancelled = true
      window.removeEventListener(COUPON_UPDATED_EVENT, handler)
    }
  }, [])

  if (!isCartReady) {
    return (
      <main className="min-h-screen overflow-x-hidden bg-gradient-to-b from-background to-background/50 pt-[102px] lg:pt-[108px]">
        <div className="mx-auto max-w-7xl px-4 md:px-5 lg:px-6 py-24">
          <p className="text-center text-muted-foreground">{ui.loadingCart}</p>
        </div>
      </main>
    )
  }

  if (items.length === 0) {
    return (
      <main className="min-h-screen overflow-x-hidden bg-gradient-to-b from-background to-background/50 pt-[102px] lg:pt-[108px]">
        <div className="mx-auto max-w-7xl px-4 md:px-5 lg:px-6 py-8 lg:py-10">
          <Link href={continueShoppingLocalized}>
            <Button
              variant="ghost"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground/70 transition-colors hover:text-foreground"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-4 w-4" aria-hidden="true">
                <path d="M15 18l-6-6 6-6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {ui.backToShop}
            </Button>
          </Link>
        </div>

        <div className="mx-auto max-w-7xl px-4 md:px-5 lg:px-6 py-24">
          <div className="text-center">
            <h1 className="mb-4 font-serif text-4xl font-bold text-foreground">{ui.cartEmptyTitle}</h1>
            <p className="mb-8 text-muted-foreground">{ui.cartEmptyDescription}</p>
            <Link href={continueShoppingLocalized}>
              <Button className="bg-[#D4AF37] hover:bg-[#C4951F] text-white">{ui.continueShopping}</Button>
            </Link>
          </div>
        </div>

        <Footer />
      </main>
    )
  }

  const totalPrice = getTotalPrice()
  const FREE_SHIPPING_THRESHOLD = 750
  const TAX_RATE = 0.035
  const activeCouponDefinition = resolvedCouponDefinition
  const isActiveCouponEligible = activeCouponDefinition
    ? isCouponEligibleForSubtotal(activeCouponDefinition, totalPrice)
    : false
  const activeCoupon = isActiveCouponEligible ? activeCouponDefinition : null
  const couponDiscountRaw = activeCoupon ? calculateCouponDiscount(totalPrice, activeCoupon.discountRate) : 0
  const couponDiscount = Math.min(totalPrice, Math.max(0, couponDiscountRaw))
  const couponMinimumNotice =
    activeCouponDefinition && !isActiveCouponEligible
      ? isRu
        ? `${activeCouponDefinition.code} \u0442\u0440\u0435\u0431\u0443\u0435\u0442 \u043c\u0438\u043d\u0438\u043c\u0430\u043b\u044c\u043d\u0443\u044e \u0441\u0443\u043c\u043c\u0443 ${formatUsdPrice(activeCouponDefinition.minimumSubtotal)}.`
        : `${activeCouponDefinition.code} requires minimum subtotal ${formatUsdPrice(activeCouponDefinition.minimumSubtotal)}.`
      : ""
  const isFreeShipping = totalPrice >= FREE_SHIPPING_THRESHOLD
  const taxAmount = parseFloat((totalPrice * TAX_RATE).toFixed(2))
  const finalTotal = parseFloat((Math.max(0, totalPrice - couponDiscount) + taxAmount).toFixed(2))
  const CHECKOUT_OTP_THRESHOLD_DOLLARS = 2500
  const requiresCheckoutOtp = finalTotal >= CHECKOUT_OTP_THRESHOLD_DOLLARS

  const getItemCopy = (item: (typeof items)[number]) =>
    getProductDisplayCopy(
      {
        slug: item.slug,
        name: item.name,
        category: item.category,
        price: "",
        image: item.image,
        description: "",
        longDescription: "",
        basePrice: 0,
        pricePerInch: 0,
      },
      locale
    )

  const getDisplayName = (item: (typeof items)[number]) => {
    const baseName = getItemCopy(item).name
    const displayVariant = formatVariantDisplay(item.variant)
    if (!displayVariant) {
      return baseName
    }

    if (baseName.toLowerCase().includes(displayVariant.toLowerCase())) {
      return baseName
    }

    return `${baseName} ${displayVariant}`
  }

  const updateCheckoutField = (field: keyof CheckoutDetails, value: string) => {
    setCheckoutDetails((previous) => ({ ...previous, [field]: value }))
    if (checkoutError) {
      setCheckoutError("")
    }
  }

  const updateCouponInput = (value: string) => {
    setCouponInput(value.toUpperCase().replace(/\s+/g, ""))
    if (couponError) {
      setCouponError("")
    }
    if (couponInfo) {
      setCouponInfo("")
    }
  }

  const applyCouponCode = async () => {
    const normalizedCode = normalizeCouponCode(couponInput)
    if (!normalizedCode) {
      setCouponError(
        isRu ? "\u0421\u043d\u0430\u0447\u0430\u043b\u0430 \u0432\u0432\u0435\u0434\u0438\u0442\u0435 \u043f\u0440\u043e\u043c\u043e\u043a\u043e\u0434." : "Enter a coupon code first."
      )
      setCouponInfo("")
      return
    }

    const builtIn = getCouponByCode(normalizedCode)
    const coupon = builtIn
      ? builtIn
      : await (async () => {
          const response = await fetch("/api/coupons/lookup", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code: normalizedCode }),
          })

          if (!response.ok) {
            return null
          }

          const payload = (await response.json().catch(() => ({}))) as { coupon?: CouponDefinition }
          return payload.coupon ?? null
        })()

    if (!coupon) {
      setCouponError(isRu ? "\u041f\u0440\u043e\u043c\u043e\u043a\u043e\u0434 \u043d\u0435\u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0442\u0435\u043b\u0435\u043d." : "Coupon code is not valid.")
      setCouponInfo("")
      return
    }

    if (!isCouponEligibleForSubtotal(coupon, totalPrice)) {
      setCouponError(
        isRu
          ? `\u041f\u0440\u043e\u043c\u043e\u043a\u043e\u0434 \u0434\u0435\u0439\u0441\u0442\u0432\u0443\u0435\u0442 \u043f\u0440\u0438 \u0441\u0443\u043c\u043c\u0435 \u043e\u0442 ${formatUsdPrice(coupon.minimumSubtotal)}.`
          : `Coupon is valid for subtotal minimum ${formatUsdPrice(coupon.minimumSubtotal)}.`
      )
      setCouponInfo("")
      return
    }

    setCouponInput(coupon.code)
    setResolvedCouponDefinition(coupon)
    saveActiveCouponCode(coupon.code)
    setCouponInfo(
      isRu ? `${coupon.code} \u0443\u0441\u043f\u0435\u0448\u043d\u043e \u043f\u0440\u0438\u043c\u0435\u043d\u0451\u043d.` : `${coupon.code} applied successfully.`
    )
    setCouponError("")
  }

  const removeCouponCode = () => {
    setCouponInput("")
    setResolvedCouponDefinition(null)
    clearActiveCouponCode()
    setCouponInfo(isRu ? "\u041f\u0440\u043e\u043c\u043e\u043a\u043e\u0434 \u0443\u0434\u0430\u043b\u0451\u043d." : "Coupon removed.")
    setCouponError("")
  }

  const normalizeWhatsAppInput = (value: string) => {
    const digits = value.replace(/\D/g, "")
    if (!digits) {
      return ""
    }
    return `+${digits}`
  }

  const getNormalizedCheckoutDetails = (): CheckoutDetails => ({
    fullName: checkoutDetails.fullName.trim(),
    email: checkoutDetails.email.trim(),
    whatsapp: checkoutDetails.whatsapp.replace(/[\s()-]/g, ""),
    addressLine: checkoutDetails.addressLine.trim(),
    city: checkoutDetails.city.trim(),
    province: checkoutDetails.province.trim(),
    postalCode: checkoutDetails.postalCode.trim(),
    country: checkoutDetails.country.trim(),
  })

  const validateCheckoutDetails = () => {
    if (!checkoutDetails.fullName.trim()) {
      return isRu
        ? "\u0418\u043c\u044f \u0438 \u0444\u0430\u043c\u0438\u043b\u0438\u044f \u043e\u0431\u044f\u0437\u0430\u0442\u0435\u043b\u044c\u043d\u044b \u043f\u0435\u0440\u0435\u0434 \u043e\u043f\u043b\u0430\u0442\u043e\u0439."
        : "Full name is required before payment."
    }

    if (!checkoutDetails.email.trim()) {
      return isRu ? "Email \u043e\u0431\u044f\u0437\u0430\u0442\u0435\u043b\u0435\u043d \u043f\u0435\u0440\u0435\u0434 \u043e\u043f\u043b\u0430\u0442\u043e\u0439." : "Email is required before payment."
    }

    if (!isValidEmail(checkoutDetails.email)) {
      return isRu ? "\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u043a\u043e\u0440\u0440\u0435\u043a\u0442\u043d\u044b\u0439 email-\u0430\u0434\u0440\u0435\u0441." : "Please enter a valid email address."
    }

    const compactWhatsApp = checkoutDetails.whatsapp.replace(/[\s()-]/g, "")
    if (!compactWhatsApp) {
      return isRu
        ? "\u041d\u043e\u043c\u0435\u0440 WhatsApp \u043e\u0431\u044f\u0437\u0430\u0442\u0435\u043b\u0435\u043d \u043f\u0435\u0440\u0435\u0434 \u043e\u043f\u043b\u0430\u0442\u043e\u0439."
        : "WhatsApp number is required before payment."
    }

    if (!/^\+\d{8,15}$/.test(compactWhatsApp)) {
      return isRu
        ? "\u0418\u0441\u043f\u043e\u043b\u044c\u0437\u0443\u0439\u0442\u0435 \u0444\u043e\u0440\u043c\u0430\u0442 WhatsApp \u0441 \u043a\u043e\u0434\u043e\u043c \u0441\u0442\u0440\u0430\u043d\u044b, \u043d\u0430\u043f\u0440\u0438\u043c\u0435\u0440: +62812xxxxxxx."
        : "Use WhatsApp format with country code, e.g. +62812xxxxxxx."
    }

    if (checkoutDetails.country.trim().toLowerCase() === "indonesia" && !compactWhatsApp.startsWith("+62")) {
      return isRu
        ? "\u0414\u043b\u044f \u0418\u043d\u0434\u043e\u043d\u0435\u0437\u0438\u0438 \u043d\u043e\u043c\u0435\u0440 WhatsApp \u0434\u043e\u043b\u0436\u0435\u043d \u043d\u0430\u0447\u0438\u043d\u0430\u0442\u044c\u0441\u044f \u0441 +62."
        : "For Indonesia, WhatsApp number must start with +62."
    }

    if (!checkoutDetails.addressLine.trim()) {
      return isRu
        ? "\u0410\u0434\u0440\u0435\u0441 \u0434\u043e\u0441\u0442\u0430\u0432\u043a\u0438 \u043e\u0431\u044f\u0437\u0430\u0442\u0435\u043b\u0435\u043d \u043f\u0435\u0440\u0435\u0434 \u043e\u043f\u043b\u0430\u0442\u043e\u0439."
        : "Shipping address is required before payment."
    }
    if (!hasAddressLettersAndNumbers(checkoutDetails.addressLine)) {
      return isRu
        ? "\u0410\u0434\u0440\u0435\u0441 \u0434\u043e\u0441\u0442\u0430\u0432\u043a\u0438 \u0434\u043e\u043b\u0436\u0435\u043d \u0441\u043e\u0434\u0435\u0440\u0436\u0430\u0442\u044c \u0431\u0443\u043a\u0432\u044b \u0438 \u0446\u0438\u0444\u0440\u044b."
        : "Shipping address must include letters and numbers."
    }
    if (containsDisallowedAddressMarker(checkoutDetails.addressLine)) {
      return isRu ? "\u041f\u043e\u0436\u0430\u043b\u0443\u0439\u0441\u0442\u0430, \u0443\u043a\u0430\u0436\u0438\u0442\u0435 \u043a\u043e\u0440\u0440\u0435\u043a\u0442\u043d\u044b\u0439 \u0430\u0434\u0440\u0435\u0441 \u0434\u043e\u0441\u0442\u0430\u0432\u043a\u0438." : "Please enter a valid shipping address."
    }

    if (!checkoutDetails.city.trim()) {
      return isRu ? "\u0413\u043e\u0440\u043e\u0434 \u043e\u0431\u044f\u0437\u0430\u0442\u0435\u043b\u0435\u043d \u043f\u0435\u0440\u0435\u0434 \u043e\u043f\u043b\u0430\u0442\u043e\u0439." : "City is required before payment."
    }

    if (!checkoutDetails.province.trim()) {
      return isRu ? "\u0420\u0435\u0433\u0438\u043e\u043d/\u043f\u0440\u043e\u0432\u0438\u043d\u0446\u0438\u044f \u043e\u0431\u044f\u0437\u0430\u0442\u0435\u043b\u044c\u043d\u044b \u043f\u0435\u0440\u0435\u0434 \u043e\u043f\u043b\u0430\u0442\u043e\u0439." : "Province is required before payment."
    }

    if (!checkoutDetails.postalCode.trim()) {
      return isRu ? "\u041f\u043e\u0447\u0442\u043e\u0432\u044b\u0439 \u0438\u043d\u0434\u0435\u043a\u0441 \u043e\u0431\u044f\u0437\u0430\u0442\u0435\u043b\u0435\u043d \u043f\u0435\u0440\u0435\u0434 \u043e\u043f\u043b\u0430\u0442\u043e\u0439." : "Postal code is required before payment."
    }

    if (!checkoutDetails.country.trim()) {
      return isRu ? "\u0421\u0442\u0440\u0430\u043d\u0430 \u043e\u0431\u044f\u0437\u0430\u0442\u0435\u043b\u044c\u043d\u0430 \u043f\u0435\u0440\u0435\u0434 \u043e\u043f\u043b\u0430\u0442\u043e\u0439." : "Country is required before payment."
    }

    return ""
  }

  const handleRequestVerificationCode = async () => {
    const checkoutValidationError = validateCheckoutDetails()
    if (checkoutValidationError) {
      setCheckoutError(checkoutValidationError)
      return
    }

    setVerificationLoading(true)
    setVerificationError("")
    setVerificationInfo("")
    setVerificationDevCode("")

    try {
      const checkoutClient = supabase
      const checkoutReturnTo = localizedHref("/cart?checkout=1")
      if (!checkoutClient) {
        const loginUrl = `${localizedHref("/login")}?next=${encodeURIComponent(checkoutReturnTo)}&returnTo=${encodeURIComponent(checkoutReturnTo)}`
        window.location.href = loginUrl
        return
      }

      const normalizedDetails = getNormalizedCheckoutDetails()
      const { data: checkoutSessionData } = await checkoutClient.auth.getSession()
      const accessToken = checkoutSessionData.session?.access_token ?? ""
      if (!accessToken) {
        const loginUrl = `${localizedHref("/login")}?next=${encodeURIComponent(checkoutReturnTo)}&returnTo=${encodeURIComponent(checkoutReturnTo)}`
        window.location.href = loginUrl
        return
      }

      const response = await fetch("/api/checkout/request-verification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          customer: normalizedDetails,
        }),
      })

      const payload = (await response.json().catch(() => ({}))) as RequestVerificationResponse
      if (!response.ok || !payload.challengeId) {
        throw new Error(
          payload.error ||
            (isRu
              ? "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043e\u0442\u043f\u0440\u0430\u0432\u0438\u0442\u044c \u043a\u043e\u0434 \u043f\u043e\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u0438\u044f."
              : "Unable to send verification code.")
        )
      }

      setVerificationChallengeId(payload.challengeId)
      setVerificationCode("")
      setVerificationToken("")
      setVerificationInfo(
        payload.destination
          ? isRu
            ? `\u041a\u043e\u0434 \u043f\u043e\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u0438\u044f \u043e\u0442\u043f\u0440\u0430\u0432\u043b\u0435\u043d \u043d\u0430 ${payload.destination}.`
            : `Verification code sent to ${payload.destination}.`
          : isRu
            ? "\u041a\u043e\u0434 \u043f\u043e\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u0438\u044f \u043e\u0442\u043f\u0440\u0430\u0432\u043b\u0435\u043d."
            : "Verification code sent."
      )
      setVerificationDevCode(payload.devOtpCode ?? "")
      setCheckoutError("")
      setPaypalError("")
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : isRu
            ? "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043e\u0442\u043f\u0440\u0430\u0432\u0438\u0442\u044c \u043a\u043e\u0434 \u043f\u043e\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u0438\u044f."
            : "Unable to send verification code."
      setVerificationError(message)
    } finally {
      setVerificationLoading(false)
    }
  }

  const handleVerifyCheckoutCode = async () => {
    if (!verificationChallengeId) {
      setVerificationError(
        isRu
          ? "\u0421\u043d\u0430\u0447\u0430\u043b\u0430 \u0437\u0430\u043f\u0440\u043e\u0441\u0438\u0442\u0435 \u043a\u043e\u0434 \u043f\u043e\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u0438\u044f."
          : "Request a verification code first."
      )
      return
    }

    if (!/^\d{6}$/.test(verificationCode.trim())) {
      setVerificationError(
        isRu ? "\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u043a\u043e\u0440\u0440\u0435\u043a\u0442\u043d\u044b\u0439 6-\u0437\u043d\u0430\u0447\u043d\u044b\u0439 \u043a\u043e\u0434." : "Enter a valid 6-digit verification code."
      )
      return
    }

    setVerificationLoading(true)
    setVerificationError("")
    setVerificationInfo("")

    try {
      const checkoutClient = supabase
      const checkoutReturnTo = localizedHref("/cart?checkout=1")
      if (!checkoutClient) {
        const loginUrl = `${localizedHref("/login")}?next=${encodeURIComponent(checkoutReturnTo)}&returnTo=${encodeURIComponent(checkoutReturnTo)}`
        window.location.href = loginUrl
        return
      }

      const { data: checkoutSessionData } = await checkoutClient.auth.getSession()
      const accessToken = checkoutSessionData.session?.access_token ?? ""
      if (!accessToken) {
        const loginUrl = `${localizedHref("/login")}?next=${encodeURIComponent(checkoutReturnTo)}&returnTo=${encodeURIComponent(checkoutReturnTo)}`
        window.location.href = loginUrl
        return
      }

      const response = await fetch("/api/checkout/verify-verification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          challengeId: verificationChallengeId,
          otpCode: verificationCode.trim(),
        }),
      })

      const payload = (await response.json().catch(() => ({}))) as VerifyVerificationResponse
      if (!response.ok || !payload.verificationToken) {
        throw new Error(payload.error || (isRu ? "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043f\u0440\u043e\u0432\u0435\u0440\u0438\u0442\u044c \u043a\u043e\u0434." : "Unable to verify code."))
      }

      setVerificationToken(payload.verificationToken)
      setVerificationInfo(
        isRu
          ? "\u0422\u0435\u043b\u0435\u0444\u043e\u043d \u0438 \u0434\u0430\u043d\u043d\u044b\u0435 \u0434\u043e\u0441\u0442\u0430\u0432\u043a\u0438 \u043f\u043e\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u044b."
          : "Phone and shipping details verified."
      )
      setVerificationError("")
      setCheckoutError("")
      setPaypalError("")
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : isRu
            ? "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043f\u0440\u043e\u0432\u0435\u0440\u0438\u0442\u044c \u043a\u043e\u0434."
            : "Unable to verify code."
      setVerificationError(message)
    } finally {
      setVerificationLoading(false)
    }
  }

  const handlePayPalCheckout = async () => {
    if (items.length === 0) {
      setPaypalError(isRu ? "\u0412\u0430\u0448\u0430 \u043a\u043e\u0440\u0437\u0438\u043d\u0430 \u043f\u0443\u0441\u0442\u0430." : "Your cart is empty.")
      return
    }

    if (!supabase) {
      setPaypalError(
        isRu
          ? "\u0410\u0432\u0442\u043e\u0440\u0438\u0437\u0430\u0446\u0438\u044f \u043d\u0435 \u043d\u0430\u0441\u0442\u0440\u043e\u0435\u043d\u0430. \u041f\u043e\u043f\u0440\u043e\u0431\u0443\u0439\u0442\u0435 \u043f\u043e\u0437\u0436\u0435."
          : "Auth is not configured. Please try again later."
      )
      return
    }

    const returnTo = localizedHref("/cart?checkout=1")
    const nextAddress = localizedHref("/account/address/new")
    const registerUrl = `${localizedHref("/register")}?next=${encodeURIComponent(nextAddress)}&returnTo=${encodeURIComponent(returnTo)}`
    const addressUrl = `${nextAddress}?returnTo=${encodeURIComponent(returnTo)}`

    const { data: checkoutUserData } = await supabase.auth.getUser()
    const checkoutUser = checkoutUserData.user
    if (!checkoutUser) {
      window.location.href = registerUrl
      return
    }

    const savedAddresses = readAddresses(checkoutUser.id)
    if (savedAddresses.length === 0) {
      window.location.href = addressUrl
      return
    }

    if (!showCheckoutForm) {
      setShowCheckoutForm(true)
      setCheckoutError("")
      setPaypalError("")
      setPaypalInfo("")
      return
    }

    const checkoutValidationError = validateCheckoutDetails()
    if (checkoutValidationError) {
      setCheckoutError(checkoutValidationError)
      setPaypalError("")
      return
    }

    if (requiresCheckoutOtp && !verificationToken) {
      setCheckoutError(
        isRu
          ? "\u041a\u043e\u0434 \u043f\u043e\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u0438\u044f \u043e\u0431\u044f\u0437\u0430\u0442\u0435\u043b\u0435\u043d \u0434\u043b\u044f \u0437\u0430\u043a\u0430\u0437\u043e\u0432 \u043e\u0442 $2500 \u0438 \u0432\u044b\u0448\u0435."
          : "Verification code is required for orders of $2500 or more."
      )
      setPaypalError("")
      return
    }

    setPaypalLoading(true)
    setCheckoutError("")
    setPaypalError("")
    setPaypalInfo("")

    try {
      const checkoutClient = supabase
      const checkoutReturnTo = localizedHref("/cart?checkout=1")
      if (!checkoutClient) {
        const loginUrl = `${localizedHref("/login")}?next=${encodeURIComponent(checkoutReturnTo)}&returnTo=${encodeURIComponent(checkoutReturnTo)}`
        window.location.href = loginUrl
        return
      }

      const normalizedDetails = getNormalizedCheckoutDetails()

      const checkoutItemsPayload = items.map((item) => ({
        slug: item.slug,
        length: item.length,
        quantity: item.quantity,
        variant: item.variant,
      }))

      const { data: checkoutSessionData } = await checkoutClient.auth.getSession()
      const accessToken = checkoutSessionData.session?.access_token ?? ""
      if (!accessToken) {
        const loginUrl = `${localizedHref("/login")}?next=${encodeURIComponent(checkoutReturnTo)}&returnTo=${encodeURIComponent(checkoutReturnTo)}`
        window.location.href = loginUrl
        return
      }

      const response = await fetch("/api/create-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify(
          requiresCheckoutOtp
            ? {
                items: checkoutItemsPayload,
                customer: normalizedDetails,
                verificationToken,
                couponCode: activeCoupon?.code,
              }
            : {
                items: checkoutItemsPayload,
                customer: normalizedDetails,
                couponCode: activeCoupon?.code,
              }
        ),
      })

      const data = (await response.json().catch(() => ({}))) as {
        error?: string
        orderId?: string
        approveUrl?: string
      }

      if (!response.ok || !data.approveUrl || !data.orderId) {
        throw new Error(
          data.error ||
            (isRu
              ? "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0438\u043d\u0438\u0446\u0438\u0430\u043b\u0438\u0437\u0438\u0440\u043e\u0432\u0430\u0442\u044c \u043e\u043f\u043b\u0430\u0442\u0443 PayPal."
              : "Unable to initialize PayPal checkout.")
        )
      }

      savePaymentDraft({
        orderId: data.orderId,
        status: "PENDING",
        currency: "USD",
        subtotal: totalPrice,
        tax: taxAmount,
        total: finalTotal,
        customer: normalizedDetails,
        items: items.map((item) => ({
          slug: item.slug,
          name: getDisplayName(item),
          length: item.length,
          variant: item.variant,
          quantity: item.quantity,
          unitPrice: item.price,
        })),
        createdAt: Date.now(),
      })

      const cartData = JSON.parse(window.localStorage.getItem("candrashair-cart-v1") || "[]") || []
      if (Array.isArray(cartData)) {
        window.localStorage.setItem("candrashair-cart-v1", JSON.stringify(cartData))
      }

      window.location.href = data.approveUrl
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : isRu
            ? "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0438\u043d\u0438\u0446\u0438\u0430\u043b\u0438\u0437\u0438\u0440\u043e\u0432\u0430\u0442\u044c \u043e\u043f\u043b\u0430\u0442\u0443 PayPal."
            : "Unable to initialize PayPal checkout."
      setPaypalError(message)
      setPaypalLoading(false)
    }
  }

  const liveCheckoutValidationError = showCheckoutForm ? validateCheckoutDetails() : ""
  const isCheckoutReadyForPayment =
    showCheckoutForm &&
    liveCheckoutValidationError === "" &&
    (!requiresCheckoutOtp || Boolean(verificationToken))

  return (
    <main className="min-h-screen overflow-x-hidden bg-gradient-to-b from-background to-background/50 pt-[102px] lg:pt-[108px]">
      {/* Back Button */}
      <div className="mx-auto max-w-7xl px-4 md:px-5 lg:px-6 py-8 lg:py-10">
        <Link href={continueShoppingLocalized}>
          <Button
            variant="ghost"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground/70 transition-colors hover:text-foreground"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-4 w-4" aria-hidden="true">
              <path d="M15 18l-6-6 6-6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {ui.backToShop}
          </Button>
        </Link>
      </div>

      {/* Cart Section */}
      <div className="mx-auto max-w-7xl px-4 md:px-5 lg:px-6 py-8 lg:py-16">
        <h1 className="mb-2 font-serif text-5xl font-bold text-foreground">{ui.shoppingCartTitle}</h1>
        <p className="mb-12 text-muted-foreground">{cartItemsLabel(getTotalItems())}</p>

        <div className="grid gap-8 lg:gap-16 lg:grid-cols-3">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {items.map((item, index) => (
              <div
                key={`${item.slug}-${item.length}-${item.variant ?? "default"}-${index}`}
                className="flex flex-col gap-4 rounded-xl border border-border/30 bg-card/50 p-4 sm:flex-row sm:gap-6 sm:p-6 transition-all duration-300 hover:shadow-lg"
              >
                {/* Product Image */}
                <div className="relative h-24 w-24 sm:h-32 sm:w-32 flex-shrink-0 overflow-hidden rounded-lg bg-secondary">
                  <Image
                    src={item.image}
                    alt={getDisplayName(item)}
                    fill
                    sizes="(max-width: 640px) 96px, 128px"
                    className="object-cover"
                  />
                </div>

                {/* Product Details */}
                <div className="flex min-w-0 flex-1 flex-col justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-accent/80">
                      {getItemCopy(item).category}
                    </p>
                    <h3 className="mb-2 font-serif text-lg sm:text-xl font-semibold text-foreground">
                      {getDisplayName(item)}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {ui.lengthLabel}: <span className="font-semibold text-foreground">{item.length}&quot;</span>
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() =>
                          updateQuantity(item.slug, item.length, Math.max(1, item.quantity - 1), item.variant)
                        }
                        disabled={item.quantity <= 1}
                        className="flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 text-gray-600 transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:text-gray-600"
                      >
                        -
                      </button>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={4}
                        value={item.quantity}
                        onChange={(e) =>
                          updateQuantity(
                            item.slug,
                            item.length,
                            parseInt(e.target.value.replace(/\D/g, ""), 10) || 1,
                            item.variant
                          )
                        }
                        className="w-12 text-center font-semibold text-foreground focus:outline-none border border-gray-300 rounded-md py-1"
                      />
                      <button
                        onClick={() =>
                          updateQuantity(item.slug, item.length, item.quantity + 1, item.variant)
                        }
                        disabled={item.quantity >= MAX_ITEM_QUANTITY}
                        className="flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 text-gray-600 hover:text-foreground transition-colors disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:text-gray-600"
                      >
                        +
                      </button>
                    </div>

                    <button
                      onClick={() => removeFromCart(item.slug, item.length, item.variant)}
                      className="text-sm font-semibold text-red-500 hover:text-red-700 transition-colors"
                    >
                      {isRu ? "\u0423\u0434\u0430\u043b\u0438\u0442\u044c" : "Remove"}
                    </button>
                  </div>
                </div>

                {/* Price */}
                <div className="flex flex-row items-center justify-between sm:flex-col sm:items-end sm:justify-between">
                  <div className="text-right">
                    <p className="text-xs sm:text-sm text-muted-foreground/80">
                      {formatUsdPrice(item.price)} {ui.eachLabel}
                    </p>
                    <p className="text-[11px] sm:text-xs text-muted-foreground/70 line-through">
                      {formatUsdPrice(recoverOriginalPriceFromDiscounted(item.price))} {ui.eachLabel}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-serif text-xl sm:text-2xl font-bold text-[#D4AF37]">
                      {formatUsdPrice(item.price * item.quantity)}
                    </p>
                    <p className="text-[11px] sm:text-xs text-muted-foreground/70 line-through">
                      {formatUsdPrice(recoverOriginalPriceFromDiscounted(item.price) * item.quantity)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Order Summary */}
          <div className="h-fit">
            <div className="rounded-xl bg-gradient-to-b from-[#FBF8F3] to-[#FAF6F0] border border-[#D4AF37]/30 p-5 sm:p-6 lg:p-8 space-y-5 sm:space-y-6 lg:sticky lg:top-8">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-[#D4AF37] mb-4">
                  {ui.orderSummary}
                </p>

                <div className="mb-4 rounded-lg border border-[#D4AF37]/25 bg-white/70 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-[#8A6510]">
                    {ui.couponCode}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      type="text"
                      value={couponInput}
                      onChange={(event) => updateCouponInput(event.target.value)}
                      placeholder={ui.enterCoupon}
                      className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm font-semibold uppercase tracking-wider text-foreground focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/40"
                    />
                    <button
                      type="button"
                      onClick={applyCouponCode}
                      className="h-10 rounded-md bg-[#1F1810] px-4 text-xs font-semibold uppercase tracking-widest text-white transition-colors hover:bg-[#2A2218]"
                    >
                      {ui.apply}
                    </button>
                  </div>

                  {activeCouponDefinition && (
                    <button
                      type="button"
                      onClick={removeCouponCode}
                      className="mt-2 text-[11px] font-semibold uppercase tracking-widest text-[#A94442] hover:text-[#7F2E2D]"
                    >
                      {ui.removeCoupon}
                    </button>
                  )}

                  {couponInfo && <p className="mt-2 text-xs font-medium text-[#2E7D32]">{couponInfo}</p>}
                  {couponError && <p className="mt-2 text-xs font-medium text-red-500">{couponError}</p>}
                  {couponMinimumNotice && <p className="mt-2 text-xs font-medium text-amber-700">{couponMinimumNotice}</p>}
                </div>

                <div className="space-y-3 border-b border-[#D4AF37]/20 pb-4">
                  <div className="flex justify-between text-sm">
                    <p className="text-gray-600">{ui.subtotal}</p>
                    <p className="font-semibold text-foreground">${totalPrice.toFixed(2)}</p>
                  </div>
                  {activeCoupon && couponDiscount > 0 && (
                    <div className="flex justify-between text-sm">
                      <p className="text-gray-600">{isRu ? `\u041f\u0440\u043e\u043c\u043e\u043a\u043e\u0434 (${activeCoupon.code})` : `Coupon (${activeCoupon.code})`}</p>
                      <p className="font-semibold text-[#2E7D32]">- ${couponDiscount.toFixed(2)}</p>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <p className="text-gray-600">{ui.shipping}</p>
                    <p className="text-right font-semibold text-foreground">
                      {isFreeShipping ? ui.shippingFree : ui.shippingCalc}
                    </p>
                  </div>
                  <div className="flex justify-between text-sm">
                    <p className="text-gray-600">{ui.tax}</p>
                    <p className="text-right font-semibold text-foreground">${taxAmount.toFixed(2)}</p>
                  </div>
                </div>

                <div className="flex justify-between pt-4">
                  <p className="font-semibold text-foreground">{ui.total}</p>
                  <p className="font-serif text-2xl font-bold text-[#D4AF37]">
                    ${finalTotal.toFixed(2)}
                  </p>
                </div>
              </div>

              {showCheckoutForm && (
                <div className="space-y-3 rounded-xl border border-[#D4AF37]/25 bg-white/70 p-4">
                  <p className="text-xs font-semibold uppercase tracking-widest text-[#A77B15]">
                    {isRu
                      ? "\u041a\u043e\u043d\u0442\u0430\u043a\u0442\u044b \u0438 \u0434\u043e\u0441\u0442\u0430\u0432\u043a\u0430 (\u0432\u0441\u0435 \u043f\u043e\u043b\u044f \u043e\u0431\u044f\u0437\u0430\u0442\u0435\u043b\u044c\u043d\u044b)"
                      : "Contact & Shipping (All fields are required)"}
                  </p>

                  <label className="block text-xs font-medium text-muted-foreground">
                    {isRu ? "\u041f\u043e\u043b\u043d\u043e\u0435 \u0438\u043c\u044f *" : "Full Name *"}
                    <input
                      type="text"
                      value={checkoutDetails.fullName}
                      onChange={(event) => updateCheckoutField("fullName", event.target.value)}
                      placeholder={isRu ? "\u0412\u0430\u0448\u0435 \u043f\u043e\u043b\u043d\u043e\u0435 \u0438\u043c\u044f" : "Your full name"}
                      className="mt-1 h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/40"
                    />
                  </label>

                  <label className="block text-xs font-medium text-muted-foreground">
                    Email *
                    <input
                      type="email"
                      value={checkoutDetails.email}
                      onChange={(event) => updateCheckoutField("email", event.target.value)}
                      placeholder="you@example.com"
                      className="mt-1 h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/40"
                    />
                  </label>

                  <label className="block text-xs font-medium text-muted-foreground">
                    {isRu ? "\u041d\u043e\u043c\u0435\u0440 WhatsApp *" : "WhatsApp Number *"}
                    <input
                      type="tel"
                      value={checkoutDetails.whatsapp}
                      onChange={(event) => updateCheckoutField("whatsapp", normalizeWhatsAppInput(event.target.value))}
                      placeholder={isRu ? "\u041a\u043e\u0434 \u0441\u0442\u0440\u0430\u043d\u044b + \u043d\u043e\u043c\u0435\u0440 WhatsApp" : "Country code + WhatsApp number"}
                      className="mt-1 h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/40"
                    />
                  </label>

                  <label className="block text-xs font-medium text-muted-foreground">
                    {isRu ? "\u0410\u0434\u0440\u0435\u0441 \u0434\u043e\u0441\u0442\u0430\u0432\u043a\u0438 *" : "Shipping Address *"}
                    <textarea
                      value={checkoutDetails.addressLine}
                      onChange={(event) => updateCheckoutField("addressLine", event.target.value)}
                      rows={3}
                      placeholder={
                        isRu
                          ? "\u0423\u043b\u0438\u0446\u0430, \u0434\u043e\u043c, \u0440\u0430\u0439\u043e\u043d \u0438 \u043f\u0440\u0438\u043c\u0435\u0447\u0430\u043d\u0438\u044f \u0434\u043b\u044f \u0434\u043e\u0441\u0442\u0430\u0432\u043a\u0438"
                          : "Street, building, district, and notes for delivery"
                      }
                      className="mt-1 w-full resize-none rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/40"
                    />
                  </label>

                  <label className="block text-xs font-medium text-muted-foreground">
                    {isRu ? "\u0413\u043e\u0440\u043e\u0434 *" : "City *"}
                    <input
                      type="text"
                      value={checkoutDetails.city}
                      onChange={(event) => updateCheckoutField("city", event.target.value)}
                      placeholder={isRu ? "\u0413\u043e\u0440\u043e\u0434" : "City"}
                      className="mt-1 h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/40"
                    />
                  </label>

                  <label className="block text-xs font-medium text-muted-foreground">
                    {isRu ? "\u0420\u0435\u0433\u0438\u043e\u043d/\u041f\u0440\u043e\u0432\u0438\u043d\u0446\u0438\u044f *" : "Province *"}
                    <input
                      type="text"
                      value={checkoutDetails.province}
                      onChange={(event) => updateCheckoutField("province", event.target.value)}
                      placeholder={isRu ? "\u0420\u0435\u0433\u0438\u043e\u043d/\u041f\u0440\u043e\u0432\u0438\u043d\u0446\u0438\u044f" : "Province"}
                      className="mt-1 h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/40"
                    />
                  </label>

                  <label className="block text-xs font-medium text-muted-foreground">
                    {isRu ? "\u041f\u043e\u0447\u0442\u043e\u0432\u044b\u0439 \u0438\u043d\u0434\u0435\u043a\u0441 *" : "Postal Code *"}
                    <input
                      type="text"
                      value={checkoutDetails.postalCode}
                      onChange={(event) => updateCheckoutField("postalCode", event.target.value)}
                      placeholder={isRu ? "\u041f\u043e\u0447\u0442\u043e\u0432\u044b\u0439 \u0438\u043d\u0434\u0435\u043a\u0441" : "Postal code"}
                      className="mt-1 h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/40"
                    />
                  </label>

                  <label className="block text-xs font-medium text-muted-foreground">
                    {isRu ? "\u0421\u0442\u0440\u0430\u043d\u0430 *" : "Country *"}
                    <input
                      type="text"
                      value={checkoutDetails.country}
                      onChange={(event) => updateCheckoutField("country", event.target.value)}
                      placeholder={isRu ? "\u0421\u0442\u0440\u0430\u043d\u0430" : "Country"}
                      className="mt-1 h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/40"
                    />
                  </label>

                  {requiresCheckoutOtp ? (
                    <div className="space-y-2 rounded-lg border border-[#D4AF37]/20 bg-[#FFFDF8] p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-widest text-[#A77B15]">
                        {isRu
                          ? "\u0422\u0440\u0435\u0431\u0443\u0435\u0442\u0441\u044f \u043f\u0440\u043e\u0432\u0435\u0440\u043a\u0430 \u0431\u0435\u0437\u043e\u043f\u0430\u0441\u043d\u043e\u0441\u0442\u0438"
                          : "Security Verification Required"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {isRu
                          ? "\u0417\u0430\u043a\u0430\u0437\u044b \u043e\u0442 $2500 \u0438 \u0432\u044b\u0448\u0435 \u0434\u043e\u043b\u0436\u043d\u044b \u0431\u044b\u0442\u044c \u043f\u043e\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u044b \u043f\u0435\u0440\u0435\u0434 \u043e\u043f\u043b\u0430\u0442\u043e\u0439."
                          : "Orders of $2500 or more must be verified before final checkout."}
                      </p>

                      <button
                        type="button"
                        onClick={() => void handleRequestVerificationCode()}
                        disabled={verificationLoading}
                        className={`w-full rounded-md border border-border px-3 py-2 text-xs font-semibold uppercase tracking-widest text-foreground transition-colors ${
                          verificationLoading ? "cursor-not-allowed opacity-70" : "hover:bg-secondary"
                        }`}
                      >
                        {verificationLoading
                          ? isRu
                            ? "\u041e\u0442\u043f\u0440\u0430\u0432\u043b\u044f\u0435\u043c..."
                            : "Sending..."
                          : isRu
                            ? "\u041e\u0442\u043f\u0440\u0430\u0432\u0438\u0442\u044c \u043a\u043e\u0434"
                            : "Send Verification Code"}
                      </button>

                      {verificationChallengeId && (
                        <div className="space-y-2">
                          <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            maxLength={6}
                            value={verificationCode}
                            onChange={(event) => setVerificationCode(event.target.value.replace(/\D/g, ""))}
                            placeholder={isRu ? "\u0412\u0432\u0435\u0434\u0438\u0442\u0435 6-\u0437\u043d\u0430\u0447\u043d\u044b\u0439 \u043a\u043e\u0434" : "Enter 6-digit code"}
                            className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/40"
                          />

                          <button
                            type="button"
                            onClick={() => void handleVerifyCheckoutCode()}
                            disabled={verificationLoading}
                            className={`w-full rounded-md bg-foreground px-3 py-2 text-xs font-semibold uppercase tracking-widest text-background transition-colors ${
                              verificationLoading ? "cursor-not-allowed opacity-70" : "hover:bg-[#2B2722]"
                            }`}
                          >
                            {verificationLoading
                              ? isRu
                                ? "\u041f\u0440\u043e\u0432\u0435\u0440\u044f\u0435\u043c..."
                                : "Verifying..."
                              : isRu
                                ? "\u041f\u0440\u043e\u0432\u0435\u0440\u0438\u0442\u044c \u043a\u043e\u0434"
                                : "Verify Code"}
                          </button>
                        </div>
                      )}

                      {verificationInfo && (
                        <p className="text-xs font-medium text-[#2E7D32]">{verificationInfo}</p>
                      )}
                      {verificationDevCode && (
                        <p className="text-xs font-medium text-amber-700">
                          {isRu ? "\u041a\u043e\u0434 \u0434\u043b\u044f \u0440\u0430\u0437\u0440\u0430\u0431\u043e\u0442\u0447\u0438\u043a\u043e\u0432:" : "Dev verification code:"} {verificationDevCode}
                        </p>
                      )}
                      {verificationError && (
                        <p className="text-xs font-medium text-red-500">{verificationError}</p>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-lg border border-[#D4AF37]/20 bg-[#FFFDF8] p-3">
                      <p className="text-xs text-muted-foreground">
                        {isRu
                          ? "OTP-\u043f\u0440\u043e\u0432\u0435\u0440\u043a\u0430 \u043f\u0440\u0438\u043c\u0435\u043d\u044f\u0435\u0442\u0441\u044f \u0442\u043e\u043b\u044c\u043a\u043e \u043a \u0437\u0430\u043a\u0430\u0437\u0430\u043c \u043e\u0442 $2500 \u0438 \u0432\u044b\u0448\u0435."
                          : "OTP verification applies only to orders of $2500 or more."}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-3">
                <button
                  onClick={() => void handlePayPalCheckout()}
                  disabled={paypalLoading || (showCheckoutForm && !isCheckoutReadyForPayment)}
                  className={`w-full group flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#1B63D0] to-[#174EA6] px-8 py-4 text-base font-semibold text-white shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-105 active:scale-95 ${
                    paypalLoading || (showCheckoutForm && !isCheckoutReadyForPayment)
                      ? "cursor-not-allowed opacity-75 hover:scale-100 hover:shadow-lg"
                      : ""
                  }`}
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    shapeRendering="geometricPrecision"
                    className="h-5 w-5 shrink-0"
                    aria-hidden="true"
                  >
                    <path
                      fill="currentColor"
                      d="M15.607 4.653H8.941L6.645 19.251H1.82L4.862 0h7.995c3.754 0 6.375 2.294 6.473 5.513c-.648-.478-2.105-.86-3.722-.86m6.57 5.546c0 3.41-3.01 6.853-6.958 6.853h-2.493L11.595 24H6.74l1.845-11.538h3.592c4.208 0 7.346-3.634 7.153-6.949a5.24 5.24 0 0 1 2.848 4.686M9.653 5.546h6.408c.907 0 1.942.222 2.363.541c-.195 2.741-2.655 5.483-6.441 5.483H8.714Z"
                    />
                  </svg>
                  <span>
                    {paypalLoading
                      ? isRu
                        ? "\u041e\u0431\u0440\u0430\u0431\u0430\u0442\u044b\u0432\u0430\u0435\u043c PayPal..."
                        : "Processing PayPal..."
                      : showCheckoutForm
                        ? isRu
                          ? "\u041f\u0440\u043e\u0434\u043e\u043b\u0436\u0438\u0442\u044c \u0432 PayPal"
                          : "Continue to PayPal"
                        : isRu
                          ? "\u041e\u043f\u043b\u0430\u0442\u0438\u0442\u044c \u0447\u0435\u0440\u0435\u0437 PayPal"
                          : "Pay with PayPal"}
                  </span>
                </button>

                {!showCheckoutForm && (
                  <p className="text-xs font-medium text-amber-700">
                    {isRu
                      ? "\u0421\u043d\u0430\u0447\u0430\u043b\u0430 \u043d\u0430\u0436\u043c\u0438\u0442\u0435 \u00abPay with PayPal\u00bb, \u0447\u0442\u043e\u0431\u044b \u043e\u0442\u043a\u0440\u044b\u0442\u044c \u043e\u0431\u044f\u0437\u0430\u0442\u0435\u043b\u044c\u043d\u0443\u044e \u0444\u043e\u0440\u043c\u0443 \u043e\u0444\u043e\u0440\u043c\u043b\u0435\u043d\u0438\u044f."
                      : "Click \"Pay with PayPal\" first to open the required checkout form."}
                  </p>
                )}

                {showCheckoutForm && !isCheckoutReadyForPayment && !checkoutError && (
                  <p className="text-xs font-medium text-amber-600">
                    {liveCheckoutValidationError ||
                      (requiresCheckoutOtp
                        ? isRu
                          ? "\u0417\u0430\u0432\u0435\u0440\u0448\u0438\u0442\u0435 \u043f\u0440\u043e\u0432\u0435\u0440\u043a\u0443, \u0447\u0442\u043e\u0431\u044b \u043f\u0440\u043e\u0434\u043e\u043b\u0436\u0438\u0442\u044c \u043e\u043f\u043b\u0430\u0442\u0443."
                          : "Complete verification to continue payment."
                        : isRu
                          ? "\u0417\u0430\u043f\u043e\u043b\u043d\u0438\u0442\u0435 \u043a\u043e\u043d\u0442\u0430\u043a\u0442\u043d\u044b\u0435 \u0434\u0430\u043d\u043d\u044b\u0435 \u0438 \u0430\u0434\u0440\u0435\u0441 \u0434\u043e\u0441\u0442\u0430\u0432\u043a\u0438, \u0447\u0442\u043e\u0431\u044b \u043f\u0440\u043e\u0434\u043e\u043b\u0436\u0438\u0442\u044c \u043e\u043f\u043b\u0430\u0442\u0443."
                          : "Complete contact and shipping details to continue payment.")}
                  </p>
                )}

                <Link href={continueShoppingLocalized} className="block">
                  <Button variant="outline" className="w-full">
                    {ui.continueShopping}
                  </Button>
                </Link>

                {items.length > 0 && (
                  <button
                    onClick={clearCart}
                    className="w-full text-sm font-semibold text-red-500 hover:text-red-700 transition-colors py-2"
                  >
                    {ui.clearCart}
                  </button>
                )}

                {paypalInfo && (
                  <p className="text-xs font-medium text-[#1B63D0]">{paypalInfo}</p>
                )}
                {checkoutError && (
                  <p className="text-xs font-medium text-red-500">{checkoutError}</p>
                )}
                {paypalError && (
                  <p className="text-xs font-medium text-red-500">{paypalError}</p>
                )}
              </div>

              <div className="border-t border-[#D4AF37]/20 pt-4 text-xs text-gray-600 space-y-2">
                <p>
                  &#10003;{" "}
                  {isRu ? "\u0412\u043e\u0437\u0432\u0440\u0430\u0442 \u0432 \u0442\u0435\u0447\u0435\u043d\u0438\u0435 7 \u0434\u043d\u0435\u0439" : "7-day return policy"}
                </p>
                <p>
                  &#10003;{" "}
                  {isRu ? "\u0421\u043b\u0443\u0436\u0431\u0430 \u043f\u043e\u0434\u0434\u0435\u0440\u0436\u043a\u0438 24/7" : "24/7 customer service"}
                </p>
                <p>
                  &#10003;{" "}
                  {isRu ? "\u0411\u044b\u0441\u0442\u0440\u0430\u044f \u043c\u0435\u0436\u0434\u0443\u043d\u0430\u0440\u043e\u0434\u043d\u0430\u044f \u0434\u043e\u0441\u0442\u0430\u0432\u043a\u0430" : "Fast Worldwide Delivery"}
                </p>
                <p>
                  &#10003;{" "}
                  {isRu ? "\u0413\u0430\u0440\u0430\u043d\u0442\u0438\u044f \u043f\u0440\u0435\u043c\u0438\u0443\u043c \u043a\u0430\u0447\u0435\u0441\u0442\u0432\u0430" : "Premium Quality Guaranteed"}
                </p>
                <p>
                  &#10003;{" "}
                  {isRu
                    ? "\u0411\u0435\u0441\u043f\u043b\u0430\u0442\u043d\u0430\u044f \u0434\u043e\u0441\u0442\u0430\u0432\u043a\u0430 \u043f\u0440\u0438 \u0437\u0430\u043a\u0430\u0437\u0435 \u043e\u0442 $750"
                    : "Free shipping on orders over $750"}
                </p>
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </main>
  )
}
