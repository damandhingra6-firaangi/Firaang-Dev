// components/Category.tsx

const categories = [
  { name: "Ethnic Wear", img: "/cat1.jpg" },
  { name: "Jewellery", img: "/cat2.jpg" },
  { name: "Menswear", img: "/cat3.jpg" },
  { name: "Occasion", img: "/cat4.jpg" },
];

export default function Category() {
  return (
    <section className="bg-[var(--secondary)] text-white py-12">
      <h2 className="text-center text-3xl font-semibold mb-8">
        Shop by Category
      </h2>

      <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 px-6">
        {categories.map((cat, i) => (
          <div key={i} className="relative group cursor-pointer">
            <img
              src={cat.img}
              className="rounded-lg w-full h-60 object-cover"
            />
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
              <span className="text-lg font-semibold">
                {cat.name}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}