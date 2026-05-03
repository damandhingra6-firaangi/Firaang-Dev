import SafeImage from "@/components/SafeImage";

const seasons = [
  { id: "season-boho-1", title: "Boho Chic", image: "/cat1.jpg" },
  { id: "season-boho-2", title: "Boho Chic", image: "/cat2.jpg" },
  { id: "season-boho-3", title: "Boho Chic", image: "/cat3.jpg" },
  { id: "season-boho-4", title: "Boho Chic", image: "/cat4.jpg" },
];

export default function SeasonShowcase() {
  return (
    <section className="bg-[var(--primary)] py-16">
      <div className="section-shell">
        <h2 className="text-center text-3xl md:text-4xl">Shop by Season</h2>
        <p className="mt-2 text-center text-[11px] uppercase tracking-[0.12em] text-[var(--gold)]">
          Curated Looks for Every Time of Year
        </p>
        <SafeImage
          src="/GoldenArrow.svg"
          alt="Decorative golden divider"
          className="mx-auto mb-8 mt-3 w-[156px]"
        />
        <div className="grid gap-5 md:grid-cols-4">
          {seasons.map((season) => (
            <div key={season.id} className="group relative overflow-hidden border border-[#8a2c35]/70">
              <SafeImage
                src={season.image}
                alt={season.title}
                className="h-64 w-full object-cover transition duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-4 text-center">
                <h3 className="text-xl">{season.title}</h3>
                <p className="mt-2 text-sm text-[var(--gold)]">Explore →</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
