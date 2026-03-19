"use client"

import Image from "next/image"
import Link from "next/link"
import { useState } from "react"
import ProductGallery from "./product-gallery"
import { getDiscountedPriceLabel } from "@/lib/pricing"
import { getProductDisplayCopy } from "@/lib/product-copy"
import { withLocaleHref } from "@/lib/i18n"
import { useLocale } from "@/context/LocaleContext"

interface ProductCardProps {
  name: string
  slug: string
  price: string
  image?: string
  images?: string[]
  category: string
  description: string
  tag?: string
}

export function ProductCard({ name, slug, price, image, images, category, description, tag }: ProductCardProps) {
  const [isHovered, setIsHovered] = useState(false)
  const isVirginStraightBulk = slug === "virgin-straight-bulk"
  const { discountedLabel, originalLabel } = getDiscountedPriceLabel(price)
  const { locale } = useLocale()
  const copy = getProductDisplayCopy({ slug, name, category, description, tag }, locale)

  return (
    <Link href={withLocaleHref(`/order/${slug}`, locale)}>
      <div
        className="group relative flex w-full flex-col cursor-pointer"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Image Container */}
        <div className="relative">
          {images && images.length > 0 ? (
            <ProductGallery images={images} alt={copy.name} />
          ) : (
            <div className="relative aspect-[15/14] overflow-hidden rounded-2xl bg-secondary">
              <Image
                src={image ?? ""}
                alt={copy.name}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                className={`transition-transform duration-700 ${isHovered ? "scale-110" : "scale-100"} ${isVirginStraightBulk ? "object-contain p-2" : "object-cover"}`}
              />
            </div>
          )}

          {copy.tag && (
            <span className="absolute left-4 top-4 bg-accent px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-accent-foreground">
              {copy.tag}
            </span>
          )}

        </div>

        {/* Details */}
        <div className="flex flex-col gap-1 pt-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            {copy.category}
          </p>
          <h3 className="font-serif text-lg font-semibold text-foreground">{copy.name}</h3>
          <p className="text-sm leading-relaxed text-muted-foreground">{copy.description}</p>
          <div className="mt-1 flex items-baseline gap-2">
            <p className="text-lg font-semibold leading-none text-foreground tabular-nums">{discountedLabel}</p>
            <p className="text-sm font-medium leading-none text-muted-foreground line-through tabular-nums">{originalLabel}</p>
          </div>
        </div>
      </div>
    </Link>
  )
}
