// components/SaleBanner.tsx

export default function SaleBanner() {
  return (
    <section className="border-y border-[var(--sale-border)]/70 bg-[var(--sale-bg)] py-12 text-center text-[var(--sale-text)]">
      <p className="text-[10px] uppercase tracking-[0.3em] text-[var(--gold)]">Festive Offer</p>
      <h2 className="mt-2 text-3xl md:text-4xl">
        SALE <span className="text-[var(--gold)]">20% - 50% OFF</span>
      </h2>
      <p className="mt-3 text-sm text-[var(--sale-subtext)]">Limited period markdowns across clothing and jewellery.</p>
    </section>
  );
}