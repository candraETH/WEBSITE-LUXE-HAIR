import "server-only"

const PAYPAL_ORDER_ID_REGEX = /^[A-Z0-9]{10,30}$/

function normalizeOrigin(value: string): string {
  return value.trim().replace(/\/+$/, "").toLowerCase()
}

export function getAllowedAppOrigin(request: Request): string {
  const configured = process.env.APP_BASE_URL?.trim()

  if (configured) {
    return normalizeOrigin(configured)
  }

  // Developer fallback for local environments.
  if (process.env.NODE_ENV !== "production") {
    return normalizeOrigin(new URL(request.url).origin)
  }

  throw new Error("APP_BASE_URL is not configured.")
}

export function isAllowedRequestOrigin(request: Request): boolean {
  const allowedOrigin = getAllowedAppOrigin(request)
  const requestOrigin = request.headers.get("origin")

  if (requestOrigin && normalizeOrigin(requestOrigin) !== allowedOrigin) {
    return false
  }

  const referer = request.headers.get("referer")
  if (referer) {
    try {
      const refererOrigin = normalizeOrigin(new URL(referer).origin)
      if (refererOrigin !== allowedOrigin) {
        return false
      }
    } catch {
      return false
    }
  }

  return true
}

export function isValidPayPalOrderId(value: string): boolean {
  return PAYPAL_ORDER_ID_REGEX.test(value.trim().toUpperCase())
}

