"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { TouchEvent } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import SafeImage from "@/components/SafeImage";
import type { ShopifyCollectionLaunch } from "@/lib/shopify-collections";

type HeroProps = {
  featuredCollections?: ShopifyCollectionLaunch[];
};

type HeroSlide = {
  id: string;
  image: string;
  mobileImage: string;
  alt: string;
  eyebrow: string;
  title: [string, string];
  subtitle: string;
  primaryCtaLabel: string;
  primaryCtaHref: string;
  secondaryCtaLabel?: string;
  secondaryCtaHref?: string;
  contentClassName?: string;
  titleClassName?: string;
  subtitleClassName?: string;
  imageClassName?: string;
  mobileImageClassName?: string;
  overlayClassName?: string;
  actionsClassName?: string;
  promoBadgeText?: string;
  promoBadgeClassName?: string;
  couponCode?: string;
  couponHintText?: string;
  couponClassName?: string;
};

const BASE_HERO_SLIDE: HeroSlide = {
  id: "core-firaang-hero",
  image: "/Home Page Banner.png",
  mobileImage: "/Mobile view_02.png",
  alt: "Model in seasonal Firaang outfit",
  eyebrow: "AUTUMN / WINTER 2026",
  title: ["Define Your", "Style With Firaang"],
  subtitle: "Premium Clothing And Jewellery, Sculpted For Those Who Treat Their Wardrobe Like An Archive. Firaang (Fi-rang) is different by design.",
  primaryCtaLabel: "SHOP WOMEN",
  primaryCtaHref: "/shop?audience=girls",
  secondaryCtaLabel: "SHOP MEN",
  secondaryCtaHref: "/shop?audience=boys",
};

const DEVOTIONAL_HERO_SLIDE: HeroSlide = {
  id: "devotional-collection-hero",
  image: "/HomePageBannerDevotional.jpg",
  mobileImage: "/Mobile_banner_devotional.png",
  alt: "Devotional Collection banner featuring Lord Shiva-inspired artwork and temple setting",
  eyebrow: "DEVOTIONAL COLLECTION",
  title: ["Wear your faith.", "Carry your devotion."],
  subtitle: "Thoughtfully designed spiritual expression, crafted in Firaang's premium visual language.",
  primaryCtaLabel: "SHOP COLLECTION",
  primaryCtaHref: "/shop?category=t-shirts&subCategory=devotional",
  contentClassName:
    "items-start justify-end pb-16 text-left sm:pb-20 md:justify-center md:pb-0 md:pl-8 lg:pl-14 xl:pl-20",
  titleClassName:
    "max-w-[8ch] text-[clamp(2.65rem,10vw,4.25rem)] leading-[0.98] sm:max-w-[9ch] md:max-w-[8ch] md:text-[clamp(3.3rem,5.2vw,5.2rem)] lg:max-w-[9ch] xl:max-w-[10ch]",
  subtitleClassName: "max-w-[320px] text-[13px] leading-[1.5] sm:max-w-[380px] md:max-w-[420px] lg:max-w-[460px] xl:max-w-[500px]",
  mobileImageClassName: "object-[68%_18%]",
  imageClassName: "object-[62%_28%] lg:object-[64%_26%] xl:object-[66%_25%]",
  overlayClassName:
    "bg-[linear-gradient(90deg,rgba(0,0,0,0.86)_0%,rgba(0,0,0,0.76)_24%,rgba(0,0,0,0.46)_46%,rgba(0,0,0,0.16)_68%,rgba(0,0,0,0.08)_100%)] md:bg-[linear-gradient(90deg,rgba(0,0,0,0.78)_0%,rgba(0,0,0,0.68)_23%,rgba(0,0,0,0.36)_44%,rgba(0,0,0,0.12)_68%,rgba(0,0,0,0.08)_100%)]",
  actionsClassName: "mt-5 md:mt-7",
};

