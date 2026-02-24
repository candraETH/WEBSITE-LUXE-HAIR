"use client"

import Image from "next/image"
import Link from "next/link"
import { use, useEffect, useMemo, useState, type MouseEvent } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Footer } from "@/components/footer"
import { Navbar } from "@/components/navbar"
import { MAX_ITEM_QUANTITY, useCart } from "@/context/CartContext"
import { testimonialsCount } from "@/lib/testimonials-data"
import { LAST_VISITED_ROUTE_KEY } from "@/lib/navigation-state"

type ProductColor = {
  code: string
  label: string
  hex: string
}

type ProductItem = {
  slug: string
  name: string
  price: string
  image: string
  category: string
  description: string
  longDescription: string
  basePrice: number
  pricePerInch: number
  tag?: string
  gallery?: string[]
  colorImageFolder?: string
  colorImageMap?: Record<string, string>
  colors?: ProductColor[]
}

// Product data
const allProducts: ProductItem[] = [
  // Hair Extensions
  {
    slug: "silky-straight-clip-ins",
    name: "Silky Straight Clip-Ins",
    price: "$120 - $280",
    image: "/images/extensions-1.jpg",
    category: "Hair Extensions",
    description: "100% human hair clip-in extensions. Available in 16-26 inch lengths.",
    longDescription: "Premium quality silky straight clip-in hair extensions made from 100% human hair. Perfect for adding length, volume, and dimension to your natural hair. Our clip-ins are durable, reusable, and can be styled, colored, and heat treated just like natural hair.",
    tag: "Best Seller",
    basePrice: 120,
    pricePerInch: 6.67,
  },
  {
    slug: "honey-blonde-tape-ins",
    name: "Honey Blonde Tape-Ins",
    price: "$150 - $320",
    image: "/images/extensions-2.jpg",
    category: "Hair Extensions",
    description: "Premium tape-in extensions with seamless blend. Reusable up to 3 times.",
    longDescription: "Luxurious honey blonde tape-in extensions with a seamless blend. These premium extensions are reusable up to 3 times and provide a natural, undetectable look. Perfect for all hair types.",
    basePrice: 150,
    pricePerInch: 8.5,
  },
  {
    slug: "body-wave-bundles",
    name: "Body Wave Bundles",
    price: "$95 - $250",
    image: "/images/extensions-3.jpg",
    category: "Hair Extensions",
    description: "Luxurious body wave texture. Can be colored and heat styled.",
    longDescription: "Beautiful body wave texture bundles that can be customized to your preferences. Heat-resistant, durable, and perfect for creating voluminous, wavy styles.",
    basePrice: 95,
    pricePerInch: 5.8,
  },
  // Wigs
  {
    slug: "straight-lace-front-wig",
    name: "Straight Lace Front Wig",
    price: "$250 - $450",
    image: "/images/wig-1.jpg",
    category: "Wigs",
    description: "HD lace front with pre-plucked hairline. Natural jet black, 18-30 inches.",
    longDescription: "Premium HD lace front wig with a pre-plucked, natural-looking hairline. Made from 100% human hair in natural jet black. Breathable cap construction for all-day comfort.",
    tag: "Best Seller",
    basePrice: 250,
    pricePerInch: 6.67,
  },
  {
    slug: "deep-wave-closure-wig",
    name: "Deep Wave Closure Wig",
    price: "$280 - $480",
    image: "/images/wig-2.jpg",
    category: "Wigs",
    description: "4x4 closure wig with deep wave curls. Breathable cap construction.",
    longDescription: "Stunning deep wave closure wig with gorgeous curls and a breathable cap construction. Perfect for a glamorous, bouncy look that turns heads.",
    basePrice: 280,
    pricePerInch: 8.0,
  },
  {
    slug: "burgundy-bob-wig",
    name: "Burgundy Bob Wig",
    price: "$180 - $320",
    image: "/images/wig-3.jpg",
    category: "Wigs",
    description: "Chic bob cut in burgundy wine. Perfect for a bold, sophisticated look.",
    longDescription: "Sophisticated burgundy bob wig with a chic, modern cut. Perfect for making a bold statement while maintaining an elegant appearance.",
    tag: "Trending",
    basePrice: 180,
    pricePerInch: 5.6,
  },
  // Weft Hair
  {
    slug: "machine-weft-straight",
    name: "Machine Weft Straight",
    price: "$80 - $180",
    image: "/images/weft-1.jpg",
    category: "Weft Hair",
    description: "Durable machine weft sewing. Ideal for sew-in installations. 12-28 inches.",
    longDescription: "Durable machine-made weft hair perfect for professional sew-in installations. High quality with minimal shedding for long-lasting wear.",
    basePrice: 80,
    pricePerInch: 4.0,
  },
  {
    slug: "hand-tied-loose-wave",
    name: "Hand-Tied Loose Wave",
    price: "$130 - $280",
    image: "/images/weft-2.jpg",
    category: "Weft Hair",
    description: "Ultra-thin hand-tied wefts that lay flat. Perfect for volume and length.",
    longDescription: "Luxurious hand-tied weft with loose wave texture. Ultra-thin wefts lay completely flat for an undetectable, seamless look. Creates beautiful volume and dimension.",
    tag: "Premium",
    basePrice: 130,
    pricePerInch: 6.5,
  },
  {
    slug: "flat-weft-platinum",
    name: "Flat Weft Platinum",
    price: "$110 - $240",
    image: "/images/weft-3.jpg",
    category: "Weft Hair",
    description: "Platinum blonde flat weft. Minimal shedding, tangle-free guarantee.",
    longDescription: "Beautiful platinum blonde flat weft hair with guaranteed minimal shedding and no tangles. Perfect for creating stunning blonde styles.",
    basePrice: 110,
    pricePerInch: 5.2,
  },
  // Bulk Hair
  {
    slug: "virgin-straight-bulk",
    name: "Virgin Straight Bulk",
    price: "$70 - $160",
    image: "/images/images1.png",
    category: "Bulk Hair",
    description: "100% virgin hair without weft. Perfect for braiding and custom wig making.",
    longDescription: "Premium 100% virgin bulk hair without weft. Unprocessed and perfect for braiding, custom wig construction, and creative styling projects.",
    basePrice: 70,
    pricePerInch: 3.6,
    colorImageMap: {
      "#ash": "/images/images2.png",
    },
    colors: [
      { code: "#ash", label: "Ash", hex: "#b8b8b8" },
      { code: "#60", label: "Light Blonde", hex: "#f5e6d3" },
      { code: "#613", label: "Gold Blonde", hex: "#f4d49e" },
      { code: "#24", label: "Medium Ash", hex: "#c9b5a0" },
      { code: "#18", label: "Honey Brown", hex: "#d4a574" },
      { code: "#16", label: "Light Brown", hex: "#c9a570" },
      { code: "#14", label: "Medium Brown", hex: "#a0795f" },
      { code: "#12", label: "Dark Brown", hex: "#8b6f47" },
      { code: "#10", label: "Chestnut Brown", hex: "#6b5847" },
      { code: "#8", label: "Dark Chestnut", hex: "#5a4a3a" },
      { code: "#4", label: "Deep Brown", hex: "#3d3129" },
      { code: "#2", label: "Natural Hair", hex: "#1a1a1a" },
    ],
  },
  {
    slug: "natural-braiding-hair",
    name: "Natural Braiding Hair",
    price: "$60 - $140",
    image: "/images/Natural%20Braiding%20Hair/Natural%20Braiding%20Hair%201.png",
    gallery: [
      "/images/Natural%20Braiding%20Hair/Natural%20Braiding%20Hair%204.png",
      "/images/Natural%20Braiding%20Hair/Natural%20Braiding%20Hair%203.png",
    ],
    colorImageFolder: "/images/Natural%20Braiding%20Hair",
    colorImageMap: {
      "#ash": "/images/Natural%20Braiding%20Hair/ash.png",
    },
    category: "Bulk Hair",
    description: "Soft, tangle-free bulk hair ideal for box braids and twists.",
    longDescription: "Soft, premium quality bulk braiding hair that's tangle-free and perfect for creating beautiful box braids, twists, and other protective styles.",
    tag: "Popular",
    basePrice: 60,
    pricePerInch: 3.2,
  },
  {
    slug: "wavy-bulk-premium",
    name: "Wavy Bulk Premium",
    price: "$85 - $180",
    image: "/images/Wavy%20Bulk%20Premium/Wavy%20Bulk%20Premium.png",
    colorImageFolder: "/images/Wavy%20Bulk%20Premium",
    category: "Bulk Hair",
    description: "Premium grade wavy bulk hair. Unprocessed, can be colored to any shade.",
    longDescription: "Premium grade wavy bulk hair that's unprocessed and can be colored to any shade. Perfect for custom wig making and creative styling.",
    tag: "New",
    basePrice: 85,
    pricePerInch: 4.2,
  },
]

