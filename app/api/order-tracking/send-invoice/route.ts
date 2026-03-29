import { NextResponse } from "next/server"
import { z } from "zod"
import { hasSupabaseEnv } from "@/lib/supabase-server"
import { enforceRateLimit } from "@/lib/rate-limit"
import { isAllowedRequestOrigin } from "@/lib/security"
import { extractEmailFromCartJson, extractPhoneFromCartJson, queryOrderByOrderAndPhone } from "@/lib/order-lookup"
import { deleteOrderOtpSession, getOrderOtpSession } from "@/lib/order-otp"
import { getSiteUrl } from "@/lib/seo"

export const runtime = "nodejs"

const sendInvoiceSchema = z.object({
  sessionToken: z.string().trim().min(20).max(200),
})

type OrderRow = {
  paypal_order_id?: string | null
  status?: string | null
  amount?: number | null
  currency?: string | null
  customer_name?: string | null
  customer_email?: string | null
  cart_json?: unknown
}

type CartJsonItem = {
  name?: unknown
  length?: unknown
  category?: unknown
  quantity?: unknown
  unit_price?: unknown
  line_total?: unknown
}

type CartJsonRoot = {
  order?: {
    created_at?: unknown
  }
  customer?: {
    name?: unknown
    email?: unknown
    phone_number?: unknown
    address_line?: unknown
    city?: unknown
    province?: unknown
    postal_code?: unknown
    country?: unknown
  }
  summary?: {
    subtotal?: unknown
    tax?: unknown
    shipping?: unknown
    total?: unknown
  }
  items?: unknown
}

const ORDER_SELECT = "paypal_order_id,status,amount,currency,customer_name,customer_email,cart_json"

function asNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value
  }

  if (typeof value === "string") {
    const parsed = Number.parseFloat(value)
    if (Number.isFinite(parsed)) {
      return parsed
    }
  }

  return 0
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

function maskEmail(value: string): string {
  const email = value.trim()
  if (!email.includes("@")) {
    return "-"
  }

  const [local, domain] = email.split("@")
  if (!local || !domain) {
    return "-"
  }

  if (local.length <= 2) {
    return `${local[0] ?? "*"}***@${domain}`
  }

  return `${local[0]}${"*".repeat(Math.max(2, local.length - 2))}${local[local.length - 1]}@${domain}`
}

function formatCurrency(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(value)
  } catch {
    return `${currency} ${value.toFixed(2)}`
  }
}

function parseDate(value: string): Date | null {
  if (!value) {
    return null
  }

  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(value)
}

function getCartJsonRoot(value: unknown): CartJsonRoot {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {}
  }

  return value as CartJsonRoot
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

function buildReceiptNumber(orderRef: string): string {
  const compact = orderRef.replace(/[^A-Z0-9]/gi, "").toUpperCase()
  const suffix = compact.slice(-6) || "000001"
  return `RCT-${suffix}`
}

function getCompanyWebsite(request: Request): string {
  const configured = process.env.INVOICE_COMPANY_WEBSITE?.trim()
  if (configured) {
    return configured
  }

  try {
    return new URL(request.url).origin
  } catch {
    return getSiteUrl()
  }
}

function buildInvoiceLines(root: CartJsonRoot, currency: string, taxLabel: string) {
  const itemsSource = Array.isArray(root.items) ? root.items : []
  const items = itemsSource.filter((item): item is CartJsonItem => Boolean(item && typeof item === "object"))

  if (items.length === 0) {
    return {
      text: ["- Item details unavailable"],
      html: ["<tr><td colspan=\"5\" style=\"padding:12px;color:#6b7280;\">Item details unavailable</td></tr>"],
    }
  }

  const text = items.map((item) => {
    const name = asString(item.name) || "Item"
    const quantity = Math.max(1, Math.floor(asNumber(item.quantity) || 1))
    const unitPrice = asNumber(item.unit_price)
    const amount = asNumber(item.line_total)
    const length = asNumber(item.length)
    const category = asString(item.category) || "-"
    const lengthLabel = length > 0 ? `${length}"` : "-"
    return `- ${name} (${lengthLabel} | ${category}) | Qty ${quantity} | Unit ${formatCurrency(unitPrice, currency)} | Tax ${taxLabel} | Amount ${formatCurrency(amount, currency)}`
  })

  const html = items.map((item) => {
    const name = escapeHtml(asString(item.name) || "Item")
    const quantity = Math.max(1, Math.floor(asNumber(item.quantity) || 1))
    const unitPrice = escapeHtml(formatCurrency(asNumber(item.unit_price), currency))
    const amount = escapeHtml(formatCurrency(asNumber(item.line_total), currency))
    const length = asNumber(item.length)
    const category = asString(item.category) || "-"
    const detailParts = [
      length > 0 ? `${length}"` : "",
      category !== "-" ? category : "",
    ].filter(Boolean)
    const details = detailParts.length > 0 ? ` (${escapeHtml(detailParts.join(" | "))})` : ""

    return `<tr>
      <td style="padding:11px 10px;border-bottom:1px solid #e5e7eb;color:#111827;">${name}${details}</td>
      <td style="padding:11px 10px;border-bottom:1px solid #e5e7eb;text-align:center;color:#111827;">${quantity}</td>
      <td style="padding:11px 10px;border-bottom:1px solid #e5e7eb;text-align:right;color:#111827;">${unitPrice}</td>
      <td style="padding:11px 10px;border-bottom:1px solid #e5e7eb;text-align:center;color:#111827;">${escapeHtml(taxLabel)}</td>
      <td style="padding:11px 10px;border-bottom:1px solid #e5e7eb;text-align:right;color:#111827;font-weight:600;">${amount}</td>
    </tr>`
  })

  return { text, html }
}

