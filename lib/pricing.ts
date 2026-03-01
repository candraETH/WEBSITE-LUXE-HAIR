export const PRODUCT_DISCOUNT_RATE = 0.5

function clampDiscountRate(value: number): number {
  if (!Number.isFinite(value)) {
    return 0
  }

  if (value < 0) {
    return 0
  }

  if (value > 0.95) {
    return 0.95
  }

  return value
}

function roundToMoney(value: number): number {
  return Number(value.toFixed(2))
}

export function applyProductDiscount(amount: number, discountRate = PRODUCT_DISCOUNT_RATE): number {
  if (!Number.isFinite(amount)) {
    return 0
  }

  const safeRate = clampDiscountRate(discountRate)
  return roundToMoney(amount * (1 - safeRate))
}

export function recoverOriginalPriceFromDiscounted(discountedAmount: number, discountRate = PRODUCT_DISCOUNT_RATE): number {
  if (!Number.isFinite(discountedAmount)) {
    return 0
  }

  const safeRate = clampDiscountRate(discountRate)
  const multiplier = 1 - safeRate
  if (multiplier <= 0) {
    return roundToMoney(discountedAmount)
  }

  return roundToMoney(discountedAmount / multiplier)
}

export function formatUsdPrice(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

function parseNumbersFromPriceLabel(value: string): number[] {
  const matches = value.match(/\d+(?:\.\d+)?/g) ?? []
  return matches
    .map((part) => Number.parseFloat(part))
    .filter((part) => Number.isFinite(part))
}

function formatPriceLabelFromNumbers(values: number[]): string {
  if (values.length === 0) {
    return "-"
  }

  const normalized = values.map((value) => roundToMoney(value))
  if (normalized.length === 1) {
    return formatUsdPrice(normalized[0])
  }

  return `${formatUsdPrice(normalized[0])} - ${formatUsdPrice(normalized[normalized.length - 1])}`
}

export function getDiscountedPriceLabel(priceLabel: string, discountRate = PRODUCT_DISCOUNT_RATE): {
  discountedLabel: string
  originalLabel: string
} {
  const rawValues = parseNumbersFromPriceLabel(priceLabel)
  if (rawValues.length === 0) {
    return {
      discountedLabel: priceLabel,
      originalLabel: priceLabel,
    }
  }

  const discountedValues = rawValues.map((value) => applyProductDiscount(value, discountRate))
  return {
    discountedLabel: formatPriceLabelFromNumbers(discountedValues),
    originalLabel: formatPriceLabelFromNumbers(rawValues),
  }
}
