import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Newsletter from "@/components/Newsletter";
import FeedbackPill from "@/components/FeedbackPill";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Privacy Policy",
  description: "Learn how Firaang collects, uses, and protects your personal information.",
  path: "/privacy-policy",
});

const sections = [
  {
    title: "Information We Collect",
    body: "We collect your name, email address, phone number, shipping address, and payment information when you place an order or create an account. We may also collect browsing data such as pages visited and device information.",
  },
  {
    title: "How We Use Your Information",
    body: "Your data is used to process orders, send shipping updates, improve your shopping experience, and send promotional communications you have opted into. We do not sell your personal data to third parties.",
  },
  {
    title: "Payment Security",
    body: "All payment transactions are processed through Razorpay, a PCI-DSS compliant payment gateway. Firaang does not store your card details on our servers.",
  },
  {
    title: "SMS & OTP",
    body: "If you use mobile number login, we send OTP codes for authentication via our verified SMS partner. Your phone number is used solely for account access and order communications.",
  },
  {
    title: "Cookies",
    body: "We use cookies to remember your preferences and cart items. You can disable cookies in your browser settings, but some parts of the site may not function correctly.",
  },
  {
    title: "Data Retention",
    body: "We retain your order data for up to 5 years for legal and accounting purposes. Account data is retained as long as your account is active. You may request deletion at any time.",
  },
  {
    title: "Third-Party Services",
    body: "We use Shopify for product management, Razorpay for payments, MongoDB for data storage, and Twilio for SMS delivery. Each provider maintains their own privacy practices.",
  },
  {
    title: "Your Rights",
    body: "You have the right to access, correct, or request deletion of your personal data. To exercise any of these rights, email us at support@firaang.com and we will respond within 7 working days.",
  },
  {
    title: "Changes to This Policy",
    body: "We may update this privacy policy from time to time. Any significant changes will be communicated via email or a notice on our website.",
  },
];

export default function PrivacyPolicyPage() {
  return (
    <main>
      <Navbar />

      <section className="relative overflow-hidden pt-[148px] md:pt-[160px]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_20%,rgba(211,167,54,0.18),transparent_34%)]" />
        <div className="section-shell relative pb-10 md:pb-14">
          <p className="text-xs uppercase tracking-[0.28em] text-[var(--gold)]">Legal</p>
          <h1 className="mt-3 max-w-3xl text-4xl leading-tight md:text-6xl">Privacy Policy</h1>
          <p className="mt-5 max-w-2xl text-sm leading-7 text-[#efd6cd] md:text-base">
            Your trust matters to us. Read how we collect, use, and protect your personal information.
          </p>
          <p className="mt-3 text-xs text-[#c4a9a4]">Last updated: May 2026</p>
        </div>
      </section>

      <section className="pb-16 pt-2">
        <div className="section-shell space-y-4">
          {sections.map((section, i) => (
            <article
              key={section.title}
              className="relative overflow-hidden rounded-2xl border border-[#ffffff18] bg-gradient-to-br from-[#4a0d15]/90 via-[#3a0b12]/85 to-[#2d070e]/90 p-6 shadow-[0_12px_32px_rgba(0,0,0,0.28)]"
            >
              <span className="absolute right-5 top-5 text-5xl font-bold text-[var(--gold)]/8 select-none">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h2 className="text-lg font-semibold text-[var(--gold)]">{section.title}</h2>
              <p className="mt-2 text-sm leading-7 text-[#f2d8cf]">{section.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="pb-16">
        <div className="section-shell">
          <div className="relative overflow-hidden rounded-3xl border border-[var(--gold)]/30 bg-gradient-to-br from-[#5b131b] via-[#3a0a11] to-[#30070e] p-7 shadow-[0_24px_52px_rgba(0,0,0,0.34)] md:p-10">
            <h2 className="text-3xl md:text-4xl">Questions about your data?</h2>
            <p className="mt-3 max-w-xl text-sm leading-7 text-[#f0d8cd]">
              Reach out to our team and we will respond within 7 working days.
            </p>
            <a href="mailto:support@firaang.com?subject=Privacy%20Enquiry" className="gold-button mt-6 inline-block">
              Contact Us
            </a>
          </div>
        </div>
      </section>

      <Newsletter />
      <FeedbackPill />
    </main>
  );
}
