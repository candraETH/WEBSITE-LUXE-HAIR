import { ProductCatalogPage } from "@/components/product-catalog-page"
import { EXTENSIONS_PRODUCTS } from "@/lib/extensions-products"
import { EXTENSIONS_FAQS } from "@/lib/catalog-faqs"
import type { Metadata } from "next"
import { absoluteUrl, buildPageMetadata } from "@/lib/seo"

export const metadata: Metadata = buildPageMetadata({
  title: "Hair Extensions Collection",
  description:
    "Shop premium clip-in, tape-in, and bundle hair extensions made from 100% human hair for natural length and volume.",
  path: "/extensions",
  keywords: ["hair extensions", "clip in hair extensions", "tape in extensions", "human hair bundles"],
  images: ["/images/extensions-1.jpg"],
})

export default function ExtensionsPage() {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: EXTENSIONS_FAQS.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  }
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: absoluteUrl("/"),
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Extensions",
        item: absoluteUrl("/extensions"),
      },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <ProductCatalogPage
        products={EXTENSIONS_PRODUCTS}
        filterTitle="Extension Types"
        sortId="sort-extensions"
        activeCatalogGroup="extensions"
        faqHeading="Frequently Asked Questions About Hair Extensions"
        faqItems={EXTENSIONS_FAQS}
      />
    </>
  )
}
