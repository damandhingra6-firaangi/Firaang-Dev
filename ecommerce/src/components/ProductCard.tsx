// components/ProductCard.tsx

import SafeImage from "@/components/SafeImage";

type Props = {
  title: string;
  price: number;
  image: string;
};

export default function ProductCard({ title, price, image }: Props) {
  return (
    <div className="rounded-xl border border-[var(--gold)]/30 bg-[var(--shop-card-bg)] p-4 transition hover:shadow-lg">
      <SafeImage src={image} alt={title} className="w-full h-60 object-cover rounded-lg" />

      <h3 className="mt-3 font-semibold text-[var(--arrivals-card-title)]">{title}</h3>
      <p className="text-[var(--shop-card-desc)]">₹{price}</p>

      <button className="mt-3 w-full rounded-lg bg-[var(--gold)] py-2 text-[#3b0810] transition hover:bg-[#f0c654]">
        Add to Cart
      </button>
    </div>
  );
}