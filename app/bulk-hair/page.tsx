import { ProductCatalogPage } from "@/components/product-catalog-page"
import { JsonLd } from "@/components/json-ld"
import { BULK_PRODUCTS } from "@/lib/bulk-products"
import { BULK_HAIR_FAQS } from "@/lib/catalog-faqs"
import type { Metadata } from "next"
import { absoluteUrl, buildPageMetadata } from "@/lib/seo"

export const metadata: Metadata = buildPageMetadata({
  title: "Bulk Hair Collection",
  description:
    "Shop premium bulk human hair for braiding, custom wig making, and professional installs. Explore multiple textures and color options.",
  path: "/bulk-hair",
  keywords: ["bulk hair", "braiding hair", "human bulk hair", "premium bulk hair"],
  images: ["/images/images1.png"],
})

export default function BulkHairPage() {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: BULK_HAIR_FAQS.map((item) => ({
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
        name: "Bulk Hair",
        item: absoluteUrl("/bulk-hair"),
      },
    ],
  }

  return (
    <>
      <JsonLd data={faqSchema} />
      <JsonLd data={breadcrumbSchema} />
      <ProductCatalogPage
        products={BULK_PRODUCTS}
        filterTitle="Bulk Collection"
        sortId="sort-bulk"
        activeCatalogGroup="bulk"
        faqHeading="Frequently Asked Questions About Bulk Hair"
        faqItems={BULK_HAIR_FAQS}
      />
    </>
  )
}
