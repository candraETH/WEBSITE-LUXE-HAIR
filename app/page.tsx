import { Navbar } from "@/components/navbar"
import { Hero } from "@/components/hero"
import { CategoryBanner } from "@/components/category-banner"
import { ProductSection } from "@/components/product-section"
import { AboutSection } from "@/components/about-section"
import { Testimonials } from "@/components/testimonials"
import { WhatsAppCTA } from "@/components/whatsapp-cta"
import { Footer } from "@/components/footer"
import { WhatsAppFloat } from "@/components/whatsapp-float"

const extensionsProducts = [
  {
    name: "Silky Straight Clip-Ins",
    slug: "silky-straight-clip-ins",
    price: "$120 - $280",
    image: "/images/extensions-1.jpg",
    category: "Hair Extensions",
    description: "100% human hair clip-in extensions. Available in 16-26 inch lengths.",
    tag: "Best Seller",
  },
  {
    name: "Honey Blonde Tape-Ins",
    slug: "honey-blonde-tape-ins",
    price: "$150 - $320",
    image: "/images/extensions-2.jpg",
    category: "Hair Extensions",
    description: "Premium tape-in extensions with seamless blend. Reusable up to 3 times.",
  },
  {
    name: "Body Wave Bundles",
    slug: "body-wave-bundles",
    price: "$95 - $250",
    image: "/images/extensions-3.jpg",
    category: "Hair Extensions",
    description: "Luxurious body wave texture. Can be colored and heat styled.",
    tag: "New Arrival",
  },
]

const wigsProducts = [
  {
    name: "Straight Lace Front Wig",
    slug: "straight-lace-front-wig",
    price: "$250 - $450",
    image: "/images/wig-1.jpg",
    category: "Wigs",
    description: "HD lace front with pre-plucked hairline. Natural jet black, 18-30 inches.",
    tag: "Best Seller",
  },
  {
    name: "Deep Wave Closure Wig",
    slug: "deep-wave-closure-wig",
    price: "$280 - $480",
    image: "/images/wig-2.jpg",
    category: "Wigs",
    description: "4x4 closure wig with deep wave curls. Breathable cap construction.",
  },
  {
    name: "Burgundy Bob Wig",
    slug: "burgundy-bob-wig",
    price: "$180 - $320",
    image: "/images/wig-3.jpg",
    category: "Wigs",
    description: "Chic bob cut in burgundy wine. Perfect for a bold, sophisticated look.",
    tag: "Trending",
  },
]

const weftProducts = [
  {
    name: "Machine Weft Straight",
    slug: "machine-weft-straight",
    price: "$80 - $180",
    image: "/images/weft-1.jpg",
    category: "Weft Hair",
    description: "Durable machine weft sewing. Ideal for sew-in installations. 12-28 inches.",
  },
  {
    name: "Hand-Tied Loose Wave",
    slug: "hand-tied-loose-wave",
    price: "$130 - $280",
    image: "/images/weft-2.jpg",
    category: "Weft Hair",
    description: "Ultra-thin hand-tied wefts that lay flat. Perfect for volume and length.",
    tag: "Premium",
  },
  {
    name: "Flat Weft Platinum",
    slug: "flat-weft-platinum",
    price: "$110 - $240",
    image: "/images/weft-3.jpg",
    category: "Weft Hair",
    description: "Platinum blonde flat weft. Minimal shedding, tangle-free guarantee.",
  },
]

const bulkProducts = [
  {
    name: "Virgin Straight Bulk",
    slug: "virgin-straight-bulk",
    price: "$70 - $160",
    image: "/images/images1.png",
    category: "Bulk Hair",
    description: "100% virgin hair without weft. Perfect for braiding and custom wig making.",
  },
  {
    name: "Natural Braiding Hair",
    slug: "natural-braiding-hair",
    price: "$60 - $140",
    image: "/images/bulk-2.jpg",
    category: "Bulk Hair",
    description: "Soft, tangle-free bulk hair ideal for box braids and twists.",
    tag: "Popular",
  },
  {
    name: "Wavy Bulk Premium",
    slug: "wavy-bulk-premium",
    price: "$85 - $180",
    image: "/images/bulk-3.jpg",
    category: "Bulk Hair",
    description: "Premium grade wavy bulk hair. Unprocessed, can be colored to any shade.",
    tag: "New",
  },
]

export default function Page() {
  return (
    <main>
      <Navbar />
      <Hero />
      <CategoryBanner />

      <ProductSection
        id="extensions"
        title="Hair Extensions"
        subtitle="Our Collection"
        description="Premium clip-in, tape-in, and bundle extensions crafted from 100% human hair. Achieve your dream length and volume effortlessly."
        products={extensionsProducts}
      />

      <div className="mx-auto max-w-7xl px-6">
        <hr className="border-border" />
      </div>

      <ProductSection
        id="wigs"
        title="Luxury Wigs"
        subtitle="Handcrafted"
        description="From lace front to full lace, our wigs offer the most natural look and feel. Custom options available upon request."
        products={wigsProducts}
        reverse
      />

      <div className="mx-auto max-w-7xl px-6">
        <hr className="border-border" />
      </div>

      <ProductSection
        id="weft"
        title="Weft Hair"
        subtitle="Professional Grade"
        description="Machine-made and hand-tied weft options for professional installations. Designed for stylists who demand the best."
        products={weftProducts}
      />

      <div className="mx-auto max-w-7xl px-6">
        <hr className="border-border" />
      </div>

      <ProductSection
        id="bulk"
        title="Bulk Hair"
        subtitle="Raw & Unprocessed"
        description="High-quality bulk hair perfect for braiding, custom wig construction, and creative styling. Available in all textures."
        products={bulkProducts}
        reverse
      />

      <AboutSection />
      <Testimonials />
      <WhatsAppCTA />
      <Footer />
      <WhatsAppFloat />
    </main>
  )
}