const DEFAULT_HAIR_COLORS = [
  { code: "#ash", label: "Ash", hex: "#b8b8b8" },
  { code: "#60", label: "Light Blonde", hex: "#f5e6d3" },
  { code: "#613", label: "Gold Blonde", hex: "#f4d49e" },
  { code: "#24", label: "Medium Ash", hex: "#c9b5a0" },
  { code: "#18", label: "Honey Brown", hex: "#d4a574" },
  { code: "#16", label: "Light Brown", hex: "#c9a570" },
  { code: "#14", label: "Medium Brown", hex: "#a0795f" },
  { code: "#12", label: "Dark Brown", hex: "#8b6f47" },
  { code: "#10", label: "Chestnut Brown", hex: "#6b5847" },
  { code: "#8", label: "Dark Chestnut", hex: "#5a4a3a" },
  { code: "#4", label: "Deep Brown", hex: "#3d3129" },
  { code: "#2", label: "Natural Hair", hex: "#1a1a1a" },
]

interface PageProps {
  params: Promise<{
    slug: string
  }>
}

export default function OrderPage({ params }: PageProps) {
  const router = useRouter()
  const { slug } = use(params)
  const product = allProducts.find((p) => p.slug === slug)
  const [selectedColorCode, setSelectedColorCode] = useState<string>("")
  const [activeImageIndex, setActiveImageIndex] = useState(0)
  const [backToShopHref, setBackToShopHref] = useState("/")

  useEffect(() => {
    const storedRoute = window.localStorage.getItem(LAST_VISITED_ROUTE_KEY)
    if (storedRoute && !storedRoute.startsWith("/order/") && !storedRoute.startsWith("/cart")) {
      setBackToShopHref(storedRoute)
      return
    }

    const referrer = document.referrer
    if (!referrer) {
      return
    }

    try {
      const refUrl = new URL(referrer)
      if (
        refUrl.origin === window.location.origin &&
        !refUrl.pathname.startsWith("/order/") &&
        !refUrl.pathname.startsWith("/cart")
      ) {
        setBackToShopHref(`${refUrl.pathname}${refUrl.search}${refUrl.hash}`)
      }
    } catch {
      // ignore invalid referrer
    }
  }, [])

  const handleBackToShopClick = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault()
    if (window.history.length > 1) {
      router.back()
      return
    }
    router.push(backToShopHref)
  }

  const isVirginStraightBulk = product?.slug === "virgin-straight-bulk"
  const colorImageFolder = product?.colorImageFolder
  const colorImageMap = product?.colorImageMap
  const resolvedColorImageMap = useMemo(() => {
    if (!product) {
      return {}
    }

    const map: Record<string, string> = {}

    for (const [code, src] of Object.entries(colorImageMap ?? {})) {
      map[code.toLowerCase()] = src
    }

    if (isVirginStraightBulk || colorImageFolder) {
      const colorList = product.colors ?? DEFAULT_HAIR_COLORS
      for (const color of colorList) {
        const normalizedCode = (color.code ?? "").toLowerCase()
        if (!normalizedCode || map[normalizedCode]) {
          continue
        }

        let fileKey = normalizedCode.replace(/[^a-z0-9]/gi, "")
        if (colorImageFolder && normalizedCode === "#ash") {
          fileKey = "%23ash"
        }
        if (!fileKey) {
          continue
        }

        if (colorImageFolder) {
          map[normalizedCode] = `${colorImageFolder}/${fileKey}.png`
          continue
        }

        map[normalizedCode] = `/images/${fileKey}.png`
      }
    }

    return map
  }, [colorImageFolder, colorImageMap, isVirginStraightBulk, product])
  const [availableColorImageMap, setAvailableColorImageMap] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!product) {
      setAvailableColorImageMap({})
      return
    }

    let mounted = true
    const entries = Object.entries(resolvedColorImageMap)

    if (entries.length === 0) {
      setAvailableColorImageMap({})
      return
    }

    const checkAvailability = async () => {
      const results = await Promise.all(
        entries.map(async ([code, src]) => {
          try {
            const response = await fetch(src, { method: "GET" })
            if (response.ok) {
              return [code, src] as const
            }
          } catch {
            // ignore missing files
          }
          return null
        })
      )

      if (!mounted) {
        return
      }

      const nextMap: Record<string, string> = {}
      for (const result of results) {
        if (result) {
          nextMap[result[0]] = result[1]
        }
      }
      setAvailableColorImageMap(nextMap)
    }

    void checkAvailability()

    return () => {
      mounted = false
    }
  }, [product, resolvedColorImageMap])

  const galleryImages = useMemo(() => {
    if (!product) {
      return []
    }

    const productGallery = product.gallery ?? []
    const mergedImages = [product.image, ...productGallery, ...Object.values(availableColorImageMap)]
    return Array.from(new Set(mergedImages.filter(Boolean)))
  }, [product, availableColorImageMap])

  useEffect(() => {
    setSelectedColorCode("")
    setActiveImageIndex(0)
  }, [slug])

  useEffect(() => {
    if (!product) {
      return
    }

    if (!selectedColorCode) {
      setActiveImageIndex(0)
      return
    }
    const normalized = selectedColorCode.toLowerCase()
    const colorImage = availableColorImageMap[normalized]

    if (colorImage) {
      const matchedImageIndex = galleryImages.findIndex((imageSrc) => imageSrc === colorImage)
      if (matchedImageIndex >= 0) {
        setActiveImageIndex(matchedImageIndex)
        return
      }
    }
  }, [product, selectedColorCode, availableColorImageMap, galleryImages])

  if (!product) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex flex-col items-center justify-center px-6 py-24">
          <h1 className="mb-4 text-3xl font-serif font-bold">Product Not Found</h1>
          <p className="mb-8 text-muted-foreground">The product you&apos;re looking for doesn&apos;t exist.</p>
          <Link href={backToShopHref} onClick={handleBackToShopClick}>
            <Button className="inline-flex items-center gap-2">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-4 w-4" aria-hidden="true">
                <path d="M15 18l-6-6 6-6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Back to Shop
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  const activeImageSrc = galleryImages[activeImageIndex] ?? product.image
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#eeeeef] pt-[72px] lg:pt-[78px]">
      <Navbar />

      <div className="mx-auto max-w-[980px] px-4 pb-12 sm:px-6">
        <div className="py-3 lg:py-4">
          <Link href={backToShopHref} onClick={handleBackToShopClick}>
            <Button
              variant="ghost"
              className="inline-flex items-center gap-2 px-0 text-sm text-muted-foreground/80 transition-colors hover:text-foreground"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-4 w-4" aria-hidden="true">
                <path d="M15 18l-6-6 6-6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Back to Shop
            </Button>
          </Link>
        </div>

        <article className="overflow-hidden bg-white shadow-[0_26px_60px_-38px_rgba(0,0,0,0.55)]">
          <div className="relative aspect-[3/4] w-full bg-[#d8d8da]">
            <Image
              src={activeImageSrc}
              alt={product.name}
              fill
              sizes="(max-width: 1024px) 100vw, 980px"
              className={isVirginStraightBulk ? "object-contain p-6" : "object-cover"}
              priority
            />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-black/20 to-transparent" />

            {galleryImages.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() =>
                    setActiveImageIndex((prev) => (prev === 0 ? galleryImages.length - 1 : prev - 1))
                  }
                  className="absolute left-3 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white transition-colors hover:bg-black/60"
                  aria-label="Previous image"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-5 w-5" aria-hidden="true">
                    <path d="M15 18l-6-6 6-6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setActiveImageIndex((prev) => (prev === galleryImages.length - 1 ? 0 : prev + 1))
                  }
                  className="absolute right-3 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white transition-colors hover:bg-black/60"
                  aria-label="Next image"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-5 w-5" aria-hidden="true">
                    <path d="m9 6 6 6-6 6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </>
            )}

            <div className="absolute bottom-6 left-6 inline-flex h-14 w-14 items-center justify-center rounded-full bg-black text-white">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-7 w-7" aria-hidden="true">
                <path d="M4 18h16M7 18l5-7 5 7M9 8a3 3 0 1 1 6 0" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>

            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/55 px-4 py-2 text-lg font-medium text-white">
              {activeImageIndex + 1}/{galleryImages.length}
            </div>

          </div>

          <div className="px-6 py-7 sm:px-8 sm:py-10">
            <h1 className="font-serif text-4xl font-semibold leading-tight text-[#101010] sm:text-5xl">
              {product.name}
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-relaxed text-[#555]">
              {product.longDescription}
            </p>

            <SelectLengthComponent
              basePrice={product.basePrice}
              pricePerInch={product.pricePerInch}
              slug={product.slug}
              name={product.name}
              category={product.category}
              image={product.image}
              colorImageMap={availableColorImageMap}
              onColorChange={setSelectedColorCode}
              colors={product.colors}
            />
          </div>
        </article>
      </div>

      <Footer />
    </main>
  )
}

