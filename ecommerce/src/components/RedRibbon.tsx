import SafeImage from "@/components/SafeImage";

const ribbonItems = [
  {
    title: "Free Return",
    subtitle: "30 Days Money Back Guarantee",
    iconSrc: "/FreeReturn.svg",
  },
  {
    title: "Free Shipping",
    subtitle: "Free Shipping On All Order",
    iconSrc: "/FreeShipping.svg",
  },
  {
    title: "24/7 Support",
    subtitle: "We Support Online 24 Hrs",
    iconSrc: "/24-7Hrs.svg",
  },
  {
    title: "Receive Gift Card",
    subtitle: "Receive Gift All Over Order ₹5000",
    iconSrc: "/GiftCard.svg",
  },
];

export default function RedRibbon() {
  return (
    <section>
      <div className="flex items-center justify-center gap-3 bg-[var(--ribbon-top-bg)] py-3 text-[var(--ribbon-text)]">
        <span className="text-xs opacity-85">◆</span>
        <span className="text-sm text-[var(--gold)]">◆</span>
        <span className="text-xs opacity-85">◆</span>
      </div>
      <div className="bg-[var(--ribbon-main-bg)] py-7">
        <div className="section-shell grid gap-6 md:grid-cols-2 xl:grid-cols-4 xl:gap-8">
          {ribbonItems.map(({ title, subtitle, iconSrc }) => (
            <div key={title} className="flex items-center gap-4 text-[var(--ribbon-text)]">
              <SafeImage src={iconSrc} alt={title} className="h-11 w-11 shrink-0 object-contain" />
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.05em]">{title}</p>
                <p className="text-sm text-[var(--ribbon-subtext)]">{subtitle}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
