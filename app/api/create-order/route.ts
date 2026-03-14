import { NextResponse } from "next/server"
import { z } from "zod"
import {
  calculateOrderFromItems,
  centsToDollars,
  checkoutItemSchema,
  MAX_CHECKOUT_ITEMS,
} from "@/lib/paypal/catalog"
import { paypalRequest, PayPalHttpError } from "@/lib/paypal/client"
import { savePayPalOrder } from "@/lib/paypal/order-store"
import { hasSupabaseEnv, supabase } from "@/lib/supabase-server"
import { enforceRateLimit } from "@/lib/rate-limit"
import { getAllowedAppOrigin, isAllowedRequestOrigin } from "@/lib/security"
import { checkoutCustomerSchema, normalizeCheckoutCustomer } from "@/lib/checkout-customer"
import { consumeCheckoutVerificationToken } from "@/lib/checkout-verification"
import { isCouponEligibleForSubtotal, normalizeCouponCode } from "@/lib/coupon"
import { resolveCouponDefinition } from "@/lib/coupon-resolver"
import { getTierForSpend, type LoyaltyTierKey } from "@/lib/loyalty-tier"

export const runtime = "nodejs"

type PayPalCreateOrderResponse = {
  id: string
  status: string
  links?: Array<{ href: string; rel: string; method: string }>
}

type CartJsonPayload = {
  order: {
    paypal_order_id: string
    status: "PENDING"
    currency: "USD"
    created_at: string
  }
  customer: {
    name: string
    email: string
    phone_number: string
    address_line: string
    city: string
    province: string
    postal_code: string
    country: string
  }
  summary: {
    item_count: number
    line_items_subtotal: number
    discount: number
    subtotal: number
    tax: number
    shipping: number
    total: number
  }
  coupon: {
    code: string
    discount_rate: number
  } | null
  items: Array<{
    name: string
    slug: string
    length: number
    category: string
    quantity: number
    unit_price: number
    line_total: number
  }>
}

type OrderInsertPayload = {
  paypal_order_id: string
  customer_name: string
  customer_email: string
  cart_json: CartJsonPayload
  cart_text: string
  amount: number
  currency: "USD"
  status: "PENDING"
  coupon_code?: string | null
  coupon_discount_rate?: number | null
  coupon_discount_amount?: number | null
}

function getBearerToken(request: Request): string | null {
  const header = request.headers.get("authorization") ?? ""
  if (!header.toLowerCase().startsWith("bearer ")) {
    return null
  }
  const token = header.slice(7).trim()
  return token || null
}

const createOrderSchema = z.object({
  items: z.array(checkoutItemSchema).min(1).max(MAX_CHECKOUT_ITEMS),
  customer: checkoutCustomerSchema,
  verificationToken: z.string().trim().min(20).max(200).optional(),
  couponCode: z.string().trim().max(40).optional(),
})

const CHECKOUT_OTP_REQUIRED_TOTAL_CENTS = 2500 * 100

function isMissingColumnError(message: string) {
  const normalized = message.trim().toLowerCase()
  return (
    (normalized.includes("column") && normalized.includes("does not exist")) ||
    (normalized.includes("could not find") && normalized.includes("column") && normalized.includes("schema cache")) ||
    (normalized.includes("schema cache") && normalized.includes("column"))
  )
}