function SelectLengthComponent({ 
  basePrice, 
  pricePerInch,
  slug,
  name,
  category,
  image,
  colorImageMap,
  onColorChange,
  colors,
}: { 
  basePrice: number
  pricePerInch: number
  slug: string
  name: string
  category: string
  image: string
  colorImageMap?: Record<string, string>
  onColorChange?: (colorCode: string) => void
  colors?: Array<{ code: string; label: string; hex: string }>
}) {
  const [selectedLength, setSelectedLength] = useState<string>("18")
  const [quantity, setQuantity] = useState<number>(1)
  const [selectedColorCode, setSelectedColorCode] = useState<string>("")
  const [isAddingToCart, setIsAddingToCart] = useState(false)
  const { addToCart } = useCart()
  const supportsColorSelection = ["Hair Extensions", "Weft Hair", "Bulk Hair"].includes(category)
  const availableColors =
    colors && colors.length > 0 ? colors : supportsColorSelection ? DEFAULT_HAIR_COLORS : []
  
  const lengths = [16, 18, 20, 22, 24, 26]
  const currentLength = parseInt(selectedLength)
  const normalizedColorCode = selectedColorCode.toLowerCase()
  const selectedColor = availableColors.find((color) => color.code.toLowerCase() === normalizedColorCode)
  const selectedColorLabel = selectedColor?.label ?? ""
  const selectedColorDisplay =
    selectedColorLabel && selectedColorCode
      ? `${selectedColorLabel} ${selectedColorCode}`
      : selectedColorLabel || selectedColorCode
  const colorSurcharge = normalizedColorCode && normalizedColorCode !== "#2" ? 15 : 0
  const baseSinglePrice = parseFloat((basePrice + (currentLength - 16) * pricePerInch).toFixed(2))
  const singlePrice = parseFloat((baseSinglePrice + colorSurcharge).toFixed(2))
  const grandTotal = (singlePrice * quantity).toFixed(2)
  const reviewLabel = `${testimonialsCount} ${testimonialsCount === 1 ? "Review" : "Reviews"}`
  const selectedImage =
    normalizedColorCode && colorImageMap?.[normalizedColorCode]
      ? colorImageMap[normalizedColorCode]
      : image

  const handleQuantityChange = (value: number) => {
    const nextValue = Number.isFinite(value) ? Math.floor(value) : 1
    setQuantity(Math.min(MAX_ITEM_QUANTITY, Math.max(1, nextValue)))
  }

  const animateFlyToCart = (sourceButton: HTMLButtonElement) => {
    const cartCandidates = Array.from(
      document.querySelectorAll('[data-cart-target="true"]')
    ) as HTMLElement[]

    const cartTarget =
      cartCandidates.find((target) => {
        const rect = target.getBoundingClientRect()
        return rect.width > 0 && rect.height > 0
      }) ?? (document.querySelector('a[href="/cart"]') as HTMLElement | null)

    if (!cartTarget) {
      return Promise.resolve()
    }

    const sourceIcon = sourceButton.querySelector('[data-fly-source="true"]') as HTMLElement | null
    const sourceRect = (sourceIcon ?? sourceButton).getBoundingClientRect()
    const targetRect = cartTarget.getBoundingClientRect()

    const startX = sourceRect.left + sourceRect.width / 2
    const startY = sourceRect.top + sourceRect.height / 2
    const endX = targetRect.left + targetRect.width / 2
    const endY = targetRect.top + targetRect.height / 2

    const flyNode = document.createElement("div")
    flyNode.setAttribute("aria-hidden", "true")
    flyNode.style.position = "fixed"
    flyNode.style.left = `${startX - 18}px`
    flyNode.style.top = `${startY - 18}px`
    flyNode.style.width = "36px"
    flyNode.style.height = "36px"
    flyNode.style.borderRadius = "9999px"
    flyNode.style.background = "linear-gradient(135deg, #D4AF37, #C4951F)"
    flyNode.style.display = "flex"
    flyNode.style.alignItems = "center"
    flyNode.style.justifyContent = "center"
    flyNode.style.color = "#ffffff"
    flyNode.style.boxShadow = "0 12px 30px rgba(0,0,0,0.25)"
    flyNode.style.pointerEvents = "none"
    flyNode.style.zIndex = "9999"
    flyNode.style.transform = "translate(0, 0) scale(1)"
    flyNode.style.opacity = "1"
    flyNode.style.willChange = "transform, opacity"
    flyNode.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:18px;height:18px"><path stroke-linecap="round" stroke-linejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/></svg>'

    document.body.appendChild(flyNode)

    return new Promise<void>((resolve) => {
      const deltaX = endX - startX
      const deltaY = endY - startY
      const distance = Math.hypot(deltaX, deltaY)
      const curveLift = Math.min(140, Math.max(70, distance * 0.18))
      const samples = [0, 0.2, 0.4, 0.6, 0.8, 1]
      const flyKeyframes = samples.map((t) => {
        const x = deltaX * t
        const y = deltaY * t - 4 * curveLift * t * (1 - t)
        const scale = 1 - 0.8 * t
        const rotate = 8 * (1 - t)
        return {
          transform: `translate(${x}px, ${y}px) scale(${scale}) rotate(${rotate}deg)`,
          opacity: `${1 - 0.72 * t}`,
          offset: t,
        }
      })

      const flightAnimation = flyNode.animate(flyKeyframes, {
        duration: 420,
        easing: "linear",
        fill: "forwards",
      })

      let cleanedUp = false

      const cleanup = () => {
        if (cleanedUp) {
          return
        }

        cleanedUp = true
        flyNode.remove()
        cartTarget.animate(
          [
            { transform: "scale(1)" },
            { transform: "scale(1.16)" },
            { transform: "scale(0.97)" },
            { transform: "scale(1.05)" },
            { transform: "scale(1)" },
          ],
          { duration: 260, easing: "cubic-bezier(0.34, 1.56, 0.64, 1)" }
        )
        resolve()
      }

      flightAnimation.onfinish = cleanup
      flightAnimation.oncancel = cleanup
      window.setTimeout(cleanup, 700)
    })
  }

  const handleAddToCart = async (sourceButton: HTMLButtonElement) => {
    if (isAddingToCart) {
      return
    }

    setIsAddingToCart(true)
    await animateFlyToCart(sourceButton)
    addToCart({
      slug,
      name: selectedColorDisplay ? `${name} - ${selectedColorDisplay}` : name,
      category,
      length: currentLength,
      quantity,
      price: singlePrice,
      basePrice,
      pricePerInch,
      image: selectedImage,
      variant: selectedColorCode || "default",
    })
    setIsAddingToCart(false)
  }

  return (
    <div className="mt-8 w-full min-w-0 space-y-8 overflow-x-hidden">
      {availableColors.length > 0 && (
        <div>
          <p className="text-2xl font-normal text-[#5f5f61] sm:text-[45px]">Color: {selectedColorDisplay || "Default"}</p>
          <div className="mt-5 flex flex-wrap gap-3">
            {availableColors.map((color) => {
              const isSelectedColor = selectedColorCode.toLowerCase() === color.code.toLowerCase()
              return (
                <button
                  key={color.code}
                  type="button"
                  onClick={() => {
                    setSelectedColorCode(color.code)
                    onColorChange?.(color.code)
                  }}
                  className={`relative h-16 w-16 rounded-full border-2 transition-all ${
                    isSelectedColor ? "border-black p-1 shadow-[0_0_0_2px_rgba(0,0,0,0.2)]" : "border-[#7c7c7f]"
                  }`}
                  title={`${color.label} (${color.code})`}
                  aria-label={`Select color ${color.label}`}
                >
                  <span
                    className="block h-full w-full rounded-full border border-black/10"
                    style={{ backgroundColor: color.hex }}
                  />
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div>
        <p className="text-2xl font-normal text-[#5f5f61] sm:text-[45px]">Size: {currentLength}&quot;</p>
        <div className="mt-5 grid grid-cols-6 gap-1.5 sm:flex sm:flex-wrap sm:gap-3">
          {lengths.map((length) => {
            const isSelected = selectedLength === length.toString()
            return (
              <button
                key={length}
                type="button"
                onClick={() => setSelectedLength(length.toString())}
                className={`w-full border px-1 py-3 text-center text-xl font-semibold transition-all sm:min-w-[84px] sm:w-auto sm:px-5 sm:text-[32px] ${
                  isSelected
                    ? "border-black bg-black text-white shadow-[0_0_0_4px_rgba(0,0,0,0.12)]"
                    : "border-[#7d7d80] bg-white text-[#121212] hover:bg-[#f6f6f6]"
                }`}
              >
                {length}
              </button>
            )
          })}
        </div>
      </div>

      <div className="space-y-4 border-y border-[#d6d6d8] py-5">
        <ul className="space-y-1.5 rounded-lg border border-[#cfcfd2] bg-[#f8f8f8] px-4 py-3 text-[17px] text-[#232323]">
          {[
            "100% Human Hair",
            "Minimal Shedding",
            "Free Shipping Available",
            "In Stock & Ready to Ship",
            "Heat Resistant & Curlable",
          ].map((feature) => (
            <li key={feature} className="flex items-center gap-2">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#d9ead7] text-[#2f7a38]">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-3 w-3" strokeWidth="3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m5 13 4 4L19 7" />
                </svg>
              </span>
              <span>{feature}</span>
            </li>
          ))}
        </ul>

        <Link
          href="/#testimonials"
          className="block rounded-lg border border-[#cfcfd2] bg-white px-4 py-3 transition-colors hover:bg-[#f7f7f7]"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-[#77777a]">Customer Reviews</p>
          <div className="mt-2 flex items-center gap-1">
            {Array.from({ length: 5 }).map((_, index) => (
              <svg key={index} viewBox="0 0 24 24" className="h-4 w-4 fill-[#111]" aria-hidden="true">
                <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
              </svg>
            ))}
            <span className="ml-2 text-sm font-semibold text-[#121212]">{reviewLabel}</span>
          </div>
          <p className="mt-1 text-sm text-[#6a6a6d]">Tap to read testimonials</p>
        </Link>

        <div className="rounded-lg border border-[#cfcfd2] bg-white px-4 py-3">
          <p className="text-sm text-[#6a6a6d]">Subtotal</p>
          <p className="mt-1 text-xl font-semibold leading-none text-[#121212]">${grandTotal}</p>
        </div>
      </div>

      <div className="grid grid-cols-[1fr_1.2fr] items-center gap-4">
        <div className="flex h-16 items-center rounded-full bg-[#ececee] px-3 sm:h-20 sm:px-4">
          <button
            type="button"
            onClick={() => handleQuantityChange(quantity - 1)}
            disabled={quantity <= 1}
            className="h-10 w-10 text-2xl font-light leading-none text-[#8f8f92] transition-colors hover:text-[#5a5a5d] disabled:cursor-not-allowed disabled:opacity-35 sm:h-12 sm:w-12"
          >
            -
          </button>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={4}
            value={quantity}
            onChange={(event) => handleQuantityChange(parseInt(event.target.value.replace(/\D/g, ""), 10) || 1)}
            className="h-full w-full bg-transparent text-center text-2xl font-semibold text-[#111] focus:outline-none"
          />
          <button
            type="button"
            onClick={() => handleQuantityChange(quantity + 1)}
            disabled={quantity >= MAX_ITEM_QUANTITY}
            className="h-10 w-10 text-2xl font-light leading-none text-[#8f8f92] transition-colors hover:text-[#5a5a5d] disabled:cursor-not-allowed disabled:opacity-35 sm:h-12 sm:w-12"
          >
            +
          </button>
        </div>

        <button
          type="button"
          onClick={(event) => void handleAddToCart(event.currentTarget)}
          disabled={isAddingToCart}
          className="h-16 rounded-full bg-black px-6 text-sm font-semibold uppercase tracking-wide text-white transition-colors hover:bg-[#202022] disabled:cursor-not-allowed disabled:opacity-70 sm:h-20 sm:text-base"
        >
          {isAddingToCart ? "ADDING..." : "ADD TO CART"}
        </button>
      </div>
    </div>
  )
}
