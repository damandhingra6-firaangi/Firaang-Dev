// components/ProductCard.tsx

type Props = {
  title: string;
  price: number;
  image: string;
};

export default function ProductCard({ title, price, image }: Props) {
  return (
    <div className="border rounded-xl p-4 hover:shadow-lg transition">
      <img src={image} alt={title} className="w-full h-60 object-cover rounded-lg" />

      <h3 className="mt-3 font-semibold">{title}</h3>
      <p className="text-gray-500">₹{price}</p>

      <button className="mt-3 w-full bg-black text-white py-2 rounded-lg">
        Add to Cart
      </button>
    </div>
  );
}