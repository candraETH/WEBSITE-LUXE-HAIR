import type { Metadata } from "next"
import { buildPageMetadata } from "@/lib/seo"
import { ApiKeysClient } from "./api-keys-client"

export const metadata: Metadata = buildPageMetadata({
  title: "Admin API Keys",
  description: "Manage API keys for product data access.",
  path: "/admin/api-keys",
  keywords: ["admin", "api", "keys"],
})

export default function AdminApiKeysPage() {
  return (
    <section className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-accent/80">Developer</p>
        <h1 className="mt-2 font-serif text-3xl font-bold text-foreground">API Keys</h1>
        <p className="mt-2 text-sm text-muted-foreground">Buat dan kelola API key untuk akses data produk (harga sampai foto) dari aplikasi eksternal.</p>
      </div>
      <ApiKeysClient />
    </section>
  )
}
