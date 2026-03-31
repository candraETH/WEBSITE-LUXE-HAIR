import type { SupportedLocale } from "@/lib/i18n"

type Messages = {
  promoMarquee: string
  nav: Record<string, string>
  searchPlaceholder: string
  cartLabel: string
  account: {
    register: string
    createAccount: string
    signIn: string
    signOut: string
    myAccount: string
    accountFallback: string
  }
  hero: {
    whatsappSupport: string
    whatsappButtonLabel: string
    whatsappUnavailableTitle: string
    slides: Array<{
      id: string
      eyebrow: string
      title: string
      description: string
      ctaLabel: string
    }>
  }
  home: {
    sections: {
      bulk: { title: string; subtitle: string; description: string }
      weft: { title: string; subtitle: string; description: string }
      extensions: { title: string; subtitle: string; description: string }
      wigs: { title: string; subtitle: string; description: string }
    }
  }
  catalog: {
    breadcrumbHome: string
    sortLabel: string
    sortOptions: {
      featured: string
      priceAsc: string
      priceDesc: string
      nameAsc: string
    }
    relatedHeading: string
    faqFallbackHeading: string
  }
  blog: {
    breadcrumbBlog: string
    publishDateLabel: string
    viewMoreLabel: string
    backToBlog: string
    shopCollection: string
    previewTitle: string
    previewSubtitle: string
    recommendedEyebrow: string
    recommendedTitle: string
    blogNotFoundTitle: string
    blogNotFoundDescription: string
  }
  footer: {
    brandDescription: string
    collectionsHeading: string
    companyHeading: string
    contactHeading: string
    collections: {
      extensions: string
      wigs: string
      bundles: string
      bulk: string
    }
    company: {
      about: string
      testimonials: string
      trackOrder: string
      returnPolicy: string
      termsOfService: string
    }
    whatsappMessage: string
    whatsappUnavailableTitle: string
    rightsReserved: string
  }
}

const EN: Messages = {
  promoMarquee: "Limited Offer: 25% OFF all hair collections - Shop now",
  nav: {
    Home: "Home",
    "Bulk Hair": "Bulk Hair",
    Bundles: "Bundles",
    Extensions: "Extensions",
    Wigs: "Wigs",
    Blog: "Blog",
  },
  searchPlaceholder: "Search products...",
  cartLabel: "Cart",
  account: {
    register: "Register",
    createAccount: "Create account",
    signIn: "Sign in",
    signOut: "Sign out",
    myAccount: "My account",
    accountFallback: "Account",
  },
  hero: {
    whatsappSupport: "Hi, I need help choosing the right hair product.",
    whatsappButtonLabel: "WhatsApp Support",
    whatsappUnavailableTitle: "WhatsApp is temporarily unavailable",
    slides: [
      {
        id: "main",
        eyebrow: "Premium Quality Hair",
        title: "Elevate Your\nNatural Beauty",
        description:
          "Discover our curated collection of premium hair extensions, wigs, weft hair, and bulk hair. Luxury you can feel.",
        ctaLabel: "Explore Collection",
      },
      {
        id: "promo",
        eyebrow: "Limited Time Offer",
        title: "Get 25% Off\nAll Collections",
        description:
          "Upgrade your look with salon-quality bulk hair, weft hair, extensions, and wigs. Promo is available for all categories.",
        ctaLabel: "Shop 25% Off",
      },
      {
        id: "promo-2",
        eyebrow: "New Arrival",
        title: "Luxury Texture\nNow Available",
        description:
          "Discover our newest premium bundles and bulk hair selections with salon-grade quality and timeless finish.",
        ctaLabel: "Shop New Arrival",
      },
    ],
  },
  home: {
    sections: {
      bulk: {
        title: "Bulk Hair",
        subtitle: "Our Collection",
        description:
          "High-quality bulk hair perfect for braiding, custom wig construction, and creative styling. Available in all textures.",
      },
      weft: {
        title: "Bundles",
        subtitle: "Professional Grade",
        description:
          "Machine-made and hand-tied weft options for professional installations. Designed for stylists who demand the best.",
      },
      extensions: {
        title: "Hair Extensions",
        subtitle: "Premium Selection",
        description:
          "Premium clip-in, tape-in, and bundle extensions crafted from 100% human hair. Achieve your dream length and volume effortlessly.",
      },
      wigs: {
        title: "Luxury Wigs",
        subtitle: "Handcrafted",
        description:
          "From lace front to full lace, our wigs offer the most natural look and feel. Custom options available upon request.",
      },
    },
  },
  catalog: {
    breadcrumbHome: "Home",
    sortLabel: "Sort",
    sortOptions: {
      featured: "Featured",
      priceAsc: "Price: Low to High",
      priceDesc: "Price: High to Low",
      nameAsc: "Name: A to Z",
    },
    relatedHeading: "Explore Related Collections",
    faqFallbackHeading: "Frequently Asked Questions",
  },
  blog: {
    breadcrumbBlog: "Blog",
    publishDateLabel: "Publish Date",
    viewMoreLabel: "View More ->",
    backToBlog: "Back to Blog",
    shopCollection: "Shop Collection",
    previewTitle: "Blog Preview",
    previewSubtitle: "More articles you might enjoy.",
    recommendedEyebrow: "Recommended Product",
    recommendedTitle: "Recommended for You",
    blogNotFoundTitle: "Blog Article Not Found",
    blogNotFoundDescription: "The requested blog article could not be found.",
  },
  footer: {
    brandDescription:
      "Premium quality hair extensions, wigs, and more. Elevate your natural beauty with our luxurious collection.",
    collectionsHeading: "Collections",
    companyHeading: "Company",
    contactHeading: "Contact",
    collections: {
      extensions: "Hair Extensions",
      wigs: "Wigs",
      bundles: "Bundles",
      bulk: "Bulk Hair",
    },
    company: {
      about: "About Us",
      testimonials: "Testimonials",
      trackOrder: "Track Order",
      returnPolicy: "Return Policy",
      termsOfService: "Terms of Service",
    },
    whatsappMessage: "Hi, I'm interested in your hair products",
    whatsappUnavailableTitle: "WhatsApp is temporarily unavailable",
    rightsReserved: "All rights reserved.",
  },
}

