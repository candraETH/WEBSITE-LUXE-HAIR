import { ProductCatalogPage } from "@/components/product-catalog-page"
import { WEFT_PRODUCTS } from "@/lib/weft-products"
import { WEFT_HAIR_FAQS } from "@/lib/catalog-faqs"
import type { Metadata } from "next"
import { absoluteUrl, buildPageMetadata } from "@/lib/seo"

export const metadata: Metadata = buildPageMetadata({
  title: "Bundles Collection",
  description:
    "Discover premium weft hair textures including body wave, curly, deep wave, and more. Designed for seamless installs and natural movement.",
  path: "/weft-hair",
  keywords: ["weft hair", "human hair weft", "body wave weft", "curly weft"],
  images: ["/images/texture/all%20texture.png"],
})

export default function WeftHairPage() {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: WEFT_HAIR_FAQS.map((item) => ({
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
        name: "Bundles",
        item: absoluteUrl("/weft-hair"),
      },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <ProductCatalogPage
        products={WEFT_PRODUCTS}
        filterTitle="Hair Texture"
        sortId="sort-weft"
        activeCatalogGroup="weft"
        faqHeading="Frequently Asked Questions About Bundles"
        faqItems={WEFT_HAIR_FAQS}
      />
    </>
  )
}
