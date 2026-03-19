import { ProductCatalogPage } from "@/components/product-catalog-page"
import { JsonLd } from "@/components/json-ld"
import { WIGS_PRODUCTS } from "@/lib/wigs-products"
import { WIGS_FAQS } from "@/lib/catalog-faqs"
import type { Metadata } from "next"
import { absoluteUrl } from "@/lib/seo"
import { buildLocalizedPageMetadata, getLocaleFromRequestHeaders } from "@/lib/seo-i18n"
import { withLocaleHref } from "@/lib/i18n"

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocaleFromRequestHeaders()
  const title = locale === "ru" ? "Парики — коллекция" : "Human Hair Wigs Collection"
  const description =
    locale === "ru"
      ? "Премиальные парики из натуральных волос: lace front и closure модели. Естественная линия роста, комфорт и длительная носка."
      : "Explore premium human hair wigs including lace front and closure styles. Designed for natural hairlines, comfort, and long wear."

  return buildLocalizedPageMetadata({
    title,
    description,
    keywords: ["human hair wigs", "lace front wigs", "closure wigs", "premium wigs"],
    images: ["/images/wig-1.jpg"],
  })
}

export default async function WigsPage() {
  const locale = await getLocaleFromRequestHeaders()
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
        name: locale === "ru" ? "Главная" : "Home",
        item: absoluteUrl(withLocaleHref("/", locale)),
      },
      {
        "@type": "ListItem",
        position: 2,
        name: locale === "ru" ? "Парики" : "Wigs",
        item: absoluteUrl(withLocaleHref("/wigs", locale)),
      },
    ],
  }

  return (
    <>
      <JsonLd data={faqSchema} />
      <JsonLd data={breadcrumbSchema} />
      <ProductCatalogPage
        products={WIGS_PRODUCTS}
        filterTitle={locale === "ru" ? "Стиль" : "Wig Styles"}
        sortId="sort-wigs"
        activeCatalogGroup="wigs"
        faqHeading={locale === "ru" ? "Часто задаваемые вопросы о париках" : "Frequently Asked Questions About Human Hair Wigs"}
        faqItems={WIGS_FAQS}
      />
    </>
  )
}