async function insertOrderWithPhoneFallback(
  basePayload: OrderInsertPayload,
  phoneNumber: string,
  userId?: string | null
) {
  const phoneColumnCandidates = [
    "phone_number",
    "customer_phone",
    "customer_whatsapp",
    "whatsapp",
  ] as const

  const base = { ...basePayload } as Record<string, unknown>

  const optionalCouponKeys = ["coupon_code", "coupon_discount_rate", "coupon_discount_amount"] as const
  const hasCouponSnapshot = optionalCouponKeys.some((key) => Object.prototype.hasOwnProperty.call(base, key))
  const baseWithoutCouponSnapshot = { ...base }
  for (const key of optionalCouponKeys) {
    delete baseWithoutCouponSnapshot[key]
  }

  const baseCandidates = hasCouponSnapshot ? [base, baseWithoutCouponSnapshot] : [base]

  const phoneVariants: Array<Record<string, unknown>> = []
  for (const candidate of baseCandidates) {
    for (const columnName of phoneColumnCandidates) {
      phoneVariants.push({ ...candidate, [columnName]: phoneNumber })
    }
    phoneVariants.push(candidate)
  }

  const attempts: Array<Record<string, unknown>> = []
  if (userId) {
    for (const variant of phoneVariants) {
      attempts.push({ ...variant, user_id: userId })
    }
  }
  attempts.push(...phoneVariants)

  let lastError: { message: string } | null = null
  for (const attemptPayload of attempts) {
    const { error } = await supabase.from("orders").insert([attemptPayload])
    if (!error) {
      return { error: null as null | { message: string } }
    }

    lastError = { message: error.message }
    if (!isMissingColumnError(error.message)) {
      return { error: lastError }
    }
  }

  return { error: lastError ?? { message: "Unable to save order." } }
}

const PAID_STATUSES = ["PAID", "PROCESSING", "SHIPPED", "DELIVERED", "COMPLETED"] as const

const TIER_RANK: Record<LoyaltyTierKey, number> = {
  bronze: 0,
  silver: 1,
  gold: 2,
  diamond: 3,
  vip: 4,
}

const TIER_NAME: Record<LoyaltyTierKey, string> = {
  bronze: "Bronze",
  silver: "Silver",
  gold: "Gold",
  diamond: "Diamond",
  vip: "Exclusive VIP",
}

function asNumber(value: unknown) {
  const num = typeof value === "number" ? value : Number(value ?? NaN)
  return Number.isFinite(num) ? num : 0
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase()
}

async function getTotalPaidSpendUsdByEmail(email: string) {
  const { data, error } = await supabase
    .from("orders")
    .select("amount,status,currency")
    .eq("customer_email", normalizeEmail(email))
    .in("status", [...PAID_STATUSES])
    .eq("currency", "USD")
    .limit(10000)

  if (error) {
    return { total: 0, error: error.message }
  }

  let total = 0
  for (const row of (data ?? []) as unknown as Array<Record<string, unknown>>) {
    total += asNumber(row["amount"])
  }
  return { total: Number(total.toFixed(2)), error: null as null | string }
}

async function countPaidCouponUses(params: { code: string; customerEmail?: string }) {
  let query = supabase
    .from("orders")
    // `head: true` means no rows are returned; we only read `count`.
    .select("coupon_code", { count: "exact", head: true })
    .eq("coupon_code", params.code)
    .in("status", [...PAID_STATUSES])

  if (params.customerEmail) {
    query = query.eq("customer_email", normalizeEmail(params.customerEmail))
  }

  const { count, error } = await query
  if (error) {
    return { count: 0, error: error.message }
  }

  return { count: count ?? 0, error: null as null | string }
}

