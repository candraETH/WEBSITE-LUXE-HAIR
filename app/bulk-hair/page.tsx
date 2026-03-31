import { ProductCatalogPage } from "@/components/product-catalog-page"
import { JsonLd } from "@/components/json-ld"
import { BULK_PRODUCTS } from "@/lib/bulk-products"
import { BULK_HAIR_FAQS } from "@/lib/catalog-faqs"
import type { Metadata } from "next"
import { absoluteUrl } from "@/lib/seo"
import { buildLocalizedPageMetadata, getLocaleFromRequestHeaders } from "@/lib/seo-i18n"
import { withLocaleHref } from "@/lib/i18n"

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocaleFromRequestHeaders()
  const title = locale === "ru" ? "Bulk Hair — коллекция" : "Bulk Hair Extensions"
  const titleAbsolute =
    locale === "ru" ? `${title} | CANDRA'S HAIR` : "Bulk Hair Extensions | CANDRA'S HAIR"
  const description =
    locale === "ru"
      ? "Премиальные натуральные волосы bulk hair для плетения, париков и профессиональных установок. Разные текстуры и оттенки."
      : "Shop premium bulk human hair for braiding, custom wig making, and professional installs. Explore multiple textures and color options."

  return buildLocalizedPageMetadata({
    title,
    titleAbsolute,
    description,
    keywords: ["bulk hair", "braiding hair", "human bulk hair", "premium bulk hair"],
    images: ["/images/images1.png"],
  })
}

export default async function BulkHairPage() {
  const locale = await getLocaleFromRequestHeaders()
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
        name: locale === "ru" ? "Главная" : "Home",
        item: absoluteUrl(withLocaleHref("/", locale)),
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Bulk Hair",
        item: absoluteUrl(withLocaleHref("/bulk-hair", locale)),
      },
    ],
  }

  return (
    <>
      <JsonLd data={faqSchema} />
      <JsonLd data={breadcrumbSchema} />
      <ProductCatalogPage
        products={BULK_PRODUCTS}
        filterTitle={locale === "ru" ? "Коллекция" : "Bulk Collection"}
        sortId="sort-bulk"
        activeCatalogGroup="bulk"
        faqHeading={locale === "ru" ? "Часто задаваемые вопросы о Bulk Hair" : "Frequently Asked Questions About Bulk Hair"}
        faqItems={BULK_HAIR_FAQS}
      />
    </>
  )
}


