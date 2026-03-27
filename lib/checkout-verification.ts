import "server-only"
import { createHash, createHmac, randomUUID, timingSafeEqual } from "crypto"
import { CheckoutCustomerInput, normalizeCheckoutCustomer } from "@/lib/checkout-customer"
import {
  deleteSecurityStoreValue,
  getSecurityStoreValue,
  setSecurityStoreValue,
} from "@/lib/security-store"

type CheckoutVerificationPayload = {
  fingerprint: string
  verifiedAt: number
}

type SignedVerificationPayloadV1 = {
  v: 1
  fp: string
  exp: number
}

function buildCheckoutFingerprintV1(customer: CheckoutCustomerInput): string {
  const normalized = normalizeCheckoutCustomer(customer)
  const payload = [
    normalized.fullName,
    normalized.email,
    normalized.whatsapp,
    normalized.addressLine,
    normalized.city,
    normalized.province,
    normalized.postalCode,
    normalized.country,
  ].join("|")

  return createHash("sha256").update(payload).digest("hex")
}

function buildCheckoutFingerprintV2(customer: CheckoutCustomerInput): string {
  const normalized = normalizeCheckoutCustomer(customer)
  const payload = JSON.stringify([
    normalized.fullName,
    normalized.email,
    normalized.whatsapp,
    normalized.addressLine,
    normalized.city,
    normalized.province,
    normalized.postalCode,
    normalized.country,
  ])

  return createHash("sha256").update(payload).digest("hex")
}

function buildCheckoutFingerprint(customer: CheckoutCustomerInput): string {
  return buildCheckoutFingerprintV2(customer)
}

function checkoutTokenKey(token: string) {
  return `checkout-verified:${token}`
}

export function getCheckoutFingerprint(customer: CheckoutCustomerInput) {
  return buildCheckoutFingerprint(customer)
}

function getCheckoutVerificationSecret() {
  const configured = process.env.CHECKOUT_VERIFICATION_SECRET?.trim() || process.env.OTP_HASH_SECRET?.trim()
  if (configured) {
    return configured
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("CHECKOUT_VERIFICATION_SECRET is not configured.")
  }

  return "development-only-checkout-verification-secret"
}

function isUpstashConfigured() {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim()
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim()
  return Boolean(url && token)
}

function base64UrlEncode(input: string) {
  return Buffer.from(input, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "")
}

function base64UrlDecode(input: string) {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((input.length + 3) % 4)
  return Buffer.from(padded, "base64").toString("utf8")
}

function signPayloadBase64(payloadBase64: string) {
  return createHmac("sha256", getCheckoutVerificationSecret()).update(payloadBase64).digest("base64url")
}

function safeEqualBase64Url(a: string, b: string) {
  if (!a || !b) return false
  try {
    const bufA = Buffer.from(a)
    const bufB = Buffer.from(b)
    if (bufA.length !== bufB.length) {
      return false
    }
    return timingSafeEqual(bufA, bufB)
  } catch {
    return false
  }
}

function issueSignedTokenByFingerprint(fingerprint: string, ttlSeconds: number) {
  const safeTtlMs = Math.max(1, Math.floor(ttlSeconds)) * 1000
  const payload: SignedVerificationPayloadV1 = {
    v: 1,
    fp: fingerprint,
    exp: Date.now() + safeTtlMs,
  }

  const payloadBase64 = base64UrlEncode(JSON.stringify(payload))
  const signature = signPayloadBase64(payloadBase64)
  return `${payloadBase64}.${signature}`
}

function verifySignedToken(token: string, customer: CheckoutCustomerInput) {
  const parts = token.split(".")
  if (parts.length !== 2) {
    return false
  }

  const [payloadPart, signaturePart] = parts
  if (!payloadPart || !signaturePart) {
    return false
  }

  const expectedSignature = signPayloadBase64(payloadPart)
  if (!safeEqualBase64Url(signaturePart, expectedSignature)) {
    return false
  }

  let payload: SignedVerificationPayloadV1 | null = null
  try {
    payload = JSON.parse(base64UrlDecode(payloadPart)) as SignedVerificationPayloadV1
  } catch {
    payload = null
  }

  if (!payload || payload.v !== 1 || typeof payload.fp !== "string" || typeof payload.exp !== "number") {
    return false
  }

  if (payload.exp <= Date.now()) {
    return false
  }

  const expectedFingerprintV2 = buildCheckoutFingerprintV2(customer)
  if (payload.fp === expectedFingerprintV2) {
    return true
  }

  const expectedFingerprintV1 = buildCheckoutFingerprintV1(customer)
  return payload.fp === expectedFingerprintV1
}

export async function storeCheckoutVerificationToken(
  token: string,
  customer: CheckoutCustomerInput,
  ttlSeconds: number
) {
  await storeCheckoutVerificationTokenByFingerprint(token, buildCheckoutFingerprint(customer), ttlSeconds)
}

export async function storeCheckoutVerificationTokenByFingerprint(
  token: string,
  fingerprint: string,
  ttlSeconds: number
) {
  const payload: CheckoutVerificationPayload = {
    fingerprint,
    verifiedAt: Date.now(),
  }
  await setSecurityStoreValue(checkoutTokenKey(token), payload, ttlSeconds)
}

export async function consumeCheckoutVerificationToken(token: string, customer: CheckoutCustomerInput) {
  if (!isUpstashConfigured()) {
    return verifySignedToken(token, customer)
  }

  const key = checkoutTokenKey(token)
  const stored = await getSecurityStoreValue<CheckoutVerificationPayload>(key)
  if (!stored) {
    return false
  }

  const expectedFingerprintV2 = buildCheckoutFingerprintV2(customer)
  const isMatch = stored.fingerprint === expectedFingerprintV2 || stored.fingerprint === buildCheckoutFingerprintV1(customer)
  if (!isMatch) {
    return false
  }

  await deleteSecurityStoreValue(key)
  return true
}

export async function issueCheckoutVerificationTokenByFingerprint(fingerprint: string, ttlSeconds: number) {
  if (!isUpstashConfigured()) {
    return issueSignedTokenByFingerprint(fingerprint, ttlSeconds)
  }

  const token = randomUUID().replace(/-/g, "") + randomUUID().replace(/-/g, "")
  await storeCheckoutVerificationTokenByFingerprint(token, fingerprint, ttlSeconds)
  return token
}
