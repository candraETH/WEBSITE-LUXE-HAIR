"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { WHATSAPP_ENABLED, getWhatsAppHref } from "@/lib/whatsapp-config"
import { withLocaleHref } from "@/lib/i18n"
import { getMessages } from "@/lib/messages"
import { useLocale } from "@/context/LocaleContext"

export function Footer() {
  const { locale } = useLocale()
  const messages = getMessages(locale)
  const localizedHref = (href: string) => withLocaleHref(href, locale)
  const [currentYear, setCurrentYear] = useState("")

  useEffect(() => {
    setCurrentYear(String(new Date().getFullYear()))
  }, [])

  return (
    <footer className="border-t border-border bg-card">
      <div className="w-full px-4 py-16 sm:px-6 lg:px-10 xl:px-12 2xl:px-16">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="lg:col-span-1">
            <Link href={localizedHref("/#home")} className="flex items-center gap-2 font-serif text-2xl font-bold tracking-wider text-foreground">
              <Image
                src="/images/logo-mark.png"
                alt="Candra's Hair logo"
                width={34}
                height={34}
                className="h-[34px] w-[34px] object-contain"
              />
              <span>CANDRA&apos;S HAIR</span>
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
              {messages.footer.brandDescription}
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="mb-4 text-xs font-semibold uppercase tracking-widest text-foreground">
              {messages.footer.collectionsHeading}
            </h4>
            <ul className="flex flex-col gap-3">
              {[
                { label: messages.footer.collections.extensions, href: "#extensions" },
                { label: messages.footer.collections.wigs, href: "#wigs" },
                { label: messages.footer.collections.bundles, href: "#weft" },
                { label: messages.footer.collections.bulk, href: "#bulk" },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="mb-4 text-xs font-semibold uppercase tracking-widest text-foreground">
              {messages.footer.companyHeading}
            </h4>
            <ul className="flex flex-col gap-3">
              <li>
                <Link
                  href={localizedHref("/#about")}
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  {messages.footer.company.about}
                </Link>
              </li>
              <li>
                <Link
                  href={localizedHref("/#testimonials")}
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  {messages.footer.company.testimonials}
                </Link>
              </li>
              <li>
                <Link
                  href={localizedHref("/return-policy")}
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  {messages.footer.company.returnPolicy}
                </Link>
              </li>
              <li>
                <Link
                  href={localizedHref("/terms-of-service")}
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  {messages.footer.company.termsOfService}
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="mb-4 text-xs font-semibold uppercase tracking-widest text-foreground">
              {messages.footer.contactHeading}
            </h4>
            <ul className="flex flex-col gap-3">
              <li>
                <a
                  href={getWhatsAppHref(messages.footer.whatsappMessage)}
                  target={WHATSAPP_ENABLED ? "_blank" : undefined}
                  rel={WHATSAPP_ENABLED ? "noopener noreferrer" : undefined}
                  aria-disabled={!WHATSAPP_ENABLED}
                  title={!WHATSAPP_ENABLED ? messages.footer.whatsappUnavailableTitle : undefined}
                  className={`flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground ${
                    !WHATSAPP_ENABLED ? "pointer-events-none cursor-not-allowed opacity-55" : ""
                  }`}
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                  WhatsApp
                </a>
              </li>
              <li>
                <a
                  href="mailto:support@candrashair.com"
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  support@candrashair.com
                </a>
              </li>
              <li>
                <a
                  href="https://instagram.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  Instagram
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-16 border-t border-border pt-8 text-center">
          <p className="text-xs text-muted-foreground">
            &copy; {currentYear ? `${currentYear} ` : ""}CANDRA&apos;S HAIR. {messages.footer.rightsReserved}
          </p>
        </div>
      </div>
    </footer>
  )
}
