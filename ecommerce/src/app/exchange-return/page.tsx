import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Newsletter from "@/components/Newsletter";
import FeedbackPill from "@/components/FeedbackPill";

export const metadata: Metadata = {
  title: "Exchange & Return Policy | Firaangi",
  description: "Understand Firaangi's exchange and return policy for a hassle-free shopping experience.",
};

const policies = [
  {
    title: "Exchange Window",
    body: "We accept exchange requests within 7 days of delivery. The item must be unused, unwashed, and in its original packaging with tags intact.",
  },
  {
    title: "How to Raise a Request",
    body: "Email us at support@firaangi.com with your order number, reason for exchange, and photos of the item. Our team will respond within 24–48 hours.",
  },
  {
    title: "Eligible Reasons",
    body: "We accept exchanges for size issues, manufacturing defects, or if the wrong item was delivered. Change of mind is not eligible for returns.",
  },
  {
    title: "Non-Returnable Items",
    body: "Sale items, accessories, and jewellery are non-returnable. Items that have been worn, washed, or damaged after delivery cannot be exchanged.",
  },
  {
    title: "Shipping for Exchange",
    body: "Customers are responsible for shipping the item back. Reverse pickup may be arranged in select pin codes at an additional charge of ₹80.",
  },
  {
    title: "Refund Policy",
    body: "We currently offer store credit or size exchange only. Direct refunds are processed only in the case of confirmed manufacturing defects.",
  },
];

export default function ExchangeReturnPage() {
  return (
    <main>
      <Navbar />

      <section className="relative overflow-hidden pt-[148px] md:pt-[160px]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_20%,rgba(211,167,54,0.18),transparent_34%)]" />
        <div className="section-shell relative pb-10 md:pb-14">
          <p className="text-xs uppercase tracking-[0.28em] text-[var(--gold)]">Policies</p>
          <h1 className="mt-3 max-w-3xl text-4xl leading-tight text-[var(--page-fg)] md:text-6xl">Exchange &amp; Return Policy</h1>
          <p className="mt-5 max-w-2xl text-sm leading-7 text-[var(--popup-subtext)] md:text-base">
            We want you to love every piece you receive. If something isn't right, here's how we make it easy to resolve.
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
              Our support team is available Monday to Saturday, 11 AM to 8 PM. Include your order ID for faster resolution.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <a href="mailto:support@firaangi.com?subject=Exchange%20Request" className="gold-button w-full text-center sm:w-auto">
                Email Support
              </a>
              <a href="tel:+918556008254" className="outline-button w-full text-center sm:w-auto">
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
