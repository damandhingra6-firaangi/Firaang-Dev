// components/ProductGrid.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Eye, Heart, ShoppingBag } from "lucide-react";

const products = [
  { name: "Bohemian Maxi Dress", price: "₹12,999", oldPrice: "₹18,999", img: "/cat1.jpg" },
  { name: "Celestial Drop Pendant", price: "₹4,999", oldPrice: "₹6,999", img: "/cat2.jpg" },
  { name: "Palazzo Fusion Set", price: "₹6,999", oldPrice: "₹9,999", img: "/hero.jpg" },
  { name: "Gemstone", price: "₹12,999", oldPrice: "₹18,999", img: "/cat4.jpg" },
  { name: "Luxe Evening Gown", price: "₹15,999", oldPrice: "", img: "/cat3.jpg" },
  { name: "Royal Kundan Collar", price: "₹10,999", oldPrice: "₹14,999", img: "/cat2.jpg" },
  { name: "Midnight Kurta Set", price: "₹8,499", oldPrice: "₹11,999", img: "/cat3.jpg" },
  { name: "Scarlet Draped Dress", price: "₹13,999", oldPrice: "₹17,999", img: "/hero.jpg" },
];

export default function ProductGrid() {
  const [startIndex, setStartIndex] = useState(0);
  const [cardsPerView, setCardsPerView] = useState(5);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1280) {
        setCardsPerView(5);
        return;
      }
      if (window.innerWidth >= 768) {
        setCardsPerView(3);
        return;
      }
      setCardsPerView(1);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const maxStart = Math.max(products.length - cardsPerView, 0);
    setStartIndex((current) => Math.min(current, maxStart));
  }, [cardsPerView]);

  const maxStart = Math.max(products.length - cardsPerView, 0);
  const canGoPrev = startIndex > 0;
  const canGoNext = startIndex < maxStart;

  const visibleProducts = useMemo(
    () => products.slice(startIndex, startIndex + cardsPerView),
    [startIndex, cardsPerView]
  );

  const goToPrev = () => {
    if (!canGoPrev) {
      return;
    }
    setStartIndex((current) => Math.max(current - 1, 0));
  };

  const goToNext = () => {
    if (!canGoNext) {
      return;
    }
    setStartIndex((current) => Math.min(current + 1, maxStart));
  };

  return (
    <section className="bg-[var(--secondary)] py-16">
      <h2 className="text-center text-3xl mb-2 md:text-4xl">New Arrivals</h2>
      <p className="text-center text-[11px] uppercase tracking-[0.12em] text-[var(--gold)]">
        Fresh Finds for the Season
      </p>
      <img
        src="/GoldenArrow.svg"
        alt="Decorative golden divider"
        className="mx-auto mb-12 mt-3 w-[156px]"
      />

      <div className="section-shell relative">
        <button
          type="button"
          aria-label="Previous products"
          onClick={goToPrev}
          disabled={!canGoPrev}
          className="absolute -left-3 top-[46%] z-20 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--gold)] text-[var(--gold)] transition disabled:opacity-40 xl:flex"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <button
          type="button"
          aria-label="Next products"
          onClick={goToNext}
          disabled={!canGoNext}
          className="absolute -right-3 top-[46%] z-20 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--gold)] text-[var(--gold)] transition disabled:opacity-40 xl:flex"
        >
          <ChevronRight className="h-4 w-4" />
        </button>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 xl:gap-5">
          {visibleProducts.map((p, i) => (
            <article key={`${p.name}-${i}`} className="overflow-hidden rounded-[22px] border border-[var(--gold)]/70 bg-[#4a0b12]">
            <div className="group relative">
              <img src={p.img} alt={p.name} className="h-[420px] w-full object-cover xl:h-[440px]" />
              <div className="absolute inset-0 bg-black/25 opacity-0 transition duration-300 group-hover:opacity-100" />
              <div className="absolute inset-0 flex items-center justify-center gap-3 opacity-0 transition duration-300 group-hover:opacity-100">
                <button
                  aria-label={`Quick view ${p.name}`}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--gold)] text-[#3b0810]"
                >
                  <Eye className="h-4 w-4" />
                </button>
                <button
                  aria-label={`Add ${p.name} to wishlist`}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--gold)] bg-[#2b060b] text-white"
                >
                  <Heart className="h-4 w-4" />
                </button>
                <button
                  aria-label={`Add ${p.name} to cart`}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--gold)] bg-[#2b060b] text-white"
                >
                  <ShoppingBag className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="space-y-1 p-3 pb-4 md:p-4 md:pb-5">
              <h3 className="font-[var(--font-poppins)] text-[16px] font-medium leading-[1.3] md:text-[17px]">
                {p.name}
              </h3>
              <div className="flex items-end gap-3">
                <p className="font-[var(--font-poppins)] text-[22px] leading-none text-white md:text-[23px]">{p.price}</p>
                {p.oldPrice ? <p className="font-[var(--font-poppins)] text-[14px] text-[#d5bdb9] line-through md:text-[15px]">{p.oldPrice}</p> : null}
              </div>
            </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}