import type { Metadata } from "next"
import { buildPageMetadata } from "@/lib/seo"
import { AdminOrdersClient } from "./orders-client"

export const metadata: Metadata = buildPageMetadata({
  title: "Admin Orders",
  description: "Manage orders.",
  path: "/admin/orders",
  keywords: ["admin", "orders"],
})

type PageProps = {
  searchParams?: Record<string, string | string[] | undefined>
}

function readParam(props: PageProps, key: string): string {
  const value = props.searchParams?.[key]
  return typeof value === "string" ? value : ""
}

export default function AdminOrdersPage(props: PageProps) {
  const query = readParam(props, "q")
  const status = readParam(props, "status")

  return (
    <section className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-accent/80">Orders</p>
        <h1 className="mt-2 font-serif text-3xl font-bold text-foreground">Orders</h1>
        <p className="mt-2 text-sm text-muted-foreground">Update order status, tracking number, and carrier.</p>
      </div>

      <AdminOrdersClient initialQuery={query} initialStatus={status} />
    </section>
  )
}

