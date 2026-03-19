import Image from "next/image"
import { testimonialsCount } from "@/lib/testimonials-data"
import { WHATSAPP_ENABLED, getWhatsAppHref } from "@/lib/whatsapp-config"
import { headers } from "next/headers"
import { localeFromPathname } from "@/lib/i18n"

export async function AboutSection() {
  const locale = localeFromPathname(`/${(await headers()).get("x-locale") ?? "en"}`).locale

  const copy =
    locale === "ru"
      ? {
          eyebrow: "\u041d\u0430\u0448\u0430 \u0438\u0441\u0442\u043e\u0440\u0438\u044f",
          title: "\u0421\u043e\u0437\u0434\u0430\u043d\u043e\n\u0434\u043b\u044f \u0443\u0432\u0435\u0440\u0435\u043d\u043d\u043e\u0441\u0442\u0438",
          paragraphs: [
            "\u0412 CANDRA'S HAIR \u043c\u044b \u0432\u0435\u0440\u0438\u043c, \u0447\u0442\u043e \u043a\u0430\u0436\u0434\u0430\u044f \u0436\u0435\u043d\u0449\u0438\u043d\u0430 \u0437\u0430\u0441\u043b\u0443\u0436\u0438\u0432\u0430\u0435\u0442 \u0447\u0443\u0432\u0441\u0442\u0432\u043e\u0432\u0430\u0442\u044c \u0441\u0435\u0431\u044f \u043a\u0440\u0430\u0441\u0438\u0432\u043e\u0439 \u0438 \u0443\u0432\u0435\u0440\u0435\u043d\u043d\u043e\u0439. \u041c\u044b \u043e\u0442\u0431\u0438\u0440\u0430\u0435\u043c \u0432\u043e\u043b\u043e\u0441\u044b \u0443 \u043b\u0443\u0447\u0448\u0438\u0445 \u043f\u043e\u0441\u0442\u0430\u0432\u0449\u0438\u043a\u043e\u0432 \u043f\u043e \u0432\u0441\u0435\u043c\u0443 \u043c\u0438\u0440\u0443, \u0447\u0442\u043e\u0431\u044b \u043a\u0430\u0436\u0434\u044b\u0439 \u043f\u0440\u043e\u0434\u0443\u043a\u0442 \u0441\u043e\u043e\u0442\u0432\u0435\u0442\u0441\u0442\u0432\u043e\u0432\u0430\u043b \u043d\u0430\u0448\u0438\u043c \u0441\u0442\u0440\u043e\u0433\u0438\u043c \u0441\u0442\u0430\u043d\u0434\u0430\u0440\u0442\u0430\u043c.",
            "\u0421 2009 \u0433\u043e\u0434\u0430 CANDRA'S HAIR \u043f\u0440\u043e\u0434\u043e\u043b\u0436\u0430\u0435\u0442 \u0448\u043b\u0438\u0444\u043e\u0432\u0430\u0442\u044c \u043a\u0430\u0436\u0434\u0443\u044e \u0434\u0435\u0442\u0430\u043b\u044c, \u043f\u0440\u0435\u0434\u043b\u0430\u0433\u0430\u044f \u0441\u0442\u0430\u0431\u0438\u043b\u044c\u043d\u043e\u0435 \u043a\u0430\u0447\u0435\u0441\u0442\u0432\u043e, \u043d\u0430\u0434\u0451\u0436\u043d\u044b\u0439 \u0441\u0435\u0440\u0432\u0438\u0441 \u0438 \u0442\u0435\u043a\u0441\u0442\u0443\u0440\u044b, \u043a\u043e\u0442\u043e\u0440\u044b\u0435 \u043f\u043e\u0434\u0447\u0435\u0440\u043a\u0438\u0432\u0430\u044e\u0442 \u0435\u0441\u0442\u0435\u0441\u0442\u0432\u0435\u043d\u043d\u0443\u044e \u043a\u0440\u0430\u0441\u043e\u0442\u0443.",
            "\u041e\u0442 \u043d\u0430\u0440\u0430\u0449\u0438\u0432\u0430\u043d\u0438\u0439 \u0434\u043e \u043f\u0430\u0440\u0438\u043a\u043e\u0432 \u2014 \u043a\u0430\u0436\u0434\u0430\u044f \u043f\u043e\u0437\u0438\u0446\u0438\u044f \u0441\u043e\u0437\u0434\u0430\u043d\u0430, \u0447\u0442\u043e\u0431\u044b \u043c\u044f\u0433\u043a\u043e \u0441\u043b\u0438\u0432\u0430\u0442\u044c\u0441\u044f \u0441 \u0432\u0430\u0448\u0438\u043c\u0438 \u0432\u043e\u043b\u043e\u0441\u0430\u043c\u0438 \u0438 \u0434\u0430\u0440\u0438\u0442\u044c \u0441\u0432\u043e\u0431\u043e\u0434\u0443 \u0432\u044b\u0440\u0430\u0436\u0430\u0442\u044c \u0441\u0432\u043e\u0439 \u0441\u0442\u0438\u043b\u044c.",
            "\u041c\u044b \u043f\u0440\u0435\u0434\u043b\u0430\u0433\u0430\u0435\u043c 100% \u043d\u0430\u0442\u0443\u0440\u0430\u043b\u044c\u043d\u044b\u0435 \u0432\u043e\u043b\u043e\u0441\u044b, \u043a\u043e\u0442\u043e\u0440\u044b\u0435 \u043c\u043e\u0436\u043d\u043e \u0443\u043a\u043b\u0430\u0434\u044b\u0432\u0430\u0442\u044c \u0438 \u043e\u043a\u0440\u0430\u0448\u0438\u0432\u0430\u0442\u044c \u043a\u0430\u043a \u0441\u0432\u043e\u0438. \u041f\u043e\u0447\u0443\u0432\u0441\u0442\u0432\u0443\u0439\u0442\u0435 \u0440\u0430\u0437\u043d\u0438\u0446\u0443 CANDRA'S.",
          ],
          stats: [
            { number: "100%", label: "\u041d\u0430\u0442\u0443\u0440\u0430\u043b\u044c\u043d\u044b\u0435 \u0432\u043e\u043b\u043e\u0441\u044b" },
            { number: `${testimonialsCount}+`, label: "\u0414\u043e\u0432\u043e\u043b\u044c\u043d\u044b\u0445 \u043a\u043b\u0438\u0435\u043d\u0442\u043e\u0432", href: "/#testimonials" },
            { number: "50+", label: "\u0422\u0435\u043a\u0441\u0442\u0443\u0440 \u0432\u043e\u043b\u043e\u0441" },
            { number: "24/7", label: "\u0421\u043b\u0443\u0436\u0431\u0430 \u043f\u043e\u0434\u0434\u0435\u0440\u0436\u043a\u0438" },
          ],
          whatsappMessage: "\u0417\u0434\u0440\u0430\u0432\u0441\u0442\u0432\u0443\u0439\u0442\u0435! \u0425\u043e\u0447\u0443 \u0443\u0437\u043d\u0430\u0442\u044c \u0431\u043e\u043b\u044c\u0448\u0435 \u043e \u0432\u0430\u0448\u0438\u0445 \u043f\u0440\u043e\u0434\u0443\u043a\u0442\u0430\u0445.",
          whatsappUnavailableTitle: "WhatsApp \u0432\u0440\u0435\u043c\u0435\u043d\u043d\u043e \u043d\u0435\u0434\u043e\u0441\u0442\u0443\u043f\u0435\u043d",
          cta: "\u0421\u0432\u044f\u0437\u0430\u0442\u044c\u0441\u044f",
          imageAlt: "\u041a\u0440\u0430\u0441\u0438\u0432\u0430\u044f \u0436\u0435\u043d\u0449\u0438\u043d\u0430 \u0441 \u0440\u0430\u0441\u043f\u0443\u0449\u0435\u043d\u043d\u044b\u043c\u0438 \u0432\u043e\u043b\u043e\u0441\u0430\u043c\u0438",
        }
      : {
          eyebrow: "Our Story",
          title: "Crafted for\nConfidence",
          paragraphs: [
            "At CANDRA'S HAIR, we believe every woman deserves to feel confident and beautiful. Our premium collection is carefully sourced from the finest suppliers worldwide, ensuring each product meets our exacting standards of quality.",
            "Since 2009, CANDRA'S HAIR has continued to refine every detail of our craftsmanship, serving clients with consistent quality, trusted service, and timeless styles that elevate natural beauty.",
            "From silky-smooth extensions to natural-looking wigs, every piece in our collection is crafted to blend seamlessly with your natural hair, giving you the freedom to express your unique style.",
            "We offer 100% human hair products that can be styled, colored, and treated just like your own hair. Experience the CANDRA'S difference.",
          ],
          stats: [
            { number: "100%", label: "Human Hair" },
            { number: `${testimonialsCount}+`, label: "Happy Clients", href: "/#testimonials" },
            { number: "50+", label: "Hair Styles" },
            { number: "24/7", label: "Support Service" },
          ],
          whatsappMessage: "Hi, I'd like to learn more about your products",
          whatsappUnavailableTitle: "WhatsApp is temporarily unavailable",
          cta: "Get in Touch",
          imageAlt: "Beautiful woman with flowing hair",
        }
  return (
    <section id="about" className="bg-secondary py-24 lg:py-32">
      <div className="w-full px-4 sm:px-6 lg:px-10 xl:px-12 2xl:px-16">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
          {/* Image */}
          <div className="relative aspect-[4/5] overflow-hidden">
            <Image
              src="/images/about.jpg"
              alt={copy.imageAlt}
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
            />
          </div>

          {/* Content */}
          <div className="flex flex-col">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-accent">
              {copy.eyebrow}
            </p>
            <h2 className="font-serif text-4xl font-bold text-foreground md:text-5xl text-balance">
              {copy.title.split("\n").map((line, idx, lines) => (
                <span key={`${line}-${idx}`}>
                  {line}
                  {idx < lines.length - 1 && <br />}
                </span>
              ))}
            </h2>
            <div className="mt-8 space-y-4 text-sm leading-relaxed text-muted-foreground">
              {copy.paragraphs.map((text) => (
                <p key={text}>{text}</p>
              ))}
            </div>

            {/* Features */}
            <div className="mt-10 grid grid-cols-2 gap-6">
              {copy.stats.map((stat) => (
                <div key={stat.label} className="border-l-2 border-accent pl-4">
                  {stat.href ? (
                    <a href={stat.href} className="group block">
                      <p className="font-serif text-2xl font-bold text-foreground transition-colors group-hover:text-accent">
                        {stat.number}
                      </p>
                      <p className="text-xs uppercase tracking-widest text-muted-foreground transition-colors group-hover:text-foreground">
                        {stat.label}
                      </p>
                    </a>
                  ) : (
                    <>
                      <p className="font-serif text-2xl font-bold text-foreground">
                        {stat.number}
                      </p>
                      <p className="text-xs uppercase tracking-widest text-muted-foreground">
                        {stat.label}
                      </p>
                    </>
                  )}
                </div>
              ))}
            </div>

            <a
              href={getWhatsAppHref(copy.whatsappMessage)}
              target={WHATSAPP_ENABLED ? "_blank" : undefined}
              rel={WHATSAPP_ENABLED ? "noopener noreferrer" : undefined}
              aria-disabled={!WHATSAPP_ENABLED}
              title={!WHATSAPP_ENABLED ? copy.whatsappUnavailableTitle : undefined}
              className={`mt-10 flex w-fit items-center gap-2 border border-foreground bg-primary px-8 py-3.5 text-xs font-semibold uppercase tracking-widest text-primary-foreground transition-colors hover:bg-accent hover:border-accent hover:text-accent-foreground ${
                !WHATSAPP_ENABLED ? "pointer-events-none cursor-not-allowed opacity-55" : ""
              }`}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              {copy.cta}
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
