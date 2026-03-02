import { z } from "zod"
import { applyProductDiscount } from "@/lib/pricing"
import { calculateCouponDiscountCents, getCouponByCode } from "@/lib/coupon"

export const MAX_CHECKOUT_ITEMS = 100
export const MAX_ITEM_QUANTITY = 1000
export const COLOR_SURCHARGE_DOLLARS = 15
export const TAX_RATE = 0.035
export const FREE_SHIPPING_THRESHOLD_DOLLARS = 750
export const SHIPPING_DOLLARS = 0
export const LENGTH_OPTIONS = [16, 18, 20, 22, 24, 26] as const

const lengthSet = new Set<number>(LENGTH_OPTIONS)

const PRODUCT_PRICING: Record<
  string,
  { name: string; basePrice: number; pricePerInch: number; category: string }
> = {
  "silky-straight-clip-ins": {
    name: "Silky Straight Clip-Ins",
    basePrice: 120,
    pricePerInch: 6.67,
    category: "Hair Extensions",
  },
  "honey-blonde-tape-ins": {
    name: "Honey Blonde Tape-Ins",
    basePrice: 150,
    pricePerInch: 8.5,
    category: "Hair Extensions",
  },
  "body-wave-bundles": {
    name: "Body Wave Bundles",
    basePrice: 95,
    pricePerInch: 5.8,
    category: "Hair Extensions",
  },
  "straight-lace-front-wig": {
    name: "Straight Lace Front Wig",
    basePrice: 250,
    pricePerInch: 6.67,
    category: "Wigs",
  },
  "deep-wave-closure-wig": {
    name: "Deep Wave Closure Wig",
    basePrice: 280,
    pricePerInch: 8,
    category: "Wigs",
  },
  "burgundy-bob-wig": {
    name: "Burgundy Bob Wig",
    basePrice: 180,
    pricePerInch: 5.6,
    category: "Wigs",
  },
  "machine-weft-straight": {
    name: "Machine Weft Straight",
    basePrice: 80,
    pricePerInch: 4,
    category: "Weft Hair",
  },
  "hand-tied-loose-wave": {
    name: "Hand-Tied Loose Wave",
    basePrice: 130,
    pricePerInch: 6.5,
    category: "Weft Hair",
  },
  "flat-weft-platinum": {
    name: "Flat Weft Platinum",
    basePrice: 110,
    pricePerInch: 5.2,
    category: "Weft Hair",
  },
  "natural-wave-weft": {
    name: "Natural Wave",
    basePrice: 95,
    pricePerInch: 5.6,
    category: "Weft Hair",
  },
  "body-wave-weft": {
    name: "Body Wave",
    basePrice: 98,
    pricePerInch: 5.9,
    category: "Weft Hair",
  },
  "curly-weft": {
    name: "Curly",
    basePrice: 105,
    pricePerInch: 6.3,
    category: "Weft Hair",
  },
  "deep-curly-weft": {
    name: "Deep Curly",
    basePrice: 110,
    pricePerInch: 6.5,
    category: "Weft Hair",
  },
  "deep-wave-weft": {
    name: "Deep Wave",
    basePrice: 108,
    pricePerInch: 6.2,
    category: "Weft Hair",
  },
  "fumi-weft": {
    name: "Fumi",
    basePrice: 125,
    pricePerInch: 7,
    category: "Weft Hair",
  },
  "natural-curly-weft": {
    name: "Natural Curly",
    basePrice: 112,
    pricePerInch: 6.4,
    category: "Weft Hair",
  },
  "water-wave-weft": {
    name: "Water Wave",
    basePrice: 107,
    pricePerInch: 6.1,
    category: "Weft Hair",
  },
  "kinky-curl-weft": {
    name: "Kinky Curl",
    basePrice: 118,
    pricePerInch: 6.8,
    category: "Weft Hair",
  },
  "loose-wave-weft": {
    name: "Loose Wave",
    basePrice: 102,
    pricePerInch: 6,
    category: "Weft Hair",
  },
  "jerry-curly-weft": {
    name: "Jerry Curly",
    basePrice: 114,
    pricePerInch: 6.6,
    category: "Weft Hair",
  },
  "brazilian-curly-weft": {
    name: "Brazilian Curly",
    basePrice: 120,
    pricePerInch: 6.9,
    category: "Weft Hair",
  },
  "virgin-straight-bulk": {
    name: "Virgin Straight Bulk",
    basePrice: 116,
    pricePerInch: 10,
    category: "Bulk Hair",
  },
  "natural-braiding-hair": {
    name: "Natural Braiding Hair",
    basePrice: 100,
    pricePerInch: 10,
    category: "Bulk Hair",
  },
  "wavy-bulk-premium": {
    name: "Wavy Bulk Premium",
    basePrice: 120,
    pricePerInch: 10,
    category: "Bulk Hair",
  },
}

const COLOR_LABELS: Record<string, string> = {
  "#ash": "Ash",
  "#60": "Light Blonde",
  "#613": "Gold Blonde",
  "#24": "Medium Ash",
  "#18": "Honey Brown",
  "#16": "Light Brown",
  "#14": "Medium Brown",
  "#12": "Dark Brown",
  "#10": "Chestnut Brown",
  "#8": "Dark Chestnut",
  "#4": "Deep Brown",
  "#2": "Natural Hair",
}

export const checkoutItemSchema = z.object({
  slug: z.string().trim().min(1).max(128),
  length: z.number().int(),
  quantity: z.number().int(),
  variant: z.string().trim().max(80).optional(),
})

export type CheckoutItemInput = z.infer<typeof checkoutItemSchema>

