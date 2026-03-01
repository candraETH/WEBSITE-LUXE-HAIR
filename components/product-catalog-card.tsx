"use client"

import Image from "next/image"
import Link from "next/link"
import type { CatalogProduct } from "@/lib/bulk-products"
import { getDiscountedPriceLabel } from "@/lib/pricing"

type ProductCatalogCardProps = {
  product: CatalogProduct
}

export function ProductCatalogCard({ product }: ProductCatalogCardProps) {
  const primaryImage = product.image || product.images?.[0] || ""
  const { discountedLabel, originalLabel } = getDiscountedPriceLabel(product.price)

  return (
    <Link href={`/order/${product.slug}`} className="group block">
      <div className="relative overflow-hidden rounded-xl bg-[#e9e5df]">
        <div className="relative aspect-[3/4] w-full">
          {primaryImage ? (
            <Image
              src={primaryImage}
              alt={product.name}
              fill
              unoptimized
              sizes="(max-width: 640px) 100vw, (max-width: 1200px) 33vw, 25vw"
              className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="h-full w-full bg-[#d9d2c8]" />
          )}
        </div>

        {product.tag && (
          <span className="absolute left-2 top-2 rounded-md bg-[#ea50c8] px-2 py-0.5 text-xs font-semibold text-white">
            {product.tag}
          </span>
        )}
      </div>

      <div className="pt-3">
        <h3 className="text-lg font-semibold leading-snug text-[#171717]">{product.name}</h3>
        <div className="mt-1 flex items-baseline gap-2">
          <p className="text-lg font-semibold leading-none text-[#111] tabular-nums">{discountedLabel}</p>
          <p className="text-sm font-medium leading-none text-[#6f6f73] line-through tabular-nums">{originalLabel}</p>
        </div>
      </div>
    </Link>
  )
}
