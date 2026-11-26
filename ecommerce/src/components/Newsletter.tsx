"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Eye, Mail, MapPin, Phone, Play } from "lucide-react";
import Link from "next/link";
import SafeImage from "@/components/SafeImage";
import RedRibbon from "@/components/RedRibbon";
import {
  MAX_INSTAGRAM_REELS,
  type InstagramShowcaseItem,
  type InstagramViewMetric,
} from "@/lib/instagram-showcase";
import {
  BRAND_LOGO_LIGHT,
  COMPANY_MANUFACTURER_DETAILS,
  COMPANY_SOCIAL_LINKS,
  COMPANY_SUPPORT_EMAIL,
  COMPANY_SUPPORT_PHONE,
  COMPANY_SUPPORT_PHONE_TEL,
} from "@/lib/company";

const socialLinks = [
  { label: "Instagram", href: COMPANY_SOCIAL_LINKS.instagram },
  { label: "Facebook", href: COMPANY_SOCIAL_LINKS.facebook },
//   { label: "X", href: "https://www.x.com/firaang" },
  { label: "YouTube", href: COMPANY_SOCIAL_LINKS.youtube },
] as const;

type NewsletterProps = {
  instagramShowcaseItems?: InstagramShowcaseItem[];
};

const INSTAGRAM_FEED_STORAGE_KEY = "firaang.instagram-feed.v1";
const INSTAGRAM_FEED_CACHE_MAX_AGE_MS = 60 * 60 * 1000;

function getTopInstagramShowcaseItems(items: InstagramShowcaseItem[]) {
  return [...items]
    .sort((left, right) => (right.viewCount ?? -1) - (left.viewCount ?? -1))
    .slice(0, MAX_INSTAGRAM_REELS);
}

function InstagramMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="12" cy="12" r="4.1" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="17.25" cy="6.85" r="1.05" fill="currentColor" />
    </svg>
  );
}

function SocialGlyph({ label }: { label: string }) {
  if (label === "Instagram") {
    return <InstagramMark className="h-3.5 w-3.5" />;
  }

  if (label === "Facebook") {
    return <span className="font-semibold leading-none">f</span>;
  }

  if (label === "X") {
    return <span className="text-[10px] font-semibold leading-none">X</span>;
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-3.5 w-3.5">
      <rect x="3.5" y="6" width="17" height="12" rx="3" stroke="currentColor" strokeWidth="1.7" />
      <path d="M10.5 9.2L15.2 12L10.5 14.8V9.2Z" fill="currentColor" />
    </svg>
  );
}

function isInstagramShowcaseItem(value: unknown): value is InstagramShowcaseItem {
  if (!value || typeof value !== "object") {
    return false;
  }

  const item = value as Record<string, unknown>;
  const hasValidBadges =
    item.badges === undefined ||
    (Array.isArray(item.badges) &&
      item.badges.every((badge) => ["Trending", "Most Viewed", "New", "Popular"].includes(String(badge))));
  const hasValidOptionalFields =
    (item.videoUrl === undefined || typeof item.videoUrl === "string") &&
    (item.viewCount === undefined || typeof item.viewCount === "number") &&
    (item.viewMetric === undefined ||
      ["views", "total_views", "plays", "video_views", "reach"].includes(String(item.viewMetric))) &&
    hasValidBadges;
  const hasSafeInstagramLinks =
    item.isInstagramMedia !== true ||
    (typeof item.href === "string" &&
      typeof item.image === "string" &&
      isSafeInstagramPermalink(item.href) &&
      isSafeInstagramMediaUrl(item.image) &&
      (typeof item.videoUrl !== "string" || isSafeInstagramMediaUrl(item.videoUrl)));

  return (
    typeof item.id === "string" &&
    typeof item.href === "string" &&
    typeof item.image === "string" &&
    typeof item.alt === "string" &&
    typeof item.title === "string" &&
    typeof item.isNew === "boolean" &&
    hasValidOptionalFields &&
    hasSafeInstagramLinks
  );
}

function isSafeInstagramPermalink(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && (url.hostname === "instagram.com" || url.hostname.endsWith(".instagram.com"));
  } catch {
    return false;
  }
}

