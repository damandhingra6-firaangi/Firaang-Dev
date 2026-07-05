import SafeImage from "@/components/SafeImage";

const ribbonItems = [
  {
    title: "Custom Printed Just for You",
    subtitle: "Made-to-Order Premium Quality",
    iconSrc: "/FreeReturn.svg",
  },
  {
    title: "Fast Delivery",
    subtitle: "Quick Delivery Across India",
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
    <section className="border-t border-[#ececef] bg-white">
      <div className="home-shell py-7 sm:py-8">
        <div className="grid gap-y-6 sm:grid-cols-2 sm:gap-x-8 sm:gap-y-7 xl:grid-cols-4 xl:gap-x-10">
          {ribbonItems.map(({ title, subtitle, iconSrc }) => (
            <div
              key={title}
              className="mx-auto flex w-full max-w-[300px] items-center gap-3 text-[var(--ribbon-text)] sm:max-w-none sm:justify-start sm:gap-4"
            >
              <SafeImage src={iconSrc} alt={title} className="h-12 w-12 shrink-0 object-contain sm:h-11 sm:w-11 lg:h-12 lg:w-12" />
              <div className="min-w-0 text-left">
                <p className="font-sans text-[13px] font-semibold leading-[1.15] text-[#1f1f1f] sm:text-[12px] lg:text-[13px]">
                  {title}
                </p>
                <p className="mt-0.5 font-sans text-[10px] font-medium leading-[1.2] text-[var(--ribbon-subtext)] sm:text-[10px] lg:text-[10px]">
                  {subtitle}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
