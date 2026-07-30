import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Newsletter from "@/components/Newsletter";
import FeedbackPill from "@/components/FeedbackPill";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Refund & Replacement Policy",
  description: "Read Firaang's made-to-order refund, replacement, and cancellation policy.",
  path: "/pod-policy",
});

const sections = [
  {
    title: "1. Policy Overview",
    subtitle: "Made-to-order products",
    body: "At Firaang, every item is made to order and printed specifically for your purchase. Because we do not hold ready inventory and production begins after order confirmation, refunds or returns are not offered unless the item is damaged, defective, or incorrect.",
  },
  {
    title: "2. Replacement Eligibility",
    subtitle: "When a claim qualifies",
    body: "We offer a replacement when: (a) you receive the wrong product, including wrong size, color, or design; (b) the item is damaged or defective on arrival; or (c) there is a major print error that does not match your approved design.",
  },
  {
    title: "3. How to Raise a Request",
    subtitle: "Claim window and required details",
    body: "Please contact support within 5 days of delivery and share your order ID, clear photos showing the issue, and a short description of the problem. Our team will review your request and, if approved, issue either a replacement or refund as applicable.",
  },
  {
    title: "4. Non-Refundable Situations",
    subtitle: "Cases not covered",
    body: "Refunds or replacements are not provided for change-of-mind requests, incorrectly selected sizes, minor color variations caused by screen or print process differences, or courier-related delivery delays. We will still support you by escalating shipping delays with the logistics partner.",
  },
  {
    title: "5. Cancellation Policy",
    subtitle: "Short cancellation window",
    body: "Orders can be cancelled within 1 hour of placement. After that window, production starts and cancellations cannot be processed.",
  },
  {
    title: "6. Refunds & Replacement Timelines",
    subtitle: "What happens after approval",
    body: "If a refund is approved, the amount will be refunded to your original payment method. If a replacement is approved, production will begin immediately after approval, and the order will be dispatched as per our standard production and shipping timelines.",
  },
  {
    title: "7. Recommended Clarifications (Best Practice)",
    subtitle: "Additional trust-building terms",
    body: "Recommended additions that do not change this policy: mention that claims may be declined when product photos are missing or unclear, share an expected review time (for example 24-48 business hours), and clarify that this policy applies to all made-to-order products unless a product page states otherwise.",
  },
];

export default function PodPolicyPage() {
  return (
    <main>
      <Navbar />

      <section className="relative overflow-hidden pt-[148px] md:pt-[160px]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_20%,rgba(211,167,54,0.18),transparent_34%)]" />
        <div className="section-shell relative pb-10 md:pb-14">
          <p className="text-xs uppercase tracking-[0.28em] text-[var(--gold)]">Refund Policy</p>
          <h1 className="mt-3 max-w-3xl text-4xl leading-tight text-[var(--page-fg)] md:text-6xl">Refund &amp; Replacement Policy</h1>
          <p className="mt-5 max-w-2xl text-sm leading-7 text-[var(--popup-subtext)] md:text-base">
            This policy explains when refunds or replacements are available for made-to-order products and how to raise a support request with Firaang.
          </p>
          <p className="mt-3 text-xs text-[var(--popup-subtext)]/80">Last updated: July 2026</p>
        </div>
      </section>

      <section className="pb-16 pt-2">
        <div className="section-shell grid gap-4 md:grid-cols-2 md:gap-5">
          {sections.map((section) => (
            <article
              key={section.title}
              className="relative overflow-hidden rounded-2xl border border-[var(--gold)]/40 bg-[var(--popup-card)] p-6 shadow-[0_16px_38px_rgba(0,0,0,0.32)] backdrop-blur"
            >
              <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-[radial-gradient(circle,rgba(211,167,54,0.20),rgba(211,167,54,0))] opacity-70" />
              <h2 className="text-xl text-[var(--popup-footer-text)]">{section.title}</h2>
              <h3 className="mt-1 text-sm font-semibold uppercase tracking-[0.16em] text-[var(--gold)]/85">{section.subtitle}</h3>
              <p className="mt-2 text-sm leading-7 text-[var(--popup-subtext)]">{section.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="pb-16">
        <div className="section-shell">
          <div className="relative overflow-hidden rounded-3xl border border-[var(--gold)]/45 bg-[image:var(--popup-gradient)] p-7 shadow-[0_24px_52px_rgba(0,0,0,0.34)] md:p-10">
            <div className="pointer-events-none absolute -right-12 top-0 h-40 w-40 rounded-full bg-[radial-gradient(circle,rgba(211,167,54,0.24),rgba(211,167,54,0))]" />
            <h2 className="text-3xl text-[var(--page-fg)] md:text-4xl">Need help with a refund request?</h2>
            <p className="mt-3 max-w-xl text-sm leading-7 text-[var(--popup-subtext)]">
              Please share your order ID, issue details, and clear product photos. This helps our support team verify claims faster and provide the right resolution.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <a href="mailto:support@firaang.com?subject=Refund%20or%20Replacement%20Request" className="gold-button w-full text-center sm:w-auto">
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