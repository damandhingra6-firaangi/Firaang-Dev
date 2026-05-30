"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Heart, ShoppingBag } from "lucide-react";
import { GridProduct } from "@/lib/catalog";
import { convertAmount, formatCurrency, toSupportedCurrency } from "@/lib/currency";
import { buildCategoryTree, matchesAudienceFilter, slugify } from "@/lib/product-taxonomy";
import ProductDetailsModal from "@/components/ProductDetailsModal";
import SafeImage from "@/components/SafeImage";
import { getWishlistIds, useShopStore } from "@/store/useShopStore";
import { useUiStore } from "@/store/useUiStore";

type ShopListingProps = {
  products: GridProduct[];
  initialQuery?: string;
  initialCategory?: string;
  initialSubCategory?: string;
  initialAudience?: string;
};

export default function ShopListing({
  products,
  initialQuery = "",
  initialCategory = "",
  initialSubCategory = "",
  initialAudience = "",
}: ShopListingProps) {
  const [query, setQuery] = useState(initialQuery);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [selectedSubCategory, setSelectedSubCategory] = useState(initialSubCategory);
  const [selectedAudience, setSelectedAudience] = useState(initialAudience);
  const [selectedProduct, setSelectedProduct] = useState<GridProduct | null>(null);
  const wishlist = useShopStore((state) => state.wishlist);
  const toggleWishlist = useShopStore((state) => state.toggleWishlist);
  const addToCart = useShopStore((state) => state.addToCart);
  const openCart = useUiStore((state) => state.openCart);
  const displayCurrency = useUiStore((state) => state.currency);
  const router = useRouter();
  const pathname = usePathname();

  const wishlistIds = getWishlistIds(wishlist);
  const categoryTree = useMemo(() => buildCategoryTree(products), [products]);
  const availableAudiences = useMemo(() => {
    const priority = ["boys", "girls", "unisex"] as const;
    const defaultLabels: Record<(typeof priority)[number], string> = {
      boys: "Boys",
      girls: "Girls",
      unisex: "Unisex",
    };
    const bySlug = new Map<string, string>();

    for (const slug of priority) {
      bySlug.set(slug, defaultLabels[slug]);
    }

    for (const product of products) {
      const audience = product.audience?.trim();

      if (audience) {
        bySlug.set(audience.toLowerCase(), audience);
      }
    }

    if (selectedAudience.trim()) {
      const selectedSlug = selectedAudience.trim().toLowerCase();
      const selectedLabel = selectedAudience
        .trim()
        .split("-")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");

      if (!bySlug.has(selectedSlug)) {
        bySlug.set(selectedSlug, selectedLabel);
      }
    }

    return Array.from(bySlug.entries())
      .sort(([aSlug, aLabel], [bSlug, bLabel]) => {
        const aIndex = priority.indexOf(aSlug as (typeof priority)[number]);
        const bIndex = priority.indexOf(bSlug as (typeof priority)[number]);

        if (aIndex !== -1 || bIndex !== -1) {
          return (aIndex === -1 ? Number.MAX_SAFE_INTEGER : aIndex) - (bIndex === -1 ? Number.MAX_SAFE_INTEGER : bIndex);
        }

        return aLabel.localeCompare(bLabel);
      })
      .map(([, label]) => label);
  }, [products, selectedAudience]);

  useEffect(() => {
    setQuery((prev) => (prev === initialQuery ? prev : initialQuery));
    setSelectedCategory((prev) => (prev === initialCategory ? prev : initialCategory));
    setSelectedSubCategory((prev) => (prev === initialSubCategory ? prev : initialSubCategory));
    setSelectedAudience((prev) => (prev === initialAudience ? prev : initialAudience));
  }, [initialAudience, initialCategory, initialQuery, initialSubCategory]);

  const selectedCategoryNode = useMemo(() => {
    if (!selectedCategory) {
      return null;
    }

    return categoryTree.find(
      (category) =>
        category.slug.toLowerCase() === selectedCategory.toLowerCase() ||
        category.name.toLowerCase() === selectedCategory.toLowerCase()
    ) ?? null;
  }, [categoryTree, selectedCategory]);

  const availableSubCategories = selectedCategoryNode?.subCategories ?? [];

  useEffect(() => {
    if (!selectedCategoryNode) {
      if (selectedSubCategory) {
        setSelectedSubCategory("");
      }
      return;
    }

    const hasSelectedSubCategory = availableSubCategories.some(
      (subCategory) =>
        subCategory.slug.toLowerCase() === selectedSubCategory.toLowerCase() ||
        subCategory.name.toLowerCase() === selectedSubCategory.toLowerCase()
    );

    if (!hasSelectedSubCategory && selectedSubCategory) {
      setSelectedSubCategory("");
    }
  }, [availableSubCategories, selectedCategoryNode, selectedSubCategory]);

  useEffect(() => {
    // Check if we're on a SEO route (e.g., /shop/t-shirts/gen-z-t-shirts)
    const isSeoPatterRoute = pathname !== "/shop";

    if (isSeoPatterRoute && selectedCategory && selectedSubCategory) {
      // We're on a SEO route - navigate to new SEO URL when categories change
      const categorySlug = slugify(selectedCategory);
      const subCategorySlug = slugify(selectedSubCategory);

      const params = new URLSearchParams();
      if (query.trim()) {
        params.set("q", query.trim());
      }
      if (selectedAudience) {
        params.set("audience", selectedAudience);
      }

      const queryString = params.toString();
      const seoUrl = `/shop/${categorySlug}/${subCategorySlug}${queryString ? `?${queryString}` : ""}`;
      router.replace(seoUrl, { scroll: false });
    } else if (!isSeoPatterRoute) {
      // We're on the base /shop page - use query params
      const params = new URLSearchParams();

      if (query.trim()) {
        params.set("q", query.trim());
      }

      if (selectedCategory) {
        params.set("category", selectedCategory);
      }

      if (selectedSubCategory) {
        params.set("subCategory", selectedSubCategory);
      }

      if (selectedAudience) {
        params.set("audience", selectedAudience);
      }

      const queryString = params.toString();
      const nextUrl = queryString ? `${pathname}?${queryString}` : pathname;
      router.replace(nextUrl, { scroll: false });
    }
  }, [pathname, query, router, selectedAudience, selectedCategory, selectedSubCategory]);

  const filteredProducts = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const normalizedCategory = selectedCategory.trim().toLowerCase();
    const normalizedSubCategory = selectedSubCategory.trim().toLowerCase();
    const normalizedAudience = selectedAudience.trim().toLowerCase();

    return products.filter((product) => {
      const categoryMatch =
        !normalizedCategory ||
        product.categorySlug?.toLowerCase() === normalizedCategory ||
        product.category?.toLowerCase() === normalizedCategory;

      const subCategoryMatch =
        !normalizedSubCategory ||
        product.subCategorySlug?.toLowerCase() === normalizedSubCategory ||
        product.subCategory?.toLowerCase() === normalizedSubCategory;

      const searchMatch =
        !normalized ||
        product.name.toLowerCase().includes(normalized) ||
        product.description.toLowerCase().includes(normalized);

      const audienceMatch =
        matchesAudienceFilter(product.audienceSlug ?? product.audience, normalizedAudience);

      return (
        categoryMatch &&
        subCategoryMatch &&
        audienceMatch &&
        searchMatch
      );
    });
  }, [products, query, selectedAudience, selectedCategory, selectedSubCategory]);

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

  return (
    <section className="section-shell py-12 md:py-16">
      <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="text-4xl md:text-5xl">Shop</h1>
          <p className="mt-2 text-sm uppercase tracking-[0.12em] text-[var(--gold)]">Browse all products</p>
        </div>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search in catalog..."
          className="w-full rounded-xl border border-[var(--gold)]/50 bg-[var(--shop-input-bg)] px-4 py-3 text-sm text-[var(--shop-input-text)] outline-none placeholder:text-[var(--shop-input-ph)] md:w-[360px]"
        />
      </div>

      <div className="mb-4">
        <p className="mb-2 text-xs uppercase tracking-[0.16em] text-[var(--gold)]">Category</p>
        <div className="flex gap-2 overflow-x-auto pb-2">
          <button
            type="button"
            onClick={() => {
              setSelectedCategory("");
              setSelectedSubCategory("");
            }}
            className={`rounded-full border px-4 py-2 text-xs uppercase tracking-[0.08em] transition ${
              !selectedCategory
                ? "border-[var(--gold)] bg-[var(--shop-filter-active)] text-white"
                : "border-[var(--gold)]/35 text-[var(--shop-filter-text)] hover:border-[var(--gold)]/70"
            }`}
          >
            All
          </button>
          {categoryTree.map((category) => {
            const isSelected =
              category.slug.toLowerCase() === selectedCategory.toLowerCase() ||
              category.name.toLowerCase() === selectedCategory.toLowerCase();

            return (
              <button
                key={category.slug}
                type="button"
                onClick={() => {
                  setSelectedCategory(category.slug);
                  setSelectedSubCategory("");
                }}
                className={`whitespace-nowrap rounded-full border px-4 py-2 text-xs uppercase tracking-[0.08em] transition ${
                  isSelected
                    ? "border-[var(--gold)] bg-[var(--shop-filter-active)] text-white"
                    : "border-[var(--gold)]/35 text-[var(--shop-filter-text)] hover:border-[var(--gold)]/70"
                }`}
              >
                {category.name}
              </button>
            );
          })}
        </div>
      </div>

      {availableSubCategories.length > 0 ? (
        <div className="mb-8 rounded-2xl border border-[var(--gold)]/25 bg-[var(--shop-subcategory-panel)] p-3 md:p-4">
          <p className="mb-2 text-xs uppercase tracking-[0.16em] text-[var(--gold)]">Sub-category</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSelectedSubCategory("")}
              className={`rounded-full border px-3 py-1.5 text-[11px] uppercase tracking-[0.08em] transition ${
                !selectedSubCategory
                  ? "border-[var(--gold)] bg-[var(--shop-filter-active)] text-white"
                  : "border-[var(--gold)]/35 text-[var(--shop-filter-text)] hover:border-[var(--gold)]/70"
              }`}
            >
              All
            </button>
            {availableSubCategories.map((subCategory) => {
              const isSelected =
                subCategory.slug.toLowerCase() === selectedSubCategory.toLowerCase() ||
                subCategory.name.toLowerCase() === selectedSubCategory.toLowerCase();

              return (
                <button
                  key={subCategory.slug}
                  type="button"
                  onClick={() => setSelectedSubCategory(subCategory.slug)}
                  className={`rounded-full border px-3 py-1.5 text-[11px] uppercase tracking-[0.08em] transition ${
                    isSelected
                      ? "border-[var(--gold)] bg-[var(--shop-filter-active)] text-white"
                      : "border-[var(--gold)]/35 text-[var(--shop-filter-text)] hover:border-[var(--gold)]/70"
                  }`}
                >
                  {subCategory.name}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {availableAudiences.length > 0 ? (
        <div className="mb-8">
          <p className="mb-2 text-xs uppercase tracking-[0.16em] text-[var(--gold)]">Audience</p>
          <div className="flex gap-2 overflow-x-auto pb-2">
            <button
              type="button"
              onClick={() => setSelectedAudience("")}
              className={`rounded-full border px-4 py-2 text-xs uppercase tracking-[0.08em] transition ${
                !selectedAudience
                  ? "border-[var(--gold)] bg-[var(--shop-filter-active)] text-white"
                  : "border-[var(--gold)]/35 text-[var(--shop-filter-text)] hover:border-[var(--gold)]/70"
              }`}
            >
              All
            </button>
            {availableAudiences.map((audience) => {
              const isSelected = audience.toLowerCase() === selectedAudience.toLowerCase();

              return (
                <button
                  key={audience}
                  type="button"
                  onClick={() => setSelectedAudience(audience)}
                  className={`whitespace-nowrap rounded-full border px-4 py-2 text-xs uppercase tracking-[0.08em] transition ${
                    isSelected
                      ? "border-[var(--gold)] bg-[var(--shop-filter-active)] text-white"
                      : "border-[var(--gold)]/35 text-[var(--shop-filter-text)] hover:border-[var(--gold)]/70"
                  }`}
                >
                  {audience}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {filteredProducts.length === 0 ? (
        <p className="text-[var(--shop-card-desc)]">No products found for your search.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredProducts.map((product) => (
            <article
              key={product.id}
              className="overflow-hidden rounded-[18px] border border-[var(--gold)]/35 bg-[var(--shop-card-bg)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(120,82,58,0.2)]"
              onClick={() => handleOpenDetails(product)}
            >
              <SafeImage
                src={product.img}
                alt={product.name}
                className="h-[330px] w-full cursor-pointer object-cover object-[50%_12%] max-[374px]:object-[50%_10%] min-[375px]:object-[50%_11%] min-[390px]:object-[50%_12%] min-[414px]:object-[50%_14%] md:h-[340px] md:object-[50%_16%] lg:h-[320px] lg:object-[50%_18%]"
              />
              <div className="space-y-3 p-4">
                <h3 className="cursor-pointer text-lg leading-tight text-[var(--arrivals-card-title)]">{product.name}</h3>
                <p className="line-clamp-2 text-sm text-[var(--shop-card-desc)]">{product.description}</p>
                <div className="flex items-end gap-3">
                  <p className="text-xl text-[var(--arrivals-price)]">
                    {formatCurrency(
                      convertAmount(product.priceAmount, toSupportedCurrency(product.currencyCode), displayCurrency),
                      displayCurrency,
                    )}
                  </p>
                  {product.oldPrice ? (
                    <p className="text-sm text-[var(--shop-card-old-price)] line-through">
                      {formatCurrency(
                        convertAmount(
                          Number.parseFloat(product.oldPrice.replace(/[^\d.]/g, "")) || product.priceAmount,
                          toSupportedCurrency(product.currencyCode),
                          displayCurrency,
                        ),
                        displayCurrency,
                      )}
                    </p>
                  ) : null}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="rounded-full border border-[var(--gold)]/70 px-3 py-2 text-xs font-medium uppercase tracking-[0.08em] text-[var(--popup-footer-text)] transition hover:bg-[var(--popup-hover)]"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleOpenDetails(product);
                    }}
                  >
                    Details
                  </button>
                  <button
                    type="button"
                    className="flex flex-1 items-center justify-center gap-2 rounded-full bg-[var(--gold)] px-4 py-2 text-sm font-semibold text-[#3b0810] transition hover:bg-[#e1bb55]"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleAddToCart(product);
                    }}
                  >
                    <ShoppingBag className="h-4 w-4" />
                    Add to Cart
                  </button>
                  <button
                    type="button"
                    className="rounded-full border border-[var(--gold)]/65 p-2 transition hover:bg-[var(--popup-hover)]"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleToggleWishlist(product);
                    }}
                    aria-label={`Toggle wishlist for ${product.name}`}
                  >
                    <Heart className={`h-4 w-4 ${wishlistIds.has(product.id) ? "fill-[var(--gold)] text-[var(--gold)]" : ""}`} />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

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
