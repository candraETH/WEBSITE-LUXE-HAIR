import type { Metadata } from "next"
import { buildPageMetadata } from "@/lib/seo"
import { WishlistClient } from "./wishlist-client"

export const metadata: Metadata = buildPageMetadata({
  title: "Wishlist",
  description: "View your wishlist items.",
  path: "/account/wishlist",
  keywords: ["account", "wishlist"],
})

export default function WishlistPage() {
  return <WishlistClient />
}

