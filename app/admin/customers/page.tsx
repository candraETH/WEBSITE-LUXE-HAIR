import type { Metadata } from "next"
import { buildPageMetadata } from "@/lib/seo"
import { AdminCustomersClient } from "./customers-client"

export const metadata: Metadata = buildPageMetadata({
  title: "Admin Customers",
  description: "Manage customers.",
  path: "/admin/customers",
  keywords: ["admin", "customers"],
})

type PageProps = {
  searchParams?: Record<string, string | string[] | undefined>
}

function readParam(props: PageProps, key: string): string {
  const value = props.searchParams?.[key]
  return typeof value === "string" ? value : ""
}

export default function AdminCustomersPage(props: PageProps) {
  const query = readParam(props, "q")

  return (
    <section className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-accent/80">Customers</p>
        <h1 className="mt-2 font-serif text-3xl font-bold text-foreground">Customers</h1>
        <p className="mt-2 text-sm text-muted-foreground">View customer profiles and manage roles.</p>
      </div>

      <AdminCustomersClient initialQuery={query} />
    </section>
  )
}

