import type { SupportedLocale } from "@/lib/i18n"

export const SITE_NAME = "CANDRA'S HAIR"

const COPY: Record<
  SupportedLocale,
  {
    title: string
    description: string
    keywords: string[]
  }
> = {
  en: {
    title: "CANDRA'S HAIR | Premium Hair Extensions, Wigs & More",
    description:
      "Shop premium human hair extensions, weft hair, bulk hair, wigs, and hair color options with trusted quality and fast delivery.",
    keywords: [
      "hair",
      "weft hair",
      "hair color",
      "human hairs",
      "cheap hair",
      "human hair",
      "hair extensions",
      "bulk hair",
      "wigs",
    ],
  },
  ru: {
    title: "CANDRA'S HAIR | ÐŸÑ€ÐµÐ¼Ð¸Ð°Ð»ÑŒÐ½Ñ‹Ðµ Ð½Ð°Ñ€Ð°Ñ‰Ð¸Ð²Ð°Ð½Ð¸Ñ, Ð¿Ð°Ñ€Ð¸ÐºÐ¸ Ð¸ Ð¼Ð½Ð¾Ð³Ð¾Ðµ Ð´Ñ€ÑƒÐ³Ð¾Ðµ",
    description:
      "ÐžÑ‚ÐºÑ€Ð¾Ð¹Ñ‚Ðµ Ð´Ð»Ñ ÑÐµÐ±Ñ Ð¿Ñ€ÐµÐ¼Ð¸Ð°Ð»ÑŒÐ½Ñ‹Ðµ Ð²Ð¾Ð»Ð¾ÑÑ‹: Ð½Ð°Ñ€Ð°Ñ‰Ð¸Ð²Ð°Ð½Ð¸Ñ, Ð¿Ð°Ñ€Ð¸ÐºÐ¸, Ñ‚Ñ€ÐµÑÑÑ‹ Ð¸ bulk hair. Ð Ð¾ÑÐºÐ¾ÑˆÐ½Ñ‹Ðµ Ñ€ÐµÑˆÐµÐ½Ð¸Ñ Ð´Ð»Ñ Ð»ÑŽÐ±Ð¾Ð³Ð¾ ÑÑ‚Ð¸Ð»Ñ.",
    keywords: [
      "hair",
      "weft hair",
      "hair color",
      "human hairs",
      "cheap hair",
      "human hair",
      "hair extensions",
      "bulk hair",
      "wigs",
    ],
  },
}

export function getSiteCopy(locale: SupportedLocale) {
  return COPY[locale]
}
