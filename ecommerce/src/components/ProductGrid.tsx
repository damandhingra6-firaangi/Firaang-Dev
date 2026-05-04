// components/ProductGrid.tsx
"use client";

import { useEffect, useRef, useState, type TouchEventHandler } from "react";
import { ChevronLeft, ChevronRight, Eye, Heart, ShoppingBag } from "lucide-react";
import SafeImage from "@/components/SafeImage";
import { GridProduct } from "@/lib/catalog";
import { convertAmount, formatCurrency, toSupportedCurrency } from "@/lib/currency";
import ProductDetailsModal from "@/components/ProductDetailsModal";
import { getCartCount, getWishlistIds, useShopStore } from "@/store/useShopStore";
import { useUiStore } from "@/store/useUiStore";

type ProductGridProps = {
  products: GridProduct[];
};

const MOBILE_AUTOPLAY_INTERVAL_MS = 4500;
const MOBILE_AUTOPLAY_RESUME_DELAY_MS = 5500;

export default function ProductGrid({ products }: ProductGridProps) {
  const [startIndex, setStartIndex] = useState(0);
  const [cardsPerView, setCardsPerView] = useState(5);
  const [selectedProduct, setSelectedProduct] = useState<GridProduct | null>(null);
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [isAutoplayPaused, setIsAutoplayPaused] = useState(false);
  const resumeAutoplayTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const wishlist = useShopStore((state) => state.wishlist);
  const cart = useShopStore((state) => state.cart);
  const toggleWishlist = useShopStore((state) => state.toggleWishlist);
  const addToCart = useShopStore((state) => state.addToCart);
  const openCart = useUiStore((state) => state.openCart);
  const displayCurrency = useUiStore((state) => state.currency);

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
  const mobilePosition = Math.min(boundedStartIndex + 1, products.length);
  const mobileSlideCount = cardsPerView === 1 ? products.length : maxStart + 1;

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

  const pauseAutoplay = (resumeAfterMs: number) => {
    setIsAutoplayPaused(true);

    if (resumeAutoplayTimeoutRef.current) {
      clearTimeout(resumeAutoplayTimeoutRef.current);
      resumeAutoplayTimeoutRef.current = null;
    }

    if (resumeAfterMs > 0) {
      resumeAutoplayTimeoutRef.current = setTimeout(() => {
        setIsAutoplayPaused(false);
      }, resumeAfterMs);
    }
  };

  useEffect(() => {
    return () => {
      if (resumeAutoplayTimeoutRef.current) {
        clearTimeout(resumeAutoplayTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (cardsPerView !== 1 || !showNavigation || isAutoplayPaused || selectedProduct) {
      return;
    }

    const intervalId = setInterval(() => {
      setStartIndex((current) => (current >= maxStart ? 0 : current + 1));
    }, MOBILE_AUTOPLAY_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [cardsPerView, isAutoplayPaused, maxStart, selectedProduct, showNavigation]);

  const handleTouchStart: TouchEventHandler<HTMLDivElement> = (event) => {
    if (cardsPerView !== 1 || !showNavigation) {
      return;
    }

    pauseAutoplay(0);

    const touch = event.touches[0];
    setTouchStart({ x: touch.clientX, y: touch.clientY });
  };

  const handleTouchEnd: TouchEventHandler<HTMLDivElement> = (event) => {
    if (!touchStart || cardsPerView !== 1 || !showNavigation) {
      return;
    }

    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - touchStart.x;
    const deltaY = touch.clientY - touchStart.y;
    setTouchStart(null);
    pauseAutoplay(MOBILE_AUTOPLAY_RESUME_DELAY_MS);

    const swipeThreshold = 42;
    const isHorizontalSwipe = Math.abs(deltaX) > Math.abs(deltaY);

    if (!isHorizontalSwipe || Math.abs(deltaX) < swipeThreshold) {
      return;
    }

    if (deltaX > 0) {
      goToPrev();
      return;
    }

    goToNext();
  };

  return (
    <section className="bg-[var(--arrivals-bg)] py-16">
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
          className="inline-flex items-center gap-2 rounded-full border border-[var(--gold)] px-4 py-2 text-sm text-[var(--arrivals-card-title)] transition hover:bg-[var(--arrivals-hover)]"
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
              className="absolute -left-3 top-[46%] z-20 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--gold)] text-[var(--gold)] transition hover:bg-[var(--arrivals-hover)] disabled:opacity-40 md:flex"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <button
              type="button"
              aria-label="Next products"
              onClick={goToNext}
              disabled={!canGoNext}
              className="absolute -right-3 top-[46%] z-20 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--gold)] text-[var(--gold)] transition hover:bg-[var(--arrivals-hover)] disabled:opacity-40 md:flex"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </>
        ) : null}

        <div
          className="flex flex-wrap justify-center gap-5"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {visibleProducts.map((p) => (
            <article
              key={p.id}
              className="w-full max-w-[340px] overflow-hidden rounded-[24px] border border-[var(--gold)]/65 bg-[image:var(--arrivals-card-bg)] shadow-[0_16px_36px_rgba(0,0,0,0.28)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_20px_44px_rgba(0,0,0,0.36)] sm:max-w-[300px] xl:max-w-[260px]"
              onClick={() => handleOpenDetails(p)}
            >
            <div className="group relative">
              <SafeImage src={p.img} alt={p.name} className="h-[290px] w-full object-cover sm:h-[330px] md:h-[360px] xl:h-[320px]" />
              <div className="absolute inset-0 opacity-0 transition duration-300 group-hover:opacity-100" style={{ background: 'var(--card-hover-overlay)' }} />
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
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--gold)] bg-[var(--arrivals-action-bg)] text-[var(--arrivals-card-title)]"
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
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--gold)] bg-[var(--arrivals-action-bg)] text-[var(--arrivals-card-title)]"
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
              <h3 className="line-clamp-2 min-h-[44px] font-[var(--font-poppins)] text-[17px] font-semibold leading-[1.3] text-[var(--arrivals-card-title)] md:text-[18px]">
                {p.name}
              </h3>
              <div className="flex items-end gap-3">
                <p className="font-[var(--font-poppins)] text-[30px] leading-none text-[var(--arrivals-price)] md:text-[32px]">
                  {formatCurrency(
                    convertAmount(p.priceAmount, toSupportedCurrency(p.currencyCode), displayCurrency),
                    displayCurrency,
                  )}
                </p>
                {p.oldPrice ? (
                  <p className="font-[var(--font-poppins)] text-[14px] text-[var(--arrivals-old-price)] line-through md:text-[15px]">
                    {formatCurrency(
                      convertAmount(
                        Number.parseFloat(p.oldPrice.replace(/[^\d.]/g, "")) || p.priceAmount,
                        toSupportedCurrency(p.currencyCode),
                        displayCurrency,
                      ),
                      displayCurrency,
                    )}
                  </p>
                ) : null}
              </div>
            </div>
            </article>
          ))}
        </div>

        {showNavigation ? (
          <p className="mt-5 text-center text-xs uppercase tracking-[0.14em] text-[var(--arrivals-muted)] md:hidden">
            Swipe through {products.length} products
          </p>
        ) : null}

        {showNavigation ? (
          <div className="mt-4 flex items-center justify-center gap-3 md:hidden">
            <button
              type="button"
              aria-label="Previous products"
              onClick={() => {
                pauseAutoplay(MOBILE_AUTOPLAY_RESUME_DELAY_MS);
                goToPrev();
              }}
              disabled={!canGoPrev}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--gold)] text-[var(--gold)] transition hover:bg-[var(--arrivals-hover)] disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <p className="min-w-[72px] text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--arrivals-muted)]">
              {mobilePosition}/{products.length}
            </p>

            <button
              type="button"
              aria-label="Next products"
              onClick={() => {
                pauseAutoplay(MOBILE_AUTOPLAY_RESUME_DELAY_MS);
                goToNext();
              }}
              disabled={!canGoNext}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--gold)] text-[var(--gold)] transition hover:bg-[var(--arrivals-hover)] disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        ) : null}

        {showNavigation && cardsPerView === 1 ? (
          <div className="mt-3 flex items-center justify-center gap-2 md:hidden" aria-label="Product pagination">
            {Array.from({ length: mobileSlideCount }).map((_, index) => {
              const isActive = index === boundedStartIndex;

              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => {
                    pauseAutoplay(MOBILE_AUTOPLAY_RESUME_DELAY_MS);
                    setStartIndex(index);
                  }}
                  aria-label={`Go to product ${index + 1}`}
                  aria-current={isActive ? "true" : undefined}
                  className={`h-2.5 rounded-full transition ${
                    isActive
                      ? "w-6 bg-[var(--gold)]"
                      : "w-2.5 bg-[var(--arrivals-dot)] hover:bg-[var(--arrivals-dot-hover)]"
                  }`}
                />
              );
            })}
          </div>
        ) : null}
      </div>

      <ProductDetailsModal
        product={selectedProduct}
        isOpen={selectedProduct !== null}
        isWishlisted={(product) => wishlistIds.has(product.id)}
        onClose={() => setSelectedProduct(null)}
        onToggleWishlist={handleToggleWishlist}
        onAddToCart={handleAddToCart}
      />
    </section>
  );
}