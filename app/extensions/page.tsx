import { ProductCatalogPage } from "@/components/product-catalog-page"
import { EXTENSIONS_PRODUCTS } from "@/lib/extensions-products"
import { EXTENSIONS_FAQS } from "@/lib/catalog-faqs"

export default function ExtensionsPage() {
  return (
    <ProductCatalogPage
      products={EXTENSIONS_PRODUCTS}
      filterTitle="Extension Types"
      sortId="sort-extensions"
      activeCatalogGroup="extensions"
      faqHeading="Frequently Asked Questions About Hair Extensions"
      faqItems={EXTENSIONS_FAQS}
    />
  )
}
