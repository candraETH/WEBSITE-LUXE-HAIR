"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Menu, X, ShoppingBag } from "lucide-react"
import { useCart } from "@/context/CartContext"

const navLinks = [
  { label: "Home", href: "/#home" },
  { label: "Extensions", href: "/#extensions" },
  { label: "Wigs", href: "/#wigs" },
  { label: "Weft Hair", href: "/#weft" },
  { label: "Bulk Hair", href: "/#bulk" },
  { label: "About", href: "/#about" },
]

const WHATSAPP_URL = "https://wa.me/6282234109177?text=Hi%2C%20I%27m%20interested%20in%20your%20hair%20products"

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const { getTotalItems } = useCart()
  const totalItems = getTotalItems()

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
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
        <ul className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="text-sm font-medium uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="hidden items-center gap-4 md:flex">
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

          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-none border border-foreground bg-primary px-5 py-2.5 text-xs font-semibold uppercase tracking-widest text-primary-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <WhatsAppIcon />
            Contact Us
          </a>
        </div>

        {/* Mobile Toggle */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="text-foreground md:hidden"
          aria-label="Toggle navigation"
        >
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </nav>

      {/* Mobile Nav */}
      {isOpen && (
        <div className="border-t border-border bg-background px-6 pb-6 md:hidden">
          <ul className="flex flex-col gap-4 pt-4">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className="text-sm font-medium uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
                >
                  {link.label}
                </Link>
              </li>
            ))}
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
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 flex w-full items-center justify-center gap-2 border border-foreground bg-primary px-5 py-2.5 text-xs font-semibold uppercase tracking-widest text-primary-foreground"
          >
            <WhatsAppIcon />
            Contact Us
          </a>
        </div>
      )}
    </header>
  )
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  )
}
