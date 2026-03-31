import { NextResponse } from "next/server"
import { z } from "zod"
import { enforceRateLimit } from "@/lib/rate-limit"
import { isAllowedRequestOrigin } from "@/lib/security"
import { verifyCaptchaToken } from "@/lib/captcha"

export const runtime = "nodejs"

const captchaVerifySchema = z.object({
  token: z.string().trim().min(1).max(2000),
  action: z.enum(["login", "register"]).optional(),
})

export async function POST(request: Request) {
  try {
    const rateLimit = await enforceRateLimit(request, "api:captcha:verify", {
      max: 20,
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
    const parsed = captchaVerifySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request payload." }, { status: 400 })
    }

    const result = await verifyCaptchaToken(request, parsed.data.token, parsed.data.action)
    if (!result.success) {
      return NextResponse.json({ error: result.error ?? "CAPTCHA verification failed." }, { status: 400 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("CAPTCHA verify error:", error instanceof Error ? error.message : "Unknown error")
    return NextResponse.json({ error: "Unable to verify CAPTCHA." }, { status: 500 })
  }
}
