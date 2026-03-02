import type { Metadata } from "next"
import { CATALOG_PRODUCT_BY_SLUG } from "@/lib/catalog-index"
import { applyProductDiscount } from "@/lib/pricing"
import { buildPageMetadata, parsePriceValues } from "@/lib/seo"

type LayoutProps = Readonly<{
  children: React.ReactNode
  params: Promise<{
    slug: string
  }>
}>

export async function generateMetadata({ params }: LayoutProps): Promise<Metadata> {
  const { slug } = await params
  const product = CATALOG_PRODUCT_BY_SLUG.get(slug)

  if (!product) {
    return buildPageMetadata({
      title: "Order Product",
      description: "Select product options and place your order securely.",
      path: `/order/${slug}`,
      noIndex: true,
    })
  }

  const numericPrices = parsePriceValues(product.price)
  const rawStartingPrice = numericPrices.length > 0 ? Math.min(...numericPrices) : 0
  const startingPrice = rawStartingPrice > 0 ? applyProductDiscount(rawStartingPrice) : 0
  const categoryLabel = product.category || "Hair Product"
  const title = `${product.name} - ${categoryLabel}`
  const priceSnippet = startingPrice > 0 ? `Starting from $${startingPrice.toFixed(2)}.` : ""

  return buildPageMetadata({
    title,
    description: `${product.description} ${priceSnippet}`.trim(),
    path: `/order/${product.slug}`,
    keywords: [product.name.toLowerCase(), categoryLabel.toLowerCase(), "human hair", "buy online"],
    images: product.image ? [product.image] : ["/images/hero.jpg"],
  })
}

export default function OrderLayout({ children }: LayoutProps) {
  return children
}
