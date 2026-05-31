export type ProductVariantOption = {
  name: string;
  value: string;
};

export type ProductOptionGroup = {
  name: string;
  values: string[];
};

export type ProductSizeChart = {
  headers: string[];
  rows: string[][];
  note?: string;
};

export type ProductMedia = {
  type: "image" | "video";
  src: string;
  thumbnail?: string;
  alt?: string;
};

export type ProductVariant = {
  id: string;
  name: string;
  availableForSale: boolean;
  img: string;
  price: string;
  priceAmount: number;
  currencyCode: string;
  oldPrice: string;
  options: ProductVariantOption[];
};

export type GridProduct = {
  id: string;
  parentId?: string;
  handle?: string;
  tags?: string[];
  category?: string;
  categorySlug?: string;
  subCategory?: string;
  subCategorySlug?: string;
  audience?: string;
  audienceSlug?: string;
  name: string;
  price: string;
  priceAmount: number;
  currencyCode: string;
  oldPrice: string;
  img: string;
  galleryImages?: string[];
  productMedia?: ProductMedia[];
  description: string;
  optionGroups?: ProductOptionGroup[];
  sizeChart?: ProductSizeChart;
  variants?: ProductVariant[];
};

export const fallbackProducts: GridProduct[] = [
  {
    id: "fallback-1",
    name: "Bohemian Maxi Dress",
    category: "Dresses",
    categorySlug: "dresses",
    subCategory: "Bohemian Dresses",
    subCategorySlug: "bohemian-dresses",
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
    category: "Jewelry",
    categorySlug: "jewelry",
    subCategory: "Pendant",
    subCategorySlug: "pendant",
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
    category: "Ethnic Wear",
    categorySlug: "ethnic-wear",
    subCategory: "Palazzo Set",
    subCategorySlug: "palazzo-set",
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
    category: "Jewelry",
    categorySlug: "jewelry",
    subCategory: "Gemstone Jewelry",
    subCategorySlug: "gemstone-jewelry",
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
    category: "Dresses",
    categorySlug: "dresses",
    subCategory: "Evening Gown",
    subCategorySlug: "evening-gown",
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
    category: "Jewelry",
    categorySlug: "jewelry",
    subCategory: "Kundan Jewelry",
    subCategorySlug: "kundan-jewelry",
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
    category: "Ethnic Wear",
    categorySlug: "ethnic-wear",
    subCategory: "Kurta Set",
    subCategorySlug: "kurta-set",
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
    category: "Dresses",
    categorySlug: "dresses",
    subCategory: "Draped Dress",
    subCategorySlug: "draped-dress",
    price: "₹13,999",
    priceAmount: 13999,
    currencyCode: "INR",
    oldPrice: "₹17,999",
    img: "/hero.jpg",
    description: "Bold draped silhouette in a rich scarlet shade, made for standout celebratory moments.",
  },
];
