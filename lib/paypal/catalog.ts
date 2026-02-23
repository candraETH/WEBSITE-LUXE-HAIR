import { z } from "zod"

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
  "virgin-straight-bulk": {
    name: "Virgin Straight Bulk",
    basePrice: 70,
    pricePerInch: 3.6,
    category: "Bulk Hair",
  },
  "natural-braiding-hair": {
    name: "Natural Braiding Hair",
    basePrice: 60,
    pricePerInch: 3.2,
    category: "Bulk Hair",
  },
  "wavy-bulk-premium": {
    name: "Wavy Bulk Premium",
    basePrice: 85,
    pricePerInch: 4.2,
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

function hasNoColorSurcharge(normalizedVariant: string | null): boolean {
  if (!normalizedVariant || normalizedVariant === "default") {
    return true
  }

  if (normalizedVariant.startsWith("#2")) {
    return true
  }

  if (normalizedVariant.includes("natural hair")) {
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

export function calculateOrderFromItems(items: CheckoutItemInput[]) {
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
    const baseUnitPrice = product.basePrice + (item.length - 16) * product.pricePerInch
    const unitPriceDollars = Number((baseUnitPrice + surchargeCents / 100).toFixed(2))
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

  const subtotalCents = lineItems.reduce((sum, item) => sum + item.lineTotalCents, 0)
  const taxCents = Math.round(subtotalCents * TAX_RATE)
  const shippingCents = subtotalCents >= dollarsToCents(FREE_SHIPPING_THRESHOLD_DOLLARS) ? 0 : dollarsToCents(SHIPPING_DOLLARS)
  const totalCents = subtotalCents + taxCents + shippingCents

  return {
    lineItems,
    subtotalCents,
    taxCents,
    shippingCents,
    totalCents,
  }
}