export async function POST(request: Request) {
  try {
    const rateLimit = await enforceRateLimit(request, "api:create-order", {
      max: 20,
      windowMs: 10 * 60 * 1000,
    })
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } }
      )
    }

    if (!isAllowedRequestOrigin(request)) {
      return NextResponse.json({ error: "Forbidden origin." }, { status: 403 })
    }

    const body = await request.json()
    const parsed = createOrderSchema.safeParse(body)

    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0]
      const issuePath = firstIssue?.path?.join(".")
      const issueMessage = firstIssue?.message?.trim() || "Invalid order payload."
      const errorMessage = issuePath
        ? `Invalid ${issuePath}: ${issueMessage}`
        : `Invalid order payload: ${issueMessage}`
      return NextResponse.json({ error: errorMessage }, { status: 400 })
    }

    if (!hasSupabaseEnv) {
      return NextResponse.json({ error: "Supabase environment variables are not configured." }, { status: 500 })
    }

    const normalizedCouponCode = normalizeCouponCode(parsed.data.couponCode)
    const requestedCoupon = normalizedCouponCode ? await resolveCouponDefinition(normalizedCouponCode) : null
    if (normalizedCouponCode && !requestedCoupon) {
      return NextResponse.json({ error: "Invalid coupon code." }, { status: 400 })
    }

    const calculated = calculateOrderFromItems(
      parsed.data.items,
      normalizedCouponCode || undefined,
      requestedCoupon
    )
    if (
      requestedCoupon &&
      !isCouponEligibleForSubtotal(requestedCoupon, calculated.lineItemsSubtotalCents / 100)
    ) {
      return NextResponse.json(
        {
          error: `Coupon requires minimum subtotal ${requestedCoupon.minimumSubtotal.toFixed(0)} USD.`,
        },
        { status: 400 }
      )
    }

    const token = getBearerToken(request)
    if (!token) {
      return NextResponse.json({ error: "You must be signed in to checkout." }, { status: 401 })
    }

    const { data: authedUser, error: authedUserError } = await supabase.auth.getUser(token)
    if (authedUserError || !authedUser?.user) {
      return NextResponse.json({ error: "Your session expired. Please sign in again." }, { status: 401 })
    }

    const authedUserId = authedUser.user.id
    const authedEmail = authedUser.user.email?.trim().toLowerCase() ?? ""
    if (!authedEmail) {
      return NextResponse.json({ error: "Unable to read your account email. Please sign in again." }, { status: 401 })
    }

    if (requestedCoupon) {
      if (requestedCoupon.minTierKey) {
        const { total: totalSpend, error: totalSpendError } = await getTotalPaidSpendUsdByEmail(authedEmail)
        if (totalSpendError) {
          console.error("Coupon tier check failed:", totalSpendError)
          return NextResponse.json({ error: "Unable to validate coupon. Please try again." }, { status: 500 })
        }

        const customerTier = getTierForSpend(totalSpend)
        const requiredTierKey = requestedCoupon.minTierKey
        if (TIER_RANK[customerTier.key] < TIER_RANK[requiredTierKey]) {
          return NextResponse.json(
            { error: `Coupon requires minimum membership tier ${TIER_NAME[requiredTierKey]}.` },
            { status: 400 }
          )
        }
      }

      const hasUseLimits =
        (typeof requestedCoupon.maxUsesTotal === "number" && requestedCoupon.maxUsesTotal > 0) ||
        (typeof requestedCoupon.maxUsesPerCustomer === "number" && requestedCoupon.maxUsesPerCustomer > 0)

      if (hasUseLimits) {
        const { count: totalUses, error: totalUsesError } = await countPaidCouponUses({ code: requestedCoupon.code })
        if (totalUsesError) {
          if (isMissingColumnError(totalUsesError)) {
            return NextResponse.json(
              { error: "This coupon is temporarily unavailable. Please try again later." },
              { status: 503 }
            )
          }
          console.error("Coupon usage check failed:", totalUsesError)
          return NextResponse.json({ error: "Unable to validate coupon. Please try again." }, { status: 500 })
        }

        if (requestedCoupon.maxUsesTotal != null && totalUses >= requestedCoupon.maxUsesTotal) {
          return NextResponse.json({ error: "Coupon has reached its usage limit." }, { status: 400 })
        }

        const { count: customerUses, error: customerUsesError } = await countPaidCouponUses({
          code: requestedCoupon.code,
          customerEmail: authedEmail,
        })
        if (customerUsesError) {
          if (isMissingColumnError(customerUsesError)) {
            return NextResponse.json(
              { error: "This coupon is temporarily unavailable. Please try again later." },
              { status: 503 }
            )
          }
          console.error("Coupon per-customer usage check failed:", customerUsesError)
          return NextResponse.json({ error: "Unable to validate coupon. Please try again." }, { status: 500 })
        }

        if (requestedCoupon.maxUsesPerCustomer != null && customerUses >= requestedCoupon.maxUsesPerCustomer) {
          return NextResponse.json({ error: "You have already used this coupon." }, { status: 400 })
        }
      }
    }

    const customer = normalizeCheckoutCustomer({
      ...parsed.data.customer,
      email: authedEmail,
    })
    const requiresCheckoutOtp = calculated.totalCents >= CHECKOUT_OTP_REQUIRED_TOTAL_CENTS
    if (requiresCheckoutOtp) {
      if (!parsed.data.verificationToken) {
        return NextResponse.json(
          { error: "Verification code is required for orders of $2500 or more." },
          { status: 403 }
        )
      }

      const isVerificationValid = await consumeCheckoutVerificationToken(parsed.data.verificationToken, customer)
      if (!isVerificationValid) {
        return NextResponse.json(
          { error: "Invalid or expired verification code. Please verify again." },
          { status: 403 }
        )
      }
    }

    const internalOrderId = crypto.randomUUID()
    const origin = getAllowedAppOrigin(request)

    const amountBreakdown: {
      item_total: { currency_code: "USD"; value: string }
      tax_total: { currency_code: "USD"; value: string }
      shipping: { currency_code: "USD"; value: string }
      discount?: { currency_code: "USD"; value: string }
    } = {
      item_total: { currency_code: "USD", value: centsToDollars(calculated.lineItemsSubtotalCents) },
      tax_total: { currency_code: "USD", value: centsToDollars(calculated.taxCents) },
      shipping: { currency_code: "USD", value: centsToDollars(calculated.shippingCents) },
    }

    if (calculated.couponDiscountCents > 0) {
      amountBreakdown.discount = {
        currency_code: "USD",
        value: centsToDollars(calculated.couponDiscountCents),
      }
    }

    const payload = {
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: internalOrderId,
          custom_id: internalOrderId,
          amount: {
            currency_code: "USD",
            value: centsToDollars(calculated.totalCents),
            breakdown: amountBreakdown,
          },
          items: calculated.lineItems.map((item) => ({
            name: item.displayName.slice(0, 127),
            quantity: String(item.quantity),
            category: "PHYSICAL_GOODS",
            unit_amount: {
              currency_code: "USD",
              value: centsToDollars(item.unitPriceCents),
            },
          })),
        },
      ],
      application_context: {
        user_action: "PAY_NOW",
        shipping_preference: "NO_SHIPPING",
        return_url: `${origin}/payment-success`,
        cancel_url: `${origin}/cart?paypal=cancel`,
      },
    }

    const response = await paypalRequest<PayPalCreateOrderResponse>("/v2/checkout/orders", {
      method: "POST",
      body: JSON.stringify(payload),
    })

    const approveUrl = response.links?.find((link) => link.rel === "approve")?.href
    if (!approveUrl) {
      return NextResponse.json({ error: "Unable to create PayPal approval link." }, { status: 502 })
    }

    savePayPalOrder({
      paypalOrderId: response.id,
      internalOrderId,
      status: "CREATED",
      subtotalCents: calculated.subtotalCents,
      taxCents: calculated.taxCents,
      shippingCents: calculated.shippingCents,
      totalCents: calculated.totalCents,
      currencyCode: "USD",
    })

    const lineItemsSubtotalAmount = Number(centsToDollars(calculated.lineItemsSubtotalCents))
    const discountAmount = Number(centsToDollars(calculated.couponDiscountCents))
    const subtotalAmount = Number(centsToDollars(calculated.subtotalCents))
    const taxAmount = Number(centsToDollars(calculated.taxCents))
    const shippingAmount = Number(centsToDollars(calculated.shippingCents))
    const totalAmount = Number(centsToDollars(calculated.totalCents))
    const cartJson: CartJsonPayload = {
      order: {
        paypal_order_id: response.id,
        status: "PENDING",
        currency: "USD",
        created_at: new Date().toISOString(),
      },
      customer: {
        name: customer.fullName,
        email: customer.email,
        phone_number: customer.whatsapp,
        address_line: customer.addressLine,
        city: customer.city,
        province: customer.province,
        postal_code: customer.postalCode,
        country: customer.country,
      },
      summary: {
        item_count: calculated.lineItems.reduce((sum, item) => sum + item.quantity, 0),
        line_items_subtotal: lineItemsSubtotalAmount,
        discount: discountAmount,
        subtotal: subtotalAmount,
        tax: taxAmount,
        shipping: shippingAmount,
        total: totalAmount,
      },
      coupon: calculated.appliedCoupon
        ? {
            code: calculated.appliedCoupon.code,
            discount_rate: calculated.appliedCoupon.discountRate,
          }
        : null,
      items: calculated.lineItems.map((item) => ({
        name: item.name,
        slug: item.slug,
        length: item.length,
        category: item.category,
        quantity: item.quantity,
        unit_price: Number(centsToDollars(item.unitPriceCents)),
        line_total: Number(centsToDollars(item.lineTotalCents)),
      })),
    }
    const cartTextItems = calculated.lineItems.map((item, index) => {
      return [
        `${index + 1}. ${item.name}`,
        `   ${item.length}"  ${item.category}  x ${item.quantity}  $${centsToDollars(item.lineTotalCents)}`,
      ].join("\n")
    })
    const cartText = [
      `Order ID: ${response.id}`,
      `Status: PENDING`,
      `Customer: ${customer.fullName}  ${customer.email}  ${customer.whatsapp}`,
      `Address: ${customer.addressLine}, ${customer.city}, ${customer.province}, ${customer.postalCode}, ${customer.country}`,
      "",
      "Items:",
      ...cartTextItems,
      "",
      `Line Items Subtotal: $${centsToDollars(calculated.lineItemsSubtotalCents)}`,
      ...(calculated.couponDiscountCents > 0
        ? [
            `Coupon (${calculated.appliedCoupon?.code ?? normalizedCouponCode}): -$${centsToDollars(calculated.couponDiscountCents)}`,
          ]
        : []),
      `Subtotal: $${centsToDollars(calculated.subtotalCents)}`,
      `Tax: $${centsToDollars(calculated.taxCents)}`,
      `Shipping: $${centsToDollars(calculated.shippingCents)}`,
      `Total: $${centsToDollars(calculated.totalCents)}`,
      "Currency: USD",
    ].join("\n")

    const orderInsertPayload: OrderInsertPayload = {
      paypal_order_id: response.id,
      customer_name: customer.fullName,
      customer_email: customer.email,
      cart_json: cartJson,
      cart_text: cartText,
      amount: totalAmount,
      currency: "USD",
      status: "PENDING",
      coupon_code: calculated.appliedCoupon?.code ?? null,
      coupon_discount_rate: calculated.appliedCoupon?.discountRate ?? null,
      coupon_discount_amount: calculated.appliedCoupon ? discountAmount : null,
    }

    const { error: insertError } = await insertOrderWithPhoneFallback(orderInsertPayload, customer.whatsapp, authedUserId)

    if (insertError) {
      console.error("Supabase insert order failed:", insertError.message)
      const isProd = process.env.NODE_ENV === "production"
      return NextResponse.json(
        {
          error: isProd ? "Unable to save order." : `Unable to save order. (${insertError.message})`,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      orderId: response.id,
      status: response.status,
      approveUrl,
    })
  } catch (error) {
    if (error instanceof Error && error.message.includes("APP_BASE_URL")) {
      console.error("Create-order configuration error:", error.message)
      return NextResponse.json({ error: "Server configuration error." }, { status: 500 })
    }

    if (error instanceof PayPalHttpError) {
      console.error("PayPal create-order failed:", error.status, error.message)
      return NextResponse.json({ error: "Failed to create PayPal order." }, { status: 502 })
    }

    console.error("Create-order error:", error instanceof Error ? error.message : "Unknown error")
    return NextResponse.json({ error: "Unable to create order." }, { status: 500 })
  }
}
