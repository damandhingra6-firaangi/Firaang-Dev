"use client";

import FeedbackModal from "@/components/FeedbackModal";
import { useUiStore } from "@/store/useUiStore";

export default function FeedbackPill() {
  const isFeedbackOpen = useUiStore((state) => state.isFeedbackOpen);
  const openFeedback = useUiStore((state) => state.openFeedback);
  const closeFeedback = useUiStore((state) => state.closeFeedback);

  return (
    <>
      <button
        type="button"
        onClick={openFeedback}
        className="fixed bottom-8 left-1/2 z-40 -translate-x-1/2 rounded-full border border-[#8a2c35] bg-[#6a1521] px-5 py-3 text-xs font-medium uppercase tracking-[0.2em] text-white shadow-xl transition hover:bg-[#7d1f2c]"
        aria-label="Open feedback form"
      >
        Feedback Widget
      </button>

      <FeedbackModal isOpen={isFeedbackOpen} onClose={closeFeedback} />
    </>
  );
}
