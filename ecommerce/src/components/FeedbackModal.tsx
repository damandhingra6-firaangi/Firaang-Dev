"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Loader2, X } from "lucide-react";
import { useUiStore } from "@/store/useUiStore";
import { feedbackSchema } from "@/lib/feedback";

type FeedbackModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

type FeedbackFormState = {
  name: string;
  email: string;
  message: string;
};

const initialFormState: FeedbackFormState = {
  name: "",
  email: "",
  message: "",
};

export default function FeedbackModal({ isOpen, onClose }: FeedbackModalProps) {
  const [formData, setFormData] = useState<FeedbackFormState>(initialFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const pushToast = useUiStore((state) => state.pushToast);
  const isMountedRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  const updateField = (field: keyof FeedbackFormState, value: string) => {
    setFormData((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const resetAndClose = () => {
    setFormData(initialFormState);
    onClose();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedPayload = {
      name: formData.name.trim(),
      email: formData.email.trim(),
      message: formData.message.trim(),
    };

    const parsed = feedbackSchema.safeParse(normalizedPayload);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? "Please review your feedback input";
      pushToast(firstError, { variant: "warning" });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(parsed.data),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        meta?: {
          storage?: "mongo" | "fallback";
        };
      };

      if (!response.ok) {
        const errorMessage = payload.error ?? "Feedback could not be submitted";
        pushToast(errorMessage, { variant: "error" });
        return;
      }

      if (!isMountedRef.current) {
        return;
      }

      if (payload.meta?.storage === "fallback") {
        pushToast("Feedback saved locally, but MongoDB is not connected.", { variant: "warning" });
      } else {
        pushToast("Thanks for sharing feedback", { variant: "success" });
      }
      resetAndClose();
    } catch (error) {
      console.error("Feedback submission failed", error);
      pushToast("Could not submit feedback. Please try again.", { variant: "error" });
    } finally {
      if (isMountedRef.current) {
        setIsSubmitting(false);
      }
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[115] bg-black/65 px-4 py-10" onClick={onClose}>
      <div
        className="mx-auto mt-16 w-full max-w-xl rounded-2xl border border-[var(--gold)]/50 bg-[#2b060b] p-6 shadow-2xl md:mt-24"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold">Share Feedback</h2>
            <p className="mt-1 text-sm text-[#d5bdb9]">Tell us what worked and what we should improve.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close feedback form"
            className="rounded-full p-2 transition hover:bg-[#4a1118]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="text-sm">
              <span className="mb-1 block text-[#f2d7c3]">Name</span>
              <input
                type="text"
                value={formData.name}
                onChange={(event) => updateField("name", event.target.value)}
                placeholder="Your name"
                className="w-full rounded-lg border border-[var(--gold)]/35 bg-[#3a0d14] px-3 py-2 text-sm text-white outline-none transition focus:border-[var(--gold)]"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-[#f2d7c3]">Email</span>
              <input
                type="email"
                value={formData.email}
                onChange={(event) => updateField("email", event.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-lg border border-[var(--gold)]/35 bg-[#3a0d14] px-3 py-2 text-sm text-white outline-none transition focus:border-[var(--gold)]"
              />
            </label>
          </div>

          <label className="block text-sm">
            <span className="mb-1 block text-[#f2d7c3]">Feedback</span>
            <textarea
              value={formData.message}
              onChange={(event) => updateField("message", event.target.value)}
              rows={5}
              required
              maxLength={800}
              placeholder="Share your thoughts about the experience..."
              className="w-full resize-none rounded-lg border border-[var(--gold)]/35 bg-[#3a0d14] px-3 py-2 text-sm text-white outline-none transition focus:border-[var(--gold)]"
            />
            <p className="mt-1 text-right text-xs text-[#d5bdb9]">{formData.message.length}/800</p>
          </label>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-[#8a2c35] px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] transition hover:bg-[#4a1118]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--gold)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#2c0b10] transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {isSubmitting ? "Submitting" : "Send Feedback"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
