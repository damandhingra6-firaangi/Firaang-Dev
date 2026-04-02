// components/ProductGrid.tsx

const products = [
  { name: "Royal Necklace", price: "₹12,999", img: "/p1.jpg" },
  { name: "Designer Kurta", price: "₹4,999", img: "/p2.jpg" },
  { name: "Elegant Dress", price: "₹6,999", img: "/p3.jpg" },
  { name: "Men Suit", price: "₹8,999", img: "/p4.jpg" },
];

export default function ProductGrid() {
  return (
    <section className="bg-[var(--primary)] text-white py-16">
      <h2 className="text-center text-3xl mb-10">New Arrivals</h2>

      <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 px-6">
        {products.map((p, i) => (
          <div key={i} className="bg-[#5a0f16] p-4 rounded-lg">
            <img src={p.img} className="rounded mb-4" />
            <h3>{p.name}</h3>
            <p className="text-[var(--gold)]">{p.price}</p>
          </div>
        ))}
      </div>
    </section>
  );
}