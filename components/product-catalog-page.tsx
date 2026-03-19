"use client"

import { useState } from "react"
import Link from "next/link"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { ProductCatalogCard } from "@/components/product-catalog-card"
import type { CatalogProduct } from "@/lib/bulk-products"
import { BULK_PRODUCTS } from "@/lib/bulk-products"
import { WEFT_PRODUCTS } from "@/lib/weft-products"
import { EXTENSIONS_PRODUCTS } from "@/lib/extensions-products"
import { WIGS_PRODUCTS } from "@/lib/wigs-products"
import type { CatalogFaqItem } from "@/lib/catalog-faqs"
import { getCatalogSeoContent, type CatalogGroupKey } from "@/lib/catalog-seo"
import { withLocaleHref } from "@/lib/i18n"
import { getMessages } from "@/lib/messages"
import { getProductDisplayCopy } from "@/lib/product-copy"
import { useLocale } from "@/context/LocaleContext"

type SortValue = "featured" | "price-asc" | "price-desc" | "name-asc"

type ProductCatalogPageProps = {
  products: CatalogProduct[]
  filterTitle?: string
  sortId: string
  activeCatalogGroup?: CatalogGroupKey
  faqHeading?: string
  faqItems?: CatalogFaqItem[]
}

function getPriceStart(range: string): number {
  const first = range.split("-")[0]?.replace(/[^0-9.]/g, "") ?? "0"
  return Number(first) || 0
}

