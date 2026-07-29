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
