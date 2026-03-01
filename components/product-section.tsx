import { ProductCard } from "./product-card"

interface Product {
  name: string
  slug: string
  price: string
  image?: string
  images?: string[]
  category: string
  description: string
  tag?: string
}

interface ProductSectionProps {
  id: string
  title: string
  subtitle: string
  description: string
  products: Product[]
  reverse?: boolean
}

export function ProductSection({
  id,
  title,
  subtitle,
  description,
  products,
  reverse,
}: ProductSectionProps) {
  return (
    <section id={id} className="py-24 lg:py-32">
      <div className="w-full px-4 sm:px-6 lg:px-10 xl:px-12 2xl:px-16">
        {/* Section Header */}
        <div className={`mb-16 flex flex-col items-start gap-4 lg:flex-row lg:items-end lg:justify-between ${reverse ? "lg:flex-row-reverse lg:text-right" : ""}`}>
          <div className={`max-w-xl ${reverse ? "lg:ml-auto" : ""}`}>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-accent">
              {subtitle}
            </p>
            <h2 className="font-serif text-4xl font-bold text-foreground md:text-5xl text-balance">
              {title}
            </h2>
          </div>
          <p className={`max-w-md text-sm leading-relaxed text-muted-foreground ${reverse ? "lg:mr-auto lg:text-left" : ""}`}>
            {description}
          </p>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <ProductCard key={product.name} {...product} />
          ))}
        </div>
      </div>
    </section>
  )
}
