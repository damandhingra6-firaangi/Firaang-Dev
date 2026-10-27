import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Newsletter from "@/components/Newsletter";
import FeedbackPill from "@/components/FeedbackPill";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Terms & Conditions",
  description:
    "Read FIRAANG's Terms and Conditions covering website use, orders, payments, shipping, returns, intellectual property, and applicable laws.",
  path: "/terms-and-conditions",
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
    title: "1. Overview and Acceptance of Terms",
    body: [
      "These Terms & Conditions (\"Terms\") govern your access to and use of the FIRAANG website, online store, mobile or web interfaces, product information, and services made available by FIRAANG. By using our website, placing an order, or otherwise interacting with us, you agree to be bound by these Terms in full.",
      "FIRAANG is an online apparel business based in Chandigarh, India. We operate through our website, Shopify ecommerce infrastructure, Razorpay payment processing, and Unitee fulfilment and shipping services where relevant. These Terms apply to the purchase of products and the use of services associated with our website.",
      "If you do not agree to these Terms, you should not access or use the website or place any order with FIRAANG. We may update these Terms from time to time, and your continued use of the website after such changes constitutes acceptance of the updated Terms.",
    ],
  },
  {
    title: "2. Eligibility and Acceptable Use",
    body: [
      "You must be at least 18 years old, or be using the website under the supervision of a parent or legal guardian if local law permits, to place an order or otherwise use our services. We may refuse service, close accounts, or cancel orders where we reasonably believe a customer is ineligible or acting in a manner inconsistent with these Terms.",
      "You agree to use the website lawfully and responsibly. You must not use it for any unlawful, fraudulent, abusive, threatening, or harmful purpose. You must not attempt to interfere with the operation of the website, tamper with systems, access unauthorised areas, or misuse customer data or information.",
      "We may suspend or restrict access to our website or certain features where required to protect the security, integrity, business, or legal interests of FIRAANG or its customers.",
    ],
  },
  {
    title: "3. Products and Product Descriptions",
    body: [
      "FIRAANG offers apparel and related products as described on the website. Product descriptions, materials, colours, sizes, pricing, and images are intended to provide a helpful overview of the item and may vary due to screen display, photography, lighting, fabric colour variation, and production processes.",
      "We do our best to ensure that product information is accurate, but we do not guarantee that all descriptions, images, or specifications are free from errors. Some products may be made-to-order, subject to availability, or produced in limited quantities. If a product is unavailable or cannot be fulfilled as expected, we may contact you and offer an alternative or refund in accordance with applicable law and the relevant policy.",
      "Product availability is subject to change without notice. We reserve the right to discontinue products or adjust offerings at any time.",
    ],
  },
  {
    title: "4. Prices, Currency, and Taxes",
    body: [
      "Prices displayed on the website are in INR unless otherwise stated. Taxes, shipping charges, and any other applicable charges may be shown during checkout as part of the total amount payable. The final order total is the total amount displayed at the time of order confirmation.",
      "FIRAANG may update product prices or apply changes to offers, promotions, or pricing displays from time to time. We do not guarantee that a price seen earlier will remain available when you place an order. We reserve the right to correct pricing or other errors where necessary.",
      "The applicable taxes for a purchase will depend on the nature of the transaction, the item, the delivery location, the checkout configuration, and relevant law. Customers are responsible for reviewing the total amount before confirming a purchase.",
    ],
  },
  {
    title: "5. Orders and Order Confirmation",
    body: [
      "When you place an order, you are making an offer to purchase the selected goods under these Terms. We may accept or reject orders at our discretion, including where products are unavailable, pricing is incorrect, payment verification is required, or a security or fraud check is not satisfied.",
      "An order is confirmed only when we send you a confirmation communication, such as an order acknowledgement or payment confirmation, and we have accepted the order. Until that point, the order may still be cancelled or rejected by FIRAANG.",
      "You are responsible for ensuring that the information you provide during checkout is accurate and complete. This includes product selection, delivery details, contact information, and any special instructions relevant to the order. If you provide incorrect details, we may be unable to fulfil or deliver the order as expected.",
      "We may also need to verify your identity, payment details, or order information before processing or shipping an order. Additional verification may delay order fulfilment.",
    ],
  },
  {
    title: "6. Payments and Razorpay",
    body: [
      "Payments are processed through Razorpay and the payment methods available at checkout. The available payment methods depend on the live checkout configuration, the payment provider, and the payment method offerings available at the time of purchase.",
      "Payment verification may be required before an order is processed. If a payment fails, is pending, appears duplicated, or raises a concern, you should contact us at support@firaang.com with your order details and relevant transaction information so that we can review the matter.",
      "FIRAANG may rely on Razorpay, banks, or other relevant payment providers to authenticate, process, and settle payments. Payment processing is also subject to the terms, procedures, and security controls of those providers. We do not store or intentionally retain full card credentials or banking details unless this is specifically enabled by the payment setup and required by law or the provider.",
      "If a payment issue cannot be resolved by the payment provider or by FIRAANG, the matter may require follow-up with the relevant bank or payment network. FIRAANG will use reasonable efforts to assist with enquiries and support the resolution of payment-related issues.",
    ],
  },
  {
    title: "7. Shipping, Delivery, and Order Fulfilment",
    body: [
      "FIRAANG may work with Unitee and third-party delivery partners to process, pack, and deliver orders. Shipping and fulfilment services are provided by these partners as part of the order journey and may be subject to their own terms and service conditions.",
      "Delivery estimates are provided as guidance only and are not guaranteed unless explicitly stated in writing. Actual delivery times may vary due to location, courier capacity, weather, public holidays, regional restrictions, order volume, and other operational factors.",
      "Customers must provide accurate delivery details, including the shipping address, contact phone number, pin code, and any special instructions needed for successful delivery. FIRAANG is not responsible for failed or delayed deliveries caused by incorrect or incomplete delivery information, non-availability of the recipient, or any other circumstances outside our reasonable control.",
      "If an order is delayed, lost, damaged in transit, or otherwise not delivered as expected, customers should contact support@firaang.com as soon as reasonably possible so that support staff can review the issue with the relevant courier or fulfilment partner.",
    ],
  },
  {
    title: "8. Cancellations, Returns, Exchanges, and Refunds",
    body: [
      "Cancellations, returns, exchanges, and refunds are subject to the applicable published policy for the relevant product or order, as well as applicable law and payment-provider processing requirements. We may refuse or limit requests where the relevant policy does not permit them, where a product is non-returnable or customised, or where a request is not made within relevant time frames.",
      "If a product is damaged, defective, incorrect, or materially different from the item ordered, please contact customer support promptly with your order details, relevant photos, and a short description. We will review the request under the applicable policy and arrange an appropriate remedy where appropriate.",
      "Refunds, where approved, are subject to the relevant policy, product category, payment method, and the processing procedures of the payment provider. We cannot guarantee the exact timing of refund credit to a bank account or payment instrument, and final settlement depends on the provider's processing schedule and applicable terms.",
      "If an order is cancelled prior to dispatch, any refund due will generally be processed in accordance with the payment provider and the relevant policy. FIRAANG will not unreasonably withhold a refund where law or the relevant policy requires it.",
    ],
  },
  {
    title: "9. Customised Products and Personalisation",
    body: [
      "For customised or personalised products, additional terms may apply depending on the design, artwork, production process, and order requirements. Customers are responsible for ensuring that any artwork, logos, images, names, text, or other content they provide to FIRAANG for customisation is original, legally owned or permissioned, and does not infringe the rights of any third party.",
      "FIRAANG may review submitted content for technical feasibility, policy compliance, and production suitability, but we do not guarantee that all custom requests can be fulfilled or that exact design outcomes will match every expectation. Production may depend on material availability, product type, printing or embroidery constraints, and turnaround times.",
      "By submitting content for customisation, you represent and warrant that you have the rights and permissions needed to provide the content and that it does not violate any law, third-party right, platform policy, or confidentiality obligation applicable to you.",
    ],
  },
  {
    title: "10. Intellectual Property",
    body: [
      "All intellectual property rights in the FIRAANG website, brand, original designs, product images, marketing materials, product descriptions, graphics, layouts, and other content are owned by or licensed to FIRAANG unless otherwise stated. This includes the FIRAANG name, logo, trademarks, and website materials.",
      "You may browse, view, and use the website for personal, non-commercial purposes only. You may not reproduce, distribute, display publicly, modify, resell, exploit, or commercially use FIRAANG's protected content without our prior written permission or a lawful exception under applicable copyright or other intellectual property law.",
      "Any unauthorised use of FIRAANG's trademarks, product visuals, or website content may lead to legal action and the suspension of access to the site.",
    ],
  },
  {
    title: "11. Customer-Submitted Content",
    body: [
      "Customers may submit artwork, reviews, testimonials, messages, photos, or other content to FIRAANG in connection with their orders, product enquiries, feedback, or customer support. Such content may be used only in accordance with applicable law and any specific consent or permission given by the customer.",
      "FIRAANG does not automatically receive, or automatically assume, permission to use customer-submitted content for public advertising, promotional campaigns, social media, catalogue reproduction, or other commercial or public-facing uses. Any such use requires clear permission from the customer, where required by applicable law and policy.",
      "If you submit content that includes the intellectual property or personal information of third parties, you are responsible for ensuring that you have all necessary rights and permissions before submitting it to us.",
    ],
  },
  {
    title: "12. Third-Party Services and Links",
    body: [
      "The website may include links to third-party websites, social profiles, payment pages, courier tracking pages, or other services. FIRAANG is not responsible for the accuracy, content, availability, privacy practices, or security of such third-party services.",
      "We may also rely on Shopify, Razorpay, Unitee, delivery partners, analytics tools, hosting services, and other service providers to operate our website and fulfil orders. These providers may process information needed to provide their services, and their own terms and privacy provisions will apply to those interactions.",
      "You should review the relevant third-party terms and policies before interacting with those services or submitting personal information to them.",
    ],
  },
  {
    title: "13. Privacy and Personal Information",
    body: [
      "FIRAANG treats personal information carefully and handles it in line with our Privacy Policy. Personal information may be collected, processed, and shared with Shopify, Razorpay, Unitee, courier partners, payment providers, support tools, and other service providers where reasonably necessary to operate the website, process orders, deliver products, and provide customer support.",
      "We may also use relevant personal information to identify and address security issues, manage disputes, and comply with legal or regulatory obligations. Where required by law, we will seek the appropriate consent before processing personal information for non-essential purposes.",
      "If you have questions about how we handle your personal data, please review our Privacy Policy or contact us at support@firaang.com.",
    ],
  },
  {
    title: "14. Prohibited Activities",
    body: [
      "You must not use the website in a way that breaches applicable law, harms the website, disrupts the experience of other customers, or unfairly interferes with our operations. This includes attempts to gain unauthorised access, scrape data, damage systems, overload servers, manipulate offers, exploit promotions, or use automated tools to interfere with the site.",
      "You may not use the website to distribute spam, malware, fraudulent communications, or unlawful content, nor may you impersonate FIRAANG staff or misrepresent your affiliation with us.",
      "FIRAANG may investigate suspected misuse and take appropriate action, including blocking access, cancelling orders, and reporting unlawful activity to the relevant authorities where necessary.",
    ],
  },
  {
    title: "15. Website Availability and Accuracy",
    body: [
      "We aim to keep the website available and functioning smoothly, but we cannot guarantee that the website will be uninterrupted, error-free, or free from technical issues. The website may be unavailable temporarily for maintenance, upgrades, or technical interruptions outside our direct control.",
      "Although we try to ensure that product details, prices, and information are accurate, errors may occasionally occur. We reserve the right to correct any incorrect information, suspend service, or cancel an order where necessary due to inaccuracies or operational constraints.",
      "Where a product or offer is unavailable or cannot be fulfilled, we may contact you and offer an alternative remedy where appropriate under applicable law.",
    ],
  },
  {
    title: "16. Disclaimers and Limitation of Liability",
    body: [
      "The website and its content are provided on an \"as is\" and \"as available\" basis. To the extent permitted by law, FIRAANG disclaims all warranties, express or implied, including implied warranties of merchantability, fitness for a particular purpose, and non-infringement.",
      "FIRAANG shall not be liable for indirect, incidental, consequential, special, punitive, or loss-of-business damages arising from your use of the website, products, or services, except to the extent required by applicable law or arising from our gross negligence, fraud, or wilful misconduct.",
      "Our aggregate liability for any claim arising out of or relating to these Terms or the website shall not exceed the total value of the order that gave rise to the claim, except where liability cannot lawfully be limited under applicable law.",
    ],
  },
  {
    title: "17. Indemnification",
    body: [
      "You agree to indemnify and hold harmless FIRAANG, its officers, employees, agents, affiliates, and representatives from and against any claims, liabilities, damages, losses, or expenses arising from your misuse of the website, your breach of these Terms, your unlawful conduct, or claims arising from information or content you provide to us.",
      "This indemnity includes, where relevant, claims arising from fraud, misuse, false information, infringement of third-party rights, or the submission of unauthorised or unlawful content.",
      "Where a third-party claim is made against us in connection with your conduct, we may seek to recover corresponding losses or costs from you in accordance with applicable law.",
    ],
  },
  {
    title: "18. Severability and Waiver",
    body: [
      "If any part of these Terms is found to be unenforceable or invalid under applicable law, that provision will be interpreted to the maximum extent permitted by law, and the remaining provisions will continue in full force and effect.",
      "Any waiver by FIRAANG of a breach or default under these Terms must be in writing and will not constitute a waiver of any other breach or default. If we choose not to enforce any provision immediately, this does not mean that we waive the right to enforce it later.",
    ],
  },
  {
    title: "19. Governing Law and Jurisdiction",
    body: [
      "Subject to applicable laws, any legal disputes, claims, or proceedings arising from the use of this website, its products, or services shall be governed by the laws of India and shall be subject to the exclusive jurisdiction of the competent courts in Chandigarh, India.",
      "Nothing in this clause is intended to remove or limit any consumer rights, remedies, or protections that cannot legally be excluded, restricted, or waived under applicable law.",
    ],
  },
  {
    title: "20. Changes to These Terms",
    body: [
      "FIRAANG may update, revise, or amend these Terms from time to time to reflect changes in our business, the website, applicable law, technology, or operational requirements. The latest version will be published on this page and will show the effective or last-updated date.",
      "Your continued use of the website after such updates means that you accept the revised Terms. If a change is material, we will take reasonable steps to communicate it where required by applicable law.",
    ],
  },
];

