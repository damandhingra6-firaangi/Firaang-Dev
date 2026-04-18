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
          <div className="fade-in-up relative flex max-w-[calc(100vw-1.5rem)] items-center gap-1.5 rounded-2xl border border-[var(--gold)]/45 bg-gradient-to-br from-[#6e1521] to-[#3a0b11] p-1.5 pl-1.5 shadow-[0_16px_36px_rgba(0,0,0,0.45)] backdrop-blur-sm md:gap-3 md:pl-2">
            <button
              type="button"
              onClick={openFeedback}
              className="group inline-flex items-center gap-2 rounded-xl px-2.5 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-white transition hover:bg-[#7b202c] md:px-3"
              aria-label="Open feedback form"
            >
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--gold)]/90 text-[#3a0b11] shadow-sm transition group-hover:brightness-105">
                <MessageSquareMore className="h-4 w-4" />
              </span>
              <span className="pr-1 text-[10px] md:block md:pr-0 md:text-[11px]">
                Feedback
              </span>
            </button>

            <button
              type="button"
              onClick={handleDismiss}
              aria-label="Hide feedback button"
              className="rounded-lg p-2 text-[#f3d8c7] transition hover:bg-[#54131c] hover:text-white"
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
