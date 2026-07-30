"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { ChevronDown, Loader2, Palette, Sparkles } from "lucide-react";
import type { DesignCustomization } from "@/components/DesignStudio";

const DesignStudio = dynamic(() => import("@/components/DesignStudio"), {
  loading: () => (
    <div className="flex items-center justify-center gap-3 rounded-3xl border border-[#e8ddd5] bg-[#f5ede3] py-16">
      <Loader2 className="h-6 w-6 animate-spin text-[var(--secondary)]" />
      <span className="text-sm text-[#7a6a62]">Loading design studio…</span>
    </div>
  ),
  ssr: false,
});

const DesignIdeaForm = dynamic(() => import("@/components/DesignIdeaForm"), {
  ssr: false,
});

type Tab = "studio" | "idea";

type Props = {
  productName?: string;
  productId?: string;
  onCustomizationChange: (customization: DesignCustomization | null) => void;
  productImageFront?: string;
  productImageBack?: string;
};

export default function CustomDesignSection({ productName, productId, onCustomizationChange, productImageFront, productImageBack }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("studio");
  const [studioOpen, setStudioOpen] = useState(false);
  const [ideaOpen, setIdeaOpen] = useState(false);

  return (
    <div className="mt-8 space-y-5">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#1a1010] via-[#2d1515] to-[#3a1a1a] p-6 text-white shadow-2xl md:p-8">
        {/* Decorative glow */}
        <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-[var(--secondary)] opacity-10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-8 -left-8 h-36 w-36 rounded-full bg-[#ff9a6c] opacity-8 blur-2xl" />

        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-[#ffb87a]" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#ffb87a]">
                Firaang Signature
              </span>
            </div>
            <h2 className="mt-2 text-2xl font-semibold leading-tight md:text-3xl">
              Create Your Own Design
            </h2>
            <p className="mt-2 max-w-md text-sm leading-6 text-white/70">
              Upload your artwork and see it live on the product — or share your idea and let our designers bring it to life.
            </p>
          </div>
          <div className="flex shrink-0 flex-col gap-2 sm:items-end">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold backdrop-blur">
              <Palette className="h-3.5 w-3.5" />
              Custom Print-on-Demand
            </span>
          </div>
        </div>
      </div>

      {/* Option 1 — Design Studio */}
      <div className="overflow-hidden rounded-[28px] border border-[#e8ddd5] bg-[rgba(255,252,248,0.96)] shadow-[0_12px_36px_rgba(97,52,27,0.05)]">
        <button
          type="button"
          onClick={() => setStudioOpen((prev) => !prev)}
          className="flex w-full items-center justify-between gap-4 p-5 text-left transition hover:bg-[#fffaf6] md:p-6"
          aria-expanded={studioOpen}
        >
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#f3e0d3]">
              <span className="text-2xl" role="img" aria-label="Artist palette">🎨</span>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8e7f75]">Option 1</p>
              <h3 className="text-xl font-semibold text-[var(--page-fg)]">Customize This T-Shirt</h3>
              <p className="mt-0.5 text-sm text-[#7a6a62]">Upload your artwork and position it live on the product.</p>
            </div>
          </div>
          <ChevronDown
            className={`h-5 w-5 shrink-0 text-[#8e7f75] transition-transform ${studioOpen ? "rotate-180" : ""}`}
          />
        </button>

        {studioOpen && (
          <div className="border-t border-[#eee6de] px-5 pb-6 pt-5 md:px-6">
            <DesignStudio
              onCustomizationChange={onCustomizationChange}
              productImageFront={productImageFront}
              productImageBack={productImageBack}
            />
            <div className="mt-4 rounded-2xl border border-[#e8ddd5] bg-[#fffaf5] px-4 py-3 text-sm text-[#6a5b52]">
              <strong>How it works:</strong> Upload a PNG or JPG (minimum 1200×1200 px, 2000×2000 px recommended for premium results). Position your design
              inside the dashed safe-area guide. When you add this product to your bag, your customisation data is
              saved with the order so our print team can fulfil it exactly as you designed.
            </div>
          </div>
        )}
      </div>

      {/* Option 2 — Have an Idea */}
      <div className="overflow-hidden rounded-[28px] border border-[#e8ddd5] bg-[rgba(255,252,248,0.96)] shadow-[0_12px_36px_rgba(97,52,27,0.05)]">
        <button
          type="button"
          onClick={() => setIdeaOpen((prev) => !prev)}
          className="flex w-full items-center justify-between gap-4 p-5 text-left transition hover:bg-[#fffaf6] md:p-6"
          aria-expanded={ideaOpen}
        >
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#edf2ff]">
              <span className="text-2xl" role="img" aria-label="Light bulb">💡</span>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8e7f75]">Option 2</p>
              <h3 className="text-xl font-semibold text-[var(--page-fg)]">Have an Idea?</h3>
              <p className="mt-0.5 text-sm text-[#7a6a62]">Tell us your vision and our designers will create it for you.</p>
            </div>
          </div>
          <ChevronDown
            className={`h-5 w-5 shrink-0 text-[#8e7f75] transition-transform ${ideaOpen ? "rotate-180" : ""}`}
          />
        </button>

        {ideaOpen && (
          <div className="border-t border-[#eee6de] px-5 pb-6 pt-5 md:px-6">
            <p className="mb-5 text-sm leading-6 text-[#6a5b52]">
              Don&apos;t have artwork ready? No problem. Tell us your idea — theme, colours, text, symbols, mood — and
              our in-house design team will create a custom artwork for you. We&apos;ll share a concept sketch before
              moving to print.
            </p>
            <DesignIdeaForm productName={productName} productId={productId} />
          </div>
        )}
      </div>
    </div>
  );
}
