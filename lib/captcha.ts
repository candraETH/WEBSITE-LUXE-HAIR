import "server-only"

const HCAPTCHA_VERIFY_URL = "https://hcaptcha.com/siteverify"

export type CaptchaAction = "login" | "register"

export type CaptchaVerifyResult = {
  success: boolean
  error: string | null
}

function getHCaptchaSecret() {
  return process.env.HCAPTCHA_SECRET_KEY?.trim() ?? process.env.HCAPTCHA_SECRET?.trim() ?? ""
}

function extractClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for")
  if (forwardedFor) {
    const firstIp = forwardedFor.split(",")[0]?.trim()
    if (firstIp) {
      return firstIp
    }
  }

  const realIp = request.headers.get("x-real-ip")
  if (realIp) {
    return realIp.trim()
  }

  return ""
}

export async function verifyCaptchaToken(
  request: Request,
  token: string,
  expectedAction?: CaptchaAction
): Promise<CaptchaVerifyResult> {
  const secret = getHCaptchaSecret()
  if (!secret) {
    if (process.env.NODE_ENV !== "production") {
      return { success: true, error: null }
    }

    return { success: false, error: "CAPTCHA is not configured." }
  }

  const form = new FormData()
  form.set("secret", secret)
  form.set("response", token)

  const clientIp = extractClientIp(request)
  if (clientIp) {
    form.set("remoteip", clientIp)
  }

  const response = await fetch(HCAPTCHA_VERIFY_URL, {
    method: "POST",
    body: form,
    cache: "no-store",
  })

  if (!response.ok) {
    return { success: false, error: "Unable to verify CAPTCHA." }
  }

  const payload = (await response.json().catch(() => null)) as
    | {
        success?: boolean
        action?: string
        hostname?: string
        challenge_ts?: string
        "error-codes"?: string[]
      }
    | null

  if (!payload?.success) {
    return { success: false, error: "CAPTCHA verification failed." }
  }

  if (expectedAction && payload.action && payload.action !== expectedAction) {
    return { success: false, error: "CAPTCHA action mismatch." }
  }

  return { success: true, error: null }
}
