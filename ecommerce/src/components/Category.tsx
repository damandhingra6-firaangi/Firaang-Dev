// components/Category.tsx

import SafeImage from "@/components/SafeImage";

const categories = [
  { name: "Boho Chic", img: "/cat1.jpg" },
  { name: "Ethnic Fusion", img: "/cat3.jpg" },
  { name: "Everyday Essentials", img: "/cat4.jpg" },
  { name: "Statement Pieces", img: "/cat2.jpg" },
];

export default function Category() {
  return (
    <section className="bg-[var(--primary)] py-14 md:py-16">
      <h2 className="text-center text-3xl font-semibold mb-2 md:text-4xl">
        Shop by Category
      </h2>
      <p className="text-center text-[11px] uppercase tracking-[0.12em] text-[var(--gold)] mb-3 md:text-[31px]">
        Clothing & Jewellery
      </p>
      <SafeImage
        src="/GoldenArrow.svg"
        alt="Decorative golden divider"
        className="mx-auto mb-10 w-[156px]"
      />

      <div className="section-shell grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
        {categories.map((cat, i) => (
          <div key={i} className="relative group cursor-pointer overflow-hidden rounded-[18px] border border-[var(--gold)]/70">
            <SafeImage
              src={cat.img}
              alt={cat.name}
              className="h-[240px] w-full object-cover transition duration-500 group-hover:scale-105 md:h-[340px]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent flex items-end justify-center p-6">
              <span className="text-center text-2xl font-semibold md:text-[36px]">
                {cat.name}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}