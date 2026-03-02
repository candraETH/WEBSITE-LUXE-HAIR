import type { Metadata } from "next"
import { buildPageMetadata } from "@/lib/seo"

export const metadata: Metadata = buildPageMetadata({
  title: "Shopping Cart",
  description: "Review selected items and proceed securely to checkout.",
  path: "/cart",
  noIndex: true,
})

export default function CartLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return children
}
