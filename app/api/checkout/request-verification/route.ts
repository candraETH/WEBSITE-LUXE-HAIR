import { NextResponse } from "next/server"
import { z } from "zod"
import { enforceRateLimit } from "@/lib/rate-limit"
import { isAllowedRequestOrigin } from "@/lib/security"
import { checkoutCustomerSchema, normalizeCheckoutCustomer } from "@/lib/checkout-customer"
import { deliverOtpCode } from "@/lib/otp-delivery"
import { generateOtpCode, hashOtpCode, maskEmail } from "@/lib/otp-utils"
import { setSecurityStoreValue } from "@/lib/security-store"
import { getCheckoutFingerprint } from "@/lib/checkout-verification"
import { supabase } from "@/lib/supabase-server"

export const runtime = "nodejs"

const requestVerificationSchema = z.object({
  customer: checkoutCustomerSchema,
})

type CheckoutOtpChallenge = {
  userId: string
  email: string
  fingerprint: string
  otpHash: string
  attemptsLeft: number
  expiresAt: number
}

const OTP_TTL_SECONDS = 10 * 60

function mapOtpErrorToMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : ""
  const message = raw.toLowerCase()

  if (message.includes("brevo otp delivery failed with status 401") || message.includes("status 403")) {
    return "OTP email authentication failed. Please contact support."
  }
  if (message.includes("sender")) {
    return "OTP sender email is not verified. Please contact support."
  }
  if (message.includes("not configured")) {
    return "OTP delivery is not configured."
  }

  return "Unable to send verification code."
}

function getBearerToken(request: Request): string | null {
  const header = request.headers.get("authorization") ?? ""
  if (!header.toLowerCase().startsWith("bearer ")) {
    return null
  }

  const token = header.slice(7).trim()
  return token || null
}

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

    const token = getBearerToken(request)
    if (!token) {
      return NextResponse.json({ error: "You must be signed in to request a verification code." }, { status: 401 })
    }

    const { data: userData, error: userError } = await supabase.auth.getUser(token)
    const authedUser = userData.user ?? null
    const authedEmail = authedUser?.email?.trim().toLowerCase() ?? ""
    if (userError || !authedUser || !authedEmail) {
      return NextResponse.json({ error: "Your session expired. Please sign in again." }, { status: 401 })
    }

    const body = await request.json()
    const parsed = requestVerificationSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request payload." }, { status: 400 })
    }

    const customer = normalizeCheckoutCustomer(parsed.data.customer)
    if (customer.email !== authedEmail) {
      return NextResponse.json({ error: "Verification requests must use the signed-in account email." }, { status: 403 })
    }

    const otpCode = generateOtpCode()
    const challengeId = crypto.randomUUID()
    const fingerprint = getCheckoutFingerprint(customer)
    const otpHash = hashOtpCode(otpCode, fingerprint)

    const challengePayload: CheckoutOtpChallenge = {
      userId: authedUser.id,
      email: authedEmail,
      fingerprint,
      otpHash,
      attemptsLeft: 3,
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
      destination: maskEmail(customer.email),
      channel: delivery.channel,
      devOtpCode: delivery.devOtpCode,
    })
  } catch (error) {
    console.error("Checkout request-verification error:", error instanceof Error ? error.message : "Unknown error")
    return NextResponse.json({ error: mapOtpErrorToMessage(error) }, { status: 500 })
  }
}
