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

const AUTOPLAY_INTERVAL_MS = 2800;
const INTERACTION_RESUME_DELAY_MS = 4200;

export default function ProductGrid({ products }: ProductGridProps) {
  const [startIndex, setStartIndex] = useState(0);
  const [cardsPerRow, setCardsPerRow] = useState(6);
  const [rowCount, setRowCount] = useState(2);
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
      if (window.innerWidth >= 1536) {
        setCardsPerRow(6);
        setRowCount(2);
        return;
      }

      if (window.innerWidth >= 1280) {
        setCardsPerRow(5);
        setRowCount(2);
        return;
      }

      if (window.innerWidth >= 1024) {
        setCardsPerRow(5);
        setRowCount(2);
        return;
      }

      if (window.innerWidth >= 900) {
        setCardsPerRow(4);
        setRowCount(2);
        return;
      }

      if (window.innerWidth >= 768) {
        setCardsPerRow(3);
        setRowCount(2);
        return;
      }

      setCardsPerRow(2);
      setRowCount(1);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const discoveryProducts = (() => {
    if (products.length <= 1) {
      return products;
    }

    const buckets = new Map<string, GridProduct[]>();

    for (const product of products) {
      const categoryKey = product.category?.trim() || product.subCategory?.trim() || "Other";
      const existing = buckets.get(categoryKey) ?? [];
      existing.push(product);
      buckets.set(categoryKey, existing);
    }

    const categoryOrder = Array.from(buckets.keys());
    const mixed: GridProduct[] = [];
    let hasPending = true;

    while (hasPending) {
      hasPending = false;

      for (const category of categoryOrder) {
        const queue = buckets.get(category);
        const nextProduct = queue?.shift();

        if (nextProduct) {
          mixed.push(nextProduct);
          hasPending = true;
        }
      }
    }

    return mixed;
  })();

  const totalSlots = cardsPerRow * rowCount;
  const hasMultipleProducts = discoveryProducts.length > 1;
  const showNavigation = hasMultipleProducts;
  const advanceStep = rowCount > 1 ? cardsPerRow : 1;
  const mobileStepCount =
    discoveryProducts.length === 0
      ? 0
      : rowCount > 1
        ? Math.ceil(discoveryProducts.length / cardsPerRow)
        : discoveryProducts.length;
  const mobilePosition =
    discoveryProducts.length === 0
      ? 0
      : rowCount > 1
        ? Math.floor(startIndex / cardsPerRow) + 1
        : (startIndex % discoveryProducts.length) + 1;

  const visibleProducts =
    discoveryProducts.length === 0
      ? []
      : Array.from({ length: totalSlots }, (_, offset) => {
          const index = (startIndex + offset) % discoveryProducts.length;
          return discoveryProducts[index];
        });

  const rows = Array.from({ length: rowCount }, (_, rowIndex) =>
    visibleProducts.slice(rowIndex * cardsPerRow, rowIndex * cardsPerRow + cardsPerRow),
  );

  const goToPrev = () => {
    if (!hasMultipleProducts) {
      return;
    }

    setStartIndex((current) =>
      (current - advanceStep + discoveryProducts.length) % discoveryProducts.length,
    );
  };

  const goToNext = () => {
    if (!hasMultipleProducts) {
      return;
    }

    setStartIndex((current) => (current + advanceStep) % discoveryProducts.length);
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

  const handleModalAddToCart = (product: GridProduct) => {
    addToCart(product);
  };

  const handleModalBuyNow = (product: GridProduct) => {
    addToCart(product);
    setSelectedProduct(null);
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
    if (!showNavigation || isAutoplayPaused || selectedProduct) {
      return;
    }

    const intervalId = setInterval(() => {
      setStartIndex((current) => (current + advanceStep) % discoveryProducts.length);
    }, AUTOPLAY_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [advanceStep, discoveryProducts.length, isAutoplayPaused, selectedProduct, showNavigation]);

  const handleTouchStart: TouchEventHandler<HTMLDivElement> = (event) => {
    if (cardsPerRow !== 2 || rowCount !== 1 || !showNavigation) {
      return;
    }

    pauseAutoplay(0);

    const touch = event.touches[0];
    setTouchStart({ x: touch.clientX, y: touch.clientY });
  };

  const handleTouchEnd: TouchEventHandler<HTMLDivElement> = (event) => {
    if (!touchStart || cardsPerRow !== 2 || rowCount !== 1 || !showNavigation) {
      return;
    }

    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - touchStart.x;
    const deltaY = touch.clientY - touchStart.y;
    setTouchStart(null);
    pauseAutoplay(INTERACTION_RESUME_DELAY_MS);

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
    <section className="bg-[var(--arrivals-bg)] py-12 md:py-14 xl:py-16">
      <div className="mx-auto w-full max-w-[1680px] px-2 sm:px-3 md:px-4 lg:px-6">
        <h2 className="mb-2 text-center text-3xl md:text-4xl">New Arrivals</h2>
        <p className="text-center text-[11px] uppercase tracking-[0.12em] text-[var(--gold)]">
          Fresh Finds for the Season
        </p>
        <img
          src="/GoldenArrow.svg"
          alt="Decorative golden divider"
          className="mx-auto mb-8 mt-3 w-[156px]"
        />

        <div className="mb-4 flex justify-end md:mb-5">
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

        <div
          className="relative"
          onMouseEnter={() => pauseAutoplay(0)}
          onMouseLeave={() => pauseAutoplay(120)}
        >
        {showNavigation ? (
          <>
            <button
              type="button"
              aria-label="Previous products"
              onClick={goToPrev}
              className="absolute left-0 top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--gold)] bg-[var(--arrivals-action-bg)] text-[var(--gold)] shadow-sm transition hover:bg-[var(--arrivals-hover)] md:flex"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <button
              type="button"
              aria-label="Next products"
              onClick={goToNext}
              className="absolute right-0 top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--gold)] bg-[var(--arrivals-action-bg)] text-[var(--gold)] shadow-sm transition hover:bg-[var(--arrivals-hover)] md:flex"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </>
        ) : null}

        <div
          className="space-y-3 md:space-y-4"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {rows.map((row, rowIndex) => (
            <div
              key={`product-row-${rowIndex}`}
              className="grid gap-2.5 sm:gap-3 md:gap-4"
              style={{ gridTemplateColumns: `repeat(${cardsPerRow}, minmax(0, 1fr))` }}
            >
              {row.map((p, productIndex) => (
                <article
                  key={`${p.id}-${rowIndex}-${productIndex}`}
                  className="group overflow-hidden rounded-[18px] border border-[var(--gold)]/65 bg-[image:var(--arrivals-card-bg)] shadow-[0_10px_28px_rgba(0,0,0,0.18)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_32px_rgba(0,0,0,0.26)]"
                  onClick={() => handleOpenDetails(p)}
                >
                  <div className="relative overflow-hidden">
                    <SafeImage
                      src={p.img}
                      alt={p.name}
                      className="h-[190px] w-full object-cover transition duration-500 group-hover:scale-105 sm:h-[220px] md:h-[240px] lg:h-[250px]"
                    />
                    <div
                      className="absolute inset-0 opacity-0 transition duration-300 group-hover:opacity-100"
                      style={{ background: "var(--card-hover-overlay)" }}
                    />

                    <div className="absolute inset-x-2 bottom-2 flex translate-y-2 items-center justify-center gap-2 opacity-0 transition duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                      <button
                        type="button"
                        aria-label={`Quick view ${p.name}`}
                        className="inline-flex h-9 items-center justify-center rounded-full bg-[var(--gold)] px-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#3b0810]"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleOpenDetails(p);
                        }}
                      >
                        <Eye className="mr-1.5 h-3.5 w-3.5" />
                        Quick View
                      </button>

                      <button
                        type="button"
                        aria-label={`Add ${p.name} to wishlist`}
                        className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--gold)] bg-[var(--arrivals-action-bg)] text-[var(--arrivals-card-title)]"
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
                        className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--gold)] bg-[var(--arrivals-action-bg)] text-[var(--arrivals-card-title)]"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleAddToCart(p);
                        }}
                      >
                        <ShoppingBag className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5 p-3 md:p-3.5">
                    <h3 className="line-clamp-2 min-h-[40px] text-[15px] font-semibold leading-[1.28] text-[var(--arrivals-card-title)] md:min-h-[44px] md:text-[16px]">
                      {p.name}
                    </h3>

                    <div className="flex items-end gap-2 md:gap-2.5">
                      <p className="text-[31px] leading-none text-[var(--arrivals-price)] md:text-[33px]">
                        {formatCurrency(
                          convertAmount(p.priceAmount, toSupportedCurrency(p.currencyCode), displayCurrency),
                          displayCurrency,
                        )}
                      </p>

                      {p.oldPrice ? (
                        <p className="mb-0.5 text-[13px] text-[var(--arrivals-old-price)] line-through md:text-[14px]">
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
          ))}
        </div>

        {showNavigation ? (
          <p className="mt-4 text-center text-xs uppercase tracking-[0.14em] text-[var(--arrivals-muted)] md:hidden">
            Swipe through {discoveryProducts.length} products
          </p>
        ) : null}

        {showNavigation ? (
          <div className="mt-4 flex items-center justify-center gap-3 md:hidden">
            <button
              type="button"
              aria-label="Previous products"
              onClick={() => {
                pauseAutoplay(INTERACTION_RESUME_DELAY_MS);
                goToPrev();
              }}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--gold)] text-[var(--gold)] transition hover:bg-[var(--arrivals-hover)]"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <p className="min-w-[72px] text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--arrivals-muted)]">
              {mobilePosition}/{mobileStepCount}
            </p>

            <button
              type="button"
              aria-label="Next products"
              onClick={() => {
                pauseAutoplay(INTERACTION_RESUME_DELAY_MS);
                goToNext();
              }}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--gold)] text-[var(--gold)] transition hover:bg-[var(--arrivals-hover)]"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        ) : null}

        {showNavigation && rowCount === 1 && cardsPerRow === 2 ? (
          <div className="mt-3 flex items-center justify-center gap-2 md:hidden" aria-label="Product pagination">
            {Array.from({ length: discoveryProducts.length }).map((_, index) => {
              const isActive = index === startIndex;

              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => {
                    pauseAutoplay(INTERACTION_RESUME_DELAY_MS);
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
      </div>

      <ProductDetailsModal
        product={selectedProduct}
        isOpen={selectedProduct !== null}
        isWishlisted={(product) => wishlistIds.has(product.id)}
        onClose={() => setSelectedProduct(null)}
        onToggleWishlist={handleToggleWishlist}
        onAddToCart={handleModalAddToCart}
        onBuyNow={handleModalBuyNow}
      />
    </section>
  );
}