function buildSummary(root: CartJsonRoot, fallbackAmount: number) {
  const summary = root.summary ?? {}
  const subtotal = asNumber(summary.subtotal)
  const tax = asNumber(summary.tax)
  const shipping = asNumber(summary.shipping)
  const total = asNumber(summary.total) || fallbackAmount
  return { subtotal, tax, shipping, total }
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

  return {
    apiKey,
    senderEmail,
    senderName: process.env.BREVO_SENDER_NAME?.trim() || "Candra's Hair",
  }
}

export async function POST(request: Request) {
  try {
    const rateLimit = await enforceRateLimit(request, "api:order-tracking:send-invoice", {
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

    if (!hasSupabaseEnv) {
      return NextResponse.json({ error: "Supabase environment variables are not configured." }, { status: 500 })
    }

    const body = await request.json()
    const parsed = sendInvoiceSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request payload." }, { status: 400 })
    }

    const session = await getOrderOtpSession(parsed.data.sessionToken)
    if (!session) {
      return NextResponse.json({ error: "Receipt session expired. Request a new verification code." }, { status: 401 })
    }

    if (session.purpose !== "send_invoice") {
      return NextResponse.json({ error: "Invalid receipt session." }, { status: 403 })
    }

    const { data, error } = await queryOrderByOrderAndPhone<OrderRow>(session.orderId, session.phoneNumber, ORDER_SELECT)
    if (error) {
      console.error("Order-tracking send-invoice query failed:", error, `order=${session.orderId}`)
      return NextResponse.json({ error: "Unable to read order data." }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: "Order not found for the provided details." }, { status: 404 })
    }

    const customerEmail = (data.customer_email ?? extractEmailFromCartJson(data.cart_json) ?? "").trim()
    if (!customerEmail) {
      return NextResponse.json({ error: "No email is available for this order." }, { status: 400 })
    }

    const brevo = getBrevoConfig()
    if (!brevo) {
      if (process.env.NODE_ENV !== "production") {
        console.log(`[INVOICE_DEV] order=${session.orderId} to=${customerEmail}`)
        await deleteOrderOtpSession(parsed.data.sessionToken)
        return NextResponse.json({
          message: "Receipt prepared (development mode).",
          destination: maskEmail(customerEmail),
        })
      }
      return NextResponse.json({ error: "Receipt email delivery is not configured." }, { status: 500 })
    }

    const root = getCartJsonRoot(data.cart_json)
    const orderRef = asString(data.paypal_order_id) || session.orderId
    const customerName = asString(data.customer_name) || asString(root.customer?.name) || "Customer"
    const customerPhone = asString(root.customer?.phone_number) || extractPhoneFromCartJson(data.cart_json) || "-"
    const customerAddress = [
      asString(root.customer?.address_line),
      asString(root.customer?.city),
      asString(root.customer?.province),
      asString(root.customer?.postal_code),
      asString(root.customer?.country),
    ]
      .filter(Boolean)
      .join(", ")

    const currency = asString(data.currency) || "USD"
    const status = asString(data.status).toUpperCase() || "UNKNOWN"
    const summary = buildSummary(root, asNumber(data.amount))
    const taxRatePercent = summary.subtotal > 0 && summary.tax > 0 ? (summary.tax / summary.subtotal) * 100 : 0
    const taxLabel = taxRatePercent > 0 ? `${taxRatePercent.toFixed(1)}%` : "-"
    const lines = buildInvoiceLines(root, currency, taxLabel)

    const receiptNumber = buildReceiptNumber(orderRef)
    const createdAt = parseDate(asString(root.order?.created_at)) ?? new Date()
    const receiptDateLabel = formatDate(createdAt)
    const paidAmount = status === "PAID" ? summary.total : 0
    const balanceDue = Math.max(summary.total - paidAmount, 0)
    const isPaidInFull = status === "PAID" && balanceDue <= 0.01
    const paymentBadgeLabel = isPaidInFull ? "PAID IN FULL" : "PAYMENT PENDING"
    const paymentBadgeBackground = isPaidInFull ? "#166534" : "#9a3412"
    const balanceLabel = isPaidInFull ? "PAYMENT RECEIVED" : "BALANCE DUE"
    const balanceBarBackground = isPaidInFull ? "#166534" : "#111827"

    const companyName = process.env.INVOICE_COMPANY_NAME?.trim() || brevo.senderName || "Candra's Hair"
    const companyPhone = process.env.INVOICE_COMPANY_PHONE?.trim() || "+6289-7890-5657"
    const companyAddress = process.env.INVOICE_COMPANY_ADDRESS?.trim() || "Indonesia"
    const companyWebsite = getCompanyWebsite(request)
    const companyEmail = brevo.senderEmail

    const textContent = [
      `${companyName} - RECEIPT`,
      "",
      `Receipt Number: ${receiptNumber}`,
      `Receipt Date: ${receiptDateLabel}`,
      `Order ID: ${orderRef}`,
      `Status: ${status}`,
      `Payment Badge: ${paymentBadgeLabel}`,
      "",
      "Address Details:",
      `${customerName}`,
      `${customerAddress || "-"}`,
      `${customerPhone}`,
      `${customerEmail}`,
      "",
      "Items:",
      ...lines.text,
      "",
      `Subtotal: ${formatCurrency(summary.subtotal, currency)}`,
      `Tax: ${formatCurrency(summary.tax, currency)}`,
      `Shipping: ${formatCurrency(summary.shipping, currency)}`,
      `Total: ${formatCurrency(summary.total, currency)}`,
      `Paid: ${formatCurrency(paidAmount, currency)}`,
      `Balance Due: ${formatCurrency(balanceDue, currency)}`,
      "",
      `Need help with this receipt? Chat with us on WhatsApp at ${companyPhone}.`,
      `Contact: ${companyEmail} | ${companyPhone}`,
      `Website: ${companyWebsite}`,
    ].join("\n")

    const htmlContent = `
      <div style="margin:0;padding:20px;background:#f3f4f6;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:800px;margin:0 auto;background:#ffffff;border:1px solid #d1d5db;border-collapse:collapse;">
          <tr>
            <td style="padding:0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                <tr>
                  <td style="padding:22px 28px;background:#f8fafc;border-bottom:4px solid #0e7c3a;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                      <tr>
                        <td style="vertical-align:top;">
                          <p style="margin:0;font-size:12px;letter-spacing:1.7px;color:#6b7280;font-weight:700;">${escapeHtml(companyName.toUpperCase())}</p>
                          <h1 style="margin:9px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:40px;line-height:1;color:#111827;">Receipt</h1>
                        </td>
                        <td style="text-align:right;vertical-align:top;">
                          <p style="margin:0;color:#111827;font-size:13px;"><strong>Number:</strong> ${escapeHtml(receiptNumber)}</p>
                          <p style="margin:4px 0 0;color:#111827;font-size:13px;"><strong>Date:</strong> ${escapeHtml(receiptDateLabel)}</p>
                          <p style="margin:4px 0 0;color:#111827;font-size:13px;"><strong>Order ID:</strong> ${escapeHtml(orderRef)}</p>
                          <p style="margin:10px 0 0;">
                            <span style="display:inline-block;padding:6px 11px;border-radius:999px;background:${paymentBadgeBackground};color:#ffffff;font-size:11px;font-weight:800;letter-spacing:0.8px;">
                              ${escapeHtml(paymentBadgeLabel)}
                            </span>
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:20px 28px 12px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                      <tr>
                        <td style="width:60%;vertical-align:top;padding-right:18px;">
                          <p style="margin:0 0 7px;font-size:12px;letter-spacing:1px;color:#6b7280;font-weight:700;">Address Details</p>
                          <p style="margin:0;color:#111827;font-size:14px;font-weight:700;">${escapeHtml(customerName)}</p>
                          <p style="margin:4px 0 0;color:#374151;font-size:13px;line-height:1.5;">${escapeHtml(customerAddress || "-")}</p>
                          <p style="margin:4px 0 0;color:#374151;font-size:13px;">${escapeHtml(customerPhone || "-")}</p>
                          <p style="margin:4px 0 0;color:#374151;font-size:13px;">${escapeHtml(customerEmail)}</p>
                        </td>
                        <td style="width:40%;vertical-align:top;">
                          <p style="margin:0 0 7px;font-size:12px;letter-spacing:1px;color:#6b7280;font-weight:700;">From</p>
                          <p style="margin:0;color:#111827;font-size:14px;font-weight:700;">${escapeHtml(companyName)}</p>
                          <p style="margin:4px 0 0;color:#374151;font-size:13px;line-height:1.5;">${escapeHtml(companyAddress)}</p>
                          <p style="margin:4px 0 0;color:#374151;font-size:13px;">${escapeHtml(companyPhone)}</p>
                          <p style="margin:4px 0 0;color:#374151;font-size:13px;">${escapeHtml(companyEmail)}</p>
                          <p style="margin:4px 0 0;color:#374151;font-size:13px;">${escapeHtml(companyWebsite)}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 28px 0;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                      <thead>
                        <tr style="background:#0e7c3a;">
                          <th style="padding:11px 10px;text-align:left;color:#ffffff;font-size:13px;">Description</th>
                          <th style="padding:11px 10px;text-align:center;color:#ffffff;font-size:13px;">Quantity</th>
                          <th style="padding:11px 10px;text-align:right;color:#ffffff;font-size:13px;">Unit Price</th>
                          <th style="padding:11px 10px;text-align:center;color:#ffffff;font-size:13px;">Tax</th>
                          <th style="padding:11px 10px;text-align:right;color:#ffffff;font-size:13px;">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${lines.html.join("")}
                      </tbody>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:18px 28px 24px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                      <tr>
                        <td style="width:56%;vertical-align:top;padding-right:14px;">
                          <p style="margin:0;color:#374151;font-size:13px;"><strong>Payment method:</strong> PayPal</p>
                          <p style="margin:9px 0 0;color:#6b7280;font-size:12px;line-height:1.5;">Thank you for your purchase. If you need any correction on this receipt, please chat with us on WhatsApp.</p>
                        </td>
                        <td style="width:44%;vertical-align:top;">
                          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                            <tr>
                              <td style="padding:2px 0;color:#374151;font-size:13px;">Subtotal:</td>
                              <td style="padding:2px 0;color:#111827;font-size:13px;text-align:right;">${escapeHtml(formatCurrency(summary.subtotal, currency))}</td>
                            </tr>
                            <tr>
                              <td style="padding:2px 0;color:#374151;font-size:13px;">Tax:</td>
                              <td style="padding:2px 0;color:#111827;font-size:13px;text-align:right;">${escapeHtml(formatCurrency(summary.tax, currency))}</td>
                            </tr>
                            <tr>
                              <td style="padding:2px 0;color:#374151;font-size:13px;">Shipping:</td>
                              <td style="padding:2px 0;color:#111827;font-size:13px;text-align:right;">${escapeHtml(formatCurrency(summary.shipping, currency))}</td>
                            </tr>
                            <tr>
                              <td style="padding:2px 0;color:#111827;font-size:13px;font-weight:700;">Total:</td>
                              <td style="padding:2px 0;color:#111827;font-size:13px;text-align:right;font-weight:700;">${escapeHtml(formatCurrency(summary.total, currency))}</td>
                            </tr>
                            <tr>
                              <td style="padding:2px 0;color:#374151;font-size:13px;">Paid:</td>
                              <td style="padding:2px 0;color:#111827;font-size:13px;text-align:right;">${escapeHtml(formatCurrency(paidAmount, currency))}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px;border-collapse:collapse;background:${balanceBarBackground};">
                      <tr>
                        <td style="padding:11px 14px;color:#ffffff;font-size:20px;font-weight:700;letter-spacing:0.2px;">${escapeHtml(balanceLabel)}</td>
                        <td style="padding:11px 14px;color:#ffffff;font-size:30px;font-weight:800;text-align:right;">${escapeHtml(formatCurrency(balanceDue, currency))}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </div>
    `.trim()

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
            email: customerEmail,
            name: customerName,
          },
        ],
        subject: `Receipt ${receiptNumber} - Order ${orderRef}`,
        textContent,
        htmlContent,
      }),
      cache: "no-store",
    })

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "")
      throw new Error(`Brevo receipt delivery failed with status ${response.status}${errorBody ? `: ${errorBody}` : ""}`)
    }

    await deleteOrderOtpSession(parsed.data.sessionToken)

    return NextResponse.json({
      message: `Your receipt has been sent successfully to ${maskEmail(customerEmail)}.`,
      destination: maskEmail(customerEmail),
    })
  } catch (error) {
    console.error("Order-tracking send-receipt error:", error instanceof Error ? error.message : "Unknown error")
    return NextResponse.json({ error: "Unable to send receipt email." }, { status: 500 })
  }
}
