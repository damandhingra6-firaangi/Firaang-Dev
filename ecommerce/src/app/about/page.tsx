import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Newsletter from "@/components/Newsletter";
import FeedbackPill from "@/components/FeedbackPill";

export const metadata: Metadata = {
  title: "About | Firaangi",
  description: "Discover the story, values, and design philosophy behind Firaangi.",
};

const valuePillars = [
  {
    title: "Global Inspiration",
    description:
      "Each collection blends silhouettes and details inspired by streets, art, and cultures from around the world.",
  },
  {
    title: "Crafted Quality",
    description:
      "From fit to finish, we obsess over comfort, tailoring, and premium materials that feel as good as they look.",
  },
  {
    title: "Limited-Edit Mindset",
    description:
      "We design with intention and release in curated drops so every piece feels special and stays timeless.",
  },
];

const milestones = [
  { label: "Curated Collections", value: "25+" },
  { label: "Happy Customers", value: "10k+" },
  { label: "Cities Served", value: "120+" },
];

export default function AboutPage() {
  return (
    <main>
      <Navbar />

      <section className="relative overflow-hidden pt-[148px] md:pt-[160px]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(211,167,54,0.16),transparent_36%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_90%_40%,rgba(255,255,255,0.08),transparent_30%)]" />

        <div className="section-shell relative pb-10 md:pb-14">
          <p className="text-xs uppercase tracking-[0.28em] text-[var(--gold)]">About Firaangi</p>
          <h1 className="mt-3 max-w-3xl text-4xl leading-tight md:text-6xl">
            A modern Indian label with a global fashion lens.
          </h1>
          <p className="mt-5 max-w-3xl text-sm leading-7 text-[#efd6cd] md:text-base">
            Firaangi was born from a simple idea: style should feel expressive, elevated, and effortless in everyday life.
            We build statement-ready looks for women who want couture-inspired polish with practical comfort.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {milestones.map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border border-[var(--gold)]/30 bg-[#4a1118]/70 px-5 py-6 shadow-[0_10px_30px_rgba(0,0,0,0.24)]"
              >
                <p className="text-3xl font-semibold text-[var(--gold)]">{item.value}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[#f2d9c6]">{item.label}</p>
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
              className="rounded-2xl border border-[#ffffff1a] bg-[#3a0b12]/75 p-6 shadow-[0_12px_32px_rgba(0,0,0,0.28)]"
            >
              <h2 className="text-2xl text-[var(--cream)]">{pillar.title}</h2>
              <p className="mt-3 text-sm leading-7 text-[#e9cfc4]">{pillar.description}</p>
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
