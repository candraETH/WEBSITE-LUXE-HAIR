"use client"

import Image from "next/image"
import Link from "next/link"
import { useState } from "react"
import ProductGallery from "./product-gallery"

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

  return (
    <Link href={`/order/${slug}`}>
      <div
        className="group relative flex flex-col cursor-pointer"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Image Container */}
        <div className="relative">
          {images && images.length > 0 ? (
            <ProductGallery images={images} alt={name} />
          ) : (
            <div className="relative aspect-[3/4] overflow-hidden bg-secondary">
              <Image
                src={image ?? ""}
                alt={name}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                className={`transition-transform duration-700 ${isHovered ? "scale-110" : "scale-100"} ${isVirginStraightBulk ? "object-contain p-2" : "object-cover"}`}
              />
            </div>
          )}

          {tag && (
            <span className="absolute left-4 top-4 bg-accent px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-accent-foreground">
              {tag}
            </span>
          )}

        </div>

        {/* Details */}
        <div className="flex flex-col gap-1 pt-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            {category}
          </p>
          <h3 className="font-serif text-lg font-semibold text-foreground">{name}</h3>
          <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
          <p className="mt-1 text-lg font-semibold text-foreground">{price}</p>
        </div>
      </div>
    </Link>
  )
}
