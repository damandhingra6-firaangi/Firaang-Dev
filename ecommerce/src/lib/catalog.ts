export type GridProduct = {
  id: string;
  name: string;
  price: string;
  priceAmount: number;
  currencyCode: string;
  oldPrice: string;
  img: string;
  description: string;
};

export const fallbackProducts: GridProduct[] = [
  {
    id: "fallback-1",
    name: "Bohemian Maxi Dress",
    price: "₹12,999",
    priceAmount: 12999,
    currencyCode: "INR",
    oldPrice: "₹18,999",
    img: "/cat1.jpg",
    description: "A flowing silhouette with artisan embroidery and lightweight comfort for festive evenings.",
  },
  {
    id: "fallback-2",
    name: "Celestial Drop Pendant",
    price: "₹4,999",
    priceAmount: 4999,
    currencyCode: "INR",
    oldPrice: "₹6,999",
    img: "/cat2.jpg",
    description: "Elegant handcrafted pendant with celestial detailing, designed to elevate everyday looks.",
  },
  {
    id: "fallback-3",
    name: "Palazzo Fusion Set",
    price: "₹6,999",
    priceAmount: 6999,
    currencyCode: "INR",
    oldPrice: "₹9,999",
    img: "/hero.jpg",
    description: "Contemporary fusion set with soft drape and versatile styling for day-to-night wear.",
  },
  {
    id: "fallback-4",
    name: "Gemstone",
    price: "₹12,999",
    priceAmount: 12999,
    currencyCode: "INR",
    oldPrice: "₹18,999",
    img: "/cat4.jpg",
    description: "Statement accessory inspired by traditional textures and modern luxury aesthetics.",
  },
  {
    id: "fallback-5",
    name: "Luxe Evening Gown",
    price: "₹15,999",
    priceAmount: 15999,
    currencyCode: "INR",
    oldPrice: "",
    img: "/cat3.jpg",
    description: "A dramatic evening profile with rich fabric movement and flattering structured tailoring.",
  },
  {
    id: "fallback-6",
    name: "Royal Kundan Collar",
    price: "₹10,999",
    priceAmount: 10999,
    currencyCode: "INR",
    oldPrice: "₹14,999",
    img: "/cat2.jpg",
    description: "Ornate kundan work with a regal finish, crafted to anchor your festive wardrobe.",
  },
  {
    id: "fallback-7",
    name: "Midnight Kurta Set",
    price: "₹8,499",
    priceAmount: 8499,
    currencyCode: "INR",
    oldPrice: "₹11,999",
    img: "/cat3.jpg",
    description: "Refined kurta set in deep tones with clean lines and subtle festive detailing.",
  },
  {
    id: "fallback-8",
    name: "Scarlet Draped Dress",
    price: "₹13,999",
    priceAmount: 13999,
    currencyCode: "INR",
    oldPrice: "₹17,999",
    img: "/hero.jpg",
    description: "Bold draped silhouette in a rich scarlet shade, made for standout celebratory moments.",
  },
];
