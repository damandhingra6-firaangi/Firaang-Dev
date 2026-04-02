// components/Hero.tsx

export default function Hero() {
  return (
    <section className="relative h-screen w-full">
      {/* Background image */}
      <img
  src="/hero.jpg"
  alt="Hero"
  className="absolute inset-0 w-full h-full object-cover"
/>

<div className="absolute inset-0 bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] opacity-50"></div>

<div className="absolute inset-0 flex flex-col items-center justify-center text-center text-white z-10 px-6">
  <p className="tracking-[3px] text-sm text-[var(--gold)] uppercase">
    LUXURY CLOTHING & JEWELLERY
  </p>

  <h1 className="text-5xl md:text-7xl font-semibold leading-tight mt-4 font-[var(--font-playfair)]">
    Wear Your Story. <br />
    The Firaangi Way.
  </h1>

  <div className="flex gap-4 mt-8">
    <button className="border border-[var(--gold)] text-[var(--gold)] px-6 py-3 rounded-none uppercase tracking-wider">
      SHOP COLLECTION
    </button>
    <button className="bg-[var(--gold)] text-black px-6 py-3 rounded-none uppercase tracking-wider">
      EXPLORE JEWELLERY
    </button>
  </div>
</div>

    </section>
  );
}