export function ProductCatalogPage({
  products,
  filterTitle = "Hair Type",
  sortId,
  activeCatalogGroup = "bulk",
  faqHeading,
  faqItems = [],
}: ProductCatalogPageProps) {
  const { locale } = useLocale()
  const messages = getMessages(locale)
  const localizedHref = (href: string) => withLocaleHref(href, locale)

  const sortOptions: Array<{ value: SortValue; label: string }> = [
    { value: "featured", label: messages.catalog.sortOptions.featured },
    { value: "price-asc", label: messages.catalog.sortOptions.priceAsc },
    { value: "price-desc", label: messages.catalog.sortOptions.priceDesc },
    { value: "name-asc", label: messages.catalog.sortOptions.nameAsc },
  ]

  const [openCatalogGroups, setOpenCatalogGroups] = useState<string[]>([activeCatalogGroup])
  const [selectedProductSlugs, setSelectedProductSlugs] = useState<string[]>([])
  const [sortBy, setSortBy] = useState<SortValue>("featured")
  const [openFaqIndex, setOpenFaqIndex] = useState<number>(0)
  const seoContent = getCatalogSeoContent(locale, activeCatalogGroup)

  const catalogGroups = [
    { key: "bulk", title: messages.nav["Bulk Hair"], href: "/bulk-hair", items: BULK_PRODUCTS },
    { key: "weft", title: messages.nav["Bundles"], href: "/weft-hair", items: WEFT_PRODUCTS },
    { key: "extensions", title: messages.nav["Extensions"], href: "/extensions", items: EXTENSIONS_PRODUCTS },
    { key: "wigs", title: messages.nav["Wigs"], href: "/wigs", items: WIGS_PRODUCTS },
  ] as const

  const currentGroup =
    catalogGroups.find((group) => group.key === activeCatalogGroup) ?? catalogGroups[0]

  const allCatalogProducts = (() => {
    const map = new Map<string, CatalogProduct>()
    for (const group of catalogGroups) {
      for (const item of group.items) {
        if (!map.has(item.slug)) {
          map.set(item.slug, item)
        }
      }
    }
    return Array.from(map.values())
  })()

  const selectedProducts = allCatalogProducts.filter((item) =>
    selectedProductSlugs.includes(item.slug)
  )

  const filteredProducts = (() => {
    const baseProducts = selectedProductSlugs.length > 0 ? selectedProducts : products
    const sorted = [...baseProducts]
    if (sortBy === "price-asc") {
      sorted.sort((a, b) => getPriceStart(a.price) - getPriceStart(b.price))
    } else if (sortBy === "price-desc") {
      sorted.sort((a, b) => getPriceStart(b.price) - getPriceStart(a.price))
    } else if (sortBy === "name-asc") {
      sorted.sort((a, b) => a.name.localeCompare(b.name))
    }

    return sorted
  })()

  const popularProductLinks = products.slice(0, 4).map((product) => ({
    href: withLocaleHref(`/order/${product.slug}`, locale),
    label: product.name,
  }))

  const toggleProductSelection = (slug: string) => {
    setSelectedProductSlugs((prev) =>
      prev.includes(slug) ? prev.filter((value) => value !== slug) : [...prev, slug]
    )
  }

  const toggleCatalogGroup = (groupKey: string) => {
    setOpenCatalogGroups((prev) =>
      prev.includes(groupKey) ? prev.filter((item) => item !== groupKey) : [...prev, groupKey]
    )
  }

  return (
    <main className="min-h-screen bg-[#f6f3ef] pt-[102px] lg:pt-[108px]">
      <Navbar />

      <section className="w-full px-4 py-7 sm:px-6 lg:px-10 xl:px-12 2xl:px-16">
        <nav aria-label="Breadcrumb" className="mb-4">
          <ol className="flex flex-wrap items-center gap-1.5 text-xs font-medium uppercase tracking-widest text-[#6b6b70]">
            <li>
              <Link href={localizedHref("/")} className="transition-colors hover:text-[#1f1f1f]">
                {messages.catalog.breadcrumbHome}
              </Link>
            </li>
            <li aria-hidden="true" className="text-[#9a9aa0]">
              /
            </li>
            <li className="text-[#1f1f1f]">{seoContent.breadcrumbLabel}</li>
          </ol>
        </nav>

        <div className="mb-5 flex items-center justify-between gap-3 border-b border-[#dfd7cf] pb-4">
          <p className="text-[24px] font-semibold leading-none text-[#171717] sm:text-[26px]">
            {locale === "ru" ? `${filteredProducts.length} \u0442\u043e\u0432\u0430\u0440\u043e\u0432` : `${filteredProducts.length} items`}
          </p>
          <div className="flex items-center gap-2">
            <label htmlFor={sortId} className="text-sm font-semibold uppercase tracking-widest text-[#4b4b4f]">
              {locale === "ru" ? "\u0421\u043e\u0440\u0442\u0438\u0440\u043e\u0432\u043a\u0430" : "Sort By"}
            </label>
            <select
              id={sortId}
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value as SortValue)}
              className="h-10 rounded-md border border-[#d6d0c9] bg-white px-3 text-sm text-[#1f1f1f] focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30"
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {selectedProducts.length > 0 && (
          <div className="mb-4 flex flex-wrap items-center gap-2 border-b border-[#dfd7cf] pb-4">
            {selectedProducts.map((item) => (
              <button
                key={item.slug}
                type="button"
                onClick={() => toggleProductSelection(item.slug)}
                className="inline-flex h-9 items-center gap-2 rounded-md border border-[#b5aea6] bg-white px-3 text-sm font-medium text-[#1f1f1f] transition-colors hover:bg-[#f5f0e9]"
              >
                <span>{getProductDisplayCopy(item, locale).name}</span>
                <span className="text-base leading-none">×</span>
              </button>
            ))}
            <button
              type="button"
              onClick={() => setSelectedProductSlugs([])}
              className="ml-1 text-sm font-semibold text-[#8a6b22] underline-offset-2 hover:underline"
            >
              {locale === "ru" ? "\u041e\u0447\u0438\u0441\u0442\u0438\u0442\u044c \u0444\u0438\u043b\u044c\u0442\u0440" : "Clear Filter"}
            </button>
          </div>
        )}

        <div className="mb-5 rounded-xl border border-[#dfd7cf] bg-white/60 p-3 sm:p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#7a7a80]">
            {locale === "ru" ? "\u041f\u043e\u043f\u0443\u043b\u044f\u0440\u043d\u043e\u0435 \u0432" : "Popular in"} {currentGroup.title}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {popularProductLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="inline-flex items-center rounded-full border border-[#cfc5ba] bg-white px-3 py-1.5 text-xs font-medium text-[#1f1f1f] transition-colors hover:bg-[#f5efe6]"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[245px_1fr]">
          <aside className="h-fit border-r border-[#dfd7cf] pr-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[22px] font-semibold leading-none text-[#171717] sm:text-[24px]">{filterTitle}</h2>
            </div>
            <div className="border-t border-[#dfd7cf]">
              {catalogGroups.map((group) => {
                const isOpen = openCatalogGroups.includes(group.key)
                return (
                  <div key={group.key} className="border-b border-[#dfd7cf]">
                    <button
                      type="button"
                      onClick={() => toggleCatalogGroup(group.key)}
                      className="flex w-full items-center justify-between gap-3 py-3 text-left"
                    >
                      <span className="text-[16px] font-semibold leading-none text-[#171717]">{group.title}</span>
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        className={`h-4 w-4 text-[#171717] transition-transform ${isOpen ? "rotate-180" : ""}`}
                        aria-hidden="true"
                      >
                        <path d="m6 9 6 6 6-6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                    {isOpen && (
                      <div className="space-y-1 pb-3">
                        {group.items.map((item) => {
                          const isSelected = selectedProductSlugs.includes(item.slug)

                          return (
                            <label
                              key={item.slug}
                              className="group flex cursor-pointer items-center justify-between gap-2 rounded-md px-1 py-1.5 text-[#1f1f1f] transition-colors hover:bg-[#efe9e1]"
                            >
                              <span className="inline-flex items-center gap-2.5">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleProductSelection(item.slug)}
                                  className="peer sr-only"
                                />
                                <span
                                  aria-hidden="true"
                                  className={`inline-flex h-[18px] w-[18px] items-center justify-center rounded-[6px] border transition-all duration-200 ${
                                    isSelected
                                      ? "border-[#c79a33] bg-gradient-to-b from-[#f7d98a] to-[#d4af37] shadow-[0_2px_7px_rgba(186,140,29,0.35)]"
                                      : "border-[#c8c0b7] bg-white group-hover:border-[#b5aba0] group-hover:bg-[#fdfbf8]"
                                  }`}
                                >
                                  <svg
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    aria-hidden="true"
                                    className={`h-[11px] w-[11px] text-white transition-all duration-150 ${
                                      isSelected ? "scale-100 opacity-100" : "scale-75 opacity-0"
                                    }`}
                                  >
                                    <path d="m5 12 4 4 10-10" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                                  </svg>
                                </span>
                                <span className="text-[14px] leading-snug">{item.name}</span>
                              </span>
                              <span className="text-[11px] text-[#6f6f73]">1</span>
                            </label>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </aside>

          <div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {filteredProducts.map((product) => (
                <ProductCatalogCard key={product.slug} product={product} />
              ))}
            </div>

            {faqItems.length > 0 && (
              <section className="mt-16 sm:mt-20">
                <h2 className="text-xl font-semibold leading-tight text-[#141414] sm:text-2xl">
                  {faqHeading ?? messages.catalog.faqFallbackHeading}
                </h2>
                <div className="mt-4 border-t border-[#ddd2c8]">
                  {faqItems.map((faq, index) => {
                    const isOpen = openFaqIndex === index
                    return (
                      <div key={faq.question} className="border-b border-[#ddd2c8]">
                        <button
                          type="button"
                          onClick={() => setOpenFaqIndex(isOpen ? -1 : index)}
                          className="flex w-full items-center justify-between gap-4 py-3 text-left"
                        >
                          <span className="text-base font-semibold leading-snug text-[#171717] sm:text-lg">
                            {faq.question}
                          </span>
                          <span className="text-xl leading-none text-[#171717]">{isOpen ? "-" : "+"}</span>
                        </button>
                        {isOpen && (
                          <p className="pb-3 pr-1 text-sm leading-relaxed text-[#2b2b2d] sm:text-base">
                            {faq.answer}
                          </p>
                        )}
                      </div>
                    )
                  })}
                </div>
              </section>
            )}

            <section className="mt-10 rounded-2xl border border-[#ddd2c8] bg-white/70 p-5 sm:mt-12 sm:p-6">
              <h2 className="text-xl font-semibold leading-tight text-[#161616] sm:text-2xl">
                {seoContent.guideTitle}
              </h2>
              <div className="mt-3 space-y-3 text-sm leading-relaxed text-[#2d2d2f] sm:text-base">
                {seoContent.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>

              <div className="mt-5 border-t border-[#e6ddd4] pt-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#7a7a80]">
                  {messages.catalog.relatedHeading}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {seoContent.relatedCollections.map((link) => (
                    <Link
                      key={link.href}
                      href={localizedHref(link.href)}
                      className="inline-flex items-center rounded-full border border-[#cfc5ba] bg-white px-3 py-1.5 text-xs font-medium text-[#1f1f1f] transition-colors hover:bg-[#f5efe6]"
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>
            </section>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}

