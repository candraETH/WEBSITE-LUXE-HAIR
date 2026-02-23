import { NextResponse } from "next/server"
import { z } from "zod"
import { PayPalHttpError, paypalRequest } from "@/lib/paypal/client"
import { getPayPalOrder, updatePayPalOrderStatus } from "@/lib/paypal/order-store"

export const runtime = "nodejs"

type CaptureOrderResponse = {
  id: string
  status: string
}

const captureSchema = z.object({
  orderId: z.string().trim().min(1),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = captureSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid order capture payload." }, { status: 400 })
    }

    const { orderId } = parsed.data
    const stored = getPayPalOrder(orderId)
    if (!stored) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 })
    }

    if (stored.status === "PAID") {
      return NextResponse.json({
        orderId,
        status: "PAID",
        message: "Order already confirmed.",
      })
    }

    updatePayPalOrderStatus(orderId, "CAPTURE_REQUESTED")

    const capture = await paypalRequest<CaptureOrderResponse>(`/v2/checkout/orders/${orderId}/capture`, {
      method: "POST",
      body: JSON.stringify({}),
    })

    updatePayPalOrderStatus(orderId, "CAPTURED_PENDING_WEBHOOK")

    return NextResponse.json({
      orderId: capture.id,
      paypalStatus: capture.status,
      status: "CAPTURED_PENDING_WEBHOOK",
      message: "Capture submitted. Waiting for verified webhook confirmation.",
    })
  } catch (error) {
    if (error instanceof PayPalHttpError) {
      console.error("PayPal capture-order failed:", error.status, error.message)
      return NextResponse.json({ error: "Failed to capture PayPal order." }, { status: 502 })
    }

    console.error("Capture-order error:", error instanceof Error ? error.message : "Unknown error")
    return NextResponse.json({ error: "Unable to capture order." }, { status: 500 })
  }
}

