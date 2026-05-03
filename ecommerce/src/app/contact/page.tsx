import type { Metadata } from "next";
import { Clock3, Mail, MapPin, Phone } from "lucide-react";
import Navbar from "@/components/Navbar";
import Newsletter from "@/components/Newsletter";
import FeedbackPill from "@/components/FeedbackPill";

export const metadata: Metadata = {
  title: "Contact | Firaangi",
  description: "Get in touch with the Firaangi team for orders, support, and collaborations.",
};

type ContactCard = {
  title: string;
  value: string;
  subtitle: string;
  icon: typeof MapPin;
  href?: string;
};

const contactCards: ReadonlyArray<ContactCard> = [
  {
    title: "Store Address",
    value: "Firaangi Studio, Chandigarh, India",
    subtitle: "Visit by prior appointment",
    icon: MapPin,
  },
  {
    title: "Call Us",
    value: "+91 85560 08254",
    subtitle: "Mon to Sat, 11:00 AM to 8:00 PM",
    icon: Phone,
    href: "tel:+918556008254",
  },
  {
    title: "Email",
    value: "support@firaangi.com",
    subtitle: "Support and order updates",
    icon: Mail,
    href: "mailto:support@firaangi.com",
  },
  {
    title: "Working Hours",
    value: "11:00 AM to 8:00 PM",
    subtitle: "Sunday closed",
    icon: Clock3,
  },
];

export default function ContactPage() {
  return (
    <main>
      <Navbar />

      <section className="relative overflow-hidden pt-[148px] md:pt-[160px]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_20%,rgba(211,167,54,0.20),transparent_34%)]" />
        <div className="section-shell relative pb-10 md:pb-14">
          <p className="text-xs uppercase tracking-[0.28em] text-[var(--gold)]">Contact</p>
          <h1 className="mt-3 max-w-3xl text-4xl leading-tight md:text-6xl">We are here to help you style confidently.</h1>
          <p className="mt-5 max-w-3xl text-sm leading-7 text-[#efd6cd] md:text-base">
            Whether you need fit guidance, order assistance, or collaboration details, our team is ready to support you.
            Reach out through phone or email and we will get back quickly.
          </p>
        </div>
      </section>

      <section className="pb-12 pt-2 md:pb-16">
        <div className="section-shell grid gap-4 md:grid-cols-2 md:gap-5">
          {contactCards.map((card) => {
            const Icon = card.icon;

            return (
              <article
                key={card.title}
                className="group relative overflow-hidden rounded-2xl border border-[#ffffff20] bg-gradient-to-br from-[#4a0d15]/90 via-[#3a0b12]/85 to-[#2d070e]/90 p-6 shadow-[0_16px_38px_rgba(0,0,0,0.32)] transition duration-300 hover:-translate-y-0.5 hover:border-[var(--gold)]/35 hover:shadow-[0_22px_44px_rgba(0,0,0,0.38)]"
              >
                <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-[radial-gradient(circle,rgba(211,167,54,0.24),rgba(211,167,54,0))] opacity-80" />

                <div className="relative inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--gold)]/35 bg-gradient-to-br from-[#f7d782] via-[#e5b95a] to-[#bf8b2f] text-[#551018] shadow-[0_8px_18px_rgba(191,139,47,0.38)]">
                  <Icon className="h-5 w-5 transition group-hover:scale-105" />
                </div>

                <h2 className="mt-4 text-2xl text-[#fff4ef]">{card.title}</h2>
                {card.href ? (
                  <a
                    href={card.href}
                    className="mt-2 block text-lg font-medium text-[#efc35e] transition hover:text-[#ffd980] hover:underline"
                  >
                    {card.value}
                  </a>
                ) : (
                  <p className="mt-2 text-lg font-medium text-[#efc35e]">{card.value}</p>
                )}
                <p className="mt-1 text-sm text-[#f2d8cf]">{card.subtitle}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="pb-16">
        <div className="section-shell">
          <div className="relative overflow-hidden rounded-3xl border border-[var(--gold)]/30 bg-gradient-to-br from-[#5b131b] via-[#3a0a11] to-[#30070e] p-7 shadow-[0_24px_52px_rgba(0,0,0,0.34)] md:p-10">
            <div className="pointer-events-none absolute -right-12 top-0 h-40 w-40 rounded-full bg-[radial-gradient(circle,rgba(211,167,54,0.28),rgba(211,167,54,0))]" />
            <h2 className="text-3xl md:text-4xl">Need quicker help?</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[#f0d8cd] md:text-base">
              Add your order number in your message so our team can assist faster with delivery status, exchanges, and
              size support.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <a href="mailto:support@firaangi.com?subject=Firaangi%20Support" className="gold-button w-full text-center sm:w-auto">
                Email Support
              </a>
              {/* <a href="tel:+919876543210" className="outline-button w-full text-center sm:w-auto">
                Call Firaangi
              </a> */}
            </div>
          </div>
        </div>
      </section>

      <Newsletter />
      <FeedbackPill />
    </main>
  );
}
