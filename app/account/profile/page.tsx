import type { Metadata } from "next"
import { buildPageMetadata } from "@/lib/seo"
import { ProfileClient } from "./profile-client"

export const metadata: Metadata = buildPageMetadata({
  title: "My Profile",
  description: "View and update your profile information.",
  path: "/account/profile",
  keywords: ["account", "profile"],
})

export default function ProfilePage() {
  return <ProfileClient />
}

