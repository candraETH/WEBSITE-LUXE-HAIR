import type { Metadata } from "next"
import Link from "next/link"
import { buildPageMetadata } from "@/lib/seo"

export const metadata: Metadata = buildPageMetadata({
  title: "Admin Settings",
  description: "Admin settings.",
  path: "/admin/settings",
  keywords: ["admin", "settings"],
})

export default function AdminSettingsPage() {
  return (
    <section className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-accent/80">Settings</p>
        <h1 className="mt-2 font-serif text-3xl font-bold text-foreground">Settings</h1>
        <p className="mt-2 text-sm text-muted-foreground">Admin configuration and shortcuts.</p>
      </div>

      <div className="rounded-2xl border border-border/30 bg-card/60 p-6 shadow-sm">
        <p className="text-sm font-semibold text-foreground">Shortcuts</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Link
            href="/admin/orders"
            className="rounded-xl border border-border/30 bg-background/40 p-4 text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
          >
            Manage orders
            <p className="mt-1 text-xs font-normal text-muted-foreground">Update status, tracking number, and carrier.</p>
          </Link>
          <Link
            href="/admin/customers"
            className="rounded-xl border border-border/30 bg-background/40 p-4 text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
          >
            Manage customers
            <p className="mt-1 text-xs font-normal text-muted-foreground">Search profiles and change roles.</p>
          </Link>
        </div>
      </div>

      <div className="rounded-2xl border border-border/30 bg-card/60 p-6 shadow-sm">
        <p className="text-sm font-semibold text-foreground">Order status workflow</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Orders move to <span className="font-medium text-foreground">Shipped</span> when an admin updates the order and adds shipment details.
        </p>
        <ol className="mt-4 list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
          <li>Open Admin → Orders.</li>
          <li>Click Edit on the order.</li>
          <li>Set Status to SHIPPED.</li>
          <li>Fill Tracking number and Carrier.</li>
          <li>Save changes.</li>
        </ol>
      </div>
    </section>
  )
}
