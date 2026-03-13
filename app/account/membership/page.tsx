import type { Metadata } from "next"
import { buildPageMetadata } from "@/lib/seo"
import { MembershipClient } from "./membership-client"

export const metadata: Metadata = buildPageMetadata({
  title: "Membership",
  description: "View your membership tier and progress.",
  path: "/account/membership",
  keywords: ["account", "membership", "tier"],
})

export default function MembershipPage() {
  return <MembershipClient />
}

