import type { Metadata } from "next"
import { buildPageMetadata } from "@/lib/seo"
import { OrderDetailClient } from "./order-detail-client"

export const metadata: Metadata = buildPageMetadata({
  title: "Order Detail",
  description: "View order details.",
  path: "/account/orders",
  keywords: ["account", "orders"],
})

export default async function OrderDetailPage(props: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await props.params
  return <OrderDetailClient orderId={orderId} />
}

