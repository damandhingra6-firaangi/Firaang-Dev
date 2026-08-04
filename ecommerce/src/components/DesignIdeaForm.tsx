"use client";

import type { FormEvent } from "react";
import { useRef, useState } from "react";
import { Loader2, Paperclip, Send, Sparkles, X } from "lucide-react";

type Props = {
  productName?: string;
  productId?: string;
};

type FormState = {
  name: string;
  email: string;
  phone: string;
  description: string;
  budget: string;
  expectedDelivery: string;
};

const INITIAL_FORM: FormState = {
  name: "",
  email: "",
  phone: "",
  description: "",
  budget: "",
  expectedDelivery: "",
};

const MAX_REFERENCE_FILES = 5;
const MAX_REFERENCE_FILE_SIZE_BYTES = 20 * 1024 * 1024;
const ALLOWED_REFERENCE_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/jpg", "image/webp"]);

export default function DesignIdeaForm({ productName, productId }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [referenceFiles, setReferenceFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const update = (field: keyof FormState) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [field]: event.target.value }));

  const handleReferenceFiles = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    const allowed: File[] = [];
    const rejectedByType: string[] = [];
    const rejectedBySize: string[] = [];

    for (const file of files) {
      if (!ALLOWED_REFERENCE_MIME_TYPES.has(file.type)) {
        rejectedByType.push(file.name);
        continue;
      }

      if (file.size > MAX_REFERENCE_FILE_SIZE_BYTES) {
        rejectedBySize.push(file.name);
        continue;
      }

      allowed.push(file);
    }

    if (rejectedByType.length > 0 || rejectedBySize.length > 0) {
      const messages: string[] = [];
      if (rejectedByType.length > 0) {
        messages.push(`Unsupported format: ${rejectedByType.join(", ")}. Use PNG/JPG/JPEG/WEBP.`);
      }
      if (rejectedBySize.length > 0) {
        messages.push(`Too large (max 20 MB each): ${rejectedBySize.join(", ")}.`);
      }
      setErrorMessage(messages.join(" "));
    } else {
      setErrorMessage(null);
    }

    setReferenceFiles((prev) => [...prev, ...allowed].slice(0, MAX_REFERENCE_FILES));
    event.target.value = "";
  };

  const removeFile = (index: number) => {
    setReferenceFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);

    if (!form.name.trim() || form.name.trim().length < 2) {
      setErrorMessage("Please enter your name (at least 2 characters).");
      return;
    }
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }
    if (!form.description.trim() || form.description.trim().length < 10) {
      setErrorMessage("Please describe your idea in at least 10 characters.");
      return;
    }

    setIsSubmitting(true);

    try {
      // Upload reference images first (fire-and-forget individually)
      const referenceImageUrls: string[] = [];
      const failedUploads: string[] = [];
      for (const file of referenceFiles) {
        try {
          const fd = new FormData();
          fd.append("file", file);
          const res = await fetch("/api/design/upload", { method: "POST", body: fd });
          const data = (await res.json()) as { url?: string; error?: string };

          if (!res.ok || !data.url) {
            failedUploads.push(file.name);
            continue;
          }

          referenceImageUrls.push(data.url);
        } catch {
          failedUploads.push(file.name);
        }
      }

      if (failedUploads.length > 0) {
        throw new Error(`Some images failed to upload: ${failedUploads.join(", ")}. Please retry.`);
      }

      const response = await fetch("/api/design/inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim() || undefined,
          description: form.description.trim(),
          budget: form.budget.trim() || undefined,
          expectedDelivery: form.expectedDelivery.trim() || undefined,
          productName: productName ?? undefined,
          productId: productId ?? undefined,
          referenceImageUrls: referenceImageUrls.length > 0 ? referenceImageUrls : undefined,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as { success?: boolean; error?: string };

      if (!response.ok || !payload.success) {
        throw new Error(payload.error ?? "Submission failed. Please try again.");
      }

      setSuccessMessage(
        "Your idea has been submitted! Our designers will review it and contact you within 1–2 business days."
      );
      setForm(INITIAL_FORM);
      setReferenceFiles([]);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (successMessage) {
    return (
      <div className="rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-6 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
          <Sparkles className="h-7 w-7 text-emerald-600" />
        </div>
        <h3 className="text-xl font-semibold text-[var(--page-fg)]">Idea Received!</h3>
        <p className="mt-2 text-sm leading-7 text-[#5a4a42]">{successMessage}</p>
        <button
          type="button"
          onClick={() => setSuccessMessage(null)}
          className="mt-5 rounded-2xl border border-[#ddd0c5] px-5 py-2.5 text-sm font-semibold text-[var(--page-fg)] transition hover:border-[var(--secondary)] hover:text-[var(--secondary)]"
        >
          Submit another idea
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm font-medium text-[#4a3f38]">
          Full Name <span className="text-[var(--secondary)]">*</span>
          <input
            value={form.name}
            onChange={update("name")}
            required
            placeholder="Your full name"
            className="rounded-2xl border border-[#e1d5ca] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--secondary)] focus:ring-1 focus:ring-[var(--secondary)]/20"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm font-medium text-[#4a3f38]">
          Email Address <span className="text-[var(--secondary)]">*</span>
          <input
            type="email"
            value={form.email}
            onChange={update("email")}
            required
            placeholder="you@example.com"
            className="rounded-2xl border border-[#e1d5ca] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--secondary)] focus:ring-1 focus:ring-[var(--secondary)]/20"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm font-medium text-[#4a3f38]">
          Phone Number
          <input
            type="tel"
            value={form.phone}
            onChange={update("phone")}
            placeholder="+91 98765 43210"
            className="rounded-2xl border border-[#e1d5ca] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--secondary)] focus:ring-1 focus:ring-[var(--secondary)]/20"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm font-medium text-[#4a3f38]">
          Budget <span className="text-xs font-normal text-[#9e8e85]">(optional)</span>
          <input
            value={form.budget}
            onChange={update("budget")}
            placeholder="e.g. ₹2,000 – ₹5,000"
            className="rounded-2xl border border-[#e1d5ca] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--secondary)] focus:ring-1 focus:ring-[var(--secondary)]/20"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1.5 text-sm font-medium text-[#4a3f38]">
        Describe Your Design Idea <span className="text-[var(--secondary)]">*</span>
        <textarea
          value={form.description}
          onChange={update("description")}
          required
          rows={5}
          placeholder="Describe what you'd like — theme, colours, placement, text, symbols, mood board ideas, etc."
          className="rounded-2xl border border-[#e1d5ca] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--secondary)] focus:ring-1 focus:ring-[var(--secondary)]/20 resize-none"
        />
        <span className="text-right text-xs text-[#b0a09a]">{form.description.length} / 2000</span>
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-medium text-[#4a3f38]">
        Expected Delivery Date <span className="text-xs font-normal text-[#9e8e85]">(optional)</span>
        <input
          value={form.expectedDelivery}
          onChange={update("expectedDelivery")}
          placeholder="e.g. By 15 August, for a wedding on 20 Aug"
          className="rounded-2xl border border-[#e1d5ca] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--secondary)] focus:ring-1 focus:ring-[var(--secondary)]/20"
        />
      </label>

      {/* Reference images */}
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-[#4a3f38]">
          Reference Images <span className="text-xs font-normal text-[#9e8e85]">(optional, up to 5)</span>
        </p>

        {referenceFiles.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {referenceFiles.map((file, i) => (
              <div
                key={i}
                className="flex items-center gap-2 rounded-xl border border-[#e2d5c9] bg-white px-3 py-2 text-xs font-medium text-[#5a4a42]"
              >
                <Paperclip className="h-3.5 w-3.5 text-[var(--secondary)]" />
                <span className="max-w-[120px] truncate">{file.name}</span>
                <button
                  type="button"
                  onClick={() => removeFile(i)}
                  className="text-[#b0a09a] transition hover:text-red-400"
                  aria-label={`Remove ${file.name}`}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {referenceFiles.length < 5 && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex w-fit items-center gap-2 rounded-2xl border border-dashed border-[#ddd0c5] px-4 py-2.5 text-sm font-medium text-[#8b7d75] transition hover:border-[var(--secondary)] hover:text-[var(--secondary)]"
          >
            <Paperclip className="h-4 w-4" />
            Attach reference images
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
          multiple
          className="sr-only"
          onChange={handleReferenceFiles}
          aria-label="Attach reference images"
        />
      </div>

      {errorMessage && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{errorMessage}</div>
      )}

      <div className="flex flex-wrap gap-3 pt-1">
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center gap-2 rounded-2xl bg-[var(--secondary)] px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-[rgba(157,57,64,0.18)] transition hover:bg-[#9f3940] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Submit My Idea
        </button>
      </div>
    </form>
  );
}
