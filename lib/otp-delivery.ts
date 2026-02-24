import "server-only"
import { maskEmail, maskPhone } from "@/lib/otp-utils"

type OtpDeliveryInput = {
  purpose: "track_order" | "checkout_verification"
  orderId?: string
  code: string
  customerName?: string
  customerEmail?: string
  customerPhone?: string
}

type OtpDeliveryResult = {
  destination: string
  channel: "webhook" | "development"
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

export async function deliverOtpCode(input: OtpDeliveryInput): Promise<OtpDeliveryResult> {
  const destination = buildDestinationLabel(input)
  const webhookUrl = process.env.OTP_DELIVERY_WEBHOOK_URL?.trim()
  const webhookBearer = process.env.OTP_DELIVERY_WEBHOOK_BEARER?.trim()

  if (webhookUrl) {
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

