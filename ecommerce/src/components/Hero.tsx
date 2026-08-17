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

function mapFeaturedCollectionToSlide(collection: ShopifyCollectionLaunch): HeroSlide {
  const launchHeadline = collection.launchTitle ?? collection.title;
  const [headlineLineOne, headlineLineTwo] = splitHeadline(launchHeadline);

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
  };
}

export default function Hero({ featuredCollections = [] }: HeroProps) {
  const slides = useMemo(
    () => [BASE_HERO_SLIDE, DEVOTIONAL_HERO_SLIDE, ...featuredCollections.map(mapFeaturedCollectionToSlide)],
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
