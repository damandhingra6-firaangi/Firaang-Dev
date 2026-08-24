"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { ArrowUpRight, ChevronDown, Mail, MapPin, Phone } from "lucide-react";
import SafeImage from "@/components/SafeImage";
import type { InstagramShowcaseItem } from "@/lib/instagram-showcase";
import {
  BRAND_LOGO_LIGHT,
  COMPANY_MANUFACTURER_DETAILS,
  COMPANY_SOCIAL_LINKS,
  COMPANY_SUPPORT_EMAIL,
  COMPANY_SUPPORT_PHONE,
  COMPANY_SUPPORT_PHONE_TEL,
} from "@/lib/company";
import { newsletterSchema } from "@/lib/newsletter";
import { useUiStore } from "@/store/useUiStore";

const CURRENCY_ICON_MAP: Record<"INR" | "USD" | "AED", string> = {
  INR: "/India.svg",
  USD: "/USD.svg",
  AED: "/AED.svg",
};

const socialLinks = [
  { label: "Instagram", href: COMPANY_SOCIAL_LINKS.instagram },
  { label: "Facebook", href: COMPANY_SOCIAL_LINKS.facebook },
//   { label: "X", href: "https://www.x.com/firaang" },
  { label: "YouTube", href: COMPANY_SOCIAL_LINKS.youtube },
] as const;

type NewsletterProps = {
  instagramShowcaseItems?: InstagramShowcaseItem[];
};

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

function FooterSocialBadge({ label, href }: { label: string; href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={label}
      className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/[0.15] text-white/80 transition hover:border-white/[0.3] hover:bg-white/[0.1] hover:text-white"
    >
      <SocialGlyph label={label} />
    </a>
  );
}

