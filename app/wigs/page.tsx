import { ProductCatalogPage } from "@/components/product-catalog-page"
import { WIGS_PRODUCTS } from "@/lib/wigs-products"
import { WIGS_FAQS } from "@/lib/catalog-faqs"
import type { Metadata } from "next"
import { absoluteUrl, buildPageMetadata } from "@/lib/seo"

export const metadata: Metadata = buildPageMetadata({
  title: "Human Hair Wigs Collection",
  description:
    "Explore premium human hair wigs including lace front and closure styles. Designed for natural hairlines, comfort, and long wear.",
  path: "/wigs",
  keywords: ["human hair wigs", "lace front wigs", "closure wigs", "premium wigs"],
  images: ["/images/wig-1.jpg"],
})

export default function WigsPage() {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: WIGS_FAQS.map((item) => ({
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
        name: "Wigs",
        item: absoluteUrl("/wigs"),
      },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <ProductCatalogPage
        products={WIGS_PRODUCTS}
        filterTitle="Wig Styles"
        sortId="sort-wigs"
        activeCatalogGroup="wigs"
        faqHeading="Frequently Asked Questions About Human Hair Wigs"
        faqItems={WIGS_FAQS}
      />
    </>
  )
}
