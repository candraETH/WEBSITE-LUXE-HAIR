import { NextResponse } from "next/server"
import { z } from "zod"
import { enforceRateLimit } from "@/lib/rate-limit"
import { isAllowedRequestOrigin } from "@/lib/security"
import { checkoutCustomerSchema, normalizeCheckoutCustomer } from "@/lib/checkout-customer"
import { deliverOtpCode } from "@/lib/otp-delivery"
import { generateOtpCode, hashOtpCode, maskEmail, maskPhone } from "@/lib/otp-utils"
import { setSecurityStoreValue } from "@/lib/security-store"
import { getCheckoutFingerprint } from "@/lib/checkout-verification"

export const runtime = "nodejs"

const requestVerificationSchema = z.object({
  customer: checkoutCustomerSchema,
})

type CheckoutOtpChallenge = {
  fingerprint: string
  otpHash: string
  attemptsLeft: number
  expiresAt: number
}

const OTP_TTL_SECONDS = 10 * 60

export async function POST(request: Request) {
  try {
    const rateLimit = await enforceRateLimit(request, "api:checkout:request-verification", {
      max: 8,
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
    const parsed = requestVerificationSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request payload." }, { status: 400 })
    }

    const customer = normalizeCheckoutCustomer(parsed.data.customer)
    const otpCode = generateOtpCode()
    const challengeId = crypto.randomUUID()
    const fingerprint = getCheckoutFingerprint(customer)
    const otpHash = hashOtpCode(otpCode, fingerprint)

    const challengePayload: CheckoutOtpChallenge = {
      fingerprint,
      otpHash,
      attemptsLeft: 5,
      expiresAt: Date.now() + OTP_TTL_SECONDS * 1000,
    }

    await setSecurityStoreValue(`checkout-otp:${challengeId}`, challengePayload, OTP_TTL_SECONDS)

    const delivery = await deliverOtpCode({
      purpose: "checkout_verification",
      code: otpCode,
      customerName: customer.fullName,
      customerEmail: customer.email,
      customerPhone: customer.whatsapp,
    })

    return NextResponse.json({
      challengeId,
      expiresInSeconds: OTP_TTL_SECONDS,
      destination: `${maskEmail(customer.email)} / ${maskPhone(customer.whatsapp)}`,
      channel: delivery.channel,
      devOtpCode: delivery.devOtpCode,
    })
  } catch (error) {
    console.error("Checkout request-verification error:", error instanceof Error ? error.message : "Unknown error")
    return NextResponse.json({ error: "Unable to send verification code." }, { status: 500 })
  }
}

