import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Newsletter from "@/components/Newsletter";
import FeedbackPill from "@/components/FeedbackPill";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Shipping Policy",
  description: "Read Firaang's shipping policy for dispatch timelines, delivery estimates, tracking, and support across India.",
  path: "/shipping-policy",
});

function LinkifyText({ text }: { text: string }) {
  const pattern = /(https?:\/\/[^\s]+|www\.[^\s]+|[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/gi;
  const parts = text.split(pattern);

  return (
    <>
      {parts.map((part, index) => {
        if (!part) return null;

        const isUrl = /^https?:\/\//i.test(part) || /^www\./i.test(part);
        const isEmail = /@/.test(part) && !/^https?:\/\//i.test(part);

        if (isUrl || isEmail) {
          const href = isEmail ? `mailto:${part}` : /^www\./i.test(part) ? `https://${part}` : part;
          return (
            <a
              key={`${href}-${index}`}
              href={href}
              target={isUrl ? "_blank" : undefined}
              rel={isUrl ? "noreferrer" : undefined}
              className="inline font-medium text-[var(--nav-active)] underline decoration-[var(--nav-active)]/60 underline-offset-2 transition hover:text-[var(--secondary)]"
            >
              {part}
            </a>
          );
        }

        return <span key={`${part}-${index}`}>{part}</span>;
      })}
    </>
  );
}

const sections = [
  {
    title: "Free Shipping Across India",
    paragraphs: [
      "At FIRAANG, we currently offer free shipping on eligible orders across India. Customers are not charged any additional shipping fees at checkout for eligible deliveries.",
      "We work with third-party logistics partners to ensure that your orders are shipped securely and delivered to your doorstep.",
      "Delivery availability depends on the serviceability of your delivery PIN code.",
      "Please note that any additional charges, if applicable, will be communicated to customers before an order is placed.",
    ],
  },
  {
    title: "Order Processing and Dispatch",
    paragraphs: [
      "We aim to process and dispatch orders within 48 hours of order placement.",
      "However, dispatch timelines are estimates and may vary depending on order volume, product availability, payment verification, public holidays, and other unforeseen circumstances.",
      "During sales, promotional campaigns, festive seasons, or periods of high demand, order processing may take longer than usual.",
      "If there is a significant delay affecting your order, we will make reasonable efforts to notify you using the contact details provided when placing your order.",
    ],
  },
  {
    title: "Shipping and Delivery Timelines",
    paragraphs: [
      "We aim to deliver orders as quickly as possible through our logistics partners.",
      "Maximum Delivery Time: Orders are generally delivered within 7–8 business days from the date of order confirmation, depending on the delivery location and courier serviceability.",
      "Actual delivery timelines may vary depending on:",
    ],
    list: [
      "Your delivery location and PIN code.",
      "Courier partner availability and serviceability.",
      "Weather conditions, public holidays, and regional restrictions.",
      "Transportation disruptions or other circumstances beyond our reasonable control.",
    ],
  },
  {
    title: "Order Tracking",
    paragraphs: [
      "Once your order has been dispatched, tracking information may be shared through your registered email address, phone number, or other available communication channels.",
      "You can use the tracking details provided to check the latest shipment status.",
      "Tracking updates may take some time to appear after dispatch. If your tracking information has not been updated for an extended period, please contact our support team for assistance.",
    ],
  },
  {
    title: "Shipping Address and Contact Details",
    paragraphs: [
      "Customers are responsible for providing accurate and complete shipping information when placing an order.",
      "Please ensure that your name, phone number, delivery address, and PIN code are correct.",
      "FIRAANG cannot guarantee successful delivery if an order contains an incorrect or incomplete address or contact information.",
      "If you notice an error in your shipping details, contact us as soon as possible. We will try to assist with corrections before dispatch, but changes cannot be guaranteed once an order has been shipped.",
      "Additional delivery attempts or address corrections may depend on the courier partner's policies and service availability.",
    ],
  },
  {
    title: "Delayed, Lost, or Undelivered Orders",
    paragraphs: [
      "Although we work with logistics partners to ensure reliable delivery, unexpected shipping issues may occasionally occur.",
      "If your order is delayed, marked as undelivered, or appears to be lost in transit, please contact our support team with your order number.",
      "We will coordinate with the relevant logistics partner to investigate the issue and help determine the appropriate resolution.",
      "If an order is confirmed as lost in transit, FIRAANG will review the circumstances and provide an appropriate resolution in accordance with applicable law and our Refund and Return Policy.",
      "We will not deny a refund or other legally required remedy solely because of the difference between the customer's selling price and our product or fulfilment cost.",
    ],
  },
  {
    title: "Damaged, Incorrect, or Missing Items",
    paragraphs: [
      "We take care to ensure that your order reaches you in good condition.",
      "If you receive a damaged, incorrect, or incomplete order, please contact us as soon as reasonably possible after delivery.",
      "To help us investigate and resolve the issue, please provide:",
    ],
    list: [
      "Your order number.",
      "A description of the issue.",
      "Clear photographs or videos of the product and packaging, where available.",
    ],
  },
  {
    title: "Cash on Delivery",
    paragraphs: [
      "Cash on Delivery (COD), if available, will be displayed as a payment option during checkout.",
      "FIRAANG currently offers free shipping on eligible orders. Any COD fee or other payment-related charge, if introduced, will be clearly disclosed before you confirm your order.",
      "Customers are requested to ensure that they are available to receive their orders and complete any applicable payment at the time of delivery.",
    ],
  },
  {
    title: "Order Cancellation",
    paragraphs: [
      "If you wish to cancel an order, please contact our support team as soon as possible.",
      "Cancellation requests can be accommodated where the order has not yet been dispatched, subject to the applicable cancellation terms.",
      "Once an order has been dispatched, cancellation may no longer be possible. In such cases, customers may contact us for guidance under our applicable Return and Refund Policy.",
      "FIRAANG reserves the right to review and cancel orders where necessary due to genuine reasons, including product unavailability, suspected fraudulent activity, incorrect pricing, or delivery restrictions.",
      "If we cancel an order after payment has been received, any refund due will be processed in accordance with applicable law and our Refund Policy.",
    ],
  },
  {
    title: "Delivery Attempts and Open Delivery",
    paragraphs: [
      "Delivery attempts are managed by our logistics partners and are subject to their operational policies.",
      "Customers are requested to cooperate with delivery personnel and follow the applicable delivery procedures.",
      "Opening a parcel before accepting delivery may not be permitted by the courier partner. If the package appears damaged or tampered with, please document the issue where possible and contact FIRAANG for assistance.",
    ],
  },
];

export default function ShippingPolicyPage() {
  return (
    <main className="min-h-screen bg-[#f7f4f1]">
      <Navbar />

      <section className="relative overflow-hidden pt-[148px] md:pt-[160px]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_20%,rgba(211,167,54,0.18),transparent_34%)]" />
        <div className="section-shell relative pb-10 md:pb-14">
          <p className="text-xs uppercase tracking-[0.28em] text-[var(--gold)]">Shipping</p>
          <h1 className="mt-3 max-w-3xl text-4xl leading-tight text-[var(--page-fg)] md:text-6xl">Shipping Policy</h1>
          <p className="mt-5 max-w-3xl text-sm leading-7 text-[var(--popup-subtext)] md:text-base">
            At FIRAANG, we believe that great style should come with a smooth and hassle-free shopping experience. We are committed to delivering your favourite apparel safely and reliably to your doorstep.
          </p>
          <div className="mt-5 text-xs text-[var(--popup-subtext)]/80">Last updated: October 26, 2026</div>
        </div>
      </section>

      <section className="pb-16 pt-2">
        <div className="section-shell mx-auto max-w-5xl space-y-5">
          {sections.map((section) => (
            <article
              key={section.title}
              className="rounded-[28px] border border-[#e7d8ce] bg-white/80 p-5 shadow-[0_18px_42px_rgba(91,50,39,0.06)] backdrop-blur-sm md:p-8"
            >
              <h2 className="text-xl font-semibold text-[#2b2624] md:text-2xl">{section.title}</h2>

              <div className="mt-4 space-y-3 text-sm leading-8 text-[var(--popup-subtext)] md:text-[15px]">
                {section.paragraphs.map((paragraph) => (
                  <p key={`${section.title}-${paragraph}`}>
                    <LinkifyText text={paragraph} />
                  </p>
                ))}

                {section.list ? (
                  <ul className="list-disc space-y-2 pl-5">
                    {section.list.map((item) => (
                      <li key={`${section.title}-${item}`}>
                        <LinkifyText text={item} />
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="pb-16">
        <div className="section-shell mx-auto max-w-5xl">
          <div className="overflow-hidden rounded-[30px] border border-[#e4d6cf] bg-[#171513] p-7 text-white shadow-[0_30px_70px_rgba(0,0,0,0.12)] md:p-9">
            <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
              <div className="max-w-3xl">
                <p className="text-xs font-medium uppercase tracking-[0.28em] text-[#d1ac58]">Support</p>
                <h2 className="mt-3 text-3xl font-semibold text-white md:text-4xl">Need help with a delivery?</h2>
              </div>
            </div>

            <div className="mt-8 text-sm text-white/80 md:text-[15px]">
              <p className="mb-5 max-w-2xl leading-7">
                If you have questions about shipping, delivery timelines, tracking information, or a delayed order, please contact us through our official website. For faster assistance, please include your order number and the contact details associated with your order.
              </p>

              <dl className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <dt className="text-[10px] uppercase tracking-[0.2em] text-white/55">Brand</dt>
                  <dd className="mt-2 font-semibold text-[#f7d27d]">FIRAANG</dd>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <dt className="text-[10px] uppercase tracking-[0.2em] text-white/55">Website</dt>
                  <dd className="mt-2">
                    <a href="https://www.firaang.com" target="_blank" rel="noreferrer" className="font-medium text-[#f7d27d] underline decoration-[#f7d27d]/60 underline-offset-2">https://www.firaang.com</a>
                  </dd>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <dt className="text-[10px] uppercase tracking-[0.2em] text-white/55">Email</dt>
                  <dd className="mt-2">
                    <a href="mailto:support@firaang.com" className="font-medium text-[#f7d27d] underline decoration-[#f7d27d]/60 underline-offset-2">support@firaang.com</a>
                  </dd>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <dt className="text-[10px] uppercase tracking-[0.2em] text-white/55">Phone</dt>
                  <dd className="mt-2">
                    <a href="tel:+919878619783" className="font-medium text-[#f7d27d] underline decoration-[#f7d27d]/60 underline-offset-2">+91 98786 19783</a>
                  </dd>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:col-span-2">
                  <dt className="text-[10px] uppercase tracking-[0.2em] text-white/55">Location</dt>
                  <dd className="mt-2 text-white">Chandigarh, India</dd>
                </div>
              </dl>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a href="mailto:support@firaang.com?subject=Shipping%20Enquiry" className="gold-button w-full text-center sm:w-auto">
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
