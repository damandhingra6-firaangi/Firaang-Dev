"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { CheckCircle2, Sparkles, X } from "lucide-react";
import { newsletterSchema } from "@/lib/newsletter";
import { useUiStore } from "@/store/useUiStore";

type JewelleryComingSoonModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
};

export default function JewelleryComingSoonModal({
  isOpen,
  onClose,
  title = "Explore Jewellery",
  subtitle = "Our exclusive jewellery collection is launching soon. Be among the first to discover new arrivals, timeless designs, and special launch offers.",
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
          ? "You are already on the jewellery waitlist."
          : "You are on the jewellery waitlist. We will notify you first.",
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
      className={`fixed inset-0 z-[120] px-4 py-6 transition duration-300 md:py-10 ${isVisible ? "bg-black/70 backdrop-blur-[2px]" : "bg-black/0 backdrop-blur-0"}`}
      onClick={handleClose}
    >
      <div
        className={`mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-5xl items-center justify-center transition duration-300 md:min-h-[calc(100vh-5rem)] ${isVisible ? "translate-y-0 scale-100 opacity-100" : "translate-y-4 scale-[0.98] opacity-0"}`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="relative w-full overflow-hidden rounded-[28px] border border-[var(--gold)]/40 bg-[linear-gradient(135deg,rgba(255,251,246,0.98),rgba(248,236,224,0.96))] shadow-[0_28px_80px_rgba(0,0,0,0.38)]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(211,167,54,0.18),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(180,74,72,0.12),transparent_26%)]" />
          <div className="relative grid gap-0 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="relative overflow-hidden bg-[linear-gradient(180deg,rgba(58,18,22,0.96),rgba(86,28,35,0.96))] px-6 py-8 text-[#fff4ea] sm:px-8 sm:py-10 lg:px-10 lg:py-12">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(211,167,54,0.22),transparent_28%),radial-gradient(circle_at_80%_70%,rgba(255,255,255,0.08),transparent_22%)]" />
              <div className="relative flex h-full flex-col justify-between gap-8">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--gold)]">Coming Soon 💎</p>
                  <h2 className="mt-3 text-3xl leading-tight sm:text-4xl lg:text-5xl">{title}</h2>
                  <p className="mt-4 max-w-xl text-sm leading-7 text-[#f2ddd4] sm:text-base">{subtitle}</p>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  {[
                    "New arrivals first",
                    "Exclusive launch offers",
                    "Premium designs",
                  ].map((item) => (
                    <div key={item} className="rounded-2xl border border-white/12 bg-white/6 px-4 py-4 text-sm text-[#f6eae2] backdrop-blur">
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="relative px-6 py-8 sm:px-8 sm:py-10 lg:px-10 lg:py-12">
              <button
                type="button"
                onClick={handleClose}
                aria-label="Close jewellery coming soon modal"
                className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--gold)]/25 bg-[rgba(255,255,255,0.7)] text-[var(--page-fg)] transition hover:bg-white"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="pr-10">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--gold)]">Explore Jewellery</p>
                <h3 className="mt-2 text-2xl leading-tight text-[var(--page-fg)] sm:text-3xl">Join the waitlist</h3>
                <p className="mt-3 text-sm leading-7 text-[var(--popup-subtext)]">
                  Our exclusive jewellery collection is launching soon. Be among the first to discover new arrivals, timeless designs, and special launch offers.
                </p>
              </div>

              <div className="mt-6 rounded-2xl border border-[var(--gold)]/20 bg-[var(--popup-card)] p-4 shadow-[0_16px_30px_rgba(0,0,0,0.08)] sm:p-5">
                {isConfirmed ? (
                  <div className="rounded-2xl border border-emerald-400/35 bg-emerald-500/10 px-5 py-8 text-center">
                    <CheckCircle2 className="mx-auto mb-2 h-10 w-10 text-emerald-300" />
                    <p className="text-sm leading-7 text-emerald-950/90">{confirmationMessage}</p>
                  </div>
                ) : (
                  <form onSubmit={handleWaitlistSubmit} className="space-y-4">
                    <div>
                      <label htmlFor="jewellery-waitlist-email" className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--popup-label)]">
                        Email address
                      </label>
                      <input
                        id="jewellery-waitlist-email"
                        type="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder="you@example.com"
                        className="w-full rounded-2xl border border-[var(--gold)]/30 bg-[var(--popup-input)] px-4 py-3 text-sm text-[var(--popup-input-text)] outline-none transition focus:border-[var(--gold)] focus:bg-white placeholder:text-[var(--popup-input-ph)]"
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="gold-button flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 disabled:cursor-not-allowed disabled:opacity-75"
                    >
                      <Sparkles className="h-4 w-4" />
                      {isSubmitting ? "Joining..." : "Join Waitlist"}
                    </button>

                    <p className="text-center text-xs leading-6 text-[var(--popup-muted)]">
                      Join the waitlist and get notified first.
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