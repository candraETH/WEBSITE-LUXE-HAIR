"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useState } from "react"
import { WHATSAPP_ENABLED, getWhatsAppHref } from "@/lib/whatsapp-config"

const WHATSAPP_SUPPORT_MESSAGE = "Hi, I need help choosing the right hair product."
const AUTO_SLIDE_MS = 6000

type HeroSlide = {
  id: string
  image: string
  alt: string
  eyebrow: string
  title: string
  description: string
  ctaLabel: string
  ctaHref: string
  imageClassName?: string
}

const HERO_SLIDES: HeroSlide[] = [
  {
    id: "main",
    image: "/images/hero.jpg",
    alt: "Luxurious hair extensions on silk fabric",
    eyebrow: "Premium Quality Hair",
    title: "Elevate Your\nNatural Beauty",
    description:
      "Discover our curated collection of premium hair extensions, wigs, weft hair, and bulk hair. Luxury you can feel.",
    ctaLabel: "Explore Collection",
    ctaHref: "#extensions",
  },
  {
    id: "promo",
    image: "/images/hero%202.jpg",
    alt: "Premium hair promotion banner",
    eyebrow: "Limited Time Offer",
    title: "Get 25% Off\nAll Collections",
    description:
      "Upgrade your look with salon-quality bulk hair, weft hair, extensions, and wigs. Promo is available for all categories.",
    ctaLabel: "Shop 25% Off",
    ctaHref: "/bulk-hair",
    imageClassName: "object-contain object-center",
  },
  {
    id: "promo-2",
    image: "/images/hero%203.png",
    alt: "Premium bundles and bulk hair showcase",
    eyebrow: "New Arrival",
    title: "Luxury Texture\nNow Available",
    description:
      "Discover our newest premium bundles and bulk hair selections with salon-grade quality and timeless finish.",
    ctaLabel: "Shop New Arrival",
    ctaHref: "/weft-hair",
    imageClassName: "object-contain object-center",
  },
]

export function Hero() {
  const [activeSlideIndex, setActiveSlideIndex] = useState(0)
  const activeSlide = HERO_SLIDES[activeSlideIndex]

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveSlideIndex((prev) => (prev + 1) % HERO_SLIDES.length)
    }, AUTO_SLIDE_MS)

    return () => window.clearInterval(timer)
  }, [])

  return (
    <section id="home" className="relative min-h-[42vh] overflow-hidden pt-24 lg:pt-28">
      <div className="absolute inset-0">
        {HERO_SLIDES.map((slide, index) => (
          <div
            key={slide.id}
            className={`absolute inset-0 transition-opacity duration-700 ${
              index === activeSlideIndex ? "opacity-100" : "opacity-0"
            } bg-[#120f0d]`}
          >
            <Image
              src={slide.image}
              alt={slide.alt}
              fill
              sizes="100vw"
              className={slide.imageClassName ?? "object-cover object-center"}
              priority={index === 0}
            />
            <div className="absolute inset-0 bg-foreground/45" />
          </div>
        ))}
      </div>

      <div className="relative z-10 flex min-h-[42vh] flex-col items-center justify-center px-6 py-10 text-center md:py-12">
        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.3em] text-background/80">
          {activeSlide.eyebrow}
        </p>
        <h1 className="font-serif text-4xl font-bold leading-tight text-background md:text-6xl lg:text-7xl text-balance">
          {activeSlide.title.split("\n").map((line, index, lines) => (
            <span key={`${activeSlide.id}-${line}`}>
              {line}
              {index < lines.length - 1 && <br />}
            </span>
          ))}
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-sm leading-relaxed text-background/80 md:text-base">
          {activeSlide.description}
        </p>

        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
          <Link
            href={activeSlide.ctaHref}
            className="border border-background bg-background px-7 py-3 text-xs font-semibold uppercase tracking-widest text-foreground transition-colors hover:bg-background/90"
          >
            {activeSlide.ctaLabel}
          </Link>
          <a
            href={getWhatsAppHref(WHATSAPP_SUPPORT_MESSAGE)}
            target={WHATSAPP_ENABLED ? "_blank" : undefined}
            rel={WHATSAPP_ENABLED ? "noopener noreferrer" : undefined}
            aria-disabled={!WHATSAPP_ENABLED}
            title={!WHATSAPP_ENABLED ? "WhatsApp is temporarily unavailable" : undefined}
            className={`flex items-center gap-2 border border-background/50 px-7 py-3 text-xs font-semibold uppercase tracking-widest text-background transition-colors hover:bg-background/10 ${
              !WHATSAPP_ENABLED ? "pointer-events-none cursor-not-allowed opacity-55" : ""
            }`}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            WhatsApp Support
          </a>
        </div>

        <div className="mt-6 flex items-center gap-2">
          {HERO_SLIDES.map((slide, index) => (
            <button
              key={`dot-${slide.id}`}
              type="button"
              onClick={() => setActiveSlideIndex(index)}
              aria-label={`Show slide ${index + 1}`}
              className={`h-2.5 rounded-full transition-all ${
                index === activeSlideIndex ? "w-8 bg-white" : "w-2.5 bg-white/50 hover:bg-white/70"
              }`}
            />
          ))}
        </div>
      </div>

      <div className="absolute bottom-6 left-1/2 z-10 -translate-x-1/2">
        <div className="flex flex-col items-center gap-2">
          <span className="text-[10px] uppercase tracking-[0.2em] text-background/60">Scroll</span>
          <div className="h-10 w-px bg-background/40" />
        </div>
      </div>
    </section>
  )
}
