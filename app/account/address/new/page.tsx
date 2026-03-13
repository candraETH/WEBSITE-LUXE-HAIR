import type { Metadata } from "next"
import { buildPageMetadata } from "@/lib/seo"
import { AddressFormClient } from "../address-form-client"

export const metadata: Metadata = buildPageMetadata({
  title: "Add Address",
  description: "Add a new address.",
  path: "/account/address/new",
  keywords: ["account", "address"],
})

export default function AddAddressPage(props: { searchParams?: Record<string, string | string[] | undefined> }) {
  const returnTo = typeof props.searchParams?.returnTo === "string" ? props.searchParams.returnTo : undefined
  return <AddressFormClient returnTo={returnTo} />
}