const WELCOME_COUPON_HERO_SLIDE: HeroSlide = {
  id: "welcome-coupon-hero",
  image: "/Banner1.png",
  mobileImage: "/Banner_Mobile.png",
  alt: "Firaang welcome offer banner with fashion models",
  eyebrow: "WELCOME TO FIRAANG",
  title: ["EXTRA 5% OFF", ""],
  subtitle: "Apply at checkout to save",
  primaryCtaLabel: "SHOP NOW",
  primaryCtaHref: "/shop",
  promoBadgeText: "NEW CUSTOMER WELCOME OFFER",
  couponCode: "WELCOME5",
  couponHintText: "Use this code at checkout",
  titleClassName:
    "text-[clamp(2.9rem,13.5vw,5.7rem)] leading-[0.96] md:text-[clamp(4.8rem,7.3vw,6.35rem)]",
  subtitleClassName:
    "mt-3 max-w-[300px] text-[13px] font-semibold text-white/92 sm:max-w-[360px] md:mt-4 md:max-w-[430px] md:text-[17px]",
  mobileImageClassName: "object-[50%_70%]",
  imageClassName: "object-[50%_26%] lg:object-[50%_30%] xl:object-[50%_34%]",
  overlayClassName:
    "bg-[radial-gradient(circle_at_18%_24%,rgba(0,189,255,0.2)_0%,rgba(0,189,255,0)_38%),radial-gradient(circle_at_82%_20%,rgba(10,207,131,0.18)_0%,rgba(10,207,131,0)_36%),radial-gradient(circle_at_50%_84%,rgba(237,70,122,0.16)_0%,rgba(237,70,122,0)_42%),radial-gradient(circle_at_66%_50%,rgba(253,206,72,0.11)_0%,rgba(253,206,72,0)_46%),linear-gradient(112deg,rgba(12,10,18,0.2)_0%,rgba(20,14,26,0.14)_35%,rgba(14,12,22,0.2)_100%)]",
  promoBadgeClassName: "mt-3 bg-white/22 text-white ring-1 ring-white/55 shadow-[0_8px_18px_rgba(0,0,0,0.18)] md:mt-4",
  couponClassName: "border-white/58 bg-white/14 text-white shadow-[0_14px_26px_rgba(0,0,0,0.16)]",
  actionsClassName: "mt-5 md:mt-7",
};

function splitHeadline(value: string) {
  const normalized = value.trim().replace(/\s+/g, " ");

  if (!normalized) {
    return ["Define Your", "Style With Firaang"] as const;
  }

  const words = normalized.split(" ");
  if (words.length <= 3) {
    return [normalized, ""] as const;
  }

  const pivot = Math.ceil(words.length / 2);
  return [words.slice(0, pivot).join(" "), words.slice(pivot).join(" ")] as const;
}

function getFestivalSlideOverrides(collection: ShopifyCollectionLaunch): Partial<HeroSlide> | null {
  const lowered = `${collection.title} ${collection.handle}`.toLowerCase();

  if (lowered.includes("janmashtami")) {
    return {
      eyebrow: "✨ JANMASHTAMI SPECIAL",
      title: ["Janmashtami", "Special"],
      subtitle:
        "Celebrate Krishna Janmashtami with expressive graphic essentials inspired by devotion, color, and festive energy.",
      primaryCtaLabel: "EXPLORE COLLECTION",
      overlayClassName:
        "bg-[radial-gradient(circle_at_16%_24%,rgba(249,115,22,0.2)_0%,rgba(249,115,22,0)_38%),radial-gradient(circle_at_84%_18%,rgba(37,99,235,0.16)_0%,rgba(37,99,235,0)_38%),linear-gradient(110deg,rgba(8,8,12,0.62)_0%,rgba(12,12,20,0.52)_36%,rgba(20,12,8,0.48)_100%)]",
      imageClassName: "object-[50%_22%] lg:object-[50%_24%] xl:object-[50%_26%]",
      mobileImageClassName: "object-[50%_18%]",
      subtitleClassName: "max-w-[320px] text-[13px] leading-[1.5] sm:max-w-[380px] md:max-w-[460px]",
      actionsClassName: "mt-5 md:mt-7",
    };
  }

  return null;
}

function mapFeaturedCollectionToSlide(collection: ShopifyCollectionLaunch): HeroSlide {
  const launchHeadline = collection.launchTitle ?? collection.title;
  const [headlineLineOne, headlineLineTwo] = splitHeadline(launchHeadline);
  const festivalOverrides = getFestivalSlideOverrides(collection);

  return {
    id: collection.id,
    image: collection.imageUrl || "/Home Page Banner.png",
    mobileImage: collection.imageUrl || "/Mobile view_02.png",
    alt: `${collection.title} launch collection`,
    eyebrow: `✨ ${collection.title.toUpperCase()}`,
    title: [headlineLineOne, headlineLineTwo],
    subtitle:
      collection.launchSubtitle ||
      collection.description ||
      "Explore the latest limited campaign from Firaang (Fi-rang).",
    primaryCtaLabel: "EXPLORE COLLECTION",
    primaryCtaHref: collection.href,
    ...festivalOverrides,
  };
}

