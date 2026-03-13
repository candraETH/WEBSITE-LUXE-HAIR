"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ChevronDown, Menu, X, ShoppingBag, Search, UserRound } from "lucide-react"
import { useCart } from "@/context/CartContext"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { TierBadge, getTierNameGradientClass } from "@/components/loyalty/tier-badge"
import { getSupabaseBrowserClient } from "@/lib/supabase-browser"
import { getAppRoleFromMetadata } from "@/lib/roles"
import { getTierForSpend, type LoyaltyTierKey } from "@/lib/loyalty-tier"

const navLinks = [
  { label: "Home", href: "/#home" },
  { label: "Bulk Hair", href: "/bulk-hair" },
  { label: "Bundles", href: "/weft-hair" },
  { label: "Extensions", href: "/extensions" },
  { label: "Wigs", href: "/wigs" },
  { label: "Blog", href: "/blog" },
]

const PROMO_MARQUEE_MESSAGE = "Limited Offer: 25% OFF all hair collections - Shop now"

type MegaMenuItem = {
  label: string
  href: string
}

type MegaMenuConfig = {
  heading: string
  viewAllHref: string
  viewAllLabel: string
  previewImage: string
  previewAlt: string
  items: MegaMenuItem[]
}

type PreviewLightboxState = {
  src: string
  alt: string
  heading: string
}

const bulkMenuItems: MegaMenuItem[] = [
  { label: "Virgin Straight Bulk", href: "/order/virgin-straight-bulk" },
  { label: "Natural Braiding Hair", href: "/order/natural-braiding-hair" },
  { label: "Wavy Bulk Premium", href: "/order/wavy-bulk-premium" },
]

const bundleMenuItems: MegaMenuItem[] = [
  { label: "Natural Wave", href: "/order/natural-wave-weft" },
  { label: "Body Wave", href: "/order/body-wave-weft" },
  { label: "Curly", href: "/order/curly-weft" },
  { label: "Deep Curly", href: "/order/deep-curly-weft" },
  { label: "Deep Wave", href: "/order/deep-wave-weft" },
  { label: "Fumi", href: "/order/fumi-weft" },
  { label: "Natural Curly", href: "/order/natural-curly-weft" },
  { label: "Water Wave", href: "/order/water-wave-weft" },
  { label: "Kinky Curl", href: "/order/kinky-curl-weft" },
  { label: "Loose Wave", href: "/order/loose-wave-weft" },
  { label: "Jerry Curly", href: "/order/jerry-curly-weft" },
  { label: "Brazilian Curly", href: "/order/brazilian-curly-weft" },
]

const extensionsMenuItems: MegaMenuItem[] = [
  { label: "Silky Straight Clip-Ins", href: "/order/silky-straight-clip-ins" },
  { label: "Honey Blonde Tape-Ins", href: "/order/honey-blonde-tape-ins" },
  { label: "Body Wave Bundles", href: "/order/body-wave-bundles" },
]

const wigsMenuItems: MegaMenuItem[] = [
  { label: "Straight Lace Front Wig", href: "/order/straight-lace-front-wig" },
  { label: "Deep Wave Closure Wig", href: "/order/deep-wave-closure-wig" },
  { label: "Burgundy Bob Wig", href: "/order/burgundy-bob-wig" },
]

const PRODUCT_MEGA_MENUS: Record<string, MegaMenuConfig> = {
  "Bulk Hair": {
    heading: "Bulk Hair",
    viewAllHref: "/bulk-hair",
    viewAllLabel: "View All Bulk Hair",
    previewImage: "/images/images1.png",
    previewAlt: "Bulk hair collection",
    items: bulkMenuItems,
  },
  Bundles: {
    heading: "Bundles",
    viewAllHref: "/weft-hair",
    viewAllLabel: "View All Bundles",
    previewImage: "/images/texture/all%20texture.png",
    previewAlt: "Bundles options",
    items: bundleMenuItems,
  },
  Extensions: {
    heading: "Extensions",
    viewAllHref: "/extensions",
    viewAllLabel: "View All Extensions",
    previewImage: "/images/extensions-1.jpg",
    previewAlt: "Extensions collection",
    items: extensionsMenuItems,
  },
  Wigs: {
    heading: "Wigs",
    viewAllHref: "/wigs",
    viewAllLabel: "View All Wigs",
    previewImage: "/images/wig-1.jpg",
    previewAlt: "Wig collection",
    items: wigsMenuItems,
  },
}

