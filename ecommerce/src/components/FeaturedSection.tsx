const featuredLogos = ["VOGUE", "ELLE", "BRIDES", "HARPER'S BAZAAR"];

const gallery = ["/cat4.jpg", "/cat1.jpg", "/cat2.jpg", "/cat3.jpg"];

export default function FeaturedSection() {
  return (
    <section className="bg-[var(--primary)] py-16">
      <div className="section-shell">
        <h2 className="text-center text-3xl md:text-4xl">As Featured In</h2>
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {featuredLogos.map((logo) => (
            <div
              key={logo}
              className="border border-[#8a2c35]/70 bg-[#4a0b12] p-4 text-center text-sm tracking-[0.2em] text-[var(--gold)]"
            >
              {logo}
            </div>
          ))}
        </div>

        <h3 className="mt-12 text-center text-2xl">Our Social Radar</h3>
        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          {gallery.map((item, index) => (
            <img key={`${item}-${index}`} src={item} alt="Firaangi showcase" className="h-36 w-full object-cover" />
          ))}
        </div>
      </div>
    </section>
  );
}
