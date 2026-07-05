"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { CheckCircle2, Sparkles, X } from "lucide-react";
import { newsletterSchema } from "@/lib/newsletter";
import { useUiStore } from "@/store/useUiStore";

type JewelleryComingSoonModalProps = {
  isOpen: boolean;
  onClose: () => void;
  /** Main headline shown in the left panel */
  title?: string;
  /** Supporting paragraph in the left panel */
  subtitle?: string;
  /** Eyebrow label above the title (left panel) */
  eyebrow?: string;
  /** Eyebrow label above the form heading (right panel) */
  formEyebrow?: string;
  /** Heading inside the form panel */
  formTitle?: string;
  /** Paragraph inside the form panel */
  formDescription?: string;
  /** CTA button label */
  buttonText?: string;
  /** Email input placeholder */
  placeholder?: string;
  /** Three short benefit strings shown as pills on the left */
  benefits?: [string, string, string];
  /** Fine-print below the CTA */
  finePrint?: string;
};

export default function JewelleryComingSoonModal({
  isOpen,
  onClose,
  title = "Something Exciting is Coming",
  subtitle = "We're preparing something special for you. Be among the first to discover upcoming collections, exclusive products, exciting launches, and limited-time releases.",
  eyebrow = "Coming Soon",
  formEyebrow = "Stay Updated",
  formTitle = "Be the First to Know",
  formDescription = "Enter your email to receive updates about upcoming launches, new collections, exclusive offers, and early access.",
  buttonText = "Notify Me",
  placeholder = "you@example.com",
  benefits = ["Early Access", "Exclusive Launch Updates", "Limited-Time Offers"],
  finePrint = "No spam. Only updates about exciting launches and exclusive releases.",
}: JewelleryComingSoonModalProps) {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [confirmationMessage, setConfirmationMessage] = useState("");
  const [isVisible, setIsVisible] = useState(false);
  const [isMounted, setIsMounted] = useState(isOpen);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pushToast = useUiStore((state) => state.pushToast);

  useEffect(() => {
    if (isOpen) {
      setIsMounted(true);
      requestAnimationFrame(() => setIsVisible(true));
      return;
    }

    setIsVisible(false);
    closeTimerRef.current = setTimeout(() => {
      setIsMounted(false);
    }, 220);

    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
      }
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        handleClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.removeProperty("overflow");
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isConfirmed) {
      return;
    }

    autoCloseTimerRef.current = setTimeout(() => {
      handleClose();
    }, 1400);

    return () => {
      if (autoCloseTimerRef.current) {
        clearTimeout(autoCloseTimerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConfirmed]);

  useEffect(() => {
    if (!isOpen) {
      setEmail("");
      setIsSubmitting(false);
      setIsConfirmed(false);
      setConfirmationMessage("");
    }
  }, [isOpen]);

  const handleClose = () => {
    setIsVisible(false);
    onClose();
  };

  const handleWaitlistSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const parsed = newsletterSchema.safeParse({ email });

    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? "Please enter a valid email address";
      pushToast(firstError, { variant: "warning" });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/newsletter", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(parsed.data),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        duplicate?: boolean;
        error?: string;
        meta?: {
          storage?: "mongo" | "fallback";
        };
      };

      if (!response.ok) {
        pushToast(payload.error ?? "Could not join waitlist right now", { variant: "error" });
        return;
      }

      setConfirmationMessage(
        payload.duplicate
          ? "You're already on the list — we'll notify you first."
          : "You're on the list! We'll notify you before anyone else.",
      );

      if (payload.meta?.storage === "fallback") {
        pushToast("Newsletter saved locally, but MongoDB is not connected.", { variant: "warning" });
      }

      setEmail("");
      setIsConfirmed(true);
    } catch (error) {
      console.error("Jewellery waitlist signup failed", error);
      pushToast("Could not join waitlist right now", { variant: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isMounted) {
    return null;
  }

  return (
    <div
      className={`fixed inset-0 z-[120] flex items-center justify-center px-4 py-6 transition duration-300 md:py-10 ${isVisible ? "bg-black/60 backdrop-blur-[3px]" : "bg-black/0 backdrop-blur-0"}`}
      onClick={handleClose}
    >
      <div
        className={`w-full max-w-5xl transition duration-300 ${isVisible ? "translate-y-0 scale-100 opacity-100" : "translate-y-5 scale-[0.97] opacity-0"}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal card */}
        <div className="relative w-full overflow-hidden rounded-[20px] border border-[var(--nav-border)] bg-[var(--page-bg)] shadow-[0_32px_80px_rgba(0,0,0,0.28)]">

          {/* Subtle top-right gold accent */}
          <div className="pointer-events-none absolute -top-20 -right-20 h-56 w-56 rounded-full bg-[var(--gold)]/10 blur-3xl" />

          <div className="relative grid lg:grid-cols-[1.15fr_0.85fr]">

            {/* ── Left panel ── */}
            <div className="relative overflow-hidden bg-[var(--nav-text)] px-6 py-8 text-white sm:px-9 sm:py-10 lg:rounded-l-[20px] lg:px-10 lg:py-12">
              {/* Decorative gradient blobs */}
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_15%,rgba(207,165,58,0.18),transparent_36%),radial-gradient(circle_at_85%_85%,rgba(207,165,58,0.10),transparent_32%)]" />

              <div className="relative flex h-full flex-col justify-between gap-10">
                <div>
                  {/* Eyebrow */}
                  <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--gold)]">
                    <Sparkles className="h-3 w-3" />
                    {eyebrow}
                  </p>

                  {/* Headline */}
                  <h2
                    className="mt-3 text-3xl leading-[1.1] tracking-[-0.01em] text-white sm:text-4xl lg:text-[2.6rem]"
                    style={{ fontFamily: "var(--font-playfair), serif" }}
                  >
                    {title}
                  </h2>

                  {/* Body */}
                  <p className="mt-4 max-w-lg text-[13px] leading-[1.75] text-white/65 sm:text-sm">
                    {subtitle}
                  </p>
                </div>

                {/* Benefit pills */}
                <div className="grid gap-2.5 sm:grid-cols-3">
                  {benefits.map((item) => (
                    <div
                      key={item}
                      className="rounded-[10px] border border-white/10 bg-white/[0.06] px-4 py-3 text-[12px] font-medium leading-snug text-white/80 backdrop-blur-sm transition hover:border-[var(--gold)]/30 hover:bg-white/[0.09]"
                    >
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Right panel ── */}
            <div className="relative bg-[var(--page-bg)] px-6 py-8 sm:px-8 sm:py-10 lg:px-10 lg:py-12">
              {/* Close button */}
              <button
                type="button"
                onClick={handleClose}
                aria-label="Close popup"
                className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--nav-border)] bg-white text-[var(--nav-text)] transition hover:border-[var(--gold)]/40 hover:text-[var(--gold)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold)]"
              >
                <X className="h-3.5 w-3.5" />
              </button>

              <div className="pr-8">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--gold)]">
                  {formEyebrow}
                </p>
                <h3
                  className="mt-2 text-2xl leading-snug tracking-[-0.01em] text-[var(--page-fg)] sm:text-3xl"
                  style={{ fontFamily: "var(--font-playfair), serif" }}
                >
                  {formTitle}
                </h3>
                <p className="mt-2.5 text-[13px] leading-[1.7] text-[var(--popup-subtext)]">
                  {formDescription}
                </p>
              </div>

              {/* Form card */}
              <div className="mt-6 rounded-[14px] border border-[var(--nav-border)] bg-white p-4 shadow-[0_4px_20px_rgba(0,0,0,0.06)] sm:p-5">
                {isConfirmed ? (
                  <div className="rounded-[10px] border border-emerald-200 bg-emerald-50 px-5 py-8 text-center">
                    <CheckCircle2 className="mx-auto mb-3 h-9 w-9 text-emerald-500" />
                    <p className="text-sm font-medium leading-6 text-emerald-800">{confirmationMessage}</p>
                  </div>
                ) : (
                  <form onSubmit={handleWaitlistSubmit} className="space-y-3">
                    <div>
                      <label
                        htmlFor="coming-soon-email"
                        className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--popup-label)]"
                      >
                        Email Address
                      </label>
                      <input
                        id="coming-soon-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder={placeholder}
                        className="w-full rounded-[10px] border border-[var(--nav-border)] bg-[var(--popup-input)] px-4 py-3 text-sm text-[var(--popup-input-text)] outline-none transition focus:border-[var(--gold)] focus:bg-white placeholder:text-[var(--popup-input-ph)]"
                        required
                        autoComplete="email"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="gold-button flex w-full items-center justify-center gap-2 rounded-[10px] py-3.5 text-[13px] disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      {isSubmitting ? "Submitting..." : buttonText}
                    </button>

                    <p className="text-center text-[11px] leading-5 text-[var(--popup-muted)]">
                      {finePrint}
                    </p>
                  </form>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}