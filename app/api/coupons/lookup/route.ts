import { NextResponse } from "next/server"
import { z } from "zod"
import { enforceRateLimit } from "@/lib/rate-limit"
import { isAllowedRequestOrigin } from "@/lib/security"
import { resolveCouponDefinition } from "@/lib/coupon-resolver"
import { logServerError, publicErrorMessage } from "@/lib/api-errors"

export const runtime = "nodejs"

const schema = z.object({
  code: z.string().trim().min(1).max(40),
})

export async function POST(request: Request) {
  try {
    const rateLimit = await enforceRateLimit(request, "api:coupons:lookup", { max: 60, windowMs: 10 * 60 * 1000 })
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } }
      )
    }

    if (!isAllowedRequestOrigin(request)) {
      return NextResponse.json({ error: "Forbidden origin." }, { status: 403 })
    }

    const body = await request.json().catch(() => null)
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid coupon lookup payload." }, { status: 400 })
    }

    const coupon = await resolveCouponDefinition(parsed.data.code)
    if (!coupon) {
      return NextResponse.json({ error: "Coupon not found." }, { status: 404 })
    }

    return NextResponse.json({ coupon })
  } catch (error) {
    logServerError("Coupon lookup failed:", error)
    return NextResponse.json({ error: publicErrorMessage(error, "Unable to look up coupon.") }, { status: 500 })
  }
}
