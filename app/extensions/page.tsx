import { ProductCatalogPage } from "@/components/product-catalog-page"
import { JsonLd } from "@/components/json-ld"
import { EXTENSIONS_PRODUCTS } from "@/lib/extensions-products"
import { EXTENSIONS_FAQS } from "@/lib/catalog-faqs"
import type { Metadata } from "next"
import { absoluteUrl } from "@/lib/seo"
import { buildLocalizedPageMetadata, getLocaleFromRequestHeaders } from "@/lib/seo-i18n"
import { withLocaleHref } from "@/lib/i18n"

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocaleFromRequestHeaders()
  const title = locale === "ru" ? "Наращивание — коллекция" : "Hair Extensions Collection"
  const description =
    locale === "ru"
      ? "Премиальные clip-in, tape-in и пряди из 100% натуральных волос — для естественной длины и объема."
      : "Shop premium clip-in, tape-in, and bundle hair extensions made from 100% human hair for natural length and volume."

  return buildLocalizedPageMetadata({
    title,
    description,
    keywords: ["hair extensions", "clip in hair extensions", "tape in extensions", "human hair bundles"],
    images: ["/images/extensions-1.jpg"],
  })
}

export default async function ExtensionsPage() {
  const locale = await getLocaleFromRequestHeaders()
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
        name: locale === "ru" ? "Главная" : "Home",
        item: absoluteUrl(withLocaleHref("/", locale)),
      },
      {
        "@type": "ListItem",
        position: 2,
        name: locale === "ru" ? "Наращивание" : "Extensions",
        item: absoluteUrl(withLocaleHref("/extensions", locale)),
      },
    ],
  }

  return (
    <>
      <JsonLd data={faqSchema} />
      <JsonLd data={breadcrumbSchema} />
      <ProductCatalogPage
        products={EXTENSIONS_PRODUCTS}
        filterTitle={locale === "ru" ? "Тип" : "Extension Types"}
        sortId="sort-extensions"
        activeCatalogGroup="extensions"
        faqHeading={locale === "ru" ? "Часто задаваемые вопросы о наращивании" : "Frequently Asked Questions About Hair Extensions"}
        faqItems={EXTENSIONS_FAQS}
      />
    </>
  )
}
