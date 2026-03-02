import type { Metadata } from "next"
import { buildPageMetadata } from "@/lib/seo"

export const metadata: Metadata = buildPageMetadata({
  title: "Payment Status",
  description: "Payment confirmation page for your recent order.",
  path: "/payment-success",
  noIndex: true,
})

export default function PaymentSuccessLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return children
}
