"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Copy, Sparkles } from "lucide-react";
import SafeImage from "@/components/SafeImage";
import { GridProduct } from "@/lib/catalog";
import { PromoSlide, SHOP_PROMO_CONFIG, ShopPromoSectionKey } from "@/lib/shop-promo-banners";

type ShopPromoBannerProps = {
  section: ShopPromoSectionKey;
  products: GridProduct[];
};

const SECTION_TRANSITION_MS = 260;
const SALE_SLIDE_AUTOPLAY_MS = 6200;

const THEME_STYLES = {
  graphite: {
    panel: "text-white",
    subtitle: "text-white/80",
    cta: "bg-white text-[#16181e] hover:bg-[#f5f6fa]",
    badge: "bg-white/12 text-white border border-white/20",
    coupon: "bg-white/12 text-white border border-white/20",
  },
  ivory: {
    panel: "text-[#1d1d23]",
    subtitle: "text-[#474652]",
    cta: "bg-[#1c1f2a] text-white hover:bg-[#141722]",
    badge: "bg-white/70 text-[#1f2231] border border-white",
    coupon: "bg-[#1f2431] text-white border border-[#1f2431]",
  },
  ember: {
    panel: "text-white",
    subtitle: "text-[#fde5ec]",
    cta: "bg-white text-[#3a1622] hover:bg-[#fff0f5]",
    badge: "bg-[#ffffff22] text-white border border-[#ffffff33]",
    coupon: "bg-[#ffffff20] text-white border border-[#ffffff33]",
  },
} as const;

function getRouteKey(product: GridProduct) {
  return product.handle?.trim() || product.id;
}

