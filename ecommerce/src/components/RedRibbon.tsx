import { Gift, Headset, RotateCcw, Truck } from "lucide-react";

const ribbonItems = [
  {
    title: "Free Return",
    subtitle: "30 Days Money Back Guarantee",
    Icon: RotateCcw,
  },
  {
    title: "Free Shipping",
    subtitle: "Free Shipping On All Order",
    Icon: Truck,
  },
  {
    title: "24/7 Support",
    subtitle: "We Support Online 24 Hrs",
    Icon: Headset,
  },
  {
    title: "Receive Gift Card",
    subtitle: "Receive Gift All Over Order ₹5000",
    Icon: Gift,
  },
];

export default function RedRibbon() {
  return (
    <section>
      <div className="flex items-center justify-center gap-3 bg-[#52200f] py-3 text-white">
        <span className="text-xs text-white/85">◆</span>
        <span className="text-sm text-[var(--gold)]">◆</span>
        <span className="text-xs text-white/85">◆</span>
      </div>
      <div className="bg-[#7a1923] py-7">
        <div className="section-shell grid gap-6 md:grid-cols-2 xl:grid-cols-4 xl:gap-8">
          {ribbonItems.map(({ title, subtitle, Icon }) => (
            <div key={title} className="flex items-center gap-4 text-white">
              <Icon className="h-11 w-11 shrink-0 text-[var(--gold)] stroke-[1.5]" />
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.05em]">{title}</p>
                <p className="text-sm text-[#f1dcda]">{subtitle}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
