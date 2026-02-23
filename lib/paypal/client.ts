import "server-only"

type PayPalAccessTokenResponse = {
  access_token: string
}

export class PayPalHttpError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message)
    this.name = "PayPalHttpError"
  }
}

function getPayPalEnv() {
  const clientId = process.env.PAYPAL_CLIENT_ID
  const secret = process.env.PAYPAL_SECRET

  if (!clientId || !secret) {
    throw new Error("PayPal environment variables are not configured")
  }

  return { clientId, secret }
}

export function getPayPalApiBaseUrl() {
  return process.env.NODE_ENV === "production"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com"
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as { message?: string; error_description?: string; name?: string }
    if (typeof data.message === "string" && data.message.trim()) {
      return data.message
    }
    if (typeof data.error_description === "string" && data.error_description.trim()) {
      return data.error_description
    }
    if (typeof data.name === "string" && data.name.trim()) {
      return data.name
    }
  } catch {
    // ignore parse errors for safe fallback
  }
  return "Request to PayPal failed"
}

export async function getPayPalAccessToken(): Promise<string> {
  const { clientId, secret } = getPayPalEnv()
  const credentials = Buffer.from(`${clientId}:${secret}`).toString("base64")

  const response = await fetch(`${getPayPalApiBaseUrl()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  })

  if (!response.ok) {
    throw new PayPalHttpError(response.status, await readErrorMessage(response))
  }

  const data = (await response.json()) as PayPalAccessTokenResponse
  if (!data.access_token) {
    throw new Error("PayPal access token response is invalid")
  }

  return data.access_token
}

export async function paypalRequest<T>(
  path: string,
  init: Omit<RequestInit, "headers"> & { headers?: Record<string, string> } = {}
): Promise<T> {
  const accessToken = await getPayPalAccessToken()
  const response = await fetch(`${getPayPalApiBaseUrl()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
    cache: "no-store",
  })

  if (!response.ok) {
    throw new PayPalHttpError(response.status, await readErrorMessage(response))
  }

  return (await response.json()) as T
}

export async function verifyWebhookSignature(payload: unknown, headers: Headers) {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID ?? process.env.PAYPAL_WEBHOOK_SECRET
  if (!webhookId) {
    throw new Error("PAYPAL_WEBHOOK_ID is not configured")
  }

  const transmissionId = headers.get("paypal-transmission-id")
  const transmissionTime = headers.get("paypal-transmission-time")
  const certUrl = headers.get("paypal-cert-url")
  const authAlgo = headers.get("paypal-auth-algo")
  const transmissionSig = headers.get("paypal-transmission-sig")

  if (!transmissionId || !transmissionTime || !certUrl || !authAlgo || !transmissionSig) {
    return false
  }

  const verification = await paypalRequest<{ verification_status?: string }>(
    "/v1/notifications/verify-webhook-signature",
    {
      method: "POST",
      body: JSON.stringify({
        transmission_id: transmissionId,
        transmission_time: transmissionTime,
        cert_url: certUrl,
        auth_algo: authAlgo,
        transmission_sig: transmissionSig,
        webhook_id: webhookId,
        webhook_event: payload,
      }),
    }
  )

  return verification.verification_status === "SUCCESS"
}
