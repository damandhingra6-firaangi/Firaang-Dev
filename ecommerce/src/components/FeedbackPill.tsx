"use client";

import { useEffect, useState } from "react";
import { MessageSquareMore, X } from "lucide-react";
import FeedbackModal from "@/components/FeedbackModal";
import { useUiStore } from "@/store/useUiStore";

export default function FeedbackPill() {
  const isFeedbackOpen = useUiStore((state) => state.isFeedbackOpen);
  const openFeedback = useUiStore((state) => state.openFeedback);
  const closeFeedback = useUiStore((state) => state.closeFeedback);
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isNearNewsletter, setIsNearNewsletter] = useState(false);

  useEffect(() => {
    const dismissed = window.sessionStorage.getItem("feedback-pill-dismissed") === "true";
    setIsDismissed(dismissed);

    if (dismissed) {
      return;
    }

    const toggleVisibility = () => {
      const shouldShow = window.scrollY > 240;
      setIsVisible(shouldShow);
    };

    toggleVisibility();
    window.addEventListener("scroll", toggleVisibility, { passive: true });

    return () => {
      window.removeEventListener("scroll", toggleVisibility);
    };
  }, []);

  useEffect(() => {
    const newsletterSection = document.querySelector<HTMLElement>("[data-newsletter-section]");

    if (!newsletterSection) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsNearNewsletter(entry.isIntersecting);
      },
      {
        // Hide the floating pill early to keep the newsletter CTA unobstructed.
        root: null,
        threshold: 0.2,
        rootMargin: "0px 0px 120px 0px",
      }
    );

    observer.observe(newsletterSection);

    return () => {
      observer.disconnect();
    };
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    window.sessionStorage.setItem("feedback-pill-dismissed", "true");
  };

  const shouldRenderPill = !isFeedbackOpen && !isDismissed && isVisible && !isNearNewsletter;

  return (
    <>
      {shouldRenderPill ? (
        <div className="fixed bottom-[max(0.9rem,env(safe-area-inset-bottom))] right-3 z-40 md:bottom-7 md:right-6">
          <div className="fade-in-up relative flex max-w-[calc(100vw-1.5rem)] items-center gap-1.5 overflow-hidden rounded-2xl border border-[var(--gold)]/45 bg-gradient-to-br from-[#6e1521] via-[#4f111a] to-[#33090f] p-1.5 pl-1.5 shadow-[0_18px_40px_rgba(0,0,0,0.46)] backdrop-blur-sm md:gap-3 md:pl-2">
            <div className="pointer-events-none absolute -right-8 -top-8 h-20 w-20 rounded-full bg-[radial-gradient(circle,rgba(211,167,54,0.26),rgba(211,167,54,0))]" />
            <button
              type="button"
              onClick={openFeedback}
              className="group relative inline-flex items-center gap-2 rounded-xl border border-transparent px-2.5 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-white transition hover:border-[var(--gold)]/20 hover:bg-[#7b202c]/80 md:px-3"
              aria-label="Open feedback form"
            >
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--gold)]/30 bg-gradient-to-br from-[#f7d782] via-[#e5b95a] to-[#bf8b2f] text-[#5a131c] shadow-[0_8px_18px_rgba(191,139,47,0.4)] transition group-hover:scale-105 group-hover:brightness-105">
                <MessageSquareMore className="h-4 w-4" />
              </span>
              <span className="pr-1 text-[10px] tracking-[0.16em] text-[#fff0e9] md:block md:pr-0 md:text-[11px]">
                Feedback
              </span>
            </button>

            <button
              type="button"
              onClick={handleDismiss}
              aria-label="Hide feedback button"
              className="rounded-lg border border-transparent p-2 text-[#f3d8c7] transition hover:border-[#ffffff22] hover:bg-[#54131c]/80 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : null}

      <FeedbackModal isOpen={isFeedbackOpen} onClose={closeFeedback} />
    </>
  );
}
