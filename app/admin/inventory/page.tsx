import type { Metadata } from "next"
import { buildPageMetadata } from "@/lib/seo"
import { ALL_CATALOG_PRODUCTS } from "@/lib/catalog-index"
import { AdminInventoryClient } from "./inventory-client"

export const metadata: Metadata = buildPageMetadata({
  title: "Admin Inventory",
  description: "Inventory management.",
  path: "/admin/inventory",
  keywords: ["admin", "inventory"],
})

type PageProps = {
  searchParams?: Record<string, string | string[] | undefined>
}

function readParam(props: PageProps, key: string): string {
  const value = props.searchParams?.[key]
  return typeof value === "string" ? value : ""
}

export default function AdminInventoryPage(props: PageProps) {
  const query = readParam(props, "q").trim().toLowerCase()
  const products = query
    ? ALL_CATALOG_PRODUCTS.filter((product) => {
        const name = product.name.toLowerCase()
        const slug = product.slug.toLowerCase()
        const category = product.category.toLowerCase()
        return name.includes(query) || slug.includes(query) || category.includes(query)
      })
    : ALL_CATALOG_PRODUCTS

  return (
    <section className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-accent/80">Inventory</p>
        <h1 className="mt-2 font-serif text-3xl font-bold text-foreground">Inventory</h1>
        <p className="mt-2 text-sm text-muted-foreground">Manage stock manually per product.</p>
      </div>

      <AdminInventoryClient
        products={products.map((product) => ({
          slug: product.slug,
          name: product.name,
          category: product.category,
        }))}
      />
    </section>
  )
}

