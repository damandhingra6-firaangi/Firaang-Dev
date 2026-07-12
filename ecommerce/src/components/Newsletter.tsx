"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { ChevronDown, Mail, MapPin, Phone } from "lucide-react";
import SafeImage from "@/components/SafeImage";
import { COMPANY_MANUFACTURER_DETAILS } from "@/lib/company";
import { newsletterSchema } from "@/lib/newsletter";
import { useUiStore } from "@/store/useUiStore";

const CURRENCY_ICON_MAP: Record<"INR" | "USD" | "AED", string> = {
  INR: "/India.svg",
  USD: "/USD.svg",
  AED: "/AED.svg",
};

const instagramGallery = ["/insta1.svg", "/inst2.svg", "/insta3.svg", "/insta4.svg", "/insta5.svg"];

const socialLinks = [
  { label: "Instagram", href: "https://www.instagram.com/fir.aang" },
  { label: "Facebook", href: "https://www.facebook.com/share/18urRNaaEq" },
//   { label: "X", href: "https://www.x.com/firaang" },
  { label: "YouTube", href: "https://www.youtube.com/@Firaang-m5r" },
] as const;

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

export default function Newsletter() {
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

      <section className="bg-[#efefef] py-12 md:py-14 lg:py-[58px]">
        <div className="home-shell">
          <div className="text-center">
            <p className="font-sans text-[13px] font-medium uppercase tracking-[0.06em] text-[#3f3f3f]">FOLLOW US ON INSTAGRAM</p>
            <h2 className="mt-2 font-sans text-[48px] font-semibold leading-[0.94] tracking-[-0.02em] text-[#2d2d2d] md:text-[54px]">
              @Firaang
            </h2>
          </div>

          <div className="mt-9 flex gap-4 overflow-x-auto pb-2 md:justify-center md:gap-5 lg:gap-6">
            {instagramGallery.map((image, index) => (
              <Link
                key={`${image}-${index}`}
                href="https://www.instagram.com/fir.aang"
                target="_blank"
                rel="noreferrer"
                aria-label={`Open Instagram image ${index + 1}`}
                className="group relative h-[140px] w-[140px] shrink-0 overflow-hidden rounded-[16px] sm:h-[162px] sm:w-[162px] md:h-[180px] md:w-[180px] lg:h-[198px] lg:w-[198px]"
              >
                <SafeImage
                  src={image}
                  alt={`Instagram post ${index + 1}`}
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/0 transition duration-300 group-hover:bg-black/35" />
                <span className="absolute inset-0 flex items-center justify-center opacity-0 transition duration-300 group-hover:opacity-100">
                  <InstagramMark className="h-8 w-8 text-white" />
                </span>
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
              alt="Different by design"
              className="mx-auto mt-1 aspect-[1220/269] h-auto max-h-full w-[clamp(760px,78vw,1280px)] max-w-full opacity-[0.25] [filter:invert(1)_brightness(1.15)]"
            />
          </div>
        </div>

        <div className="home-shell relative">
          <div className="grid gap-10 border-b border-white/10 pb-10 md:grid-cols-2 lg:grid-cols-[1.55fr_0.9fr_0.9fr_0.9fr_1.25fr]">
            <div className="max-w-[360px]">
              <SafeImage src="/FiraangLogoDesign-white.svg" alt="Firaang" className="h-[48px] w-auto" />
              {/* <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/75">
                Where fashion meets global elegance. Curated clothing and jewellery for the modern connoisseur.
              </p> */}
              <p className="mt-4 max-w-[330px] text-[12px] leading-[1.65] text-white/60">
                Where fashion meets global elegance. Curated clothing and jewellery for the modern connoisseur.
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
                  <a href="tel:+919878619783" className="transition hover:text-white">+91 98786 19783</a>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-pink-400/15 text-pink-300">
                    <Mail className="h-3.5 w-3.5" />
                  </span>
                  <a href="mailto:support@firaang.com" className="transition hover:text-white">support@firaang.com</a>
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
