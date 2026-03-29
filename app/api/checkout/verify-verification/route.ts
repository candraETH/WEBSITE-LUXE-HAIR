import { NextResponse } from "next/server"
import { z } from "zod"
import { enforceRateLimit } from "@/lib/rate-limit"
import { isAllowedRequestOrigin } from "@/lib/security"
import {
  deleteSecurityStoreValue,
  getSecurityStoreValue,
  setSecurityStoreValue,
} from "@/lib/security-store"
import { safeEqualOtpHash } from "@/lib/otp-utils"
import { issueCheckoutVerificationTokenByFingerprint } from "@/lib/checkout-verification"

export const runtime = "nodejs"

const verifySchema = z.object({
  challengeId: z.string().trim().uuid(),
  otpCode: z.string().trim().regex(/^\d{6}$/),
})

type CheckoutOtpChallenge = {
  fingerprint: string
  otpHash: string
  attemptsLeft: number
  expiresAt: number
}

const VERIFIED_TOKEN_TTL_SECONDS = 30 * 60

export async function POST(request: Request) {
  try {
    const rateLimit = await enforceRateLimit(request, "api:checkout:verify-verification", {
      max: 16,
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
    const parsed = verifySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request payload." }, { status: 400 })
    }

    const challengeKey = `checkout-otp:${parsed.data.challengeId}`
    const challenge = await getSecurityStoreValue<CheckoutOtpChallenge>(challengeKey)
    if (!challenge) {
      return NextResponse.json({ error: "Verification code expired. Request a new one." }, { status: 400 })
    }

    if (challenge.expiresAt <= Date.now()) {
      await deleteSecurityStoreValue(challengeKey)
      return NextResponse.json({ error: "Verification code expired. Request a new one." }, { status: 400 })
    }

    const isValid = safeEqualOtpHash(parsed.data.otpCode, challenge.fingerprint, challenge.otpHash)
    if (!isValid) {
      const nextAttempts = Math.max(0, challenge.attemptsLeft - 1)
      if (nextAttempts === 0) {
        await deleteSecurityStoreValue(challengeKey)
        return NextResponse.json({ error: "Too many invalid attempts. Request a new code." }, { status: 429 })
      }

      const ttlSeconds = Math.max(1, Math.floor((challenge.expiresAt - Date.now()) / 1000))
      await setSecurityStoreValue(
        challengeKey,
        {
          ...challenge,
          attemptsLeft: nextAttempts,
        },
        ttlSeconds
      )

      return NextResponse.json({ error: "Invalid code. Please try again." }, { status: 400 })
    }

    await deleteSecurityStoreValue(challengeKey)

    const verificationToken = await issueCheckoutVerificationTokenByFingerprint(challenge.fingerprint, VERIFIED_TOKEN_TTL_SECONDS)

    return NextResponse.json({
      verificationToken,
      expiresInSeconds: VERIFIED_TOKEN_TTL_SECONDS,
    })
  } catch (error) {
    console.error("Checkout verify-verification error:", error instanceof Error ? error.message : "Unknown error")
    return NextResponse.json({ error: "Unable to verify code." }, { status: 500 })
  }
}
