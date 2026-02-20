const WHATSAPP_URL = "https://wa.me/6282234109177?text=Hi%2C%20I%27m%20interested%20in%20your%20hair%20products"

export function WhatsAppCTA() {
  return (
    <section className="bg-primary py-24 lg:py-32">
      <div className="mx-auto max-w-4xl px-6 text-center">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-primary-foreground/60">
          Ready to Order?
        </p>
        <h2 className="font-serif text-4xl font-bold text-primary-foreground md:text-5xl text-balance">
          Get Your Dream Hair Today
        </h2>
        <p className="mx-auto mt-6 max-w-lg text-sm leading-relaxed text-primary-foreground/70">
          Browse our collection, choose your favorites, and reach out to us via
          WhatsApp to place your order. We offer fast shipping and personalized
          consultations.
        </p>

        <a
          href={WHATSAPP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-10 inline-flex items-center gap-3 border border-primary-foreground/30 bg-primary-foreground px-10 py-4 text-xs font-semibold uppercase tracking-widest text-primary transition-colors hover:bg-primary-foreground/90"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
          Contact Us on WhatsApp
        </a>

        <div className="mt-8 flex flex-col items-center gap-1">
          <p className="text-xs text-primary-foreground/50">
            Available 24/7 for your convenience
          </p>
          <p className="text-xs text-primary-foreground/50">
            Fast replies guaranteed
          </p>
        </div>
      </div>
    </section>
  )
}
