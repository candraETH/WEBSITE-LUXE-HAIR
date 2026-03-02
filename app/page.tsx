import { Navbar } from "@/components/navbar"
import { Hero } from "@/components/hero"
import { CategoryBanner } from "@/components/category-banner"
import { ProductSection } from "@/components/product-section"
import { AboutSection } from "@/components/about-section"
import { Testimonials } from "@/components/testimonials"
import { WhatsAppCTA } from "@/components/whatsapp-cta"
import { Footer } from "@/components/footer"
import { WhatsAppFloat } from "@/components/whatsapp-float"
import { BULK_PRODUCTS } from "@/lib/bulk-products"
import { EXTENSIONS_PRODUCTS } from "@/lib/extensions-products"
import { WEFT_PRODUCTS } from "@/lib/weft-products"
import { WIGS_PRODUCTS } from "@/lib/wigs-products"
import type { Metadata } from "next"
import { buildPageMetadata, getSiteUrl } from "@/lib/seo"

export const metadata: Metadata = buildPageMetadata({
  title: "Premium Hair Extensions, Wigs & More",
  description:
    "Shop premium human hair extensions, bulk hair, weft hair, and wigs with trusted quality, fast delivery, and professional support.",
  path: "/",
  keywords: [
    "human hair extensions",
    "premium wigs",
    "weft hair",
    "bulk hair",
    "luxury hair store",
  ],
  images: ["/images/hero.jpg"],
})

export default function Page() {
  const siteUrl = getSiteUrl()
  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "CANDRA'S HAIR",
    url: siteUrl,
  }
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "CANDRA'S HAIR",
    url: siteUrl,
    logo: `${siteUrl}/images/logo-mark.png`,
  }

  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <Navbar />
      <Hero />
      <CategoryBanner />

      <ProductSection
        id="bulk"
        title="Bulk Hair"
        subtitle="Our Collection"
        description="High-quality bulk hair perfect for braiding, custom wig construction, and creative styling. Available in all textures."
        products={BULK_PRODUCTS}
      />

      <div className="w-full px-4 sm:px-6 lg:px-10 xl:px-12 2xl:px-16">
        <hr className="border-border" />
      </div>

      <ProductSection
        id="weft"
        title="Bundles"
        subtitle="Professional Grade"
        description="Machine-made and hand-tied weft options for professional installations. Designed for stylists who demand the best."
        products={WEFT_PRODUCTS}
        reverse
      />

      <div className="w-full px-4 sm:px-6 lg:px-10 xl:px-12 2xl:px-16">
        <hr className="border-border" />
      </div>

      <ProductSection
        id="extensions"
        title="Hair Extensions"
        subtitle="Premium Selection"
        description="Premium clip-in, tape-in, and bundle extensions crafted from 100% human hair. Achieve your dream length and volume effortlessly."
        products={EXTENSIONS_PRODUCTS}
      />

      <div className="w-full px-4 sm:px-6 lg:px-10 xl:px-12 2xl:px-16">
        <hr className="border-border" />
      </div>

      <ProductSection
        id="wigs"
        title="Luxury Wigs"
        subtitle="Handcrafted"
        description="From lace front to full lace, our wigs offer the most natural look and feel. Custom options available upon request."
        products={WIGS_PRODUCTS}
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