export function dollarsToCents(amount: number): number {
  return Math.round(amount * 100)
}

export function centsToDollars(cents: number): string {
  return (cents / 100).toFixed(2)
}

function normalizeVariant(value?: string): string | null {
  if (!value) {
    return null
  }
  const normalized = value.trim().toLowerCase()
  return normalized.length > 0 ? normalized : null
}

function normalizeColorCodeVariant(normalizedVariant: string | null): string | null {
  if (!normalizedVariant || normalizedVariant === "default") {
    return null
  }

  if (normalizedVariant.startsWith("#")) {
    return normalizedVariant
  }

  if (/^(ash|\d{1,3})$/.test(normalizedVariant)) {
    return `#${normalizedVariant}`
  }

  return null
}

function hasNoColorSurcharge(normalizedVariant: string | null): boolean {
  const colorCode = normalizeColorCodeVariant(normalizedVariant)
  if (!colorCode) {
    // Variants like "Body Wave" or "Curly 1" are texture/type, not color.
    return true
  }

  if (colorCode.startsWith("#2")) {
    return true
  }

  if (normalizedVariant?.includes("natural hair")) {
    return true
  }

  return false
}

function getColorSurchargeCents(variant?: string): number {
  return hasNoColorSurcharge(normalizeVariant(variant)) ? 0 : dollarsToCents(COLOR_SURCHARGE_DOLLARS)
}

function getColorDisplay(variant?: string): string | null {
  if (!variant) {
    return null
  }

  const normalized = normalizeVariant(variant)
  if (!normalized || normalized === "default") {
    return null
  }

  const colorCode = normalized.startsWith("#") ? normalized : `#${normalized}`
  const label = COLOR_LABELS[colorCode]
  if (label) {
    return `${label} ${colorCode.toUpperCase()}`
  }

  return variant.trim()
}

function resolveProduct(slug: string) {
  const product = PRODUCT_PRICING[slug]
  if (!product) {
    throw new Error(`Unknown product slug: ${slug}`)
  }
  return product
}

function assertValidLength(length: number): void {
  if (!lengthSet.has(length)) {
    throw new Error(`Unsupported length: ${length}`)
  }
}

function assertValidQuantity(quantity: number): void {
  if (!Number.isFinite(quantity) || quantity < 1 || quantity > MAX_ITEM_QUANTITY) {
    throw new Error(`Invalid quantity: ${quantity}`)
  }
}

export function buildDisplayName(productName: string, variant?: string): string {
  const colorDisplay = getColorDisplay(variant)
  return colorDisplay ? `${productName} - ${colorDisplay}` : productName
}

type CheckoutUnitPriceInput = Pick<CheckoutItemInput, "slug" | "length" | "variant">

export function calculateCheckoutUnitPrice(input: CheckoutUnitPriceInput): number {
  assertValidLength(input.length)
  const product = resolveProduct(input.slug)
  const surchargeCents = getColorSurchargeCents(input.variant)
  const baseUnitPrice = product.basePrice + (input.length - 16) * product.pricePerInch
  const originalUnitPriceDollars = Number((baseUnitPrice + surchargeCents / 100).toFixed(2))
  return applyProductDiscount(originalUnitPriceDollars)
}

export function calculateOrderFromItems(items: CheckoutItemInput[], couponCode?: string) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("Cart items are required")
  }

  if (items.length > MAX_CHECKOUT_ITEMS) {
    throw new Error("Too many cart items")
  }

  const lineItems = items.map((item) => {
    assertValidLength(item.length)
    assertValidQuantity(item.quantity)

    const product = resolveProduct(item.slug)
    const surchargeCents = getColorSurchargeCents(item.variant)
    const unitPriceDollars = calculateCheckoutUnitPrice(item)
    const unitPriceCents = dollarsToCents(unitPriceDollars)
    const lineTotalCents = unitPriceCents * item.quantity

    return {
      slug: item.slug,
      name: product.name,
      category: product.category,
      length: item.length,
      quantity: item.quantity,
      variant: item.variant?.trim() || undefined,
      surchargeCents,
      unitPriceCents,
      lineTotalCents,
      displayName: buildDisplayName(product.name, item.variant),
    }
  })

  const lineItemsSubtotalCents = lineItems.reduce((sum, item) => sum + item.lineTotalCents, 0)
  const resolvedCoupon = getCouponByCode(couponCode)
  const couponMeetsMinimum =
    resolvedCoupon ? lineItemsSubtotalCents >= dollarsToCents(resolvedCoupon.minimumSubtotal) : false
  const eligibleCoupon = couponMeetsMinimum ? resolvedCoupon : null
  const couponDiscountCents = eligibleCoupon
    ? Math.min(
        lineItemsSubtotalCents,
        calculateCouponDiscountCents(lineItemsSubtotalCents, eligibleCoupon.discountRate)
      )
    : 0
  const subtotalCents = lineItemsSubtotalCents - couponDiscountCents
  const taxCents = Math.round(subtotalCents * TAX_RATE)
  const shippingCents = subtotalCents >= dollarsToCents(FREE_SHIPPING_THRESHOLD_DOLLARS) ? 0 : dollarsToCents(SHIPPING_DOLLARS)
  const totalCents = subtotalCents + taxCents + shippingCents

  return {
    lineItems,
    lineItemsSubtotalCents,
    couponDiscountCents,
    appliedCoupon: eligibleCoupon && couponDiscountCents > 0
      ? {
          code: eligibleCoupon.code,
          discountRate: eligibleCoupon.discountRate,
        }
      : null,
    subtotalCents,
    taxCents,
    shippingCents,
    totalCents,
  }
}
