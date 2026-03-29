import "server-only"
import { maskEmail, maskPhone } from "@/lib/otp-utils"

type OtpDeliveryInput = {
  purpose: "track_order" | "send_invoice" | "checkout_verification"
  orderId?: string
  code: string
  customerName?: string
  customerEmail?: string
  customerPhone?: string
}

type OtpDeliveryResult = {
  destination: string
  channel: "brevo" | "webhook" | "development"
  devOtpCode?: string
}

function buildDestinationLabel(input: OtpDeliveryInput): string {
  const parts: string[] = []
  if (input.customerEmail?.trim()) {
    parts.push(maskEmail(input.customerEmail))
  }
  if (input.customerPhone?.trim()) {
    parts.push(maskPhone(input.customerPhone))
  }
  return parts.length > 0 ? parts.join(" / ") : "registered contact"
}

type BrevoConfig = {
  apiKey: string
  senderEmail: string
  senderName: string
}

function getBrevoConfig(): BrevoConfig | null {
  const apiKey = process.env.BREVO_API_KEY?.trim()
  const senderEmail = process.env.BREVO_SENDER_EMAIL?.trim()
  if (!apiKey || !senderEmail) {
    return null
  }

  const senderName = process.env.BREVO_SENDER_NAME?.trim() || "Candra's Hair"
  return { apiKey, senderEmail, senderName }
}

function buildOtpSubject(input: OtpDeliveryInput): string {
  if (input.purpose === "track_order") {
    return `Order Tracking OTP${input.orderId ? ` - ${input.orderId}` : ""}`
  }
  if (input.purpose === "send_invoice") {
    return `Invoice Verification OTP${input.orderId ? ` - ${input.orderId}` : ""}`
  }
  return "Checkout Verification OTP"
}

function buildOtpTextContent(input: OtpDeliveryInput): string {
  const intro =
    input.purpose === "track_order"
      ? "Use this OTP to verify your order tracking request."
      : input.purpose === "send_invoice"
        ? "Use this OTP to verify your invoice request."
      : "Use this OTP to verify your checkout details."
  return [
    intro,
    `OTP code: ${input.code}`,
    "This code expires in 10 minutes.",
    "If you did not request this code, ignore this email.",
  ].join("\n")
}

function buildOtpHtmlContent(input: OtpDeliveryInput): string {
  const intro =
    input.purpose === "track_order"
      ? "Use this OTP to verify your order tracking request."
      : input.purpose === "send_invoice"
        ? "Use this OTP to verify your invoice request."
      : "Use this OTP to verify your checkout details."
  return `
    <div style="font-family:Arial,Helvetica,sans-serif;line-height:1.5;color:#1f2937;">
      <h2 style="margin:0 0 12px;">Candra's Hair Verification Code</h2>
      <p style="margin:0 0 10px;">${intro}</p>
      <p style="margin:0 0 10px;">Your OTP code:</p>
      <p style="margin:0 0 14px;font-size:28px;font-weight:700;letter-spacing:4px;">${input.code}</p>
      <p style="margin:0 0 8px;color:#6b7280;">This code expires in 10 minutes.</p>
      <p style="margin:0;color:#6b7280;">If you did not request this code, ignore this email.</p>
    </div>
  `.trim()
}

async function deliverOtpViaBrevo(input: OtpDeliveryInput, destination: string): Promise<OtpDeliveryResult> {
  const brevo = getBrevoConfig()
  if (!brevo || !input.customerEmail?.trim()) {
    throw new Error("Brevo OTP delivery is not configured.")
  }

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": brevo.apiKey,
    },
    body: JSON.stringify({
      sender: {
        name: brevo.senderName,
        email: brevo.senderEmail,
      },
      to: [
        {
          email: input.customerEmail.trim(),
          name: input.customerName?.trim() || undefined,
        },
      ],
      subject: buildOtpSubject(input),
      textContent: buildOtpTextContent(input),
      htmlContent: buildOtpHtmlContent(input),
    }),
    cache: "no-store",
  })

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "")
    throw new Error(`Brevo OTP delivery failed with status ${response.status}${errorBody ? `: ${errorBody}` : ""}`)
  }

  return {
    destination,
    channel: "brevo",
  }
}

async function deliverOtpViaWebhook(input: OtpDeliveryInput, destination: string): Promise<OtpDeliveryResult> {
  const webhookUrl = process.env.OTP_DELIVERY_WEBHOOK_URL?.trim()
  const webhookBearer = process.env.OTP_DELIVERY_WEBHOOK_BEARER?.trim()
  if (!webhookUrl) {
    throw new Error("OTP delivery webhook is not configured.")
  }

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(webhookBearer ? { Authorization: `Bearer ${webhookBearer}` } : {}),
    },
    body: JSON.stringify({
      type: "otp_delivery",
      purpose: input.purpose,
      orderId: input.orderId ?? "",
      code: input.code,
      customerName: input.customerName ?? "",
      customerEmail: input.customerEmail ?? "",
      customerPhone: input.customerPhone ?? "",
    }),
    cache: "no-store",
  })

  if (!response.ok) {
    throw new Error(`OTP delivery webhook failed with status ${response.status}`)
  }

  return {
    destination,
    channel: "webhook",
  }
}

export async function deliverOtpCode(input: OtpDeliveryInput): Promise<OtpDeliveryResult> {
  const destination = buildDestinationLabel(input)
  const brevoConfig = getBrevoConfig()
  const webhookUrl = process.env.OTP_DELIVERY_WEBHOOK_URL?.trim()
  if (brevoConfig && input.customerEmail?.trim()) {
    try {
      return await deliverOtpViaBrevo(input, destination)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown"
      console.error("Brevo OTP delivery failed:", message)
      if (webhookUrl) {
        return deliverOtpViaWebhook(input, destination)
      }
      throw error
    }
  }

  if (webhookUrl) {
    return deliverOtpViaWebhook(input, destination)
  }

  if (process.env.NODE_ENV !== "production") {
    console.log(
      `[OTP_DEV] purpose=${input.purpose} order=${input.orderId ?? "-"} code=${input.code} destination=${destination}`
    )

    return {
      destination,
      channel: "development",
      devOtpCode: input.code,
    }
  }

  throw new Error("OTP delivery provider is not configured.")
}
