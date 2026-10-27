import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Newsletter from "@/components/Newsletter";
import FeedbackPill from "@/components/FeedbackPill";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Privacy Policy",
  description:
    "Read FIRAANG's Privacy Policy to understand how we collect, use, store, and protect your personal information when you shop with us.",
  path: "/privacy-policy",
});

function LinkifyText({ text }: { text: string }) {
  const pattern =
    /(https?:\/\/[^\s]+|www\.[^\s]+|[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/gi;

  const parts = text.split(pattern);

  return (
    <>
      {parts.map((part, index) => {
        if (!part) return null;

        const isEmail =
          /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/i.test(part);

        const isUrl = /^(https?:\/\/|www\.)/i.test(part);

        if (!isEmail && !isUrl) {
          return <span key={`${part}-${index}`}>{part}</span>;
        }

        // Remove common trailing punctuation from automatically detected links.
        const match = part.match(/^(.*?)([.,!?;:]*)$/);
        const linkText = match?.[1] ?? part;
        const punctuation = match?.[2] ?? "";

        const href = isEmail
          ? `mailto:${linkText}`
          : /^www\./i.test(linkText)
            ? `https://${linkText}`
            : linkText;

        return (
          <span key={`${part}-${index}`}>
            <a
              href={href}
              target={isUrl ? "_blank" : undefined}
              rel={isUrl ? "noopener noreferrer" : undefined}
              className="inline font-medium text-[var(--nav-active)] underline decoration-[var(--nav-active)]/60 underline-offset-2 transition hover:text-[var(--secondary)]"
            >
              {linkText}
            </a>
            {punctuation}
          </span>
        );
      })}
    </>
  );
}

const sections = [
  {
    title: "1. Introduction",
    body: [
      'Welcome to FIRAANG ("FIRAANG", "we", "our", or "us"). We respect your privacy and are committed to protecting your personal information.',
      "This Privacy Policy explains how we collect, use, store, and share your personal information when you visit our website, browse our products, place an order, contact our customer support team, or otherwise interact with our services.",
      "We work with third-party service providers, including Shopify and Unitee, to support our ecommerce operations and order fulfilment. This Privacy Policy explains what information we may collect, how we use it, and when it may be shared with these providers.",
      "Where consent is required under applicable law, we will obtain it before processing your personal information.",
    ],
  },
  {
    title: "2. Information We Collect",
    body: [
      "Depending on how you interact with FIRAANG, we may collect the following categories of information:",
      "Contact and identity information: Your name, email address, phone number, billing address, shipping address, and other information you provide when placing an order or contacting us.",
      "Order information: Products purchased, order details, order history, delivery information, returns or refund requests, and customer support communications.",
      "Payment-related information: Payment status, transaction references, and related billing details made available to us by our payment provider. Your payment card or banking credentials are generally handled by the relevant payment provider and are not intentionally stored by FIRAANG unless our payment setup specifically supports such storage.",
      "Account information: If website account functionality is available and you choose to use it, we may collect the information associated with your account.",
      "Communication information: Messages, feedback, product enquiries, reviews, and other information you choose to send us.",
      "Please avoid sending sensitive personal information unless it is necessary to resolve your request.",
    ],
  },
  {
    title: "3. Device and Website Usage Information",
    body: [
      "When you visit our website, certain information about your device and browsing activity may be collected automatically through server logs, cookies, and similar technologies, depending on the services enabled on our website.",
      "This information may include your IP address, browser type and version, device type, operating system, time zone, cookie information, pages visited, products viewed, referring pages, search terms, and interactions with website features.",
      "We may use this information to display and operate our website, maintain security, identify technical problems, understand how visitors use our website, and improve the shopping experience.",
      "This information may be collected through website hosting, ecommerce, security, analytics, or other technical service providers where those services are enabled.",
      "We may share relevant technical information with Shopify and other service providers where necessary to operate, maintain, secure, or improve our website. We may share order-related information with Unitee where required for order fulfilment. We do not intend to share information with a provider for a purpose unrelated to the services it performs for us.",
    ],
  },
  {
    title: "4. How We Use Your Information",
    body: [
      "We may use your personal information for the following purposes:",
      "To process and manage orders, confirm purchases, arrange shipping, provide delivery updates, and handle returns or refund requests where applicable.",
      "To respond to enquiries, provide customer support, communicate about orders, and resolve complaints or disputes.",
      "To operate, maintain, secure, and improve our website, products, services, and shopping experience.",
      "To detect and prevent fraud, unauthorised activity, security incidents, and misuse of our services.",
      "To maintain business records, comply with legal obligations, and enforce our terms and policies.",
      "To send promotional communications where permitted by applicable law and, where required, with your consent. You can ask us to stop sending promotional communications at any time.",
    ],
  },
  {
  title: "5. Shopify, Razorpay, and Our Service Providers",
  body: [
    "Shopify: We use Shopify for ecommerce-related services. Depending on our website configuration and the features you use, Shopify may process information associated with browsing, shopping, orders, and customer interactions to provide its services.",

    "Razorpay: We use Razorpay to facilitate online payments for purchases made through our website. When you make a payment, Razorpay may process information such as your name, contact details, transaction details, payment status, and relevant technical information, as necessary to process the payment, verify transactions, prevent fraud, provide payment-related support, and comply with applicable legal requirements. Payment information may be collected directly by Razorpay or processed through the payment flow, depending on the checkout configuration. Payment methods may include cards, UPI, net banking, or other options made available at checkout.",

    "FIRAANG does not intentionally collect or store your complete payment card credentials, banking passwords, or UPI PINs. Payment credentials should be entered only through the relevant secure payment interface. The information we receive from Razorpay may include transaction references, payment status, and other details needed to manage your order and respond to payment-related enquiries.",

    "Unitee: We use Unitee for order fulfilment and related shipping operations. Where necessary to fulfil an order, we may share your name, phone number, delivery address, order details, and other relevant information with Unitee.",

    "Other service providers: We may use hosting, website maintenance, security, customer support, delivery, or other service providers to operate our business. We share only the information reasonably necessary for the relevant service, subject to applicable law.",

    "You can read Shopify's privacy information here: https://www.shopify.com/legal/privacy.",

    "You can read Razorpay's customer privacy notice here: https://razorpay.com/buyer-privacy-notice/.",

    "The information actually processed by each provider depends on the services enabled and the way our website, checkout, payment, and order systems are configured."
  ],
},
  {
    title: "6. How We Share Your Information",
    body: [
      "We do not sell your personal information to third parties for money.",
      "We may share personal information with service providers who help us operate our website, process orders, accept payments, fulfil orders, deliver products, provide customer support, maintain security, or perform other necessary business functions.",
      "We may also disclose information where reasonably necessary to comply with applicable laws, respond to lawful requests, protect our rights, investigate suspected fraud, enforce our policies, or protect the safety and security of our customers and business.",
      "If our business undergoes a merger, restructuring, acquisition, or sale of assets, relevant information may be transferred as part of that transaction, subject to applicable legal requirements.",
      "We do not authorise our service providers to use personal information for purposes unrelated to the services they provide to us, except where permitted or required by applicable law.",
    ],
  },
  {
    title: "7. Cookies and Similar Technologies",
    body: [
      "Our website and the services integrated with it may use cookies and similar technologies to support essential website functionality, remember preferences, maintain security, and understand website usage.",
      "The types of cookies used depend on the features and third-party services enabled on our website. These may include essential cookies, preference cookies, performance or analytics cookies, and advertising-related cookies if applicable services are enabled.",
      "You may be able to control cookies through your browser settings or through a consent tool provided on our website, if available. Blocking certain cookies may affect the functionality of some website features.",
      "Where required by applicable law, we will seek consent before using non-essential cookies or similar technologies.",
    ],
  },
  {
    title: "8. Data Retention",
    body: [
      "We retain personal information for as long as reasonably necessary to fulfil the purposes described in this Privacy Policy, including processing orders, providing customer support, maintaining business records, resolving disputes, and meeting legal, tax, accounting, or regulatory obligations.",
      "The appropriate retention period depends on the type of information, why it was collected, applicable legal requirements, and whether it is needed to establish or defend legal claims.",
      "When personal information is no longer required, we will take reasonable steps to delete it, anonymise it, or securely dispose of it, subject to applicable law and legitimate recordkeeping requirements.",
      "Some information may remain in service-provider backups or records for a limited period in accordance with their retention practices and legal obligations.",
    ],
  },
  {
    title: "9. Data Security",
    body: [
      "We take reasonable steps to protect personal information against unauthorised access, loss, misuse, alteration, or disclosure.",
      "Security measures may include access controls, secure connections, and the use of service providers that maintain appropriate technical and organisational safeguards.",
      "However, no website, electronic transmission, or storage system can be guaranteed to be completely secure. We cannot promise absolute security, but we work to protect the information entrusted to us.",
      "If you believe your interaction with FIRAANG is no longer secure, please contact us using the details provided in the Contact Us section.",
    ],
  },
  {
    title: "10. Your Privacy Rights and Requests",
    body: [
      "Depending on applicable law, you may have rights to request access to, correction of, or deletion of your personal information, or to raise an objection or concern about how your information is processed.",
      "You may also ask us to stop sending promotional communications. Where marketing emails include an unsubscribe option, you can use that option to opt out.",
      "To submit a privacy-related request, contact us at support@firaang.com. We may need to verify your identity before responding to certain requests to protect your information from unauthorised disclosure.",
      "We will review and respond to requests in accordance with applicable law. Certain information may need to be retained where required by law or where there is a legitimate reason to retain it.",
    ],
  },
  {
    title: "11. Children's Privacy",
    body: [
      "Our website is intended for people who can legally make purchases or use our services under applicable law. We do not knowingly collect personal information directly from children in circumstances where parental consent is required and has not been obtained.",
      "If you believe that a child has provided personal information to us inappropriately, please contact support@firaang.com so that we can review the matter and take appropriate action.",
    ],
  },
  {
    title: "12. Third-Party Websites and Services",
    body: [
      "Our website may contain links to third-party websites, services, or social media platforms. If you follow a link to a third-party service, your interaction with that service is governed by its own terms and privacy policy.",
      "We do not control and are not responsible for the privacy practices, security, or content of third-party websites. We encourage you to review their privacy policies before providing personal information.",
    ],
  },
  {
    title: "13. International Data Processing",
    body: [
      "Some of our service providers may process or store information in locations outside your state or country, depending on their operations and infrastructure.",
      "Where personal information is transferred across borders, we will take steps required by applicable law to ensure that the transfer and processing are handled appropriately.",
    ],
  },
  {
    title: "14. Marketing Communications",
    body: [
      "If permitted by applicable law, we may use your contact details to send updates about FIRAANG products, offers, launches, or other brand news.",
      "You can opt out of promotional emails by using the unsubscribe option included in the message, where available, or by contacting support@firaang.com.",
      "Even if you opt out of marketing communications, we may still contact you about an existing order, delivery, customer support request, security matter, or other necessary service-related issue.",
    ],
  },
  {
    title: "15. Changes to This Privacy Policy",
    body: [
      "We may update this Privacy Policy from time to time to reflect changes to our business, website, service providers, legal requirements, or privacy practices.",
      "When we make changes, we will update the policy on this page and revise the date shown at the top. Where required by applicable law, we will provide additional notice or seek consent for material changes.",
      "We encourage you to review this page periodically to stay informed about how we handle personal information.",
    ],
  },
  {
    title: "16. Governing Law",
    body: [
      "This Privacy Policy is intended to be interpreted in accordance with the laws applicable in India, subject to any mandatory privacy rights or protections that apply to you under applicable law.",
      "Nothing in this policy is intended to limit any rights you may have that cannot legally be excluded or restricted.",
    ],
  },
];

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <Navbar />

      <section className="relative overflow-hidden px-4 pb-16 pt-12 md:px-8 md:pb-24 md:pt-20">
        <div className="pointer-events-none absolute inset-0 -z-0 overflow-hidden">
          <div className="absolute left-[-10%] top-10 h-72 w-72 rounded-full bg-[var(--nav-active)]/10 blur-3xl" />
          <div className="absolute right-[-10%] top-40 h-80 w-80 rounded-full bg-[var(--secondary)]/10 blur-3xl" />
        </div>

        <div className="relative z-10 mx-auto max-w-5xl">
          <div className="mb-10 text-center">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-[var(--nav-active)]">
              FIRAANG · LEGAL
            </p>

            <h1 className="text-4xl font-black tracking-tight md:text-6xl">
              Privacy Policy
            </h1>

            <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-[var(--popup-subtext)] md:text-base">
              Your privacy matters to us. Learn how FIRAANG collects, uses, and
              protects your personal information when you visit our website or
              shop with us.
            </p>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-xs text-[var(--popup-subtext)] md:text-sm">
              <span className="rounded-full border border-[var(--border)] bg-[var(--card)] px-4 py-2">
                Effective date: October 27, 2026
              </span>

              <span className="rounded-full border border-[var(--border)] bg-[var(--card)] px-4 py-2">
                Last updated: October 27, 2026
              </span>
            </div>
          </div>

          <div className="mb-8 rounded-3xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm md:p-7">
            <h2 className="text-lg font-bold md:text-xl">
              A quick overview
            </h2>

            <p className="mt-3 text-sm leading-7 text-[var(--popup-subtext)] md:text-[15px]">
              We collect information needed to operate our website, process
              orders, arrange delivery, respond to enquiries, and improve our
              services. We may share relevant information with service
              providers such as Shopify, Unitee, and payment or delivery
              providers where necessary. You can contact us at
              {" "}
              <a
                href="mailto:support@firaang.com"
                className="font-medium text-[var(--nav-active)] underline decoration-[var(--nav-active)]/60 underline-offset-2"
              >
                support@firaang.com
              </a>
              {" "}
              with privacy-related questions or requests.
            </p>
          </div>

          <div className="space-y-5">
            {sections.map((section) => (
              <article
                key={section.title}
                className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm transition-shadow duration-300 hover:shadow-md md:p-7"
              >
                <h2 className="text-lg font-bold tracking-tight md:text-xl">
                  {section.title}
                </h2>

                <div className="mt-4 space-y-4 text-sm leading-8 text-[var(--popup-subtext)] md:text-[15px]">
                  {section.body.map((paragraph, index) => (
                    <p key={`${section.title}-${index}`}>
                      <LinkifyText text={paragraph} />
                    </p>
                  ))}
                </div>
              </article>
            ))}
          </div>

          <section className="mt-8 rounded-3xl border border-[var(--nav-active)]/20 bg-[var(--nav-active)]/5 p-6 md:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--nav-active)]">
              Contact FIRAANG
            </p>

            <h2 className="mt-3 text-2xl font-black md:text-3xl">
              Questions about your privacy?
            </h2>

            <p className="mt-3 text-sm leading-7 text-[var(--popup-subtext)] md:text-base">
              If you have questions about this Privacy Policy or want to make
              a privacy-related request, please contact our support team.
            </p>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--popup-subtext)]">
                  Email
                </p>

                <a
                  href="mailto:support@firaang.com"
                  className="mt-2 inline-block break-all font-semibold text-[var(--nav-active)] underline decoration-[var(--nav-active)]/60 underline-offset-2"
                >
                  support@firaang.com
                </a>
              </div>

              <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--popup-subtext)]">
                  Phone
                </p>

                <a
                  href="tel:+919878619783"
                  className="mt-2 inline-block font-semibold text-[var(--nav-active)] underline decoration-[var(--nav-active)]/60 underline-offset-2"
                >
                  +91 98786 19783
                </a>
              </div>

              <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 sm:col-span-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--popup-subtext)]">
                  Website
                </p>

                <a
                  href="https://www.firaang.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block font-semibold text-[var(--nav-active)] underline decoration-[var(--nav-active)]/60 underline-offset-2"
                >
                  www.firaang.com
                </a>
              </div>

              <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 sm:col-span-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--popup-subtext)]">
                  Business location
                </p>

                <p className="mt-2 font-semibold">
                  FIRAANG Studio, Chandigarh, India
                </p>

                <p className="mt-1 text-sm leading-6 text-[var(--popup-subtext)]">
                  Visits are by prior appointment only.
                </p>
              </div>
            </div>

            <p className="mt-5 text-xs leading-6 text-[var(--popup-subtext)]">
              Support hours: Monday to Saturday, 11:00 AM–8:00 PM. Sunday
              closed.
            </p>
          </section>
        </div>
      </section>

      <Newsletter />
      <FeedbackPill />
    </main>
  );
}