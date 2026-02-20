"use client"

import Image from "next/image"
import Link from "next/link"
import { useState } from "react"
import ProductGallery from "./product-gallery"

const WHATSAPP_BASE = "https://wa.me/6282234109177?text="

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
  const whatsappMessage = encodeURIComponent(
    `Hi, I'm interested in the ${name} (${category}) - ${price}. Can I get more details?`
  )

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

          {/* Hover Overlay */}
          <div
            className={`absolute inset-0 flex items-end bg-foreground/30 p-5 transition-opacity duration-500 ${isHovered ? "opacity-100" : "opacity-0"}`}
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                window.open(`${WHATSAPP_BASE}${whatsappMessage}`, "_blank", "noopener,noreferrer")
              }}
              aria-label={`Order ${name} via WhatsApp`}
              className="flex w-full items-center justify-center gap-2 bg-background py-3 text-xs font-semibold uppercase tracking-widest text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              Order via WhatsApp
            </button>
          </div>
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