function isTShirtProduct(product: GridProduct) {
  const haystack = [
    product.category,
    product.subCategory,
    product.name,
    ...(product.tags ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes("t-shirt") || haystack.includes("tee") || haystack.includes("oversized");
}

export default function ShopPromoBanner({ section, products }: ShopPromoBannerProps) {
  const config = SHOP_PROMO_CONFIG[section];
  const slides = config.slides ?? [];
  const [visibleSection, setVisibleSection] = useState(section);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [slideIndex, setSlideIndex] = useState(0);
  const [copiedCoupon, setCopiedCoupon] = useState<string | null>(null);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchEndX, setTouchEndX] = useState<number | null>(null);

  useEffect(() => {
    if (section === visibleSection) {
      return;
    }

    setIsTransitioning(true);
    const timeout = setTimeout(() => {
      setVisibleSection(section);
      setSlideIndex(0);
      setIsTransitioning(false);
    }, SECTION_TRANSITION_MS);

    return () => clearTimeout(timeout);
  }, [section, visibleSection]);

  useEffect(() => {
    if (visibleSection !== "sale" || slides.length <= 1) {
      return;
    }

    const interval = setInterval(() => {
      setSlideIndex((current) => (current + 1) % slides.length);
    }, SALE_SLIDE_AUTOPLAY_MS);

    return () => clearInterval(interval);
  }, [slides.length, visibleSection]);

  useEffect(() => {
    if (!copiedCoupon) {
      return;
    }

    const timeout = setTimeout(() => setCopiedCoupon(null), 1400);
    return () => clearTimeout(timeout);
  }, [copiedCoupon]);

  const visibleConfig = SHOP_PROMO_CONFIG[visibleSection];
  const activeSlide: PromoSlide | null =
    visibleSection === "sale" && slides.length > 0 ? slides[slideIndex] : null;

  const headline = activeSlide?.title ?? visibleConfig.title;
  const subtitle = activeSlide?.subtitle ?? visibleConfig.subtitle;
  const ctaText = activeSlide?.ctaText ?? visibleConfig.ctaText;
  const ctaUrl = activeSlide?.ctaUrl ?? visibleConfig.ctaUrl;
  const badge = activeSlide?.badge ?? visibleConfig.badge;
  const couponCode = activeSlide?.couponCode ?? visibleConfig.couponCode;
  const imageUrl = activeSlide?.imageUrl ?? visibleConfig.imageUrl;
  const background = activeSlide?.background ?? visibleConfig.background;
  const theme = THEME_STYLES[(activeSlide?.theme ?? visibleConfig.theme) ?? "graphite"];

  const saleHighlights = useMemo(() => {
    if (visibleSection !== "sale") {
      return [];
    }

    const tShirts = products.filter(isTShirtProduct).slice(0, 4);
    if (tShirts.length > 0) {
      return tShirts;
    }

    return products.slice(0, 4);
  }, [products, visibleSection]);

  const handleCopyCoupon = async (code: string) => {
    if (typeof navigator === "undefined" || !navigator.clipboard) {
      return;
    }

    try {
      await navigator.clipboard.writeText(code);
      setCopiedCoupon(code);
    } catch {
      // Ignore copy failures silently to avoid noisy UX.
    }
  };

  const goToNextSlide = () => {
    if (slides.length <= 1) {
      return;
    }

    setSlideIndex((current) => (current + 1) % slides.length);
  };

  const goToPreviousSlide = () => {
    if (slides.length <= 1) {
      return;
    }

    setSlideIndex((current) => (current - 1 + slides.length) % slides.length);
  };

  const onPointerDown = (x: number) => {
    setTouchStartX(x);
    setTouchEndX(null);
  };

  const onPointerMove = (x: number) => {
    setTouchEndX(x);
  };

  const onPointerUp = () => {
    if (slides.length <= 1 || touchStartX === null || touchEndX === null) {
      setTouchStartX(null);
      setTouchEndX(null);
      return;
    }

    const delta = touchStartX - touchEndX;
    if (delta > 42) {
      goToNextSlide();
    } else if (delta < -42) {
      goToPreviousSlide();
    }

    setTouchStartX(null);
    setTouchEndX(null);
  };

  return (
    <section className="home-shell pt-4 md:pt-6" aria-live="polite">
      <div
        className={`relative overflow-hidden rounded-2xl p-5 md:p-8 transition-all duration-300 ${theme.panel} ${
          isTransitioning ? "opacity-40 translate-y-1" : "opacity-100 translate-y-0"
        }`}
        style={{ background: background ?? "linear-gradient(130deg, #12141a 0%, #1f2430 100%)" }}
        onTouchStart={(event) => onPointerDown(event.touches[0]?.clientX ?? 0)}
        onTouchMove={(event) => onPointerMove(event.touches[0]?.clientX ?? 0)}
        onTouchEnd={onPointerUp}
      >
        <div className="pointer-events-none absolute -right-10 -top-16 h-52 w-52 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-8 -bottom-20 h-60 w-60 rounded-full bg-[#ed467a]/20 blur-3xl" />

        <div className="relative grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(220px,420px)] md:items-center">
          <div>
            {badge ? (
              <span className={`mb-4 inline-flex items-center gap-2 rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${theme.badge}`}>
                <Sparkles className="h-3.5 w-3.5" />
                {badge}
              </span>
            ) : null}

            <h2 className="max-w-[19ch] text-3xl font-semibold leading-[1.05] md:text-5xl">{headline}</h2>
            <p className={`mt-3 max-w-[58ch] text-sm md:text-base ${theme.subtitle}`}>{subtitle}</p>

            {couponCode ? (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCopyCoupon(couponCode)}
                  className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold tracking-[0.08em] ${theme.coupon}`}
                  aria-label={`Copy coupon ${couponCode}`}
                >
                  <Copy className="h-3.5 w-3.5" />
                  {couponCode}
                </button>
                <span className="text-xs text-white/85">{copiedCoupon === couponCode ? "Copied" : "Tap to copy coupon"}</span>
              </div>
            ) : null}

            {visibleConfig.promoText && visibleSection === "sale" ? (
              <p className="mt-3 text-sm font-semibold uppercase tracking-[0.12em] text-white/90">{visibleConfig.promoText}</p>
            ) : null}

            <div className="mt-5 flex items-center gap-3">
              <Link
                href={ctaUrl}
                className={`inline-flex items-center rounded-full px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] transition ${theme.cta}`}
              >
                {ctaText}
              </Link>
            </div>
          </div>

          <div className="relative hidden h-[220px] overflow-hidden rounded-xl border border-white/20 md:block">
            {imageUrl ? <SafeImage src={imageUrl} alt={headline} className="h-full w-full object-cover" /> : null}
            <div className="absolute inset-0 bg-gradient-to-t from-black/25 to-transparent" />
          </div>
        </div>

        {visibleSection === "sale" && slides.length > 1 ? (
          <>
            <button
              type="button"
              onClick={goToPreviousSlide}
              className="absolute left-3 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-black/30 text-white backdrop-blur transition hover:bg-black/45"
              aria-label="Previous sale highlight"
            >
              <ChevronLeft className="h-4.5 w-4.5" />
            </button>

            <button
              type="button"
              onClick={goToNextSlide}
              className="absolute right-3 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-black/30 text-white backdrop-blur transition hover:bg-black/45"
              aria-label="Next sale highlight"
            >
              <ChevronRight className="h-4.5 w-4.5" />
            </button>

            <div className="mt-5 flex items-center justify-center gap-2">
              {slides.map((slide, index) => (
                <button
                  key={`${slide.title}-${index}`}
                  type="button"
                  onClick={() => setSlideIndex(index)}
                  className={`h-1.5 rounded-full transition-all ${index === slideIndex ? "w-7 bg-white" : "w-2.5 bg-white/40"}`}
                  aria-label={`View sale slide ${index + 1}`}
                />
              ))}
            </div>
          </>
        ) : null}
      </div>

      {visibleSection === "sale" && saleHighlights.length > 0 ? (
        <div className="mt-4 rounded-2xl border border-[#e7d3da] bg-white p-4 md:p-5">
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8e6976]">Deal Of The Drop</p>
              <h3 className="text-xl font-semibold text-[#1d1f2a] md:text-2xl">T-Shirt Picks Worth Grabbing</h3>
            </div>
            <Link href="/shop?section=sale" className="text-xs font-semibold uppercase tracking-[0.1em] text-[#ed467a]">
              View All
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {saleHighlights.map((product) => (
              <Link
                key={product.id}
                href={`/product/${encodeURIComponent(getRouteKey(product))}`}
                className="group overflow-hidden rounded-xl border border-[#ececf2] bg-white transition hover:border-[#ed467a]/35 hover:shadow-[0_10px_22px_rgba(40,44,63,0.1)]"
              >
                <SafeImage src={product.img} alt={product.name} className="h-36 w-full object-cover sm:h-40" />
                <div className="space-y-1.5 p-2.5">
                  <p className="line-clamp-1 text-sm font-semibold text-[#222634]">{product.name}</p>
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="font-semibold text-[#222634]">{product.price}</span>
                    {product.oldPrice ? <span className="text-[#9498a5] line-through">{product.oldPrice}</span> : null}
                  </div>
                  <span className="inline-flex text-[10px] font-semibold uppercase tracking-[0.12em] text-[#ed467a]">Shop Now</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
