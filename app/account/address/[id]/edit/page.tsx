import type { Metadata } from "next"
import { buildPageMetadata } from "@/lib/seo"
import { AddressFormClient } from "../../address-form-client"

export const metadata: Metadata = buildPageMetadata({
  title: "Edit Address",
  description: "Edit an address.",
  path: "/account/address",
  keywords: ["account", "address"],
})

export default async function EditAddressPage(props: {
  params: Promise<{ id: string }>
  searchParams?: Record<string, string | string[] | undefined>
}) {
  const { id } = await props.params
  const returnTo = typeof props.searchParams?.returnTo === "string" ? props.searchParams.returnTo : undefined
  return <AddressFormClient addressId={id} returnTo={returnTo} />
}
