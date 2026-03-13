import type { Metadata } from "next"
import { buildPageMetadata } from "@/lib/seo"
import { OrdersClient } from "./orders-client"

export const metadata: Metadata = buildPageMetadata({
  title: "Orders",
  description: "View your order history.",
  path: "/account/orders",
  keywords: ["account", "orders"],
})

export default function OrdersPage() {
  return <OrdersClient />
}