export default function Hero({ featuredCollections = [] }: HeroProps) {
  const slides = useMemo(
    () => [BASE_HERO_SLIDE, WELCOME_COUPON_HERO_SLIDE, DEVOTIONAL_HERO_SLIDE, ...featuredCollections.map(mapFeaturedCollectionToSlide)],
    [featuredCollections],
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartXRef = useRef<number | null>(null);

  useEffect(() => {
    setActiveIndex((currentIndex) => Math.min(currentIndex, Math.max(0, slides.length - 1)));
  }, [slides.length]);

  const goToSlide = (index: number) => {
    if (slides.length <= 0) {
      return;
    }

    const nextIndex = ((index % slides.length) + slides.length) % slides.length;
    setActiveIndex(nextIndex);
  };

  const goToNextSlide = () => {
    setActiveIndex((currentIndex) => (currentIndex + 1) % slides.length);
  };

  const goToPreviousSlide = () => {
    setActiveIndex((currentIndex) => (currentIndex - 1 + slides.length) % slides.length);
  };

  useEffect(() => {
    if (slides.length <= 1 || isPaused) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setActiveIndex((currentIndex) => (currentIndex + 1) % slides.length);
    }, 4500);

    return () => window.clearInterval(intervalId);
  }, [isPaused, slides.length]);

  const activeSlide = slides[activeIndex] ?? BASE_HERO_SLIDE;

  const handleTouchStart = (event: TouchEvent<HTMLElement>) => {
    touchStartXRef.current = event.touches[0]?.clientX ?? null;
  };

  const handleTouchEnd = (event: TouchEvent<HTMLElement>) => {
    const startX = touchStartXRef.current;
    const endX = event.changedTouches[0]?.clientX ?? null;
    touchStartXRef.current = null;

    if (startX === null || endX === null) {
      return;
    }

    const deltaX = endX - startX;
    if (Math.abs(deltaX) < 50) {
      return;
    }

    if (deltaX > 0) {
      goToPreviousSlide();
      return;
    }

    goToNextSlide();
  };

  return (
    <section
      className="hero-section relative mt-[92px] min-h-[64vh] w-full overflow-hidden min-[401px]:min-h-[66vh] md:mt-[98px] md:min-h-[82vh] lg:min-h-[86vh]"
      tabIndex={0}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          goToPreviousSlide();
        }

        if (event.key === "ArrowRight") {
          event.preventDefault();
          goToNextSlide();
        }
      }}
      aria-label="Featured collections carousel"
    >
      {slides.map((slide, index) => (
        <div
          key={slide.id}
          className={`absolute inset-0 transition-opacity duration-700 ${
            index === activeIndex ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
          aria-hidden={index !== activeIndex}
        >
          <SafeImage
            src={slide.mobileImage}
            alt={slide.alt}
            className={`absolute left-0 top-0 h-full w-full object-cover object-[50%_15%] max-[374px]:object-[50%_12%] min-[375px]:object-[50%_14%] min-[390px]:object-[50%_15%] min-[414px]:object-[50%_18%] md:hidden ${slide.mobileImageClassName ?? ""}`}
          />
          <SafeImage
            src={slide.image}
            alt={slide.alt}
            className={`absolute left-0 top-0 hidden h-full w-full object-cover object-[50%_20%] md:block lg:object-[50%_22%] xl:object-[50%_25%] ${slide.imageClassName ?? ""}`}
          />

          <div className="hero-overlay-primary absolute inset-0" />
          <div className="hero-overlay-glow absolute inset-0" />
          {slide.overlayClassName ? <div className={`absolute inset-0 ${slide.overlayClassName}`} /> : null}
        </div>
      ))}

      <div className={`hero-content absolute inset-x-0 bottom-0 top-8 z-10 home-shell flex flex-col pt-4 fade-in-up md:inset-0 md:pt-0 ${activeSlide.contentClassName ?? "items-center justify-start text-center md:justify-center"}`}>
        <p className="hero-eyebrow font-sans text-[12px] font-medium uppercase tracking-[0.26em] text-[#f4f4f4] md:text-[16px] md:tracking-[0.22em]">
          {activeSlide.eyebrow}
        </p>

        {activeSlide.promoBadgeText ? (
          <p className={`mt-2 inline-flex self-center rounded-full px-3 py-1 font-sans text-[10px] font-semibold uppercase tracking-[0.16em] backdrop-blur-sm md:text-[11px] ${activeSlide.promoBadgeClassName ?? "bg-white/10 text-white/90"}`}>
            {activeSlide.promoBadgeText}
          </p>
        ) : null}

        <h1 className={`hero-title mt-4 max-w-4xl font-sans text-[clamp(2.5rem,11vw,4.75rem)] font-semibold leading-[1.03] tracking-[-0.02em] md:mt-5 md:text-[clamp(4.4rem,6.8vw,6rem)] md:leading-[0.98] ${activeSlide.titleClassName ?? ""}`}>
          {activeSlide.title[0]}
          {activeSlide.title[1] ? (
            <>
              <br />
              {activeSlide.title[1]}
            </>
          ) : null}
        </h1>

        <p className={`mt-4 max-w-[760px] font-sans text-[12px] font-medium leading-[1.5] text-[#f6f6f6] md:mt-6 md:text-[16px] md:leading-[1.35] lg:text-[18px] ${activeSlide.subtitleClassName ?? ""}`}>
          {activeSlide.subtitle}
        </p>

        {activeSlide.couponCode ? (
          <div className={`mt-4 inline-flex min-w-[220px] flex-col items-center self-center rounded-[14px] border px-5 py-3 backdrop-blur-md md:mt-5 md:min-w-[250px] md:px-6 ${activeSlide.couponClassName ?? "border-white/45 bg-black/28 text-white"}`}>
            <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.18em] text-white/78 md:text-[11px]">
              Coupon Code
            </p>
            <p className="mt-1.5 font-sans text-[29px] font-semibold uppercase tracking-[0.16em] leading-none md:text-[34px]">
              {activeSlide.couponCode}
            </p>
            {activeSlide.couponHintText ? (
              <p className="mt-1.5 font-sans text-[11px] font-medium text-white/74 md:text-[12px]">
                {activeSlide.couponHintText}
              </p>
            ) : null}
          </div>
        ) : null}

        <div className={`mt-6 flex flex-col gap-3 sm:flex-row sm:gap-2.5 md:mt-8 md:gap-4 ${activeSlide.actionsClassName ?? ""}`}>
          <Link
            href={activeSlide.primaryCtaHref}
            className="inline-flex h-[42px] items-center justify-center rounded-[4px] border border-white bg-white px-6 font-sans text-[15px] font-medium uppercase tracking-[0.02em] text-[#222222] transition duration-200 hover:bg-[#f2f2f2]"
          >
            {activeSlide.primaryCtaLabel}
          </Link>
          {activeSlide.secondaryCtaHref && activeSlide.secondaryCtaLabel ? (
            <Link
              href={activeSlide.secondaryCtaHref}
              className="inline-flex h-[42px] items-center justify-center rounded-[4px] border border-white/85 bg-transparent px-6 font-sans text-[15px] font-medium uppercase tracking-[0.02em] text-white transition duration-200 hover:bg-white/15"
            >
              {activeSlide.secondaryCtaLabel}
            </Link>
          ) : null}
        </div>
      </div>

      {slides.length > 1 ? (
        <>
          <button
            type="button"
            aria-label="Previous hero slide"
            onClick={goToPreviousSlide}
            className="absolute left-3 top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/35 bg-black/35 text-white backdrop-blur-sm transition hover:bg-black/55 md:inline-flex"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            aria-label="Next hero slide"
            onClick={goToNextSlide}
            className="absolute right-3 top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/35 bg-black/35 text-white backdrop-blur-sm transition hover:bg-black/55 md:inline-flex"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          <div className="absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 gap-2.5 md:bottom-8">
            {slides.map((slide, index) => (
              <button
                key={slide.id}
                type="button"
                aria-label={`Go to slide ${index + 1}`}
                onClick={() => goToSlide(index)}
                className={`h-2.5 rounded-full transition-all duration-200 ${
                  index === activeIndex ? "w-7 bg-white" : "w-2.5 bg-white/65 hover:bg-white/85"
                }`}
              />
            ))}
          </div>
        </>
      ) : null}

      {slides.length > 1 ? (
        <div className="absolute bottom-5 right-4 z-20 text-[10px] font-semibold tracking-[0.08em] text-white/85 md:hidden">
          {activeIndex + 1}/{slides.length}
        </div>
      ) : null}

      {slides.length > 1 ? (
        <div className="sr-only" aria-live="polite">
          {`Slide ${activeIndex + 1} of ${slides.length}: ${activeSlide.title[0]} ${activeSlide.title[1]}`}
        </div>
      ) : null}

    </section>
  );
}
