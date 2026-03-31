import type { Metadata } from "next"
import { JsonLd } from "@/components/json-ld"
import { CATALOG_PRODUCT_BY_SLUG } from "@/lib/catalog-index"
import { applyProductDiscount } from "@/lib/pricing"
import { getProductDisplayCopy } from "@/lib/product-copy"
import { buildLocalizedPageMetadata, getLocaleFromRequestHeaders } from "@/lib/seo-i18n"
import { absoluteUrl, parsePriceValues, SITE_NAME } from "@/lib/seo"
import { withLocaleHref } from "@/lib/i18n"

type LayoutProps = Readonly<{
  children: React.ReactNode
  params: Promise<{
    slug: string
  }>
}>

function getCategoryPath(category: string): string {
  switch (category) {
    case "Bulk Hair":
      return "/bulk-hair"
    case "Weft Hair":
      return "/weft-hair"
    case "Hair Extensions":
      return "/extensions"
    case "Wigs":
      return "/wigs"
    default:
      return "/"
  }
}

export async function generateMetadata({ params }: LayoutProps): Promise<Metadata> {
  const { slug } = await params
  const product = CATALOG_PRODUCT_BY_SLUG.get(slug)
  const locale = await getLocaleFromRequestHeaders()

  if (!product) {
    return buildLocalizedPageMetadata({
      title: locale === "ru" ? "Товар не найден" : "Product Not Found",
      description:
        locale === "ru"
          ? "Этот товар недоступен или больше не существует."
          : "This product is unavailable or no longer exists.",
      noIndex: true,
    })
  }

  const productCopy = getProductDisplayCopy(product, locale)
  const numericPrices = parsePriceValues(product.price)
  const rawStartingPrice = numericPrices.length > 0 ? Math.min(...numericPrices) : 0
  const startingPrice = rawStartingPrice > 0 ? applyProductDiscount(rawStartingPrice) : 0
  const categoryLabel = productCopy.category || "Hair Product"
  const title = `${productCopy.name} - ${categoryLabel}`
  const priceSnippet = startingPrice > 0 ? `Starting from $${startingPrice.toFixed(2)}.` : ""
  const images = product.images && product.images.length > 0 ? product.images : product.image ? [product.image] : ["/images/hero.jpg"]

  return buildLocalizedPageMetadata({
    title,
    description: `${productCopy.description} ${priceSnippet}`.trim(),
    keywords: [product.name.toLowerCase(), product.category.toLowerCase(), "human hair", "buy online"],
    images,
  })
}

export default async function OrderLayout({ children, params }: LayoutProps) {
  const { slug } = await params
  const product = CATALOG_PRODUCT_BY_SLUG.get(slug)

  if (!product) {
    return children
  }

  const locale = await getLocaleFromRequestHeaders()
  const productCopy = getProductDisplayCopy(product, locale)
  const numericPrices = parsePriceValues(product.price)
  const discountedPrices = numericPrices.map((value) => applyProductDiscount(value))
  const lowPrice = discountedPrices.length > 0 ? Math.min(...discountedPrices) : undefined
  const highPrice = discountedPrices.length > 0 ? Math.max(...discountedPrices) : undefined
  const imagePaths = product.images && product.images.length > 0 ? product.images : product.image ? [product.image] : ["/images/hero.jpg"]
  const localizedProductPath = withLocaleHref(`/order/${product.slug}`, locale)
  const localizedCategoryPath = withLocaleHref(getCategoryPath(product.category), locale)
  const productUrl = absoluteUrl(localizedProductPath)
  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: productCopy.name,
    description: productCopy.description,
    category: productCopy.category,
    sku: product.slug,
    image: imagePaths.map((path) => absoluteUrl(path)),
    brand: {
      "@type": "Brand",
      name: SITE_NAME,
    },
    offers: {
      "@type": "AggregateOffer",
      url: productUrl,
      priceCurrency: "USD",
      lowPrice,
      highPrice: highPrice ?? lowPrice,
      offerCount: discountedPrices.length > 0 ? discountedPrices.length : 1,
      availability: "https://schema.org/InStock",
      itemCondition: "https://schema.org/NewCondition",
    },
  }
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: locale === "ru" ? "Главная" : "Home",
        item: absoluteUrl(withLocaleHref("/", locale)),
      },
      {
        "@type": "ListItem",
        position: 2,
        name: productCopy.category,
        item: absoluteUrl(localizedCategoryPath),
      },
      {
        "@type": "ListItem",
        position: 3,
        name: productCopy.name,
        item: productUrl,
      },
    ],
  }

  return (
    <>
      <JsonLd data={productSchema} />
      <JsonLd data={breadcrumbSchema} />
      {children}
    </>
  )
}
