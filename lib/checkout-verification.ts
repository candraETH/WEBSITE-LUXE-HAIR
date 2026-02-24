import "server-only"
import { createHash } from "crypto"
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

function buildCheckoutFingerprint(customer: CheckoutCustomerInput): string {
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

function checkoutTokenKey(token: string) {
  return `checkout-verified:${token}`
}

export function getCheckoutFingerprint(customer: CheckoutCustomerInput) {
  return buildCheckoutFingerprint(customer)
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
  const key = checkoutTokenKey(token)
  const stored = await getSecurityStoreValue<CheckoutVerificationPayload>(key)
  if (!stored) {
    return false
  }

  const expectedFingerprint = buildCheckoutFingerprint(customer)
  const isMatch = stored.fingerprint === expectedFingerprint
  if (!isMatch) {
    return false
  }

  await deleteSecurityStoreValue(key)
  return true
}
