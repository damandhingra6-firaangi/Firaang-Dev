import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Newsletter from "@/components/Newsletter";
import FeedbackPill from "@/components/FeedbackPill";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "About",
  description:
    "Firaang is a modern Indian label creating bold, expressive designs for everyday wear, blending global inspiration with comfort and style.",
  path: "/about",
});

const valuePillars = [
  {
    title: "Global Inspiration",
    description:
      "Inspired by global streets, art, and culture—our designs bring a fresh, modern perspective to everyday style.",
  },
  {
    title: "Crafted Quality",
    description:
      "Designed with comfort in mind, using quality fabrics and fits that feel as good as they look.",
  },
  {
    title: "Limited-Edit Mindset",
    description:
      "We release thoughtfully designed pieces in limited edits — so every drop feels fresh, relevant, and unique.",
  },
];

const milestones = [
  { label: "Curated Collections", value: "25+" },
  { label: "Community", value: "Growing" },
  { label: "Delivery", value: "Pan India" },
];

const storyHighlights = [
  "Inspired by the Hindi word फिरंग (firang).",
  "Reimagined as a modern, expressive fashion label.",
  "Built around cultural crossover and individuality.",
  "Anchored in our philosophy: Different by Design.",
];

export default function AboutPage() {
  return (
    <main>
      <Navbar />

      <section className="relative overflow-hidden pt-[148px] md:pt-[160px]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(211,167,54,0.16),transparent_36%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_90%_40%,rgba(255,255,255,0.08),transparent_30%)]" />

        <div className="section-shell relative pb-10 md:pb-14">
          <p className="text-xs uppercase tracking-[0.28em] text-[var(--gold)]">About Firaang</p>
          <h1 className="mt-3 max-w-3xl text-4xl leading-tight text-[var(--page-fg)] md:text-6xl">
            A modern Indian label with a global fashion lens.
          </h1>
          <p className="mt-5 max-w-3xl text-sm leading-7 text-[var(--popup-subtext)] md:text-base">
            Firaang brings bold, expressive designs to everyday wear — crafted for comfort, styled for everyone.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {milestones.map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border border-[var(--gold)]/40 bg-[var(--popup-card)] px-5 py-6 shadow-[0_10px_30px_rgba(0,0,0,0.24)] backdrop-blur"
              >
                <p className="text-2xl md:text-3xl font-semibold text-[var(--gold)] tracking-wide">{item.value}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[var(--popup-subtext)]">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="pb-10 pt-6 md:pb-14">
        <div className="section-shell grid gap-6 md:grid-cols-3">
          {valuePillars.map((pillar) => (
            <article
              key={pillar.title}
              className="rounded-2xl border border-[var(--gold)]/40 bg-[var(--popup-card)] p-6 shadow-[0_12px_32px_rgba(0,0,0,0.28)] backdrop-blur"
            >
              <h2 className="text-2xl text-[var(--popup-footer-text)]">{pillar.title}</h2>
              <p className="mt-3 text-sm leading-7 text-[var(--popup-subtext)]">{pillar.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="pb-12 pt-2 md:pb-16 md:pt-4">
        <div className="section-shell">
          <div className="relative overflow-hidden rounded-[28px] border border-[var(--gold)]/35 bg-[radial-gradient(circle_at_top_left,rgba(211,167,54,0.2),transparent_36%),linear-gradient(135deg,#1d2533_0%,#10151f_52%,#232a3a_100%)] p-6 shadow-[0_24px_60px_rgba(0,0,0,0.38)] md:p-10">
            <div className="pointer-events-none absolute -right-10 -top-14 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(211,167,54,0.35),transparent_68%)]" />
            <div className="pointer-events-none absolute -bottom-20 -left-10 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.12),transparent_70%)]" />

            <div className="relative grid gap-7 lg:grid-cols-[1.3fr_0.9fr] lg:items-start">
              <div>
                <p className="inline-flex rounded-full border border-[var(--gold)]/45 bg-[rgba(211,167,54,0.14)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--gold)]">
                  The Story Behind Firaang
                </p>
                <h2 className="mt-4 text-3xl leading-tight text-[#f4efe8] md:text-5xl">
                  How do you pronounce Firaang?
                </h2>
                <p className="mt-4 max-w-3xl text-base leading-8 text-[#ddd5cc]">
                  Firaang is pronounced <span className="font-semibold text-[#f8e2b0]">Fi-rang</span> (<span className="font-semibold text-[#f8e2b0]">फिरंग</span>). The name draws from the Hindi word फिरंग and is reimagined as a contemporary fashion identity that celebrates crossing boundaries, perspectives, and cultures.
                </p>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-[#c8bfb5] md:text-base">
                  It reflects exactly what we stand for: individuality with global influence, expressed through everyday style that is unapologetically Different by Design.
                </p>
              </div>

              <div className="rounded-2xl border border-white/15 bg-white/[0.06] p-5 backdrop-blur-md">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--gold)]">Brand Identity Notes</p>
                <ul className="mt-4 space-y-3 text-sm leading-6 text-[#e4ddd4]">
                  {storyHighlights.map((line) => (
                    <li key={line} className="flex items-start gap-2">
                      <span className="mt-[7px] inline-block h-1.5 w-1.5 rounded-full bg-[var(--gold)]" aria-hidden="true" />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-5 rounded-xl border border-[var(--gold)]/30 bg-[rgba(211,167,54,0.12)] px-3 py-2 text-xs font-medium tracking-[0.02em] text-[#f0e1c7]">
                  Pronunciation: <span className="font-semibold">Fi-rang</span> (short “a” sound, like फिरंग)
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* <section className="pb-16">
        <div className="section-shell">
          <div className="rounded-3xl border border-[var(--gold)]/35 bg-gradient-to-r from-[#5b131b] via-[#3a0a11] to-[#5f1620] p-7 text-center md:p-10">
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--gold)]">Next Stop</p>
            <h2 className="mt-2 text-3xl md:text-5xl">Explore the latest collections</h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm text-[#f0d8cd] md:text-base">
              Step into our newest edit and discover wardrobe pieces designed to move from day celebrations to night plans.
            </p>
            <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/shop" className="gold-button w-full sm:w-auto">
                Shop Collection
              </Link>
              <Link href="/contact" className="outline-button w-full sm:w-auto">
                Contact Us
              </Link>
            </div>
          </div>
        </div>
      </section> */}

      <Newsletter />
      <FeedbackPill />
    </main>
  );
}
