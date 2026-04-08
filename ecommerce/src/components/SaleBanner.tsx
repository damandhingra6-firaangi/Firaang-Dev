// components/SaleBanner.tsx

export default function SaleBanner() {
  return (
    <section className="border-y border-[#8a2c35]/70 bg-[var(--primary)] py-12 text-center text-white">
      <p className="text-[10px] uppercase tracking-[0.3em] text-[var(--gold)]">Festive Offer</p>
      <h2 className="mt-2 text-3xl md:text-4xl">
        SALE <span className="text-[var(--gold)]">20% - 50% OFF</span>
      </h2>
      <p className="mt-3 text-sm text-[#f7e7de]">Limited period markdowns across clothing and jewellery.</p>
    </section>
  );
}