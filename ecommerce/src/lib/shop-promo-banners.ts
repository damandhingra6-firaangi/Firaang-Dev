export type ShopPromoSectionKey =
  | "just-dropped"
  | "shop"
  | "collections"
  | "bestsellers"
  | "sale";

export type PromoTheme = "graphite" | "ivory" | "ember";

export type PromoSlide = {
  title: string;
  subtitle: string;
  ctaText: string;
  ctaUrl: string;
  badge?: string;
  couponCode?: string;
  imageUrl?: string;
  background?: string;
  theme?: PromoTheme;
};

export type ShopPromoConfig = {
  key: ShopPromoSectionKey;
  title: string;
  subtitle: string;
  ctaText: string;
  ctaUrl: string;
  badge?: string;
  couponCode?: string;
  promoText?: string;
  imageUrl?: string;
  background?: string;
  theme?: PromoTheme;
  slides?: PromoSlide[];
};

export const SHOP_PROMO_CONFIG: Record<ShopPromoSectionKey, ShopPromoConfig> = {
  "just-dropped": {
    key: "just-dropped",
    badge: "New Drop",
    title: "JUST DROPPED. DON'T SLEEP ON IT.",
    subtitle: "Fresh fits. New energy. Limited quantities.",
    ctaText: "SHOP THE DROP",
    ctaUrl: "/shop?section=just-dropped",
    imageUrl: "/hero.jpg",
    background: "linear-gradient(130deg, #111214 0%, #1b1e23 55%, #2b1f25 100%)",
    theme: "graphite",
  },
  shop: {
    key: "shop",
    badge: "Everyday Picks",
    title: "FIND YOUR NEXT FAVOURITE FIT.",
    subtitle: "Explore Firaang's complete collection and find the style that fits your vibe.",
    ctaText: "SHOP ALL",
    ctaUrl: "/shop?section=shop",
    imageUrl: "/cat3.jpg",
    background: "linear-gradient(125deg, #f7f0e8 0%, #f2e5da 52%, #ecd7cb 100%)",
    theme: "ivory",
  },
  collections: {
    key: "collections",
    badge: "Curated",
    title: "CURATED FOR YOUR VIBE.",
    subtitle: "Explore Firaang's latest collections, styles and drops.",
    ctaText: "EXPLORE COLLECTIONS",
    ctaUrl: "/shop?section=collections",
    imageUrl: "/cat2.jpg",
    background: "linear-gradient(130deg, #17171c 0%, #24202b 50%, #2f2533 100%)",
    theme: "graphite",
  },
  bestsellers: {
    key: "bestsellers",
    badge: "Most Loved",
    title: "THE FITS EVERYONE'S LOVING.",
    subtitle: "Our most-loved Firaang styles, all in one place.",
    ctaText: "SHOP BESTSELLERS",
    ctaUrl: "/shop?section=bestsellers",
    imageUrl: "/cat4.jpg",
    background: "linear-gradient(130deg, #15161b 0%, #1f2430 56%, #342730 100%)",
    theme: "graphite",
  },
  sale: {
    key: "sale",
    badge: "Limited Time",
    title: "MORE STYLE. LESS SPEND.",
    subtitle: "Your favourite Firaang fits just got better.",
    ctaText: "SHOP THE SALE",
    ctaUrl: "/shop?section=sale",
    promoText: "EXTRA 5% OFF",
    couponCode: "WELCOME5",
    imageUrl: "/cat1.jpg",
    background: "linear-gradient(130deg, #2b0f18 0%, #4f1529 52%, #7a2337 100%)",
    theme: "ember",
    slides: [
      {
        badge: "Extra 5% OFF",
        title: "MORE STYLE. LESS SPEND.",
        subtitle: "Use code WELCOME5 for an extra 5% off on your favourites.",
        ctaText: "SHOP THE SALE",
        ctaUrl: "/shop?section=sale",
        couponCode: "WELCOME5",
        imageUrl: "/cat1.jpg",
        background: "linear-gradient(130deg, #2b0f18 0%, #4f1529 52%, #7a2337 100%)",
        theme: "ember",
      },
      {
        badge: "Extra 10% OFF",
        title: "10% OFF? SAY LESS.",
        subtitle: "Your fit just got 10% better with code SPECIAL10.",
        ctaText: "GET THE DEAL",
        ctaUrl: "/shop?section=sale",
        couponCode: "SPECIAL10",
        imageUrl: "/cat2.jpg",
        background: "linear-gradient(130deg, #1a1928 0%, #2f2240 50%, #5c2f58 100%)",
        theme: "ember",
      },
      {
        badge: "Selected Styles",
        title: "YOUR NEXT FIT IS WAITING.",
        subtitle: "Selected Firaang styles + extra savings while stock lasts.",
        ctaText: "SHOP NOW",
        ctaUrl: "/shop?section=sale",
        imageUrl: "/hero.jpg",
        background: "linear-gradient(130deg, #281517 0%, #4a1b23 52%, #6f2733 100%)",
        theme: "ember",
      },
    ],
  },
};

export function normalizeShopPromoSection(input: string | undefined) {
  const value = (input ?? "").trim().toLowerCase();

  if (
    value === "just-dropped" ||
    value === "shop" ||
    value === "collections" ||
    value === "bestsellers" ||
    value === "sale"
  ) {
    return value;
  }

  return "shop" as ShopPromoSectionKey;
}
