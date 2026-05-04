"use client";

import { FormEvent, useEffect, useState } from "react";
import { CheckCircle2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import SafeImage from "@/components/SafeImage";
import { newsletterSchema } from "@/lib/newsletter";
import { useUiStore } from "@/store/useUiStore";

const heroSlides = [
  {
    id: 1,
    image: "/hero.jpg",
    alt: "Model in red couture attire",
    eyebrow: "Luxury Clothing & Jewellery",
    title: ["Wear The World.", "Own The Style."],
  },
];

export default function Hero() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isWaitlistOpen, setIsWaitlistOpen] = useState(false);
  const [isWaitlistConfirmed, setIsWaitlistConfirmed] = useState(false);
  const [waitlistConfirmationMessage, setWaitlistConfirmationMessage] = useState("");
  const [waitlistEmail, setWaitlistEmail] = useState("");
  const [isSubmittingWaitlist, setIsSubmittingWaitlist] = useState(false);
  const router = useRouter();
  const pushToast = useUiStore((state) => state.pushToast);

  useEffect(() => {
    if (heroSlides.length <= 1) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setActiveIndex((currentIndex) => (currentIndex + 1) % heroSlides.length);
    }, 6000);

    return () => window.clearInterval(intervalId);
  }, []);

  const activeSlide = heroSlides[activeIndex];

  const handleShopCollection = () => {
    router.push("/shop");
  };

  const handleExploreJewellery = () => {
    setWaitlistEmail("");
    setIsWaitlistConfirmed(false);
    setWaitlistConfirmationMessage("");
    setIsWaitlistOpen(true);
  };

  useEffect(() => {
    if (!isWaitlistConfirmed) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setIsWaitlistOpen(false);
      setIsWaitlistConfirmed(false);
      setWaitlistConfirmationMessage("");
    }, 1400);

    return () => window.clearTimeout(timeoutId);
  }, [isWaitlistConfirmed]);

  const handleWaitlistSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const parsed = newsletterSchema.safeParse({ email: waitlistEmail });

    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? "Please enter a valid email address";
      pushToast(firstError, { variant: "warning" });
      return;
    }

    setIsSubmittingWaitlist(true);

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

      if (payload.duplicate) {
        setWaitlistConfirmationMessage("You are already on the jewellery waitlist.");
      } else {
        setWaitlistConfirmationMessage("You are on the jewellery waitlist. We will notify you first.");
      }

      if (payload.meta?.storage === "fallback") {
        pushToast("Newsletter saved locally, but MongoDB is not connected.", { variant: "warning" });
      }

      setWaitlistEmail("");
      setIsWaitlistConfirmed(true);
    } catch (error) {
      console.error("Jewellery waitlist signup failed", error);
      pushToast("Could not join waitlist right now", { variant: "error" });
    } finally {
      setIsSubmittingWaitlist(false);
    }
  };

  return (
    <section className="hero-section relative min-h-[56vh] w-full overflow-hidden pt-20 max-[390px]:min-h-[52vh] min-[401px]:min-h-[60vh] md:min-h-[90vh] md:pt-28 lg:mt-24">
      <SafeImage
        src="/hero.jpg"
        alt={activeSlide.alt}
        className="absolute left-0 top-0 h-full w-full object-cover object-[50%_24%] max-[390px]:object-[50%_22%] min-[401px]:object-[50%_26%] md:hidden"
      />
      <SafeImage
        src={activeSlide.image}
        alt={activeSlide.alt}
        className="absolute left-0 top-0 hidden h-full w-full object-cover object-top md:block"
      />

      <div className="hero-overlay-primary absolute inset-0 bg-gradient-to-r from-[#30070bcc] via-[#4f0f17c2] to-[#220406de]" />
      <div className="hero-overlay-glow absolute inset-0 bg-[radial-gradient(circle_at_70%_40%,rgba(211,167,54,0.18),transparent_35%)]" />

      <div className="hero-content absolute inset-x-0 bottom-0 top-[122px] z-10 section-shell flex flex-col items-center justify-start pt-4 text-center fade-in-up max-[390px]:top-[106px] max-[390px]:pt-3 min-[401px]:top-[126px] min-[401px]:pt-5 md:inset-0 md:justify-center md:pt-0">
        <p className="hero-eyebrow text-xs font-medium uppercase tracking-[0.35em] text-[var(--gold)] md:text-sm">
          {activeSlide.eyebrow}
        </p>

        <h1 className="hero-title mt-4 text-4xl font-bold leading-tight drop-shadow-2xl md:text-7xl">
          {activeSlide.title[0]} <br />
          {activeSlide.title[1]}
        </h1>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:gap-4">
          <button type="button" onClick={handleShopCollection} className="outline-button px-6 py-3">
            SHOP COLLECTION
          </button>
          <button type="button" onClick={handleExploreJewellery} className="gold-button px-6 py-3">
            EXPLORE JEWELLERY
          </button>
        </div>
      </div>

      {heroSlides.length > 1 ? (
        <div className="absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 gap-3 md:bottom-8">
          {heroSlides.map((slide, index) => (
            <button
              key={slide.id}
              type="button"
              aria-label={`Go to slide ${index + 1}`}
              onClick={() => setActiveIndex(index)}
              className={index === activeIndex ? "text-[var(--gold)]" : "text-white/80"}
            >
              <span className="text-sm">◆</span>
            </button>
          ))}
        </div>
      ) : null}

      {isWaitlistOpen ? (
        <div className="fixed inset-0 z-[120] bg-black/70 px-4 py-8" onClick={() => setIsWaitlistOpen(false)}>
          <div
            className="mx-auto mt-12 w-full max-w-lg rounded-2xl border border-[var(--gold)]/45 bg-[var(--popup-bg)] p-5 shadow-2xl md:mt-24 md:p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--gold)]">Coming Soon</p>
                <h3 className="mt-1 text-2xl leading-tight text-[var(--page-fg)]">Explore Jewellery</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsWaitlistOpen(false)}
                aria-label="Close jewellery waitlist"
                className="rounded-full p-2 transition hover:bg-[var(--popup-hover2)] text-[var(--page-fg)]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="mb-5 text-sm text-[var(--popup-subtext)]">
              Our jewellery line is launching soon. Join the waitlist and get notified first.
            </p>

            {isWaitlistConfirmed ? (
              <div className="rounded-xl border border-emerald-400/40 bg-emerald-500/10 px-4 py-5 text-center">
                <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-emerald-300" />
                <p className="text-sm text-emerald-100">{waitlistConfirmationMessage}</p>
              </div>
            ) : (
              <form onSubmit={handleWaitlistSubmit} className="space-y-3">
                <label className="block text-xs uppercase tracking-[0.12em] text-[var(--popup-label)]" htmlFor="jewellery-waitlist-email">
                  Email
                </label>
                <input
                  id="jewellery-waitlist-email"
                  type="email"
                  value={waitlistEmail}
                  onChange={(event) => setWaitlistEmail(event.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-lg border border-[var(--gold)]/35 bg-[var(--popup-input)] px-3 py-2.5 text-sm text-[var(--popup-input-text)] outline-none transition focus:border-[var(--gold)] placeholder:text-[var(--popup-input-ph)]"
                  required
                />

                <button
                  type="submit"
                  className="gold-button w-full disabled:cursor-not-allowed disabled:opacity-70"
                  disabled={isSubmittingWaitlist}
                >
                  {isSubmittingWaitlist ? "Joining..." : "Join Waitlist"}
                </button>
              </form>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}
