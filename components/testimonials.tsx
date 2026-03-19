"use client"

import { useState } from "react"
import { ChevronLeft, ChevronRight, Star } from "lucide-react"
import { testimonials } from "@/lib/testimonials-data"
import { useLocale } from "@/context/LocaleContext"

export function Testimonials() {
  const [current, setCurrent] = useState(0)
  const { locale } = useLocale()
  const copy =
    locale === "ru"
      ? {
          eyebrow: "\u041e\u0442\u0437\u044b\u0432\u044b",
          title: "\u0427\u0442\u043e \u0433\u043e\u0432\u043e\u0440\u044f\u0442 \u043d\u0430\u0448\u0438 \u043a\u043b\u0438\u0435\u043d\u0442\u044b",
          prevLabel: "\u041f\u0440\u0435\u0434\u044b\u0434\u0443\u0449\u0438\u0439 \u043e\u0442\u0437\u044b\u0432",
          nextLabel: "\u0421\u043b\u0435\u0434\u0443\u044e\u0449\u0438\u0439 \u043e\u0442\u0437\u044b\u0432",
        }
      : {
          eyebrow: "Testimonials",
          title: "What Our Clients Say",
          prevLabel: "Previous testimonial",
          nextLabel: "Next testimonial",
        }

  const next = () => setCurrent((prev) => (prev + 1) % testimonials.length)
  const prev = () =>
    setCurrent((prev) => (prev - 1 + testimonials.length) % testimonials.length)

  const t = testimonials[current]

  return (
    <section id="testimonials" className="bg-card py-24 lg:py-32">
      <div className="mx-auto w-full max-w-[1120px] px-4 text-center sm:px-6 lg:px-10">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-accent">
          {copy.eyebrow}
        </p>
        <h2 className="font-serif text-4xl font-bold text-foreground md:text-5xl">
          {copy.title}
        </h2>

        <div className="mt-16">
          {/* Stars */}
          <div className="flex items-center justify-center gap-1">
            {Array.from({ length: t.rating }).map((_, i) => (
              <Star
                key={i}
                className="h-4 w-4 fill-accent text-accent"
              />
            ))}
          </div>

          {/* Quote */}
          <blockquote className="mt-6 font-serif text-xl leading-relaxed text-foreground md:text-2xl">
            {`"${t.quote}"`}
          </blockquote>

          {/* Author */}
          <div className="mt-8">
            <p className="text-sm font-semibold text-foreground">{t.name}</p>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              {t.title}
            </p>
          </div>

          {/* Navigation */}
          <div className="mt-10 flex items-center justify-center gap-4">
            <button
              onClick={prev}
              className="flex h-10 w-10 items-center justify-center border border-border text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
              aria-label={copy.prevLabel}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-xs tracking-widest text-muted-foreground">
              {current + 1} / {testimonials.length}
            </span>
            <button
              onClick={next}
              className="flex h-10 w-10 items-center justify-center border border-border text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
              aria-label={copy.nextLabel}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
