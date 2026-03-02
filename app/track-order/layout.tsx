import type { Metadata } from "next"
import { buildPageMetadata } from "@/lib/seo"

export const metadata: Metadata = buildPageMetadata({
  title: "Track Order",
  description: "Track your CANDRA'S HAIR order status using PayPal Order ID and phone number.",
  path: "/track-order",
  noIndex: true,
})

export default function TrackOrderLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return children
}
