"use client"

import Image from "next/image"
import Link from "next/link"
import { use, useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Footer } from "@/components/footer"
import { Navbar } from "@/components/navbar"
import { useCart } from "@/context/CartContext"
import ProductGallery from "@/components/product-gallery"
import { testimonialsCount } from "@/lib/testimonials-data"

// Product data
const allProducts = [
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
    image: "/images/bulk-2.jpg",
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
    image: "/images/bulk-3.jpg",
    category: "Bulk Hair",
    description: "Premium grade wavy bulk hair. Unprocessed, can be colored to any shade.",
    longDescription: "Premium grade wavy bulk hair that's unprocessed and can be colored to any shade. Perfect for custom wig making and creative styling.",
    tag: "New",
    basePrice: 85,
    pricePerInch: 4.2,
  },
]

const WHATSAPP_NUMBER = "6282234109177"
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
  const { slug } = use(params)
  const product = allProducts.find((p) => p.slug === slug)
  const [selectedColorCode, setSelectedColorCode] = useState<string>("")
  const [activeImageIndex, setActiveImageIndex] = useState(0)

  if (!product) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex flex-col items-center justify-center px-6 py-24">
          <h1 className="mb-4 text-3xl font-serif font-bold">Product Not Found</h1>
          <p className="mb-8 text-muted-foreground">The product you're looking for doesn't exist.</p>
          <Link href="/">
            <Button>Back to Shop</Button>
          </Link>
        </div>
      </div>
    )
  }

  const isVirginStraightBulk = product.slug === "virgin-straight-bulk"
  const colorImageMap = (product as any).colorImageMap as Record<string, string> | undefined
  const resolvedColorImageMap = useMemo(() => {
    const map: Record<string, string> = {}

    for (const [code, src] of Object.entries(colorImageMap ?? {})) {
      map[code.toLowerCase()] = src
    }

    if (isVirginStraightBulk) {
      const colorList = (((product as any).colors ?? []) as Array<{ code: string }>)
      for (const color of colorList) {
        const normalizedCode = (color.code ?? "").toLowerCase()
        if (!normalizedCode || map[normalizedCode]) {
          continue
        }

        const fileKey = normalizedCode.replace(/[^a-z0-9]/gi, "")
        if (!fileKey) {
          continue
        }
        map[normalizedCode] = `/images/${fileKey}.png`
      }
    }

    return map
  }, [colorImageMap, isVirginStraightBulk, product])
  const [availableColorImageMap, setAvailableColorImageMap] = useState<Record<string, string>>({})

  useEffect(() => {
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
          } catch (_error) {
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
  }, [resolvedColorImageMap])

  const galleryImages = useMemo(() => {
    const productGallery = ((product as any).gallery ?? []) as string[]
    const mergedImages = [product.image, ...productGallery, ...Object.values(availableColorImageMap)]
    return Array.from(new Set(mergedImages.filter(Boolean)))
  }, [product, availableColorImageMap])

  useEffect(() => {
    setSelectedColorCode("")
    setActiveImageIndex(0)
  }, [slug])

  useEffect(() => {
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
  }, [selectedColorCode, availableColorImageMap, galleryImages])

  return (
    <main className="min-h-screen overflow-x-hidden bg-gradient-to-b from-background to-background/50 pt-[72px] lg:pt-[78px]">
      <Navbar />

      {/* Back Button */}
      <div className="mx-auto max-w-7xl px-6 py-3 lg:py-4">
        <Link href="/">
          <Button variant="ghost" className="text-sm text-muted-foreground/70 hover:text-foreground transition-colors">
            Back to Shop
          </Button>
        </Link>
      </div>

      {/* Order Section */}
      <div className="mx-auto max-w-7xl px-4 md:px-5 lg:px-6 pb-10 lg:pb-16">
        {/* Product Info */}
        <div className="mb-8 grid items-start lg:mb-10 lg:grid-cols-2 lg:gap-12">
          <div className="hidden lg:block" />
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-accent/80">
              {product.category}
            </p>
            {product.tag && (
              <span className="mb-6 inline-block bg-accent/10 border border-accent/30 px-4 py-2 text-[11px] font-semibold uppercase tracking-widest text-accent rounded-full">
                {product.tag}
              </span>
            )}
            <h1 className="mb-5 font-serif text-4xl font-bold leading-tight text-foreground lg:text-5xl">
              {product.name}
            </h1>
            <p className="mb-5 text-2xl font-semibold text-accent">{product.price}</p>
            <p className="mb-0 text-base leading-relaxed text-muted-foreground/90">
              {product.longDescription}
            </p>
          </div>
        </div>

        <div className="grid items-start gap-8 lg:grid-cols-2 lg:gap-12">
          {/* Product Image */}
          <div className="order-2 min-w-0 lg:order-1">
            <ProductGallery
              images={galleryImages}
              alt={product.name}
              useContainFit={isVirginStraightBulk}
              selectedIndex={activeImageIndex}
              onIndexChange={(i) => setActiveImageIndex(i)}
            />
          </div>

          {/* Order Form */}
          <div className="order-1 min-w-0 lg:order-2">
            <div className="overflow-hidden rounded-2xl border border-border/30 bg-gradient-to-b from-card to-card/50 px-4 py-6 sm:px-5 md:px-6 md:py-7 shadow-lg backdrop-blur-sm">
              <div>
                <h3 className="mb-4 font-serif text-2xl font-semibold text-foreground">
                  Select Your Length
                </h3>
                <p className="mb-6 text-sm text-muted-foreground/90">
                  Available in professional sizes
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
                  colors={(product as any).colors}
                />
              </div>

          </div>
        </div>
      </div>

        <div className="mt-8 rounded-2xl border border-border/30 bg-gradient-to-b from-card to-card/50 p-6 lg:p-8 shadow-sm">
          <h3 className="mb-5 font-serif text-lg font-semibold text-foreground">
            What's Included
          </h3>
          <div className="grid gap-3 text-sm text-muted-foreground/90 md:grid-cols-3">
            <p>Premium materials with quality guarantee</p>
            <p>Color and customization options available</p>
            <p>Expert consultation & support</p>
          </div>
          <p className="mt-6 border-t border-border/30 pt-5 text-center text-xs text-muted-foreground/70">
            Add items to your cart or order directly
          </p>
        </div>
      </div>

      {/* CTA Section */}
      <section className="mt-24 bg-gradient-to-b from-foreground/95 to-foreground py-16 lg:py-24">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-accent/70 mb-4">
            Ready to Order?
          </p>
          <h2 className="mb-6 font-serif text-4xl lg:text-5xl font-bold text-background">
            Get Your Dream Hair Today
          </h2>
          <p className="mb-8 text-base text-background/80 leading-relaxed max-w-2xl mx-auto">
            Browse our collection, choose your favorites, and reach out to us via WhatsApp to place your order. We offer fast shipping and personalized consultations.
          </p>
          
          <a
            href={`https://wa.me/${WHATSAPP_NUMBER}?text=Hi, I'd like to know more about your hair products and place an order. Thank you!`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 bg-background text-foreground px-8 py-4 font-semibold rounded-lg transition-all duration-300 hover:shadow-lg hover:scale-105 active:scale-95"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            Contact Us on WhatsApp
          </a>

          <div className="mt-8 pt-8 border-t border-background/20 text-sm text-background/70 space-y-2">
            <p>âœ“ Available 24/7 for your convenience</p>
            <p>âœ“ Fast replies guaranteed</p>
          </div>
        </div>
      </section>

      {/* Footer */}
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
  const { addToCart, getTotalItems } = useCart()
  const supportsColorSelection = ["Hair Extensions", "Weft Hair", "Bulk Hair"].includes(category)
  const availableColors =
    colors && colors.length > 0 ? colors : supportsColorSelection ? DEFAULT_HAIR_COLORS : []
  
  const lengths = [16, 18, 20, 22, 24, 26]
  const currentLength = parseInt(selectedLength)
  const normalizedColorCode = selectedColorCode.toLowerCase()
  const selectedColor = availableColors.find((color) => color.code.toLowerCase() === normalizedColorCode)
  const selectedColorLabel = selectedColor?.label ?? ""
  const colorSurcharge =
    slug === "virgin-straight-bulk" && normalizedColorCode && normalizedColorCode !== "#2" ? 15 : 0
  const baseSinglePrice = parseFloat((basePrice + (currentLength - 16) * pricePerInch).toFixed(2))
  const singlePrice = parseFloat((baseSinglePrice + colorSurcharge).toFixed(2))
  const totalPrice = (singlePrice * quantity).toFixed(2)
  const reviewLabel = `${testimonialsCount} ${testimonialsCount === 1 ? "Review" : "Reviews"}`
  const selectedImage =
    normalizedColorCode && colorImageMap?.[normalizedColorCode]
      ? colorImageMap[normalizedColorCode]
      : image

  const handleQuantityChange = (value: number) => {
    if (value >= 1) {
      setQuantity(value)
    }
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
      name: selectedColorLabel ? `${name} - ${selectedColorLabel}` : name,
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

  const handleDirectWhatsApp = () => {
    const colorTag = selectedColorLabel ? ` - Color: ${selectedColorLabel} (${selectedColorCode})` : ""
    const surchargeTag = colorSurcharge > 0 ? ` Includes color surcharge (+$${colorSurcharge}/item).` : ""
    const message = encodeURIComponent(
      `Hi, I'm interested in ordering the ${name} (${category})${colorTag} - ${currentLength}" (${quantity} ${quantity === 1 ? 'item' : 'items'}). Total: $${totalPrice}.${surchargeTag} Can you help me complete this order?`
    )
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${message}`, "_blank")
  }

  return (
    <div className="w-full min-w-0 space-y-4 overflow-x-hidden">
      <RadioGroup value={selectedLength} onValueChange={setSelectedLength}>
        <div className="grid gap-1.5 grid-cols-3 sm:grid-cols-3">
          {lengths.map((length) => {
            const price = (basePrice + (length - 16) * pricePerInch + colorSurcharge).toFixed(2)
            const isSelected = selectedLength === length.toString()
            return (
              <div key={length}>
                <RadioGroupItem value={length.toString()} id={`length-${length}`} className="hidden" />
                <Label 
                  htmlFor={`length-${length}`} 
                  className={`flex cursor-pointer flex-col items-center justify-center gap-0.5 rounded-lg border px-2 py-2 text-center transition-all duration-200 ${
                    isSelected
                      ? "border-[#D4AF37] bg-[#FBF8F3] shadow-md hover:shadow-lg"
                      : "border-gray-200 bg-white text-muted-foreground hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center gap-0.5">
                    <span className={`text-sm font-semibold ${isSelected ? "text-foreground" : "text-gray-700"}`}>
                      {length}"
                    </span>
                    {isSelected && (
                      <svg className="w-3 h-3 text-[#D4AF37]" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <span className={`text-[10px] font-bold ${isSelected ? "text-[#D4AF37]" : "text-gray-500"}`}>
                    ${price}
                  </span>
                </Label>
              </div>
            )
          })}
        </div>
      </RadioGroup>

      {/* Color Selection - Only for products with colors */}
      {availableColors.length > 0 && (
        <div className="space-y-3 border-t border-border/30 pt-4">
          <div>
            <h4 className="mb-3 font-semibold text-foreground">Select Color</h4>
            <div className="grid w-full grid-cols-4 gap-2 sm:grid-cols-6">
              {availableColors.map((color) => (
                <button
                  key={color.code}
                  onClick={() => {
                    setSelectedColorCode(color.code)
                    onColorChange?.(color.code)
                  }}
                  className={`flex w-full min-w-0 flex-col items-center gap-1 rounded-lg p-2 transition-all duration-200 ${
                    selectedColorCode.toLowerCase() === color.code.toLowerCase()
                      ? "ring-2 ring-[#D4AF37] bg-[#FBF8F3]"
                      : "hover:bg-secondary"
                  }`}
                >
                  <div
                    className="h-10 w-10 rounded-lg border-2 border-gray-300 shadow-sm"
                    style={{ backgroundColor: color.hex }}
                    title={color.label}
                  />
                  <span className="max-w-full break-words px-0.5 text-[9px] font-semibold leading-tight text-center text-foreground md:text-[10px]">
                    {color.code.toLowerCase() === "#2" ? "#2 ( Natural Hair )" : color.code}
                  </span>
                </button>
              ))}
            </div>
            {slug === "virgin-straight-bulk" && (
              <p className="mt-3 text-xs text-muted-foreground">
                Selected color adds an extra{" "}
                <span className="font-semibold text-[#D4AF37]">$15</span> per item.
                Color <span className="font-semibold text-foreground">#2</span> has no extra charge.
              </p>
            )}
          </div>
        </div>
      )}
      <div className="flex flex-col items-center gap-2">
        <span className="text-sm font-medium text-foreground">Order Quantity</span>
        <div className="flex items-center overflow-hidden rounded-lg border border-gray-300 bg-white">
          <button
            onClick={() => handleQuantityChange(quantity - 1)}
            className="flex h-10 w-10 items-center justify-center text-lg text-gray-600 transition-colors hover:text-foreground sm:h-8 sm:w-8 sm:text-sm"
          >
            -
          </button>
          <span className="flex h-10 min-w-[52px] items-center justify-center border-l border-r border-gray-300 px-3 text-base font-semibold text-foreground sm:h-8 sm:min-w-[40px] sm:px-2 sm:text-sm">
            {quantity}
          </span>
          <button
            onClick={() => handleQuantityChange(quantity + 1)}
            className="flex h-10 w-10 items-center justify-center text-lg text-gray-600 transition-colors hover:text-foreground sm:h-8 sm:w-8 sm:text-sm"
          >
            +
          </button>
        </div>
      </div>

      {/* Premium Selection + Action Panel */}
      <div className="rounded-2xl border border-[#EADCC2] bg-gradient-to-r from-[#FFFDF8] to-[#FAF6EE] px-4 py-4 md:px-5 md:py-5 shadow-[0_25px_45px_-35px_rgba(0,0,0,0.45)]">
        <div className="grid gap-3 border-b border-[#EEE4D2] pb-4 md:grid-cols-[1.05fr_1fr]">
          <div>
            <p className="text-[14px] md:text-[17px] font-semibold uppercase tracking-[0.08em] text-[#C89E33]">Your Selection</p>
            <ul className="mt-3 space-y-1.5">
              {[
                "100% Human Hair",
                "Heat Resistant & Curlable",
                "Minimal Shedding",
                "In Stock & Ready to Ship",
              ].map((feature) => (
                <li key={feature} className="flex items-center gap-2.5">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#EAF5E7] text-[#4D9A47]">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-3 w-3" strokeWidth="3">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m5 13 4 4L19 7" />
                    </svg>
                  </span>
                  <span className="text-[14px] md:text-[16px] font-normal leading-[1.55] text-foreground">
                    {feature}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="md:border-l md:border-[#EEE4D2] md:pl-5">
            <div className="flex flex-wrap items-center gap-1.5">
              <div className="flex items-center">
                {Array.from({ length: 5 }).map((_, index) => (
                  <svg key={index} viewBox="0 0 24 24" className="h-4 w-4 md:h-5 md:w-5 fill-[#D4AF37]" aria-hidden="true">
                    <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                  </svg>
                ))}
              </div>
              <span className="text-[16px] md:text-[18px] font-semibold leading-none text-foreground">(4.9/5)</span>
            </div>
            <Link
              href="/#testimonials"
              className="mt-1.5 inline-block text-[13px] md:text-[15px] leading-none text-[#8D8A84] transition-colors hover:text-foreground"
            >
              {reviewLabel}
            </Link>

            <div className="mt-3 border-t border-[#EEE4D2] pt-3">
              <p className="text-[15px] md:text-[16px] text-muted-foreground">Total:</p>
              <p className="text-[24px] md:text-[30px] font-bold leading-none text-[#C89E33]">${totalPrice}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-3 pt-4 md:grid-cols-[1fr_1fr] md:items-start">
          <div>
            <p className="text-[15px] md:text-[16px] text-muted-foreground">Total:</p>
            <p className="mt-1 text-[24px] md:text-[30px] font-bold leading-none text-[#C89E33]">${totalPrice}</p>
            <p className="mt-1.5 text-[10px] md:text-[11px] text-muted-foreground">
              {quantity} {quantity === 1 ? "item" : "items"} x ${singlePrice.toFixed(2)} ({currentLength}")
            </p>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <button
                onClick={(event) => void handleAddToCart(event.currentTarget)}
                disabled={isAddingToCart}
                className="group w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#D9B24A] to-[#BE8C23] px-5 py-3 text-[15px] md:text-[17px] font-semibold leading-none text-white shadow-[0_14px_24px_-18px_rgba(0,0,0,0.55)] transition-all duration-300 ease-out transform-gpu hover:-translate-y-0.5 hover:scale-[1.01] hover:brightness-105 hover:shadow-[0_20px_34px_-20px_rgba(190,140,35,0.85)] active:translate-y-0 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-85 disabled:hover:translate-y-0 disabled:hover:scale-100"
              >
                <svg data-fly-source="true" className="h-4 w-4 md:h-5 md:w-5 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span>{isAddingToCart ? "Adding..." : "Add to Cart"}</span>
              </button>

              <Link
                href="/cart"
                className="relative inline-flex h-full min-w-[54px] items-center justify-center rounded-xl border border-[#D4AF37]/35 bg-white px-3 text-[#5a4a2f] shadow-[0_10px_20px_-16px_rgba(0,0,0,0.5)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#D4AF37] hover:text-[#C4951F]"
                aria-label="Open cart"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-5 w-5">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                {getTotalItems() > 0 && (
                  <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-[#D4AF37] px-1 text-[10px] font-bold leading-none text-white">
                    {getTotalItems()}
                  </span>
                )}
              </Link>
            </div>

            <button
              onClick={handleDirectWhatsApp}
              className="w-full group flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#2CC96D] to-[#21B25A] px-5 py-3 text-[15px] md:text-[17px] font-semibold leading-none text-white shadow-[0_14px_24px_-18px_rgba(0,0,0,0.45)] transition-all duration-300 ease-out transform-gpu hover:-translate-y-0.5 hover:scale-[1.01] hover:brightness-105 hover:shadow-[0_20px_34px_-20px_rgba(33,178,90,0.75)] active:translate-y-0 active:scale-[0.99]"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 md:h-5 md:w-5 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:scale-110">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              <span>Order via WhatsApp</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
