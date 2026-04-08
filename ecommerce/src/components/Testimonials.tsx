const testimonials = [
  { quote: "The quality of Firaangi's clothing is unparalleled. Every piece feels like it was made just for me. Truly luxurious!", rating: 5, name: "Priya Sharma", city: "Mumbai" },
  { quote: "The quality of Firaangi's clothing is unparalleled. Every piece feels like it was made just for me. Truly luxurious!", rating: 5, name: "Priya Sharma", city: "Mumbai" },
  { quote: "The quality of Firaangi's clothing is unparalleled. Every piece feels like it was made just for me. Truly luxurious!", rating: 5, name: "Priya Sharma", city: "Mumbai" },
  { quote: "The quality of Firaangi's clothing is unparalleled. Every piece feels like it was made just for me. Truly luxurious!", rating: 5, name: "Priya Sharma", city: "Mumbai" },
];

export default function Testimonials() {
  return (
    <section className="bg-[var(--secondary)] py-16">
      <div className="section-shell">
        <h2 className="text-center text-3xl md:text-4xl">Testimonials</h2>
        <p className="mt-2 text-center text-[11px] uppercase tracking-[0.28em] text-[var(--gold)]">Client Love</p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {testimonials.map((item, i) => (
            <blockquote
              key={i}
              className="border border-[#a63f4f]/60 bg-[#5f121c] px-4 py-6 text-center leading-6"
            >
              <div className="flex justify-center gap-1 text-[var(--gold)]">
                {[...Array(item.rating)].map((_, j) => (
                  <span key={j}>★</span>
                ))}
              </div>
              <p className="mt-3 text-sm text-[#f9eae5]">&ldquo;{item.quote}&rdquo;</p>
              <div className="mt-4 border-t border-[#8a2c35] pt-3">
                <p className="font-semibold">{item.name}</p>
                <p className="text-xs text-[#c9a8a0]">{item.city}</p>
              </div>
            </blockquote>
          ))}
        </div>
      </div>
    </section>
  );
}
