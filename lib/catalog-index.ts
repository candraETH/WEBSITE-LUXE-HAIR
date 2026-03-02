import { BULK_PRODUCTS } from "@/lib/bulk-products"
import { WEFT_PRODUCTS } from "@/lib/weft-products"
import { EXTENSIONS_PRODUCTS } from "@/lib/extensions-products"
import { WIGS_PRODUCTS } from "@/lib/wigs-products"

export const ALL_CATALOG_PRODUCTS = [
  ...BULK_PRODUCTS,
  ...WEFT_PRODUCTS,
  ...EXTENSIONS_PRODUCTS,
  ...WIGS_PRODUCTS,
]

export const CATALOG_PRODUCT_BY_SLUG = new Map(
  ALL_CATALOG_PRODUCTS.map((product) => [product.slug, product] as const)
)