export default function Newsletter({ instagramShowcaseItems = [] }: NewsletterProps) {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCurrencyOpen, setIsCurrencyOpen] = useState(false);
  const pushToast = useUiStore((state) => state.pushToast);
  const currency = useUiStore((state) => state.currency);
  const setCurrency = useUiStore((state) => state.setCurrency);
  const isMountedRef = useRef(false);
  const currencyRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const handleOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (currencyRef.current && !currencyRef.current.contains(target)) {
        setIsCurrencyOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const handleSubscribe = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const parsed = newsletterSchema.safeParse({ email });
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? "Please enter a valid email";
      pushToast(firstError, { variant: "warning" });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });

      const payload = (await response.json().catch(() => ({}))) as { duplicate?: boolean; error?: string };

      if (!response.ok) {
        pushToast(payload.error ?? "Could not subscribe right now", { variant: "error" });
        return;
      }

      if (payload.duplicate) {
        pushToast("You are already subscribed.", { variant: "info" });
      } else {
        pushToast("Subscribed successfully. Welcome to the club!", { variant: "success" });
      }

      if (isMountedRef.current) setEmail("");
    } catch (error) {
      console.error("Newsletter subscription failed", error);
      pushToast("Could not subscribe right now", { variant: "error" });
    } finally {
      if (isMountedRef.current) setIsSubmitting(false);
    }
  };

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

      <section className="overflow-hidden bg-[#f8f6f1] py-12 md:py-14 lg:py-16">
        <div className="home-shell">
          <div className="mx-auto flex max-w-[760px] flex-col items-center text-center">
            <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.24em] text-[#7a7268] md:text-[11px]">
              FOLLOW US ON INSTAGRAM
            </p>
            <a
              href={COMPANY_SOCIAL_LINKS.instagram}
              target="_blank"
              rel="noreferrer"
              className="group mt-3 inline-flex items-center gap-2.5 rounded-full border border-[#e4dccc] bg-[#fffdf8] px-4 py-2.5 transition duration-300 hover:border-[#cfd7ef] hover:bg-[#fbfbfe]"
            >
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#d7d2ea] bg-[linear-gradient(135deg,rgba(108,74,135,0.12),rgba(0,189,255,0.12))] text-[#302a39] transition duration-300 group-hover:border-[#bfc7eb] group-hover:bg-[linear-gradient(135deg,rgba(108,74,135,0.16),rgba(0,189,255,0.16))] group-hover:shadow-[0_0_0_1px_rgba(0,189,255,0.08)]">
                <InstagramMark className="h-[18px] w-[18px]" />
              </span>
              <h2 className="font-sans text-[clamp(1.9rem,5.2vw,3.1rem)] font-semibold leading-[0.98] tracking-[-0.05em] text-[#1e1a17] md:text-[clamp(2.15rem,4.1vw,3.45rem)]">
                @Fir.aang
              </h2>
            </a>
            <p className="mt-4 max-w-[620px] text-[14px] leading-6 text-[#615a53] md:text-[15px]">
              Latest drops and design stories, curated for fresh inspiration.
            </p>
            <a
              href={COMPANY_SOCIAL_LINKS.instagram}
              target="_blank"
              rel="noreferrer"
              className="mt-5 inline-flex items-center gap-2 rounded-full border border-[#1f1b17] bg-[#1f1b17] px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#f8f4ef] shadow-[0_8px_18px_rgba(31,27,23,0.12)] transition duration-300 hover:-translate-y-0.5 hover:border-[#6c4a87] hover:bg-[#211c1a] hover:shadow-[0_12px_24px_rgba(31,27,23,0.16)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6c4a87]/20 focus-visible:ring-offset-2 focus-visible:ring-offset-[#f8f6f1]"
            >
              Visit Instagram
              <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          </div>

          <div className="mx-auto mt-8 flex max-w-[1220px] snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden sm:gap-3.5 md:mt-9 md:gap-4 lg:mt-10 lg:grid lg:grid-cols-5 lg:overflow-visible lg:px-0 lg:pb-0">
            {instagramShowcaseItems.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                aria-label={`Open design: ${item.title}`}
                className="group relative aspect-[4/5] w-[64vw] min-w-[182px] max-w-[236px] shrink-0 snap-start overflow-hidden rounded-[18px] border border-[#e3ddd3] bg-white shadow-[0_8px_20px_rgba(0,0,0,0.06)] transition duration-300 hover:-translate-y-0.5 hover:border-[#cfd7ef] hover:shadow-[0_14px_26px_rgba(0,0,0,0.1)] sm:w-[44vw] sm:min-w-[198px] sm:max-w-[244px] md:w-[31vw] md:min-w-[210px] md:max-w-[250px] lg:w-auto lg:max-w-none"
              >
                <SafeImage
                  src={item.image}
                  alt={item.alt}
                  loading="lazy"
                  className="h-full w-full object-cover object-center transition duration-500 group-hover:scale-[1.04]"
                />

                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(13,11,8,0)_56%,rgba(13,11,8,0.14)_78%,rgba(13,11,8,0.68)_100%)] opacity-95 transition duration-300 group-hover:opacity-100" />

                {item.isNew ? (
                  <span className="absolute left-3 top-3 inline-flex rounded-full border border-[#cfd7ef] bg-[rgba(255,255,255,0.72)] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.16em] text-[#322b3c] backdrop-blur-md shadow-[0_0_0_1px_rgba(108,74,135,0.06)]">
                    New
                  </span>
                ) : null}

                <div className="absolute inset-x-0 bottom-0 p-3 md:p-3.5">
                  <div className="translate-y-2 opacity-0 transition-all duration-300 ease-out group-hover:translate-y-0 group-hover:opacity-100">
                    <p className="line-clamp-2 text-[11px] font-medium leading-[1.35] text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)] md:text-[12px]">
                      {item.title}
                    </p>
                    <div className="mt-2 inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#f4eefe] transition duration-300 group-hover:text-white">
                      View Design
                      <ArrowUpRight className="h-3.5 w-3.5 text-[#7dd6ff] transition duration-300 group-hover:text-[#c88cff]" />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <footer className="relative overflow-hidden border-t border-white/10 bg-[var(--footer-bg)] pb-0 pt-14">
        <div className="pointer-events-none absolute inset-x-0 top-6 bottom-[78px] hidden items-center justify-center lg:flex">
          <div className="select-none text-center">
            <SafeImage
              src="/FooterTransparentLogo.svg"
              alt="Different by Design"
              className="mx-auto mt-1 aspect-[1220/269] h-auto max-h-full w-[clamp(760px,78vw,1280px)] max-w-full opacity-[0.25] [filter:invert(1)_brightness(1.15)]"
            />
          </div>
        </div>

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
                <li><Link href="/shop?category=hair-accessories" className="transition hover:text-white">Jewellery</Link></li>
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
                <li><Link href="/track-order" className="transition hover:text-white">Shipping</Link></li>
                <li><Link href="/exchange-return" className="transition hover:text-white">Returns</Link></li>
                <li><Link href="/contact" className="transition hover:text-white">FAQs</Link></li>
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
              <div className="relative" ref={currencyRef}>
                <button
                  type="button"
                  onClick={() => {
                    setIsCurrencyOpen((prev) => !prev);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-md border border-white/[0.15] bg-white/[0.08] px-2.5 py-1.5 text-[11px] text-white/80"
                >
                  <SafeImage src={CURRENCY_ICON_MAP[currency]} alt={`${currency} currency`} className="h-3.5 w-3.5 rounded-full object-cover" />
                  {currency}
                  <ChevronDown className={`h-3 w-3 transition ${isCurrencyOpen ? "rotate-180" : ""}`} />
                </button>
                {isCurrencyOpen ? (
                  <div className="absolute bottom-[calc(100%+8px)] left-0 z-20 min-w-full overflow-hidden rounded-md border border-white/[0.1] bg-[#111111] shadow-[0_14px_26px_rgba(0,0,0,0.45)]">
                    {(["INR", "USD", "AED"] as const).map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => {
                          setCurrency(option);
                          setIsCurrencyOpen(false);
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-[11px] text-white/80 transition hover:bg-white/[0.08]"
                      >
                        <SafeImage src={CURRENCY_ICON_MAP[option]} alt={`${option} currency`} className="h-3.5 w-3.5 rounded-full object-cover" />
                        {option}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
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
