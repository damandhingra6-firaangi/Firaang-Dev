// components/ProductGrid.tsx
"use client";

import { useEffect, useRef, useState, type TouchEventHandler } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import ProductCard from "@/components/ProductCard";
import { GridProduct } from "@/lib/catalog";
import { convertAmount, formatCurrency, toSupportedCurrency } from "@/lib/currency";
import { getWishlistIds, useShopStore } from "@/store/useShopStore";
import { useUiStore } from "@/store/useUiStore";

type ProductGridProps = {
  products: GridProduct[];
};

const AUTOPLAY_INTERVAL_MS = 2800;
const INTERACTION_RESUME_DELAY_MS = 4200;

export default function ProductGrid({ products }: ProductGridProps) {
  const [startIndex, setStartIndex] = useState(0);
  const [cardsPerRow, setCardsPerRow] = useState(5);
  const [rowCount, setRowCount] = useState(3);
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [isAutoplayPaused, setIsAutoplayPaused] = useState(false);
  const resumeAutoplayTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const wishlist = useShopStore((state) => state.wishlist);
  const toggleWishlist = useShopStore((state) => state.toggleWishlist);
  const addToCart = useShopStore((state) => state.addToCart);
  const openCart = useUiStore((state) => state.openCart);
  const displayCurrency = useUiStore((state) => state.currency);
  const router = useRouter();

  const wishlistIds = getWishlistIds(wishlist);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1536) {
        setCardsPerRow(5);
        setRowCount(3);
        return;
      }

      if (window.innerWidth >= 1280) {
        setCardsPerRow(5);
        setRowCount(3);
        return;
      }

      if (window.innerWidth >= 1024) {
        setCardsPerRow(5);
        setRowCount(3);
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
  const rowStyles = [
    { backgroundColor: "#F4FCFF", borderColor: "#00BDFF" },
    { backgroundColor: "#F9F4FF", borderColor: "#7616FA" },
    { backgroundColor: "#F6FFFC", borderColor: "#0ACF83" },
  ];

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
    const routeKey = product.handle?.trim() || product.id;
    router.push(`/product/${encodeURIComponent(routeKey)}`);
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
    if (!showNavigation || isAutoplayPaused) {
      return;
    }

    const intervalId = setInterval(() => {
      setStartIndex((current) => (current + advanceStep) % discoveryProducts.length);
    }, AUTOPLAY_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [advanceStep, discoveryProducts.length, isAutoplayPaused, showNavigation]);

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
    <section className="bg-white py-12 md:py-14 xl:py-16">
      <div className="home-shell">
        <div className="mb-7 flex items-end justify-between gap-5 md:mb-9">
          <div>
            <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.06em] text-[#2f2f2f] md:text-[12px]">
              FRESH FINDS FOR THE SEASON
            </p>
            <h2 className="mt-1 font-sans text-[40px] font-semibold leading-[1.06] tracking-[-0.01em] text-[#000000] md:text-[52px]">
              New Arrivals
            </h2>
          </div>

          <Link
            href="/shop"
            className="inline-flex h-[40px] min-w-[132px] items-center justify-center rounded-[5px] border border-[#5a5a5a] px-6 font-sans text-[14px] font-medium uppercase tracking-[0.02em] text-[#353535] transition hover:bg-white md:text-[15px]"
          >
            VIEW ALL
          </Link>
        </div>

        <div className="relative" onMouseEnter={() => pauseAutoplay(0)} onMouseLeave={() => pauseAutoplay(120)}>
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
          className="space-y-3 md:space-y-3.5"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {rows.map((row, rowIndex) => (
            <div
              key={`product-row-${rowIndex}`}
              className="grid gap-2.5 sm:gap-3 md:gap-3.5"
              style={{ gridTemplateColumns: `repeat(${cardsPerRow}, minmax(0, 1fr))` }}
            >
              {row.map((p, productIndex) => {
                const currentPrice = formatCurrency(
                  convertAmount(p.priceAmount, toSupportedCurrency(p.currencyCode), displayCurrency),
                  displayCurrency,
                );

                const oldPrice = p.oldPrice
                  ? formatCurrency(
                      convertAmount(
                        Number.parseFloat(p.oldPrice.replace(/[^\d.]/g, "")) || p.priceAmount,
                        toSupportedCurrency(p.currencyCode),
                        displayCurrency,
                      ),
                      displayCurrency,
                    )
                  : undefined;

                return (
                  <ProductCard
                    key={`${p.id}-${rowIndex}-${productIndex}`}
                    title={p.name}
                    image={p.img}
                    currentPrice={currentPrice}
                    oldPrice={oldPrice}
                    isNew={p.tags?.some((tag) => /\bnew\b/i.test(tag))}
                    borderColor={rowStyles[rowIndex % rowStyles.length].borderColor}
                    backgroundColor={rowStyles[rowIndex % rowStyles.length].backgroundColor}
                    isWishlisted={wishlistIds.has(p.id)}
                    onOpenDetails={() => handleOpenDetails(p)}
                    onQuickView={() => handleOpenDetails(p)}
                    onToggleWishlist={() => handleToggleWishlist(p)}
                    onAddToCart={() => handleAddToCart(p)}
                  />
                );
              })}
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
    </section>
  );
}