import type { Metadata } from "next"
import { buildPageMetadata } from "@/lib/seo"
import { AddressListClient } from "./address-list-client"

export const metadata: Metadata = buildPageMetadata({
  title: "Address",
  description: "Manage your saved addresses.",
  path: "/account/address",
  keywords: ["account", "address"],
})

export default function AddressPage() {
  return <AddressListClient />
}