const searchableProducts = [
  ...[...bulkMenuItems, ...bundleMenuItems, ...extensionsMenuItems, ...wigsMenuItems].map((item) => ({
    name: item.label,
    slug: item.href.replace("/order/", ""),
  })),
]

function resolveSearchTarget(query: string): string {
  const normalizedQuery = query.trim().toLowerCase()
  if (!normalizedQuery) {
    return "/#home"
  }

  const byProduct = searchableProducts.find(
    (product) =>
      product.name.toLowerCase().includes(normalizedQuery) || product.slug.includes(normalizedQuery)
  )
  if (byProduct) {
    return `/order/${byProduct.slug}`
  }

  if (normalizedQuery.includes("bulk")) {
    return "/bulk-hair"
  }
  if (normalizedQuery.includes("weft") || normalizedQuery.includes("bundle")) {
    return "/weft-hair"
  }
  if (normalizedQuery.includes("extension") || normalizedQuery.includes("clip") || normalizedQuery.includes("tape")) {
    return "/extensions"
  }
  if (normalizedQuery.includes("wig")) {
    return "/wigs"
  }

  return "/#home"
}

export function Navbar() {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [isDesktopSearchOpen, setIsDesktopSearchOpen] = useState(false)
  const [desktopSearchQuery, setDesktopSearchQuery] = useState("")
  const [openDesktopMenu, setOpenDesktopMenu] = useState<string | null>(null)
  const [openMobileMenu, setOpenMobileMenu] = useState<string | null>(null)
  const [previewLightbox, setPreviewLightbox] = useState<PreviewLightboxState | null>(null)
  const [authState, setAuthState] = useState<{
    status: "loading" | "signed_out" | "signed_in"
    role: "admin" | "user"
  }>({ status: "loading", role: "user" })
  const [accountLabel, setAccountLabel] = useState<{
    firstName: string
    tierKey: LoyaltyTierKey | null
    tierName: string | null
  } | null>(null)
  const desktopNavRef = useRef<HTMLUListElement>(null)
  const desktopSearchRef = useRef<HTMLDivElement>(null)
  const desktopSearchInputRef = useRef<HTMLInputElement>(null)
  const desktopOpenTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const desktopCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { getTotalItems } = useCart()
  const totalItems = getTotalItems()

  useEffect(() => {
    const supabase = getSupabaseBrowserClient()
    if (!supabase) {
      setAuthState({ status: "signed_out", role: "user" })
      return
    }
    const client = supabase

    let isCancelled = false

    async function load() {
      const { data } = await client.auth.getUser()
      if (isCancelled) return

      if (!data.user) {
        setAuthState({ status: "signed_out", role: "user" })
        setAccountLabel(null)
        return
      }

      const metadata = (data.user.user_metadata ?? {}) as Record<string, unknown>
      const fullName = typeof metadata.full_name === "string" ? metadata.full_name.trim() : ""
      const fallbackName = (data.user.email ?? "").split("@")[0] ?? ""
      const firstNameRaw = (fullName || fallbackName).trim().split(/\s+/)[0] ?? ""
      const firstName = firstNameRaw || "Account"

      let tierKey: LoyaltyTierKey | null = null
      let tierName: string | null = null
      const { data: sessionData } = await client.auth.getSession()
      const token = sessionData.session?.access_token ?? ""
      if (token) {
        const response = await fetch("/api/account/loyalty", { headers: { authorization: `Bearer ${token}` } })
        const payload = (await response.json().catch(() => ({}))) as { totalPoints?: number; totalSpent?: number }
        if (!isCancelled && response.ok) {
          const spent = typeof payload.totalSpent === "number" ? payload.totalSpent : Number(payload.totalSpent ?? 0)
          const points = typeof payload.totalPoints === "number" ? payload.totalPoints : Math.max(0, Math.floor(spent))
          const tier = getTierForSpend(points)
          tierKey = tier.key
          tierName = tier.name
        }
      }

      setAuthState({
        status: "signed_in",
        role: getAppRoleFromMetadata(metadata),
      })
      setAccountLabel({ firstName, tierKey, tierName })
    }

    void load()

    const { data: subscription } = client.auth.onAuthStateChange(() => {
      void load()
    })

    return () => {
      isCancelled = true
      subscription.subscription.unsubscribe()
    }
  }, [])

  async function handleSignOut() {
    const supabase = getSupabaseBrowserClient()
    if (!supabase) {
      return
    }

    await supabase.auth.signOut()
    router.refresh()
  }

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (!desktopNavRef.current) {
        return
      }
      if (!desktopNavRef.current.contains(event.target as Node)) {
        setOpenDesktopMenu(null)
      }

      if (desktopSearchRef.current && !desktopSearchRef.current.contains(event.target as Node)) {
        setIsDesktopSearchOpen(false)
      }
    }

    function handleEsc(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpenDesktopMenu(null)
        setIsDesktopSearchOpen(false)
      }
    }

    document.addEventListener("mousedown", handleOutsideClick)
    document.addEventListener("keydown", handleEsc)
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick)
      document.removeEventListener("keydown", handleEsc)
      if (desktopOpenTimerRef.current) {
        clearTimeout(desktopOpenTimerRef.current)
      }
      if (desktopCloseTimerRef.current) {
        clearTimeout(desktopCloseTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!isDesktopSearchOpen) {
      return
    }

    const timer = window.setTimeout(() => {
      desktopSearchInputRef.current?.focus()
      desktopSearchInputRef.current?.select()
    }, 120)

    return () => window.clearTimeout(timer)
  }, [isDesktopSearchOpen])

  useEffect(() => {
    if (!previewLightbox) {
      return
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setPreviewLightbox(null)
      }
    }

    window.addEventListener("keydown", handleEsc)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener("keydown", handleEsc)
    }
  }, [previewLightbox])

  const handleDesktopMenuEnter = (label: string) => {
    if (desktopCloseTimerRef.current) {
      clearTimeout(desktopCloseTimerRef.current)
    }
    if (desktopOpenTimerRef.current) {
      clearTimeout(desktopOpenTimerRef.current)
    }

    desktopOpenTimerRef.current = setTimeout(() => {
      setOpenDesktopMenu(label)
    }, 150)
  }

  const handleDesktopMenuLeave = () => {
    if (desktopOpenTimerRef.current) {
      clearTimeout(desktopOpenTimerRef.current)
    }
    if (desktopCloseTimerRef.current) {
      clearTimeout(desktopCloseTimerRef.current)
    }

    desktopCloseTimerRef.current = setTimeout(() => {
      setOpenDesktopMenu(null)
    }, 150)
  }

  const handleSearchSubmit = (query: string) => {
    router.push(resolveSearchTarget(query))
    setIsOpen(false)
  }

  const handleDesktopSearchIconClick = () => {
    if (!isDesktopSearchOpen) {
      setIsDesktopSearchOpen(true)
      return
    }

    const normalizedQuery = desktopSearchQuery.trim()
    if (!normalizedQuery) {
      setIsDesktopSearchOpen(false)
      return
    }

    handleSearchSubmit(normalizedQuery)
    setDesktopSearchQuery("")
    setIsDesktopSearchOpen(false)
  }

  const handleDesktopSearchEnter = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") {
      return
    }

    event.preventDefault()
    const normalizedQuery = desktopSearchQuery.trim()
    if (!normalizedQuery) {
      setIsDesktopSearchOpen(false)
      return
    }

    handleSearchSubmit(normalizedQuery)
    setDesktopSearchQuery("")
    setIsDesktopSearchOpen(false)
  }

  const handleMobileSearchClick = () => {
    const query = window.prompt("Search product:")
    if (query === null) {
      return
    }
    handleSearchSubmit(query)
  }

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="promo-marquee border-b border-[#3a2e20] bg-[#1f1810] text-[#f6ddb3]">
        <div className="promo-marquee-track flex w-max min-w-full items-center py-1.5">
          {Array.from({ length: 12 }).map((_, index) => (
            <span
              key={`promo-${index}`}
              className="mx-5 text-[10px] font-semibold uppercase tracking-[0.18em] sm:mx-7 sm:text-[11px]"
            >
              {PROMO_MARQUEE_MESSAGE}
            </span>
          ))}
        </div>
      </div>
      <nav className="flex w-full items-center justify-between px-4 py-4 sm:px-6 lg:px-10 xl:px-12 2xl:px-16">
        {/* Mobile Toggle (Left) */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="text-foreground md:hidden"
          aria-label="Toggle navigation"
        >
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>

        <Link href="/#home" className="flex items-center gap-2.5 font-serif text-2xl font-bold tracking-wider text-foreground">
          <Image
            src="/images/logo-mark.png"
            alt="Candra's Hair logo"
            width={36}
            height={36}
            className="h-9 w-9 object-contain"
          />
          <span>CANDRA&apos;S HAIR</span>
        </Link>

        {/* Desktop Nav */}
        <ul ref={desktopNavRef} className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => {
            const megaMenu = PRODUCT_MEGA_MENUS[link.label]
            const isMenuOpen = openDesktopMenu === link.label

            if (!megaMenu) {
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm font-medium uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              )
            }

            return (
              <li
                key={link.href}
                className="relative"
                onMouseEnter={() => handleDesktopMenuEnter(link.label)}
                onMouseLeave={handleDesktopMenuLeave}
              >
                <Link
                  href={link.href}
                  onClick={() => setOpenDesktopMenu(null)}
                  className="text-sm font-medium uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
                  aria-expanded={isMenuOpen}
                  aria-haspopup="menu"
                >
                  {link.label}
                </Link>

                {isMenuOpen && (
                  <div className="absolute left-1/2 top-full z-50 mt-4 w-[min(1180px,96vw)] -translate-x-1/2 rounded-2xl border border-border bg-background p-6 shadow-2xl">
                    <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
                      <div className="p-0">
                        <button
                          type="button"
                          onClick={() =>
                            setPreviewLightbox({
                              src: megaMenu.previewImage,
                              alt: megaMenu.previewAlt,
                              heading: megaMenu.heading,
                            })
                          }
                          className="preview-shake-trigger group flex min-h-[300px] w-full cursor-zoom-in items-center justify-center overflow-hidden rounded-xl bg-[#f7f4ef] p-0"
                          aria-label={`Open ${megaMenu.heading} preview image`}
                        >
                          <Image
                            src={megaMenu.previewImage}
                            alt={megaMenu.previewAlt}
                            sizes="380px"
                            width={700}
                            height={700}
                            unoptimized
                            className={`h-full w-full ${
                              link.label === "Bundles"
                                ? "object-cover scale-[1.12] transition-transform duration-300 group-hover:scale-[1.16]"
                                : "object-contain transition-transform duration-300 group-hover:scale-[1.04]"
                            }`}
                          />
                        </button>
                      </div>

                      <div className="min-w-0">
                        <div className="mb-3 flex items-center justify-between gap-4">
                          <h3 className="text-base font-bold uppercase tracking-wide text-foreground">{megaMenu.heading}</h3>
                          <Link
                            href={megaMenu.viewAllHref}
                            onClick={() => setOpenDesktopMenu(null)}
                            className="text-xs font-semibold uppercase tracking-widest text-accent transition-colors hover:text-foreground"
                          >
                            {megaMenu.viewAllLabel}
                          </Link>
                        </div>

                        <ul className="space-y-1.5">
                          {megaMenu.items.map((item) => (
                            <li key={item.href}>
                              <Link
                                href={item.href}
                                onClick={() => setOpenDesktopMenu(null)}
                                className="text-[15px] text-foreground/90 transition-colors hover:text-accent"
                              >
                                {item.label}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </li>
            )
          })}
        </ul>

        <div className="hidden items-center gap-4 md:flex">
          <div ref={desktopSearchRef} className="relative h-10 w-10">
            <div
              className={`absolute right-0 top-1/2 z-30 flex h-10 -translate-y-1/2 items-center overflow-hidden rounded-lg border transition-all duration-300 ${
                isDesktopSearchOpen
                  ? "w-[280px] border-[#d6c8b4] bg-white shadow-[0_10px_24px_-16px_rgba(0,0,0,0.45)]"
                  : "w-10 border-transparent bg-transparent"
              }`}
            >
              <input
                ref={desktopSearchInputRef}
                value={desktopSearchQuery}
                onChange={(event) => setDesktopSearchQuery(event.target.value)}
                onKeyDown={handleDesktopSearchEnter}
                placeholder="Search products..."
                aria-label="Search products"
                className={`h-full w-full bg-transparent pl-3 pr-10 text-sm text-foreground outline-none transition-opacity duration-200 placeholder:text-muted-foreground ${
                  isDesktopSearchOpen ? "opacity-100" : "pointer-events-none opacity-0"
                }`}
              />
              <button
                type="button"
                onClick={handleDesktopSearchIconClick}
                className="absolute right-0 top-0 inline-flex h-10 w-10 items-center justify-center text-foreground transition-colors hover:bg-accent/10"
                aria-label="Search products"
                title="Search"
              >
                <Search size={22} strokeWidth={1.8} />
              </button>
            </div>
          </div>

          <Link
            href="/cart"
            data-cart-target="true"
            className="relative inline-flex items-center justify-center rounded-lg p-2 text-foreground transition-colors hover:bg-accent/10"
            title="Shopping Cart"
          >
            <ShoppingBag size={24} strokeWidth={1.5} />
            {totalItems > 0 && (
              <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#D4AF37] text-xs font-bold text-white">
                {totalItems}
              </span>
            )}
          </Link>

          {authState.status === "signed_in" ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-2 rounded-none border border-border bg-transparent px-5 py-2.5 text-xs font-semibold tracking-wide text-foreground transition-colors hover:bg-accent/10"
                  aria-label="Open account menu"
                  title="Account"
                >
                  <UserRound size={18} strokeWidth={1.8} />
                  <span className="flex items-center gap-2 rounded-full border border-border/40 bg-background/95 px-2.5 py-1 text-foreground shadow-sm">
                    <span
                      className={`${accountLabel?.tierKey ? getTierNameGradientClass(accountLabel.tierKey) : "text-foreground"} max-w-[96px] truncate`}
                    >
                      {accountLabel?.firstName || "Account"}
                    </span>
                    {accountLabel?.tierKey && accountLabel.tierName ? (
                      <TierBadge
                        tier={accountLabel.tierKey}
                        label={accountLabel.tierName}
                        className="px-2 py-0.5 text-[10px] shadow-none"
                      />
                    ) : null}
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-44">
                <DropdownMenuItem onSelect={() => router.push("/account/profile")}>My account</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => void handleSignOut()}>Sign out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-2 rounded-none border border-border bg-transparent px-5 py-2.5 text-xs font-semibold uppercase tracking-widest text-foreground transition-colors hover:bg-accent/10"
                  aria-label="Open account menu"
                  title="Register / Login"
                >
                  <UserRound size={18} strokeWidth={1.8} />
                  Register
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-44">
                <DropdownMenuItem onSelect={() => router.push("/register")}>Create account</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => router.push("/login")}>Sign in</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <div className="flex items-center gap-1 md:hidden">
          <button
            type="button"
            onClick={handleMobileSearchClick}
            className="inline-flex items-center justify-center rounded-lg p-2 text-foreground transition-colors hover:bg-accent/10"
            aria-label="Search products"
            title="Search"
          >
            <Search size={22} strokeWidth={1.8} />
          </button>
        </div>
      </nav>

      {/* Mobile Nav */}
      {isOpen && (
        <div className="border-t border-border bg-background px-4 pb-6 sm:px-6 md:hidden">
          <ul className="flex flex-col gap-4 pt-4">
            {navLinks.map((link) => {
              const megaMenu = PRODUCT_MEGA_MENUS[link.label]
              const isMenuOpen = openMobileMenu === link.label

              if (!megaMenu) {
                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      onClick={() => setIsOpen(false)}
                      className="text-sm font-medium uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                )
              }

              return (
                <li key={link.href}>
                  <div className="flex items-center justify-between">
                    <Link
                      href={link.href}
                      onClick={() => setIsOpen(false)}
                      className="text-sm font-medium uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                    <button
                      type="button"
                      onClick={() => setOpenMobileMenu((prev) => (prev === link.label ? null : link.label))}
                      className="inline-flex items-center justify-center rounded p-1 text-muted-foreground transition-colors hover:text-foreground"
                      aria-label={`Toggle ${link.label} menu`}
                    >
                      <ChevronDown
                        size={16}
                        className={`transition-transform duration-200 ${isMenuOpen ? "rotate-180" : "rotate-0"}`}
                      />
                    </button>
                  </div>

                  {isMenuOpen && (
                    <div className="mt-2 space-y-1 pl-3">
                      {megaMenu.items.map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => {
                            setIsOpen(false)
                            setOpenMobileMenu(null)
                          }}
                          className="block py-1.5 text-xs font-medium uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
                        >
                          {item.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </li>
              )
            })}
            <li>
              <Link
                href="/cart"
                data-cart-target="true"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2 text-sm font-medium uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
              >
                <ShoppingBag size={18} strokeWidth={1.5} />
                Cart {totalItems > 0 && `(${totalItems})`}
              </Link>
            </li>
          </ul>
          {authState.status === "signed_in" ? (
            <div className="mt-4 grid gap-2">
              <Link
                href="/account"
                onClick={() => setIsOpen(false)}
                className="flex w-full items-center justify-center gap-2 border border-border bg-transparent px-5 py-2.5 text-xs font-semibold tracking-wide text-foreground transition-colors hover:bg-accent/10"
              >
                <UserRound size={18} strokeWidth={1.8} />
                <span className="flex items-center gap-2">
                  <span
                    className={`${accountLabel?.tierKey ? getTierNameGradientClass(accountLabel.tierKey) : "text-foreground"} max-w-[140px] truncate`}
                  >
                    {accountLabel?.firstName || "Account"}
                  </span>
                  {accountLabel?.tierKey && accountLabel.tierName ? (
                    <TierBadge
                      tier={accountLabel.tierKey}
                      label={accountLabel.tierName}
                      className="px-2 py-0.5 text-[10px] shadow-none"
                    />
                  ) : null}
                </span>
              </Link>
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false)
                  void handleSignOut()
                }}
                className="flex w-full items-center justify-center gap-2 border border-border bg-background px-5 py-2.5 text-xs font-semibold uppercase tracking-widest text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <UserRound size={18} strokeWidth={1.8} />
                Sign out
              </button>
            </div>
          ) : (
            <div className="mt-4 grid gap-2">
              <Link
                href="/register"
                onClick={() => setIsOpen(false)}
                className="flex w-full items-center justify-center gap-2 border border-foreground bg-primary px-5 py-2.5 text-xs font-semibold uppercase tracking-widest text-primary-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <UserRound size={18} strokeWidth={1.8} />
                Create account
              </Link>
              <Link
                href="/login"
                onClick={() => setIsOpen(false)}
                className="flex w-full items-center justify-center gap-2 border border-border bg-background px-5 py-2.5 text-xs font-semibold uppercase tracking-widest text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <UserRound size={18} strokeWidth={1.8} />
                Sign in
              </Link>
            </div>
          )}
        </div>
      )}
      </header>

      {previewLightbox && (
        <div
          className="fixed inset-0 z-[140] bg-black px-4 py-4 sm:px-8 sm:py-6"
          onClick={() => setPreviewLightbox(null)}
        >
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              setPreviewLightbox(null)
            }}
            className="absolute right-4 top-4 z-20 inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/30 bg-white/15 text-white transition-colors hover:bg-white/30"
            aria-label="Close preview image"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-6 w-6" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          <div className="pointer-events-none absolute left-1/2 top-4 z-20 -translate-x-1/2 rounded-full bg-white/25 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white">
            {previewLightbox.heading}
          </div>

          <div className="relative mx-auto h-full w-full max-w-[1500px]">
            <Image
              src={previewLightbox.src}
              alt={previewLightbox.alt}
              fill
              unoptimized
              sizes="100vw"
              className="object-contain"
              priority
            />
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes promoMarqueeSlide {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }

        .promo-marquee {
          overflow: hidden;
          white-space: nowrap;
        }

        .promo-marquee-track {
          will-change: transform;
          animation: promoMarqueeSlide 44s linear infinite;
        }

        @keyframes megaPreviewWiggle {
          0% {
            transform: translateX(0) rotate(0deg);
          }
          25% {
            transform: translateX(-2px) rotate(-0.7deg);
          }
          50% {
            transform: translateX(2px) rotate(0.7deg);
          }
          75% {
            transform: translateX(-1px) rotate(-0.35deg);
          }
          100% {
            transform: translateX(0) rotate(0deg);
          }
        }

        .preview-shake-trigger:hover {
          animation: megaPreviewWiggle 0.55s ease-in-out infinite;
        }
      `}</style>
    </>
  )
}

