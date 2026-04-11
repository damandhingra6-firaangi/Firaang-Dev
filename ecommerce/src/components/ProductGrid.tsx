// components/ProductGrid.tsx
"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Eye, Heart, ShoppingBag } from "lucide-react";
import { GridProduct } from "@/lib/catalog";
import ProductDetailsModal from "@/components/ProductDetailsModal";
import { getCartCount, getWishlistIds, useShopStore } from "@/store/useShopStore";
import { useUiStore } from "@/store/useUiStore";

type ProductGridProps = {
  products: GridProduct[];
};

export default function ProductGrid({ products }: ProductGridProps) {
  const [startIndex, setStartIndex] = useState(0);
  const [cardsPerView, setCardsPerView] = useState(5);
  const [selectedProduct, setSelectedProduct] = useState<GridProduct | null>(null);

  const wishlist = useShopStore((state) => state.wishlist);
  const cart = useShopStore((state) => state.cart);
  const toggleWishlist = useShopStore((state) => state.toggleWishlist);
  const addToCart = useShopStore((state) => state.addToCart);
  const openCart = useUiStore((state) => state.openCart);

  const wishlistIds = getWishlistIds(wishlist);
  const cartCount = getCartCount(cart);

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

  const maxStart = Math.max(products.length - cardsPerView, 0);
  const boundedStartIndex = Math.min(startIndex, maxStart);
  const canGoPrev = boundedStartIndex > 0;
  const canGoNext = boundedStartIndex < maxStart;
  const showNavigation = products.length > cardsPerView;

  const visibleProducts = products.slice(boundedStartIndex, boundedStartIndex + cardsPerView);

  const goToPrev = () => {
    if (!canGoPrev) {
      return;
    }
    setStartIndex((current) => Math.max(Math.min(current, maxStart) - 1, 0));
  };

  const goToNext = () => {
    if (!canGoNext) {
      return;
    }
    setStartIndex((current) => Math.min(Math.min(current, maxStart) + 1, maxStart));
  };

  const handleOpenDetails = (product: GridProduct) => {
    setSelectedProduct(product);
  };

  const handleToggleWishlist = (product: GridProduct) => {
    toggleWishlist(product);
  };

  const handleAddToCart = (product: GridProduct) => {
    addToCart(product);
    openCart();
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

      <div className="section-shell mb-6 flex justify-end">
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-full border border-[var(--gold)] px-4 py-2 text-sm text-white transition hover:bg-[#55121a]"
          onClick={openCart}
          aria-label="Open cart"
        >
          <ShoppingBag className="h-4 w-4 text-[var(--gold)]" />
          Cart ({cartCount})
        </button>
      </div>

      <div className="section-shell relative">
        {showNavigation ? (
          <>
            <button
              type="button"
              aria-label="Previous products"
              onClick={goToPrev}
              disabled={!canGoPrev}
              className="absolute -left-3 top-[46%] z-20 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--gold)] text-[var(--gold)] transition hover:bg-[#4d1018] disabled:opacity-40 md:flex"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <button
              type="button"
              aria-label="Next products"
              onClick={goToNext}
              disabled={!canGoNext}
              className="absolute -right-3 top-[46%] z-20 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--gold)] text-[var(--gold)] transition hover:bg-[#4d1018] disabled:opacity-40 md:flex"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </>
        ) : null}

        <div className="flex flex-wrap justify-center gap-5">
          {visibleProducts.map((p) => (
            <article
              key={p.id}
              className="w-full max-w-[340px] overflow-hidden rounded-[24px] border border-[var(--gold)]/65 bg-gradient-to-b from-[#5c0f19] to-[#3a070d] shadow-[0_16px_36px_rgba(0,0,0,0.28)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_20px_44px_rgba(0,0,0,0.36)] sm:max-w-[300px] xl:max-w-[260px]"
              onClick={() => handleOpenDetails(p)}
            >
            <div className="group relative">
              <img src={p.img} alt={p.name} className="h-[290px] w-full object-cover sm:h-[330px] md:h-[360px] xl:h-[320px]" />
              <div className="absolute inset-0 bg-black/25 opacity-0 transition duration-300 group-hover:opacity-100" />
              <div className="absolute inset-0 flex items-center justify-center gap-3 opacity-0 transition duration-300 group-hover:opacity-100">
                <button
                  type="button"
                  aria-label={`Quick view ${p.name}`}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--gold)] text-[#3b0810]"
                  onClick={(event) => {
                    event.stopPropagation();
                    handleOpenDetails(p);
                  }}
                >
                  <Eye className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label={`Add ${p.name} to wishlist`}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--gold)] bg-[#2b060b] text-white"
                  onClick={(event) => {
                    event.stopPropagation();
                    handleToggleWishlist(p);
                  }}
                >
                  <Heart
                    className={`h-4 w-4 ${wishlistIds.has(p.id) ? "fill-[var(--gold)] text-[var(--gold)]" : ""}`}
                  />
                </button>
                <button
                  type="button"
                  aria-label={`Add ${p.name} to cart`}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--gold)] bg-[#2b060b] text-white"
                  onClick={(event) => {
                    event.stopPropagation();
                    handleAddToCart(p);
                  }}
                >
                  <ShoppingBag className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="space-y-2 p-4 pb-5 md:p-5">
              <h3 className="line-clamp-2 min-h-[44px] font-[var(--font-poppins)] text-[17px] font-semibold leading-[1.3] md:text-[18px]">
                {p.name}
              </h3>
              <div className="flex items-end gap-3">
                <p className="font-[var(--font-poppins)] text-[30px] leading-none text-white md:text-[32px]">{p.price}</p>
                {p.oldPrice ? <p className="font-[var(--font-poppins)] text-[14px] text-[#d5bdb9] line-through md:text-[15px]">{p.oldPrice}</p> : null}
              </div>
            </div>
            </article>
          ))}
        </div>

        {showNavigation ? (
          <p className="mt-5 text-center text-xs uppercase tracking-[0.14em] text-[#d8bbb6] md:hidden">
            Swipe through {products.length} products
          </p>
        ) : null}
      </div>

      <ProductDetailsModal
        product={selectedProduct}
        isOpen={selectedProduct !== null}
        isWishlisted={selectedProduct ? wishlistIds.has(selectedProduct.id) : false}
        onClose={() => setSelectedProduct(null)}
        onToggleWishlist={handleToggleWishlist}
        onAddToCart={handleAddToCart}
      />
    </section>
  );
}