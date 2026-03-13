import type { Metadata } from "next"
import { buildPageMetadata } from "@/lib/seo"
import { SettingsClient } from "./settings-client"

export const metadata: Metadata = buildPageMetadata({
  title: "Settings",
  description: "Update your account settings.",
  path: "/account/settings",
  keywords: ["account", "settings"],
})

export default function SettingsPage() {
  return <SettingsClient />
}

