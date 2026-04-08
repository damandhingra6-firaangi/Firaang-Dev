export default function BottomCta() {
  return (
    <section className="relative overflow-hidden border-t border-[#8a2c35]/70 bg-[#2f070c] py-16">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,rgba(211,167,54,0.16),transparent_36%)]" />
      <div className="section-shell relative text-center">
        <p className="text-xs uppercase tracking-[0.28em] text-[var(--gold)]">New Festive Collection</p>
        <h2 className="mt-3 text-4xl md:text-5xl">Step Into Timeless Glamour</h2>
        <p className="mx-auto mt-4 max-w-2xl text-sm text-[#efd6cd]">
          Fresh arrivals inspired by heirloom silhouettes and contemporary tailoring.
        </p>
        <button className="gold-button mt-8 px-7 py-3">Shop Collection</button>
      </div>
    </section>
  );
}
