import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Newsletter from "@/components/Newsletter";
import FeedbackPill from "@/components/FeedbackPill";

export const metadata: Metadata = {
  title: "Made-to-Order & Quality Policy | Firaang",
  description: "Understand Firaang's print-on-demand production, quality checks, and support process.",
};

const policies = [
  {
    title: "Custom Printed Just for You",
    body: "Each piece is printed on demand after your order is confirmed. This made-to-order process helps us reduce waste and deliver premium quality products crafted specifically for you.",
  },
  {
    title: "Production & Dispatch Timeline",
    body: "Made-to-order items usually ship within 2-5 business days after order confirmation. Delivery timelines vary by location and are shared at checkout and in tracking updates.",
  },
  {
    title: "Order Changes & Cancellations",
    body: "Because production starts quickly, order edits or cancellations are possible only within a short window after placing the order. Contact support immediately for assistance.",
  },
  {
    title: "Quality Guaranteed",
    body: "If you receive a defective, damaged, or incorrect item, we will review your case and provide a replacement or resolution as per our quality assurance standards.",
  },
  {
    title: "Support Request Process",
    body: "Email support@firaang.com with your order ID, issue details, and clear photos within 48 hours of delivery. Our team typically responds within 24-48 hours.",
  },
  {
    title: "Printed & Shipped with Care",
    body: "Every order passes print and packaging checks before dispatch. We focus on consistent print quality, fabric quality, and safe delivery to provide a premium POD experience.",
  },
];

export default function PodPolicyPage() {
  return (
    <main>
      <Navbar />

      <section className="relative overflow-hidden pt-[148px] md:pt-[160px]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_20%,rgba(211,167,54,0.18),transparent_34%)]" />
        <div className="section-shell relative pb-10 md:pb-14">
          <p className="text-xs uppercase tracking-[0.28em] text-[var(--gold)]">POD Policy</p>
          <h1 className="mt-3 max-w-3xl text-4xl leading-tight text-[var(--page-fg)] md:text-6xl">Made-to-Order &amp; Quality Policy</h1>
          <p className="mt-5 max-w-2xl text-sm leading-7 text-[var(--popup-subtext)] md:text-base">
            We design, print, and ship each order with care. This page explains our print-on-demand process, quality standards, and support coverage.
          </p>
        </div>
      </section>

      <section className="pb-16 pt-2">
        <div className="section-shell grid gap-4 md:grid-cols-2 md:gap-5">
          {policies.map((policy) => (
            <article
              key={policy.title}
              className="relative overflow-hidden rounded-2xl border border-[var(--gold)]/40 bg-[var(--popup-card)] p-6 shadow-[0_16px_38px_rgba(0,0,0,0.32)] backdrop-blur"
            >
              <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-[radial-gradient(circle,rgba(211,167,54,0.20),rgba(211,167,54,0))] opacity-70" />
              <h2 className="text-xl text-[var(--popup-footer-text)]">{policy.title}</h2>
              <p className="mt-2 text-sm leading-7 text-[var(--popup-subtext)]">{policy.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="pb-16">
        <div className="section-shell">
          <div className="relative overflow-hidden rounded-3xl border border-[var(--gold)]/45 bg-[image:var(--popup-gradient)] p-7 shadow-[0_24px_52px_rgba(0,0,0,0.34)] md:p-10">
            <div className="pointer-events-none absolute -right-12 top-0 h-40 w-40 rounded-full bg-[radial-gradient(circle,rgba(211,167,54,0.24),rgba(211,167,54,0))]" />
            <h2 className="text-3xl text-[var(--page-fg)] md:text-4xl">Still have questions?</h2>
            <p className="mt-3 max-w-xl text-sm leading-7 text-[var(--popup-subtext)]">
              Our support team is available Monday to Saturday, 11 AM to 8 PM. Include your order ID and product photos for faster resolution.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <a href="mailto:support@firaang.com?subject=POD%20Support%20Request" className="gold-button w-full text-center sm:w-auto">
                Email Support
              </a>
              <a href="tel:+919878619783" className="outline-button w-full text-center sm:w-auto">
                Call
              </a>
            </div>
          </div>
        </div>
      </section>

      <Newsletter />
      <FeedbackPill />
    </main>
  );
}