const RU: Messages = {
  promoMarquee: "Спецпредложение: скидка 25% на все коллекции волос — купить сейчас",
  nav: {
    Home: "Главная",
    "Bulk Hair": "\u0412\u043e\u043b\u043e\u0441\u044b Bulk",
    Bundles: "Трессы",
    Extensions: "Наращивание",
    Wigs: "Парики",
    Blog: "Блог",
  },
  searchPlaceholder: "Поиск товаров...",
  cartLabel: "Корзина",
  account: {
    register: "Аккаунт",
    createAccount: "Создать аккаунт",
    signIn: "Войти",
    signOut: "Выйти",
    myAccount: "Мой аккаунт",
    accountFallback: "Аккаунт",
  },
  hero: {
    whatsappSupport: "Здравствуйте! Нужна помощь в выборе подходящего продукта.",
    whatsappButtonLabel: "Поддержка WhatsApp",
    whatsappUnavailableTitle: "WhatsApp временно недоступен",
    slides: [
      {
        id: "main",
        eyebrow: "Премиальное качество",
        title: "Подчеркните\nестественную красоту",
        description:
          "Откройте для себя нашу коллекцию: наращивания, парики, трессы и bulk hair. Роскошь, которую чувствуешь.",
        ctaLabel: "Смотреть коллекцию",
      },
      {
        id: "promo",
        eyebrow: "Ограниченное предложение",
        title: "Скидка 25%\nна все коллекции",
        description:
          "Обновите образ с салонным качеством: bulk hair, трессы, наращивание и парики. Акция действует на все категории.",
        ctaLabel: "Купить со скидкой 25%",
      },
      {
        id: "promo-2",
        eyebrow: "Новинки",
        title: "Роскошные текстуры\nуже в наличии",
        description:
          "Наши новые премиальные трессы и bulk hair — салонное качество и безупречный финиш.",
        ctaLabel: "Купить новинки",
      },
    ],
  },
  home: {
    sections: {
      bulk: {
        title: "\u0412\u043e\u043b\u043e\u0441\u044b Bulk",
        subtitle: "Коллекция",
        description:
          "Качественные волосы bulk hair для плетения, создания париков и креативных укладок. Доступны разные текстуры.",
      },
      weft: {
        title: "Трессы",
        subtitle: "Профессиональный уровень",
        description:
          "Машинные и ручные трессы для профессиональной установки. Для стилистов, которые выбирают лучшее.",
      },
      extensions: {
        title: "Наращивание",
        subtitle: "Премиальный выбор",
        description:
          "Клипсы, тейпы и пряди из 100% натуральных волос. Длина и объем мечты — легко.",
      },
      wigs: {
        title: "Парики",
        subtitle: "Ручная работа",
        description:
          "От lace front до full lace — максимально натуральный вид и комфорт. Индивидуальные опции по запросу.",
      },
    },
  },
  catalog: {
    breadcrumbHome: "Главная",
    sortLabel: "Сортировка",
    sortOptions: {
      featured: "Рекомендуемые",
      priceAsc: "Цена: по возрастанию",
      priceDesc: "Цена: по убыванию",
      nameAsc: "Название: А–Я",
    },
    relatedHeading: "Похожие коллекции",
    faqFallbackHeading: "Часто задаваемые вопросы",
  },
  blog: {
    breadcrumbBlog: "Блог",
    publishDateLabel: "Дата публикации",
    viewMoreLabel: "Подробнее ->",
    backToBlog: "Назад в блог",
    shopCollection: "Перейти в каталог",
    previewTitle: "Другие статьи",
    previewSubtitle: "Вам также может понравиться.",
    recommendedEyebrow: "Рекомендации",
    recommendedTitle: "Рекомендуем вам",
    blogNotFoundTitle: "Статья не найдена",
    blogNotFoundDescription: "Запрошенная статья не найдена.",
  },
  footer: {
    brandDescription:
      "Премиальные наращивания, парики и многое другое. Подчеркните естественную красоту с нашей роскошной коллекцией.",
    collectionsHeading: "Коллекции",
    companyHeading: "Компания",
    contactHeading: "Контакты",
    collections: {
      extensions: "Наращивание",
      wigs: "Парики",
      bundles: "Трессы",
      bulk: "\u0412\u043e\u043b\u043e\u0441\u044b Bulk",
    },
    company: {
      about: "О нас",
      testimonials: "Отзывы",
      trackOrder: "Отследить заказ",
      returnPolicy: "Возврат",
      termsOfService: "Условия использования",
    },
    whatsappMessage: "Здравствуйте! Интересуют ваши продукты для волос.",
    whatsappUnavailableTitle: "WhatsApp временно недоступен",
    rightsReserved: "Все права защищены.",
  },
}

const MESSAGES: Record<SupportedLocale, Messages> = { en: EN, ru: RU }

export function getMessages(locale: SupportedLocale): Messages {
  return MESSAGES[locale]
}
