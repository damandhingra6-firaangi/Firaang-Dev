"use client";


export default function Newsletter() {
  return (
    <>
      {/* Instagram Section */}
      <section className="bg-[var(--secondary)] py-12">
        <div className="section-shell">
          <div className="flex items-center justify-center gap-2 text-[var(--gold)]">
            <h2 className="text-2xl font-bold">@Firaangi_boutique</h2>
          </div>
          <p className="mt-2 text-center text-[11px] uppercase tracking-[0.28em] text-[var(--gold)]">
            Follow Us On Instagram
          </p>

          <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-6">
            {["/cat1.jpg", "/cat2.jpg", "/cat3.jpg", "/cat4.jpg", "/hero.jpg", "/cat1.jpg"].map((img, i) => (
              <img key={i} src={img} alt="Instagram post" className="aspect-square w-full object-cover rounded" />
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter Section */}
      <section className="bg-[var(--primary)] py-16">
        <div className="section-shell max-w-2xl text-center">
          <p className="text-xs uppercase tracking-[0.28em] text-[var(--gold)]">Stay Connected</p>
          <h2 className="mt-2 text-4xl md:text-5xl">Join The Firaangi Club</h2>
          <p className="mt-4 text-sm text-[#efd6cd]">
            Be the first to know about new collections, exclusive offers, and luxury style tips.
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <input
              type="email"
              placeholder="Your email address"
              className="flex-1 bg-[#4a0b12] px-4 py-3 text-sm text-white placeholder-[#999] outline-none"
            />
            <button className="gold-button px-6 py-3">Subscribe</button>
          </div>
        </div>
      </section>
    </>
  );
}
