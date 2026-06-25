"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { ChevronDown, Loader2, Mail, MapPin, Phone } from "lucide-react";
import Link from "next/link";
import { newsletterSchema } from "@/lib/newsletter";
import { useUiStore } from "@/store/useUiStore";
import SafeImage from "@/components/SafeImage";

const CURRENCY_ICON_MAP: Record<"INR" | "USD" | "AED", string> = {
  INR: "/India.svg",
  USD: "/USD.svg",
  AED: "/AED.svg",
};

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
      {/* Newsletter Section */}
      <section data-newsletter-section className="bg-[var(--newsletter-bg)] py-14 md:py-16">
        <div className="section-shell max-w-2xl text-center">
          <p className="text-[12px] font-semibold uppercase tracking-[0.22em] text-[var(--page-fg)]/85">Stay Connected</p>
          <h2 className="mt-2 text-[44px] font-semibold leading-[1.08] tracking-[0.01em] md:text-[50px]" style={{ fontFamily: "var(--font-playfair), serif" }}>
            Join The Firaang Club
          </h2>
          <p className="mt-4 text-[18px] font-normal leading-[1.55] text-[var(--newsletter-subtext)]" style={{ fontFamily: "var(--font-poppins), sans-serif" }}>
            Be the first to know about new collections, exclusive offers, and luxury style tips.
          </p>

          <form className="mx-auto mt-7 flex w-full max-w-[560px] flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-center" onSubmit={handleSubscribe}>
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
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--footer-border)] bg-[var(--footer-bg)] pb-0 pt-14">
        <div className="section-shell">
        <div className="grid gap-9 border-b border-[var(--footer-border)] pb-10 md:grid-cols-2 lg:grid-cols-[1.45fr_1fr_1fr_1fr_1.35fr]">
            {/* Brand */}
            <div>
              <SafeImage src="/FiraangLogoDesign-white.png" alt="Firaang" className="h-[52px] w-auto" />
              <p className="mt-5 max-w-sm text-[16px] font-medium leading-[1.65] text-[var(--footer-links)]" style={{ fontFamily: "var(--font-poppins), sans-serif" }}>
                Where fashion meets global elegance. Curated clothing and jewellery for the modern connoisseur.
              </p>
              <p className="mt-4 inline-flex rounded-full border border-[var(--gold)]/40 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--gold)]">
                Trusted Checkout by Razorpay
              </p>
            </div>

            {/* Shop */}
            <div>
              <p className="mb-4 text-[25px] font-semibold leading-[1.05] text-[var(--footer-heading)]" style={{ fontFamily: "var(--font-playfair), serif" }}>Shop</p>
              <ul className="space-y-2.5 text-[17px] font-medium uppercase tracking-[0.04em] text-[var(--footer-links)]" style={{ fontFamily: "var(--font-poppins), sans-serif" }}>
                <li>
                  <Link href="/shop/t-shirts" className="transition hover:text-[var(--gold)]">
                    Clothing
                  </Link>
                </li>
                <li>
                  <Link href="/shop?category=hair-accessories" className="transition hover:text-[var(--gold)]">
                    Jewellery
                  </Link>
                </li>
                <li>
                  <Link href="/shop" className="transition hover:text-[var(--gold)]">
                    Collections
                  </Link>
                </li>
                <li>
                  <Link href="/shop" className="transition hover:text-[var(--gold)]">
                    New Arrivals
                  </Link>
                </li>
                <li>
                  <Link href="/shop" className="transition hover:text-[var(--gold)]">
                    Sale
                  </Link>
                </li>
              </ul>
            </div>

            {/* Company */}
            <div>
              <p className="mb-4 text-[25px] font-semibold leading-[1.05] text-[var(--footer-heading)]" style={{ fontFamily: "var(--font-playfair), serif" }}>Company</p>
              <ul className="space-y-2.5 text-[17px] font-medium uppercase tracking-[0.04em] text-[var(--footer-links)]" style={{ fontFamily: "var(--font-poppins), sans-serif" }}>
                <li>
                  <Link href="/about" className="transition hover:text-[var(--gold)]">
                    About Us
                  </Link>
                </li>
                <li>
                  <Link href="/about" className="transition hover:text-[var(--gold)]">
                    Our Story
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="transition hover:text-[var(--gold)]">
                    Careers
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="transition hover:text-[var(--gold)]">
                    Press
                  </Link>
                </li>
                <li>
                  <Link href="/about" className="transition hover:text-[var(--gold)]">
                    Sustainability
                  </Link>
                </li>
              </ul>
            </div>

            {/* Support */}
            <div>
              <p className="mb-4 text-[25px] font-semibold leading-[1.05] text-[var(--footer-heading)]" style={{ fontFamily: "var(--font-playfair), serif" }}>Support</p>
              <ul className="space-y-2.5 text-[17px] font-medium uppercase tracking-[0.04em] text-[var(--footer-links)]" style={{ fontFamily: "var(--font-poppins), sans-serif" }}>
                <li>
                  <Link href="/contact" className="transition hover:text-[var(--gold)]">Contact</Link>
                </li>
                <li>
                  <Link href="/track-order" className="transition hover:text-[var(--gold)]">Shipping</Link>
                </li>
                <li>
                  <Link href="/pod-policy" className="transition hover:text-[var(--gold)]">POD Policy</Link>
                </li>
                <li>
                  <Link href="/contact" className="transition hover:text-[var(--gold)]">FAQs</Link>
                </li>
                <li>
                  <Link href="/size-guide" className="transition hover:text-[var(--gold)]">Size Guide</Link>
                </li>
              </ul>
            </div>

            {/* Contact Info */}
            <div>
              <p className="mb-4 text-[25px] font-semibold leading-[1.05] text-[var(--footer-heading)]" style={{ fontFamily: "var(--font-playfair), serif" }}>
                Contact Information
              </p>
              <ul className="space-y-3.5 text-[16px] font-medium leading-[1.5] text-[var(--footer-links)]" style={{ fontFamily: "var(--font-poppins), sans-serif" }}>
                <li className="flex items-start gap-3 border-b border-[var(--footer-contact-border)] pb-3">
                  <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--gold)] text-[#3b0810]">
                    <MapPin className="h-3.5 w-3.5" />
                  </span>
                  <span>Firaang Studio, Chandigarh, India</span>
                </li>
                <li className="flex items-start gap-3 border-b border-[var(--footer-contact-border)] pb-3">
                  <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--gold)] text-[#3b0810]">
                    <Phone className="h-3.5 w-3.5" />
                  </span>
                  <a href="tel:+919878619783" className="transition hover:text-[var(--gold)]">+91 98786 19783</a>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--gold)] text-[#3b0810]">
                    <Mail className="h-3.5 w-3.5" />
                  </span>
                  <a href="mailto:support@firaang.com" className="transition hover:text-[var(--gold)]">support@firaang.com</a>
                </li>
              </ul>
            </div>
          </div>

          <div className="grid gap-4 py-5 text-[13px] font-medium text-[var(--footer-bottom)] md:grid-cols-[1fr_auto_1fr] md:items-center" style={{ fontFamily: "var(--font-poppins), sans-serif" }}>
            <p className="text-center md:text-left">© 2026 Firaang. All rights reserved.</p>

            <div className="flex items-center justify-center gap-2">
              <div className="relative" ref={currencyRef}>
                <button
                  type="button"
                  onClick={() => {
                    setIsCurrencyOpen((prev) => !prev);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-md border border-[var(--currency-border)] bg-[var(--currency-bg)] px-2.5 py-1.5 text-[11px] text-[var(--currency-text)]"
                >
                  <SafeImage src={CURRENCY_ICON_MAP[currency]} alt={`${currency} currency`} className="h-3.5 w-3.5 rounded-full object-cover" />
                  {currency}
                  <ChevronDown className={`h-3 w-3 transition ${isCurrencyOpen ? "rotate-180" : ""}`} />
                </button>
                {isCurrencyOpen ? (
                  <div className="absolute bottom-[calc(100%+8px)] left-0 z-20 min-w-full overflow-hidden rounded-md border border-[var(--footer-border)] bg-[var(--currency-dropdown)] shadow-[0_14px_26px_rgba(0,0,0,0.35)]">
                    {["INR", "USD", "AED"].map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => {
                          setCurrency(option as "INR" | "USD" | "AED");
                          setIsCurrencyOpen(false);
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-[11px] text-[var(--currency-option)] transition hover:bg-[var(--panel-hover)]"
                      >
                        <SafeImage src={CURRENCY_ICON_MAP[option as "INR" | "USD" | "AED"]} alt={`${option} currency`} className="h-3.5 w-3.5 rounded-full object-cover" />
                        {option}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 md:justify-end">
              <span>We Accept</span>
              <span className="inline-flex items-center rounded-md bg-[#f8f8f8] px-2 py-1 text-[10px] font-bold tracking-wide text-[#0a0a0a]">RAZORPAY</span>
              <span className="inline-flex items-center rounded-md bg-[#f7f7f7] px-2 py-1 text-[10px] font-bold tracking-wide text-[#1a1a1a]">UPI</span>
              <span className="inline-flex items-center rounded-md bg-[#f0f0f0] px-2 py-1 text-[10px] font-bold tracking-wide text-[#1a1a1a]">CARDS</span>
              <span className="inline-flex items-center rounded-md bg-[#ebebeb] px-2 py-1 text-[10px] font-bold tracking-wide text-[#1a1a1a]">NETBANKING</span>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
