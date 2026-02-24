import "server-only"
import { createHash, randomInt, timingSafeEqual } from "crypto"

function getOtpHashSecret() {
  const configured = process.env.OTP_HASH_SECRET?.trim()
  if (configured) {
    return configured
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("OTP_HASH_SECRET is not configured.")
  }

  return "development-only-otp-secret"
}

export function generateOtpCode() {
  return String(randomInt(100000, 1000000))
}

export function hashOtpCode(code: string, context: string) {
  return createHash("sha256")
    .update(`${code}:${context}:${getOtpHashSecret()}`)
    .digest("hex")
}

export function safeEqualOtpHash(candidateCode: string, context: string, expectedHash: string) {
  const candidateHash = hashOtpCode(candidateCode, context)
  if (candidateHash.length !== expectedHash.length) {
    return false
  }

  try {
    return timingSafeEqual(Buffer.from(candidateHash, "hex"), Buffer.from(expectedHash, "hex"))
  } catch {
    return false
  }
}

export function maskEmail(value: string): string {
  const email = value.trim()
  if (!email.includes("@")) {
    return "-"
  }

  const [local, domain] = email.split("@")
  if (!local || !domain) {
    return "-"
  }

  if (local.length <= 2) {
    return `${local[0] ?? "*"}***@${domain}`
  }

  return `${local[0]}${"*".repeat(Math.max(2, local.length - 2))}${local[local.length - 1]}@${domain}`
}

export function maskPhone(value: string): string {
  const compact = value.trim().replace(/[^\d+]/g, "")
  const digits = compact.replace(/\D/g, "")
  if (!digits) {
    return "-"
  }

  const countryCodeLength = digits.startsWith("1") ? 1 : 2
  const safeCountryLength = Math.min(countryCodeLength, Math.max(1, digits.length - 3))
  const countryCode = `+${digits.slice(0, safeCountryLength)}`
  const lastThree = digits.slice(-3)
  const maskedDigitsCount = Math.max(2, digits.length - safeCountryLength - 3)
  return `${countryCode}${"*".repeat(maskedDigitsCount)}${lastThree}`
}
