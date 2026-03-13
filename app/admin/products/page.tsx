import type { Metadata } from "next"
import Link from "next/link"
import { buildPageMetadata } from "@/lib/seo"
import { ALL_CATALOG_PRODUCTS } from "@/lib/catalog-index"

export const metadata: Metadata = buildPageMetadata({
  title: "Admin Products",
  description: "Manage products.",
  path: "/admin/products",
  keywords: ["admin", "products"],
})

type PageProps = {
  searchParams?: Record<string, string | string[] | undefined>
}

function readParam(props: PageProps, key: string): string {
  const value = props.searchParams?.[key]
  return typeof value === "string" ? value : ""
}

export default function AdminProductsPage(props: PageProps) {
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
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-accent/80">Products</p>
        <h1 className="mt-2 font-serif text-3xl font-bold text-foreground">Products</h1>
        <p className="mt-2 text-sm text-muted-foreground">Browse your current catalog (static data).</p>
      </div>

      <div className="rounded-2xl border border-border/30 bg-card/60 p-6 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-semibold text-foreground">Catalog products</p>
          <p className="text-xs text-muted-foreground">Search is synced with the top search bar.</p>
        </div>

        <div className="mt-4 overflow-hidden rounded-xl border border-border/30">
          {products.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">No products found.</div>
          ) : (
            <div className="divide-y divide-border/30">
              {products.map((product) => (
                <div
                  key={product.slug}
                  className="flex flex-col gap-2 bg-background/40 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{product.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {product.category} • {product.price}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">Slug: {product.slug}</p>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <Link
                      href={`/order/${encodeURIComponent(product.slug)}`}
                      className="rounded-lg border border-border px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-secondary"
                    >
                      View product
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
