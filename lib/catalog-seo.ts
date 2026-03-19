export type CatalogGroupKey = "bulk" | "weft" | "extensions" | "wigs"

type SeoLink = {
  href: string
  label: string
}

export type CatalogSeoContent = {
  breadcrumbLabel: string
  guideTitle: string
  paragraphs: string[]
  relatedCollections: SeoLink[]
}

const CATALOG_SEO_CONTENT_EN: Record<CatalogGroupKey, CatalogSeoContent> = {
  bulk: {
    breadcrumbLabel: "Bulk Hair",
    guideTitle: "Bulk Hair Buying Guide",
    paragraphs: [
      "Bulk hair is ideal for braiding, custom wig construction, and hand-tied installs where loose human hair gives maximum flexibility.",
      "When choosing bulk hair, focus on texture consistency, color compatibility, and bundle count so your install remains full and natural from root to tip.",
    ],
    relatedCollections: [
      { href: "/weft-hair", label: "Shop Bundles" },
      { href: "/extensions", label: "Shop Hair Extensions" },
      { href: "/wigs", label: "Shop Human Hair Wigs" },
    ],
  },
  weft: {
    breadcrumbLabel: "Bundles",
    guideTitle: "Bundles Texture Guide",
    paragraphs: [
      "Weft hair offers a balance of durability and versatility for sew-ins, beaded rows, and salon installs that need smooth blending and long wear.",
      "Compare wave and curl patterns carefully so your selected texture matches your styling routine, maintenance habits, and target volume.",
    ],
    relatedCollections: [
      { href: "/bulk-hair", label: "Shop Bulk Hair" },
      { href: "/extensions", label: "Shop Hair Extensions" },
      { href: "/wigs", label: "Shop Human Hair Wigs" },
    ],
  },
  extensions: {
    breadcrumbLabel: "Extensions",
    guideTitle: "Hair Extensions Selection Tips",
    paragraphs: [
      "Hair extensions are a fast way to add length and fullness, with options such as clip-ins, tape-ins, and bundles for different wear preferences.",
      "Pick the right method based on lifestyle, styling frequency, and desired finish so your extensions stay comfortable and blend naturally.",
    ],
    relatedCollections: [
      { href: "/bulk-hair", label: "Shop Bulk Hair" },
      { href: "/weft-hair", label: "Shop Bundles" },
      { href: "/wigs", label: "Shop Human Hair Wigs" },
    ],
  },
  wigs: {
    breadcrumbLabel: "Wigs",
    guideTitle: "Human Hair Wigs Buying Guide",
    paragraphs: [
      "Human hair wigs are built for realistic hairlines, styling freedom, and reliable daily wear across lace front and closure constructions.",
      "For the best result, choose a cap style and density that match your face shape, comfort needs, and preferred maintenance level.",
    ],
    relatedCollections: [
      { href: "/bulk-hair", label: "Shop Bulk Hair" },
      { href: "/weft-hair", label: "Shop Bundles" },
      { href: "/extensions", label: "Shop Hair Extensions" },
    ],
  },
}

const CATALOG_SEO_CONTENT_RU: Record<CatalogGroupKey, CatalogSeoContent> = {
  bulk: {
    breadcrumbLabel: "Bulk Hair",
    guideTitle: "Гид по выбору Bulk Hair",
    paragraphs: [
      "Bulk hair отлично подходит для плетения, создания париков и hand-tied установок — свободные пряди дают максимум гибкости.",
      "Выбирая bulk hair, обращайте внимание на однородность текстуры, совпадение оттенка и количество прядей, чтобы установка выглядела плотной и естественной.",
    ],
    relatedCollections: [
      { href: "/weft-hair", label: "Трессы" },
      { href: "/extensions", label: "Наращивание" },
      { href: "/wigs", label: "Парики" },
    ],
  },
  weft: {
    breadcrumbLabel: "Трессы",
    guideTitle: "Гид по текстурам тресс",
    paragraphs: [
      "Weft hair сочетает прочность и универсальность для sew-in и салонных установок — мягкое смешивание и длительная носка.",
      "Сравнивайте волны и завитки, чтобы выбранная текстура подходила вашему стилю, уходу и желаемому объему.",
    ],
    relatedCollections: [
      { href: "/bulk-hair", label: "Bulk Hair" },
      { href: "/extensions", label: "Наращивание" },
      { href: "/wigs", label: "Парики" },
    ],
  },
  extensions: {
    breadcrumbLabel: "Наращивание",
    guideTitle: "Советы по выбору наращивания",
    paragraphs: [
      "Наращивание — быстрый способ добавить длину и густоту: клипсы, тейпы и пряди под разные сценарии носки.",
      "Выбирайте метод под образ жизни, частоту укладки и желаемый эффект — так будет комфортно и максимально натурально.",
    ],
    relatedCollections: [
      { href: "/bulk-hair", label: "Bulk Hair" },
      { href: "/weft-hair", label: "Трессы" },
      { href: "/wigs", label: "Парики" },
    ],
  },
  wigs: {
    breadcrumbLabel: "Парики",
    guideTitle: "Гид по парикам из натуральных волос",
    paragraphs: [
      "Парики из натуральных волос дают реалистичную линию роста, свободу укладки и надежную ежедневную носку — lace front и closure варианты.",
      "Для лучшего результата подберите тип шапочки и плотность под форму лица, комфорт и привычный уровень ухода.",
    ],
    relatedCollections: [
      { href: "/bulk-hair", label: "Bulk Hair" },
      { href: "/weft-hair", label: "Трессы" },
      { href: "/extensions", label: "Наращивание" },
    ],
  },
}

export function getCatalogSeoContent(locale: "en" | "ru", group: CatalogGroupKey): CatalogSeoContent {
  return locale === "ru" ? CATALOG_SEO_CONTENT_RU[group] : CATALOG_SEO_CONTENT_EN[group]
}

// Backwards compatible export (English).
export const CATALOG_SEO_CONTENT: Record<CatalogGroupKey, CatalogSeoContent> = CATALOG_SEO_CONTENT_EN
