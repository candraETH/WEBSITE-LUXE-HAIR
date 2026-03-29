import { NextResponse } from "next/server"
import { z } from "zod"
import { enforceRateLimit } from "@/lib/rate-limit"
import { isAllowedRequestOrigin } from "@/lib/security"
import { safeEqualOtpHash } from "@/lib/otp-utils"
import {
  deleteOrderOtpChallenge,
  issueOrderOtpSession,
  getOrderOtpChallenge,
  ORDER_OTP_SESSION_TTL_SECONDS,
  getOrderOtpChallengeKey,
} from "@/lib/order-otp"
import { setSecurityStoreValue } from "@/lib/security-store"

export const runtime = "nodejs"

const verifyOtpSchema = z.object({
  challengeId: z.string().trim().uuid(),
  otpCode: z.string().trim().regex(/^\d{6}$/),
})

export async function POST(request: Request) {
  try {
    const rateLimit = await enforceRateLimit(request, "api:order-tracking:verify-otp", {
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
    const parsed = verifyOtpSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request payload." }, { status: 400 })
    }

    const challenge = await getOrderOtpChallenge(parsed.data.challengeId)
    if (!challenge) {
      return NextResponse.json({ error: "OTP expired. Request a new one." }, { status: 400 })
    }

    if (challenge.expiresAt <= Date.now()) {
      await deleteOrderOtpChallenge(parsed.data.challengeId)
      return NextResponse.json({ error: "OTP expired. Request a new one." }, { status: 400 })
    }

    const context = `${challenge.orderId}|${challenge.phoneNumber}`
    const isValid = safeEqualOtpHash(parsed.data.otpCode, context, challenge.otpHash)

    if (!isValid) {
      const nextAttempts = Math.max(0, challenge.attemptsLeft - 1)
      if (nextAttempts === 0) {
        await deleteOrderOtpChallenge(parsed.data.challengeId)
        return NextResponse.json({ error: "Too many invalid attempts. Request a new code." }, { status: 429 })
      }

      const ttlSeconds = Math.max(1, Math.floor((challenge.expiresAt - Date.now()) / 1000))
      await setSecurityStoreValue(
        getOrderOtpChallengeKey(parsed.data.challengeId),
        {
          ...challenge,
          attemptsLeft: nextAttempts,
        },
        ttlSeconds
      )

      return NextResponse.json({ error: "Invalid OTP. Please try again." }, { status: 400 })
    }

    await deleteOrderOtpChallenge(parsed.data.challengeId)

    const sessionToken = await issueOrderOtpSession(
      {
        orderId: challenge.orderId,
        phoneNumber: challenge.phoneNumber,
        purpose: challenge.purpose,
        issuedAt: Date.now(),
      }
    )

    return NextResponse.json({
      sessionToken,
      expiresInSeconds: ORDER_OTP_SESSION_TTL_SECONDS,
      purpose: challenge.purpose,
    })
  } catch (error) {
    console.error("Order-tracking verify-otp error:", error instanceof Error ? error.message : "Unknown error")
    return NextResponse.json({ error: "Unable to verify OTP." }, { status: 500 })
  }
}