export default function TermsAndConditionsPage() {
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
              Terms &amp; Conditions
            </h1>

            <p className="mx-auto mt-5 max-w-3xl text-sm leading-7 text-[var(--popup-subtext)] md:text-base">
              These Terms &amp; Conditions explain the rules for shopping with FIRAANG,
              using our website, placing orders, making payments, and accessing our services.
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
            <h2 className="text-lg font-bold md:text-xl">A quick overview</h2>

            <p className="mt-3 text-sm leading-7 text-[var(--popup-subtext)] md:text-[15px]">
              By using FIRAANG, you agree to these Terms and to our Privacy Policy. We
              help customers shop online, manage payment processing, fulfil orders, and
              support delivery and customer service for an online apparel experience.
              For any questions about these Terms, contact us at {" "}
              <a
                href="mailto:support@firaang.com"
                className="font-medium text-[var(--nav-active)] underline decoration-[var(--nav-active)]/60 underline-offset-2"
              >
                support@firaang.com
              </a>
              {" "}or visit us by appointment in Chandigarh, India.
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
              Questions about these Terms?
            </h2>

            <p className="mt-3 text-sm leading-7 text-[var(--popup-subtext)] md:text-base">
              If you need support, want to resolve a payment or delivery issue, or have a question
              about an order, please contact our team through the details below.
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

                <p className="mt-2 font-semibold">FIRAANG Studio, Chandigarh, India</p>
                <p className="mt-1 text-sm leading-6 text-[var(--popup-subtext)]">
                  Visits are by prior appointment only.
                </p>
              </div>
            </div>

            <p className="mt-5 text-xs leading-6 text-[var(--popup-subtext)]">
              Support hours: Monday to Saturday, 11:00 AM–8:00 PM. Sunday closed.
            </p>
          </section>
        </div>
      </section>

      <Newsletter />
      <FeedbackPill />
    </main>
  );
}
