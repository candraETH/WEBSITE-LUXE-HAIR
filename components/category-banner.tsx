import { headers } from "next/headers"
import { localeFromPathname } from "@/lib/i18n"
import { getMessages } from "@/lib/messages"

export async function CategoryBanner() {
  const headerStore = await headers()
  const localeHeader = headerStore.get("x-locale") ?? "en"
  const { locale } = localeFromPathname(`/${localeHeader}`)
  const messages = getMessages(locale)

  const categories = [
    {
      label: messages.nav["Bulk Hair"] ?? "Bulk Hair",
      count: locale === "ru" ? "Премиум качество" : "Premium Quality",
      href: "#bulk",
    },
    {
      label: messages.nav.Bundles ?? "Bundles",
      count: locale === "ru" ? "25+ вариантов" : "25+ Options",
      href: "#weft",
    },
    {
      label: messages.nav.Extensions ?? "Extensions",
      count: locale === "ru" ? "50+ стилей" : "50+ Styles",
      href: "#extensions",
    },
    {
      label: messages.nav.Wigs ?? "Wigs",
      count: locale === "ru" ? "30+ стилей" : "30+ Styles",
      href: "#wigs",
    },
  ]

  return (
    <section className="border-y border-border bg-card py-0">
      <div className="grid w-full grid-cols-2 lg:grid-cols-4">
        {categories.map((cat, i) => (
          <a
            key={cat.label}
            href={cat.href}
            className={`group flex flex-col items-center gap-2 px-6 py-10 text-center transition-colors hover:bg-secondary ${
              i < categories.length - 1 ? "lg:border-r lg:border-border" : ""
            } ${i < 2 ? "border-b border-border lg:border-b-0" : ""} ${
              i % 2 === 0 ? "border-r border-border" : ""
            }`}
          >
            <h3 className="font-serif text-lg font-semibold text-foreground transition-colors group-hover:text-accent">
              {cat.label}
            </h3>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">{cat.count}</p>
          </a>
        ))}
      </div>
    </section>
  )
}

