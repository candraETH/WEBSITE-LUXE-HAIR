export function CategoryBanner() {
  const categories = [
    { label: "Hair Extensions", count: "50+ Styles", href: "#extensions" },
    { label: "Wigs", count: "30+ Styles", href: "#wigs" },
    { label: "Weft Hair", count: "25+ Options", href: "#weft" },
    { label: "Bulk Hair", count: "Premium Quality", href: "#bulk" },
  ]

  return (
    <section className="border-y border-border bg-card py-0">
      <div className="mx-auto grid max-w-7xl grid-cols-2 lg:grid-cols-4">
        {categories.map((cat, i) => (
          <a
            key={cat.label}
            href={cat.href}
            className={`group flex flex-col items-center gap-2 px-6 py-10 text-center transition-colors hover:bg-secondary ${
              i < categories.length - 1 ? "lg:border-r lg:border-border" : ""
            } ${i < 2 ? "border-b border-border lg:border-b-0" : ""} ${i === 0 ? "border-r border-border lg:border-r" : ""}`}
          >
            <h3 className="font-serif text-lg font-semibold text-foreground transition-colors group-hover:text-accent">
              {cat.label}
            </h3>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              {cat.count}
            </p>
          </a>
        ))}
      </div>
    </section>
  )
}
