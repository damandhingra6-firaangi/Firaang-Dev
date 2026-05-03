import SafeImage from "@/components/SafeImage";

const curatedItems = [
  {
    title: "Zari Bloom Anarkali",
    subtitle: "Handwoven silk with subtle antique gold threadwork.",
    image: "/cat1.jpg",
    price: "₹11,499",
  },
  {
    title: "Noor Choker Set",
    subtitle: "Kundan detailing with uncut stone centerpiece.",
    image: "/cat2.jpg",
    price: "₹7,299",
  },
  {
    title: "Regal Jodhpuri Jacket",
    subtitle: "Structured festive silhouette in textured jacquard.",
    image: "/cat3.jpg",
    price: "₹9,899",
  },
  {
    title: "Scarlet Bridal Edit",
    subtitle: "A statement lehenga set inspired by royal archives.",
    image: "/hero.jpg",
    price: "₹22,999",
  },
];

export default function CuratedCollection() {
  return (
    <section className="bg-[var(--secondary)] py-16">
      <div className="section-shell">
        <h2 className="text-center text-3xl md:text-4xl">A Curated Collection</h2>
        <p className="mx-auto mt-2 max-w-2xl text-center text-sm text-[#efd7cf]">
          Discover handcrafted staples designed to move effortlessly from celebration to statement.
        </p>

        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {curatedItems.map((item) => (
            <article key={item.title} className="border border-[#8a2c35]/70 bg-[#470a11]">
              <SafeImage src={item.image} alt={item.title} className="h-52 w-full object-cover" />
              <div className="space-y-3 p-4">
                <h3 className="text-xl">{item.title}</h3>
                <p className="min-h-12 text-sm text-[#e8cfc6]">{item.subtitle}</p>
                <p className="text-sm font-semibold text-[var(--gold)]">{item.price}</p>
                <button className="gold-button w-full">View Details</button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