function isSafeInstagramMediaUrl(value: string) {
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();
    return (
      url.protocol === "https:" &&
      (hostname.endsWith(".cdninstagram.com") ||
        hostname.endsWith(".fbcdn.net") ||
        hostname === "lookaside.fbsbx.com")
    );
  } catch {
    return false;
  }
}

function parseInstagramShowcaseItems(value: unknown) {
  if (!value || typeof value !== "object" || !("items" in value) || !Array.isArray(value.items)) {
    return [];
  }

  return value.items.filter(isInstagramShowcaseItem);
}

function getCachedInstagramShowcaseItems() {
  try {
    const cached = localStorage.getItem(INSTAGRAM_FEED_STORAGE_KEY);
    if (!cached) {
      return [];
    }

    const cacheEntry: unknown = JSON.parse(cached);
    if (
      !cacheEntry ||
      typeof cacheEntry !== "object" ||
      !("cachedAt" in cacheEntry) ||
      typeof cacheEntry.cachedAt !== "number" ||
      Date.now() - cacheEntry.cachedAt > INSTAGRAM_FEED_CACHE_MAX_AGE_MS ||
      cacheEntry.cachedAt > Date.now()
    ) {
      return [];
    }

    return getTopInstagramShowcaseItems(
      parseInstagramShowcaseItems(cacheEntry).filter((item) => item.isInstagramMedia),
    );
  } catch (error) {
    console.warn("Unable to read cached Instagram feed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}

function cacheInstagramShowcaseItems(items: InstagramShowcaseItem[]) {
  try {
    localStorage.setItem(
      INSTAGRAM_FEED_STORAGE_KEY,
      JSON.stringify({ cachedAt: Date.now(), items: getTopInstagramShowcaseItems(items) }),
    );
  } catch (error) {
    console.warn("Unable to cache Instagram feed", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

function formatInstagramCount(count?: number) {
  return typeof count === "number" ? new Intl.NumberFormat("en").format(count) : null;
}

function getInstagramMetricLabel(metric?: InstagramViewMetric) {
  if (metric === "total_views") return "total views";
  if (metric === "plays") return "plays";
  if (metric === "video_views") return "video views";
  if (metric === "reach") return "reach";
  return "views";
}

function InstagramReelCard({
  item,
  prioritizeImage = false,
}: {
  item: InstagramShowcaseItem;
  prioritizeImage?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const previewTimeoutRef = useRef<number | null>(null);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const href = item.isInstagramMedia ? item.href : COMPANY_SOCIAL_LINKS.instagram;
  const badges = item.badges ?? (item.isNew ? ["New" as const] : []);
  const viewCount = formatInstagramCount(item.viewCount);
  const metricLabel = getInstagramMetricLabel(item.viewMetric);

  const stopPreview = () => {
    if (previewTimeoutRef.current !== null) {
      window.clearTimeout(previewTimeoutRef.current);
      previewTimeoutRef.current = null;
    }

    const video = videoRef.current;
    if (video) {
      video.pause();
      video.currentTime = 0;
    }
    setIsPreviewPlaying(false);
  };

  const startPreview = () => {
    const video = videoRef.current;
    if (!video || !item.videoUrl) {
      return;
    }

    if (previewTimeoutRef.current !== null) {
      window.clearTimeout(previewTimeoutRef.current);
    }

    video.currentTime = 0;
    void video.play()
      .then(() => {
        previewTimeoutRef.current = window.setTimeout(() => {
          video.pause();
          previewTimeoutRef.current = null;
        }, 4_000);
      })
      .catch(() => {
        setIsPreviewPlaying(false);
      });
  };

  useEffect(
    () => () => {
      if (previewTimeoutRef.current !== null) {
        window.clearTimeout(previewTimeoutRef.current);
      }
      videoRef.current?.pause();
    },
    [],
  );

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${item.isInstagramMedia ? "Open Instagram media" : "Visit Instagram profile"}: ${item.title}`}
      onMouseEnter={startPreview}
      onMouseLeave={stopPreview}
      onFocus={startPreview}
      onBlur={stopPreview}
      className="group relative block aspect-[4/5] w-[66vw] min-w-[182px] max-w-[244px] shrink-0 snap-start overflow-hidden rounded-[18px] border border-white/80 bg-[#E9E0D7] shadow-[0_12px_28px_rgba(58,43,34,0.12)] transition duration-500 hover:-translate-y-1 hover:border-white hover:shadow-[0_18px_36px_rgba(58,43,34,0.18)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B54847] sm:w-[31vw] sm:min-w-[200px] lg:w-[229px]"
    >
      <SafeImage
        src={item.image}
        alt={item.alt}
        loading={prioritizeImage ? "eager" : "lazy"}
        fetchPriority={prioritizeImage ? "high" : "auto"}
        sizes="(max-width: 639px) 66vw, (max-width: 1023px) 31vw, 19vw"
        className={`absolute inset-0 h-full w-full object-cover object-center transition duration-700 ease-out group-hover:scale-[1.06] motion-reduce:transition-none ${
          isPreviewPlaying ? "opacity-0" : "opacity-100"
        }`}
      />
      {item.videoUrl ? (
        <video
          ref={videoRef}
          src={item.videoUrl}
          poster={item.image}
          muted
          playsInline
          preload="none"
          aria-hidden="true"
          onPlay={() => setIsPreviewPlaying(true)}
          onPause={() => setIsPreviewPlaying(false)}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
        />
      ) : null}

      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(10,10,10,0.08)_0%,rgba(10,10,10,0.04)_35%,rgba(10,10,10,0.78)_100%)]" />

      <div className="absolute inset-x-3 top-3 flex items-start justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {badges.map((badge) => (
            <span
              key={badge}
              className="rounded-full border border-white/20 bg-black/45 px-2.5 py-1 text-[8px] font-bold uppercase tracking-[0.12em] text-white shadow-sm backdrop-blur-md"
            >
              {badge}
            </span>
          ))}
        </div>
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[linear-gradient(120deg,#F9CE34_0%,#EE2A7B_52%,#6228D7_100%)] p-px shadow-md">
          <span className="inline-flex items-center gap-1 rounded-full bg-black/70 px-2 py-1 text-[8px] font-bold uppercase tracking-[0.1em] text-white">
            <InstagramMark className="h-3 w-3" />
            {item.isInstagramMedia ? "Instagram" : "Firaang"}
          </span>
        </span>
      </div>

      {item.videoUrl ? (
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/45 bg-black/40 text-white shadow-lg backdrop-blur-md transition duration-300 group-hover:scale-110 group-hover:border-white/70 group-hover:bg-black/55">
            <Play className="ml-0.5 h-4 w-4 fill-current" />
          </span>
        </span>
      ) : null}

      <div className="absolute inset-x-0 bottom-0 p-3.5">
        <p className="line-clamp-2 text-[11px] font-medium leading-[1.4] text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.55)] md:text-[12px]">
          {item.title}
        </p>
        <div
          aria-label={viewCount === null ? `${metricLabel} count unavailable` : `${viewCount} ${metricLabel}`}
          className="mt-2.5 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/35 px-3 py-1.5 text-[10px] font-semibold text-white/95 shadow-sm backdrop-blur-xl"
        >
          <Eye aria-hidden="true" className="h-3 w-3 text-white/75" />
          {viewCount ?? "—"}
        </div>
      </div>
    </a>
  );
}

function FooterSocialBadge({ label, href }: { label: string; href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel={label === "YouTube" ? "noopener noreferrer" : "noreferrer"}
      aria-label={label}
      className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/[0.15] text-white/80 transition hover:border-white/[0.3] hover:bg-white/[0.1] hover:text-white"
    >
      <SocialGlyph label={label} />
    </a>
  );
}

export default function Newsletter({ instagramShowcaseItems = [] }: NewsletterProps) {
  const [instagramItems, setInstagramItems] = useState(() => getTopInstagramShowcaseItems(instagramShowcaseItems));
  const metricsAvailable =
    instagramItems.length > 0 && instagramItems.every((item) => typeof item.viewCount === "number");
  const availableMetrics = new Set(instagramItems.map((item) => item.viewMetric ?? "views"));
  const rankedMetricLabel = availableMetrics.size === 1
    ? getInstagramMetricLabel(instagramItems[0]?.viewMetric)
    : "available view metrics";
  const reelsAvailable = instagramItems.some((item) => item.isReel);
  const sectionEyebrow = metricsAvailable
    ? rankedMetricLabel === "views"
      ? "TOP 5 MOST VIEWED REELS"
      : `TOP 5 REELS BY ${rankedMetricLabel.toUpperCase()}`
    : reelsAvailable
      ? "LATEST REELS"
      : "LATEST INSTAGRAM POSTS";
  const sectionDescription = metricsAvailable
    ? `The Firaang reels with the highest ${rankedMetricLabel}, ranked for fresh inspiration.`
    : "Recent Firaang content, curated for fresh inspiration.";

  useEffect(() => {
    const controller = new AbortController();

    void fetch("/api/instagram/reels", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Instagram feed request failed with ${response.status}`);
        }
        return parseInstagramShowcaseItems(await response.json());
      })
      .then((items) => {
        if (controller.signal.aborted) {
          return;
        }

        if (items.length > 0) {
          const topItems = getTopInstagramShowcaseItems(items);
          setInstagramItems(topItems);
          cacheInstagramShowcaseItems(topItems);
        } else {
          const cachedItems = getCachedInstagramShowcaseItems();
          if (cachedItems.length > 0) {
            setInstagramItems(cachedItems);
          }
        }
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          const cachedItems = getCachedInstagramShowcaseItems();
          if (cachedItems.length > 0) {
            setInstagramItems(cachedItems);
          }
          console.warn("Instagram feed unavailable; keeping the existing showcase", {
            error: error instanceof Error ? error.message : String(error),
          });
        }
      });

    return () => controller.abort();
  }, []);

  return (
    <>
      {/* <section data-newsletter-section className="bg-[var(--newsletter-bg)] py-14 md:py-16">
        <div className="section-shell max-w-2xl text-center">
          <p className="text-[12px] font-semibold uppercase tracking-[0.22em] text-[var(--page-fg)]/85">Stay Connected</p>
          <h2
            className="mt-2 text-[44px] font-semibold leading-[1.08] tracking-[0.01em] md:text-[50px]"
            style={{ fontFamily: "var(--font-playfair), serif" }}
          >
            Join The Firaang Club
          </h2>
          <p
            className="mt-4 text-[18px] font-normal leading-[1.55] text-[var(--newsletter-subtext)]"
            style={{ fontFamily: "var(--font-poppins), sans-serif" }}
          >
            Be the first to know about new collections, exclusive offers, and luxury style tips.
          </p>

          <form
            className="mx-auto mt-7 flex w-full max-w-[560px] flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-center"
            onSubmit={handleSubscribe}
          >
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Your email address"
              className="w-full rounded-md border border-[var(--newsletter-input-border)] bg-[var(--newsletter-input-bg)] px-4 py-3 text-[14px] font-medium text-[var(--nav-text)] placeholder-[var(--newsletter-input-ph)] outline-none transition focus:border-[var(--gold)]/60 focus:bg-[var(--newsletter-input-focus-bg)] sm:max-w-[370px]"
              aria-label="Email address"
              required
            />
            <button
              type="submit"
              data-newsletter-subscribe
              className="gold-button inline-flex h-[48px] items-center justify-center gap-2 rounded-md px-7 py-2.5 text-[14px]"
              disabled={isSubmitting}
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isSubmitting ? "Subscribing..." : "Subscribe"}
            </button>
          </form>
        </div>
      </section> */}

      <section className="relative isolate overflow-hidden bg-[linear-gradient(180deg,#F8F5F0_0%,#FBF8F4_52%,#F4EDE7_100%)] py-12 text-[#2F2B2A] md:py-14 lg:py-16">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-[radial-gradient(ellipse_at_top,rgba(179,74,72,0.07),transparent_68%)]"
        />
        <div className="home-shell">
          <div className="mx-auto flex max-w-[760px] flex-col items-center text-center">
            <p className="flex items-center gap-3 font-sans text-[10px] font-semibold uppercase tracking-[0.24em] text-[#796E67] md:text-[11px]">
              <span aria-hidden="true" className="h-px w-7 bg-gradient-to-r from-transparent to-[#B54847]" />
              {sectionEyebrow}
              <span aria-hidden="true" className="h-px w-7 bg-gradient-to-l from-transparent to-[#B54847]" />
            </p>
            <a
              href={COMPANY_SOCIAL_LINKS.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="group mt-4 inline-flex items-center gap-3 rounded-full border border-[#E8DDD3] bg-white/75 px-4 py-2.5 shadow-[0_12px_32px_rgba(58,43,34,0.08)] transition duration-300 hover:border-[#B54847]/35 hover:bg-white sm:px-5 sm:py-3"
            >
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[linear-gradient(135deg,#F9CE34_0%,#EE2A7B_52%,#6228D7_100%)] p-px transition duration-300 group-hover:scale-105 sm:h-10 sm:w-10">
                <span className="inline-flex h-full w-full items-center justify-center rounded-full bg-white text-[#B54847]">
                  <InstagramMark className="h-[18px] w-[18px]" />
                </span>
              </span>
              <h2 className="font-sans text-[clamp(1.9rem,5.2vw,3.1rem)] font-semibold leading-[0.98] tracking-[-0.05em] text-[#302925] transition-colors duration-300 group-hover:text-[#A13F45] md:text-[clamp(2.15rem,4.1vw,3.45rem)]">
                @Fir.aang
              </h2>
            </a>
            <p className="mt-4 max-w-[620px] text-[13px] leading-6 text-[#756A63] md:text-[15px]">
              {sectionDescription}
            </p>
            <a
              href={COMPANY_SOCIAL_LINKS.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-flex items-center gap-2 rounded-full border border-[#B54847] bg-[#B54847] px-5 py-3 text-[10px] font-bold uppercase tracking-[0.16em] text-white shadow-[0_8px_24px_rgba(181,72,71,0.18)] transition duration-300 hover:-translate-y-0.5 hover:border-[#963C3D] hover:bg-[#963C3D] hover:shadow-[0_12px_28px_rgba(181,72,71,0.24)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B54847] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F8F5F0]"
            >
              Visit Instagram
              <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          </div>

          <div className="mx-auto mt-8 flex max-w-[1220px] snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden md:mt-9 md:gap-4 lg:mt-10">
            {getTopInstagramShowcaseItems(instagramItems).map((item, index) => (
              <InstagramReelCard key={item.id} item={item} prioritizeImage={index === 0} />
            ))}
          </div>
        </div>
      </section>

      <RedRibbon />

      <footer className="relative overflow-hidden bg-[var(--footer-bg)] pb-0 pt-14">
        <div className="home-shell relative">
          <div className="grid gap-10 border-b border-white/10 pb-10 md:grid-cols-2 lg:grid-cols-[1.55fr_0.9fr_0.9fr_0.9fr_1.25fr]">
            <div className="max-w-[360px]">
              <SafeImage src={BRAND_LOGO_LIGHT} alt="Firaang" className="h-[48px] w-auto" />
              {/* <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/75">
                Where fashion meets global elegance. Curated clothing and jewellery for the modern connoisseur.
              </p> */}
              <p className="mt-4 max-w-[330px] text-[12px] leading-[1.65] text-white/60">
                Where fashion meets global elegance. Curated clothing and jewellery for the modern connoisseur.
              </p>
              <p className="mt-2 text-[11px] leading-relaxed text-white/65">
                Firaang is about seeing the familiar differently.
              </p>
              <p className="mt-4 inline-flex rounded-full border border-white/[0.15] bg-white/[0.05] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/80">
                Trusted Checkout by Razorpay
              </p>

              <div className="mt-5 flex items-center gap-2">
                {socialLinks.map((social) => (
                  <FooterSocialBadge
                    key={social.label}
                    label={social.label}
                    href={social.href}
                  />
                ))}
              </div>
            </div>

            <div>
              <p className="mb-4 text-[14px] font-semibold text-white">Shop</p>
              <ul className="space-y-2 text-[12px] leading-6 text-white/70">
                <li><Link href="/shop/t-shirts" className="transition hover:text-white">Clothing</Link></li>
                <li><Link href="/shop/hair-accessories" className="transition hover:text-white">Jewellery</Link></li>
                <li><Link href="/shop" className="transition hover:text-white">Collections</Link></li>
                <li><Link href="/shop" className="transition hover:text-white">New Arrivals</Link></li>
                <li><Link href="/shop" className="transition hover:text-white">Sale</Link></li>
              </ul>
            </div>

            <div>
              <p className="mb-4 text-[14px] font-semibold text-white">Company</p>
              <ul className="space-y-2 text-[12px] leading-6 text-white/70">
                <li><Link href="/about" className="transition hover:text-white">About Us</Link></li>
                <li><Link href="/about" className="transition hover:text-white">Our Story</Link></li>
                <li><Link href="/contact" className="transition hover:text-white">Careers</Link></li>
                <li><Link href="/contact" className="transition hover:text-white">Press</Link></li>
                <li><Link href="/about" className="transition hover:text-white">Sustainability</Link></li>
              </ul>
            </div>

            <div>
              <p className="mb-4 text-[14px] font-semibold text-white">Support</p>
              <ul className="space-y-2 text-[12px] leading-6 text-white/70">
                <li><Link href="/contact" className="transition hover:text-white">Contact</Link></li>
                <li><Link href="/shipping-policy" className="transition hover:text-white">Shipping</Link></li>
                <li><Link href="/pod-policy" className="transition hover:text-white">Returns</Link></li>
                <li><Link href="/privacy-policy" className="transition hover:text-white">Privacy Policy</Link></li>
                <li><Link href="/terms-and-conditions" className="transition hover:text-white">Terms & Conditions</Link></li>
                <li><Link href="/size-guide" className="transition hover:text-white">Size Guide</Link></li>
              </ul>
            </div>

            <div>
              <p className="mb-4 text-[14px] font-semibold text-white">Contact Information</p>
              <ul className="space-y-3 text-[12px] leading-6 text-white/[0.72]">
                <li className="flex items-start gap-3">
                  <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-400/15 text-emerald-300">
                    <MapPin className="h-3.5 w-3.5" />
                  </span>
                  <span>{COMPANY_MANUFACTURER_DETAILS}</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-400/15 text-sky-300">
                    <Phone className="h-3.5 w-3.5" />
                  </span>
                  <a href={`tel:${COMPANY_SUPPORT_PHONE_TEL}`} className="transition hover:text-white">{COMPANY_SUPPORT_PHONE}</a>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-pink-400/15 text-pink-300">
                    <Mail className="h-3.5 w-3.5" />
                  </span>
                  <a href={`mailto:${COMPANY_SUPPORT_EMAIL}`} className="transition hover:text-white">{COMPANY_SUPPORT_EMAIL}</a>
                </li>
              </ul>
            </div>
          </div>

          <div
            className="grid gap-4 py-5 text-[11px] font-medium text-white/[0.65] md:grid-cols-[1fr_auto_1fr] md:items-center"
            style={{ fontFamily: "var(--font-poppins), sans-serif" }}
          >
            <p className="text-center md:text-left">© 2026 Firaang. All rights reserved.</p>

            <div className="flex items-center justify-center gap-2">
              <span className="inline-flex items-center rounded-md border border-white/[0.15] bg-white/[0.08] px-2.5 py-1.5 text-[11px] text-white/80">
                Prices in INR only · ₹
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 md:justify-end">
              <span>We Accept</span>
              <span className="inline-flex items-center rounded-md border border-white/[0.12] bg-white/[0.08] px-2 py-1 text-[10px] font-semibold tracking-wide text-white/85">RAZORPAY</span>
              <span className="inline-flex items-center rounded-md border border-white/[0.12] bg-white/[0.08] px-2 py-1 text-[10px] font-semibold tracking-wide text-white/85">UPI</span>
              <span className="inline-flex items-center rounded-md border border-white/[0.12] bg-white/[0.08] px-2 py-1 text-[10px] font-semibold tracking-wide text-white/85">CARDS</span>
              <span className="inline-flex items-center rounded-md border border-white/[0.12] bg-white/[0.08] px-2 py-1 text-[10px] font-semibold tracking-wide text-white/85">NETBANKING</span>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
