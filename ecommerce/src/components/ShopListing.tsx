"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown, Heart, ShoppingBag, SlidersHorizontal, Star, X } from "lucide-react";
import { GridProduct } from "@/lib/catalog";
import { convertAmount, formatCurrency, toSupportedCurrency } from "@/lib/currency";
import { buildCategoryTree, matchesAudienceFilter, slugify } from "@/lib/product-taxonomy";
import SafeImage from "@/components/SafeImage";
import { getWishlistIds, useShopStore } from "@/store/useShopStore";
import { useUiStore } from "@/store/useUiStore";

type ShopListingProps = {
  products: GridProduct[];
  initialQuery?: string;
  initialCategory?: string;
  initialSubCategory?: string;
  initialAudience?: string;
  initialCollection?: string;
  initialCollectionTitle?: string;
};

type SortOption =
  | "recommended"
  | "new"
  | "popularity"
  | "price-low-high"
  | "price-high-low"
  | "discount"
  | "rating";

const SORT_OPTIONS: Array<{ value: SortOption; label: string }> = [
  { value: "recommended", label: "Recommended" },
  { value: "new", label: "What's New" },
  { value: "popularity", label: "Popularity" },
  { value: "price-low-high", label: "Price: Low to High" },
  { value: "price-high-low", label: "Price: High to Low" },
  { value: "discount", label: "Better Discount" },
  { value: "rating", label: "Customer Rating" },
];

const KNOWN_MATERIALS = ["Cotton", "Polyester", "Linen", "Denim", "Rayon", "Wool", "Silk", "Satin", "Viscose"] as const;

function parseDiscountPercent(product: GridProduct) {
  const normalizedOld = Number.parseFloat((product.oldPrice ?? "").replace(/[^\d.]/g, ""));
  if (!Number.isFinite(normalizedOld) || normalizedOld <= product.priceAmount || product.priceAmount <= 0) {
    return 0;
  }
  return Math.round(((normalizedOld - product.priceAmount) / normalizedOld) * 100);
}

function hashString(input: string) {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function getPseudoRating(productId: string) {
  return 3.5 + (hashString(productId) % 16) / 10;
}

function getPseudoPopularity(productId: string) {
  return (hashString(productId) % 5000) + 300;
}

function extractBrand(product: GridProduct) {
  const tags = product.tags ?? [];
  const brandTag = tags.find((tag) => /^brand\s*[:=-]/i.test(tag));
  if (brandTag) {
    return brandTag.replace(/^brand\s*[:=-]\s*/i, "").trim() || "Firaang";
  }
  return "Firaang";
}

function extractSizes(product: GridProduct) {
  const values = new Set<string>();
  for (const group of product.optionGroups ?? []) {
    if (/size/i.test(group.name)) {
      for (const value of group.values ?? []) {
        const normalized = value.trim().toUpperCase();
        if (normalized) {
          values.add(normalized);
        }
      }
    }
  }
  return Array.from(values);
}

function extractColors(product: GridProduct) {
  const values = new Set<string>();
  for (const group of product.optionGroups ?? []) {
    if (/color/i.test(group.name)) {
      for (const value of group.values ?? []) {
        const normalized = value.trim();
        if (normalized) {
          values.add(normalized);
        }
      }
    }
  }
  return Array.from(values);
}

function extractMaterials(product: GridProduct) {
  const tags = product.tags ?? [];
  const values = new Set<string>();
  for (const material of KNOWN_MATERIALS) {
    if (tags.some((tag) => tag.toLowerCase().includes(material.toLowerCase()))) {
      values.add(material);
    }
  }
  return Array.from(values);
}

function isProductInStock(product: GridProduct) {
  if (!product.variants || product.variants.length === 0) {
    return true;
  }
  return product.variants.some((variant) => variant.availableForSale);
}

export default function ShopListing({
  products,
  initialQuery = "",
  initialCategory = "",
  initialSubCategory = "",
  initialAudience = "",
  initialCollection = "",
  initialCollectionTitle = "",
}: ShopListingProps) {
  const [query, setQuery] = useState(() => initialQuery);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [selectedSubCategory, setSelectedSubCategory] = useState(initialSubCategory);
  const [selectedAudience, setSelectedAudience] = useState(initialAudience);
  const [selectedSort, setSelectedSort] = useState<SortOption>("recommended");
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([]);
  const [availabilityFilter, setAvailabilityFilter] = useState<"all" | "in" | "out">("all");
  const [minDiscount, setMinDiscount] = useState(0);
  const [minRating, setMinRating] = useState(0);
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
  const [priceRange, setPriceRange] = useState<{ min: number; max: number }>({ min: 0, max: 0 });

  const router = useRouter();
  const pathname = usePathname();
  const deferredQuery = useDeferredValue(query);
  const urlSyncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const wishlist = useShopStore((state) => state.wishlist);
  const toggleWishlist = useShopStore((state) => state.toggleWishlist);
  const addToCart = useShopStore((state) => state.addToCart);
  const openCart = useUiStore((state) => state.openCart);
  const displayCurrency = useUiStore((state) => state.currency);

  const wishlistIds = getWishlistIds(wishlist);
  const categoryTree = useMemo(() => buildCategoryTree(products), [products]);
  const listingScopeKey = `${initialCollection}::${initialCategory}::${initialSubCategory}::${initialAudience}::${initialQuery}`;
  const previousListingScopeKeyRef = useRef<string | null>(null);

  const enrichedProducts = useMemo(
    () =>
      products.map((product) => ({
        ...product,
        brand: extractBrand(product),
        sizes: extractSizes(product),
        colors: extractColors(product),
        materials: extractMaterials(product),
        inStock: isProductInStock(product),
        discountPercent: parseDiscountPercent(product),
        rating: Number(getPseudoRating(product.id).toFixed(1)),
        popularity: getPseudoPopularity(product.id),
      })),
    [products],
  );

  const minCatalogPrice = useMemo(() => (enrichedProducts.length ? Math.min(...enrichedProducts.map((p) => p.priceAmount)) : 0), [enrichedProducts]);
  const maxCatalogPrice = useMemo(() => (enrichedProducts.length ? Math.max(...enrichedProducts.map((p) => p.priceAmount)) : 0), [enrichedProducts]);

  useEffect(() => {
    setPriceRange((current) => {
      if (current.min === 0 && current.max === 0) {
        return { min: minCatalogPrice, max: maxCatalogPrice };
      }
      return {
        min: Math.max(minCatalogPrice, current.min),
        max: Math.min(maxCatalogPrice, current.max),
      };
    });
  }, [maxCatalogPrice, minCatalogPrice]);

  useEffect(() => {
    setSelectedCategory((prev) => (prev === initialCategory ? prev : initialCategory));
    setSelectedSubCategory((prev) => (prev === initialSubCategory ? prev : initialSubCategory));
    setSelectedAudience((prev) => (prev === initialAudience ? prev : initialAudience));
  }, [initialCategory, initialSubCategory, initialAudience]);

  useEffect(() => {
    if (previousListingScopeKeyRef.current === null) {
      previousListingScopeKeyRef.current = listingScopeKey;
      return;
    }

    if (previousListingScopeKeyRef.current === listingScopeKey) {
      return;
    }

    previousListingScopeKeyRef.current = listingScopeKey;

    // Clear local listing state so each collection/search context starts cleanly.
    setQuery(initialQuery);
    setSelectedCategory(initialCategory);
    setSelectedSubCategory(initialSubCategory);
    setSelectedAudience(initialAudience);
    setSelectedSort("recommended");
    setSelectedBrands([]);
    setSelectedSizes([]);
    setSelectedColors([]);
    setSelectedMaterials([]);
    setAvailabilityFilter("all");
    setMinDiscount(0);
    setMinRating(0);
    setPriceRange({ min: minCatalogPrice, max: maxCatalogPrice });
    setIsMobileFiltersOpen(false);
  }, [
    initialAudience,
    initialCategory,
    initialQuery,
    initialSubCategory,
    listingScopeKey,
    maxCatalogPrice,
    minCatalogPrice,
  ]);

  useEffect(() => {
    if (urlSyncTimeoutRef.current) {
      clearTimeout(urlSyncTimeoutRef.current);
      urlSyncTimeoutRef.current = null;
    }

    urlSyncTimeoutRef.current = setTimeout(() => {
      const isSeoPatternRoute = pathname !== "/shop";

      if (isSeoPatternRoute && selectedCategory && selectedSubCategory) {
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
        return;
      }

      if (!isSeoPatternRoute) {
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
        if (initialCollection) {
          params.set("collection", initialCollection);
        }

        const queryString = params.toString();
        const nextUrl = queryString ? `${pathname}?${queryString}` : pathname;
        router.replace(nextUrl, { scroll: false });
      }
    }, 240);

    return () => {
      if (urlSyncTimeoutRef.current) {
        clearTimeout(urlSyncTimeoutRef.current);
        urlSyncTimeoutRef.current = null;
      }
    };
  }, [initialCollection, pathname, query, router, selectedAudience, selectedCategory, selectedSubCategory]);

  const selectedCategoryNode = useMemo(() => {
    if (!selectedCategory) {
      return null;
    }

    return (
      categoryTree.find(
        (category) =>
          category.slug.toLowerCase() === selectedCategory.toLowerCase() ||
          category.name.toLowerCase() === selectedCategory.toLowerCase(),
      ) ?? null
    );
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
        subCategory.name.toLowerCase() === selectedSubCategory.toLowerCase(),
    );

    if (!hasSelectedSubCategory && selectedSubCategory) {
      setSelectedSubCategory("");
    }
  }, [availableSubCategories, selectedCategoryNode, selectedSubCategory]);

  const availableBrands = useMemo(() => {
    const counts = new Map<string, number>();
    for (const product of enrichedProducts) {
      counts.set(product.brand, (counts.get(product.brand) ?? 0) + 1);
    }
    return Array.from(counts.entries()).map(([label, count]) => ({ label, count }));
  }, [enrichedProducts]);

  const availableSizes = useMemo(() => {
    const counts = new Map<string, number>();
    for (const product of enrichedProducts) {
      for (const size of product.sizes) {
        counts.set(size, (counts.get(size) ?? 0) + 1);
      }
    }
    return Array.from(counts.entries()).map(([label, count]) => ({ label, count }));
  }, [enrichedProducts]);

  const availableColors = useMemo(() => {
    const counts = new Map<string, number>();
    for (const product of enrichedProducts) {
      for (const color of product.colors) {
        counts.set(color, (counts.get(color) ?? 0) + 1);
      }
    }
    return Array.from(counts.entries()).map(([label, count]) => ({ label, count }));
  }, [enrichedProducts]);

  const availableMaterials = useMemo(() => {
    const counts = new Map<string, number>();
    for (const product of enrichedProducts) {
      for (const material of product.materials) {
        counts.set(material, (counts.get(material) ?? 0) + 1);
      }
    }
    return Array.from(counts.entries()).map(([label, count]) => ({ label, count }));
  }, [enrichedProducts]);

  const filteredProducts = useMemo(() => {
    const normalized = deferredQuery.trim().toLowerCase();
    const normalizedCategory = selectedCategory.trim().toLowerCase();
    const normalizedSubCategory = selectedSubCategory.trim().toLowerCase();
    const normalizedSubCategorySlug = slugify(selectedSubCategory);
    const normalizedAudience = selectedAudience.trim().toLowerCase();

    return enrichedProducts.filter((product) => {
      const categoryMatch =
        !normalizedCategory ||
        product.categorySlug?.toLowerCase() === normalizedCategory ||
        product.category?.toLowerCase() === normalizedCategory;

      const subCategoryMatch =
        !normalizedSubCategory ||
        product.subCategorySlug?.toLowerCase() === normalizedSubCategory ||
        product.subCategory?.toLowerCase() === normalizedSubCategory ||
        (product.tags ?? []).some((tag) => {
          const normalizedTag = tag.trim().toLowerCase();
          return normalizedTag === normalizedSubCategory || slugify(tag) === normalizedSubCategorySlug;
        });

      const searchMatch =
        !normalized ||
        product.name.toLowerCase().includes(normalized) ||
        product.description.toLowerCase().includes(normalized);

      const audienceMatch = matchesAudienceFilter(product.audienceSlug ?? product.audience, normalizedAudience);
      const brandMatch = selectedBrands.length === 0 || selectedBrands.includes(product.brand);
      const sizeMatch = selectedSizes.length === 0 || selectedSizes.some((size) => product.sizes.includes(size));
      const colorMatch = selectedColors.length === 0 || selectedColors.some((color) => product.colors.includes(color));
      const materialMatch = selectedMaterials.length === 0 || selectedMaterials.some((material) => product.materials.includes(material));
      const availabilityMatch = availabilityFilter === "all" || (availabilityFilter === "in" ? product.inStock : !product.inStock);
      const discountMatch = product.discountPercent >= minDiscount;
      const ratingMatch = product.rating >= minRating;
      const priceMatch = product.priceAmount >= priceRange.min && product.priceAmount <= priceRange.max;

      return (
        categoryMatch &&
        subCategoryMatch &&
        searchMatch &&
        audienceMatch &&
        brandMatch &&
        sizeMatch &&
        colorMatch &&
        materialMatch &&
        availabilityMatch &&
        discountMatch &&
        ratingMatch &&
        priceMatch
      );
    });
  }, [
    availabilityFilter,
    deferredQuery,
    enrichedProducts,
    minDiscount,
    minRating,
    priceRange.max,
    priceRange.min,
    selectedAudience,
    selectedBrands,
    selectedCategory,
    selectedColors,
    selectedMaterials,
    selectedSizes,
    selectedSubCategory,
  ]);

  const sortedProducts = useMemo(() => {
    const list = [...filteredProducts];

    switch (selectedSort) {
      case "new":
        return list.sort((a, b) => hashString(b.id) - hashString(a.id));
      case "popularity":
        return list.sort((a, b) => b.popularity - a.popularity);
      case "price-low-high":
        return list.sort((a, b) => a.priceAmount - b.priceAmount);
      case "price-high-low":
        return list.sort((a, b) => b.priceAmount - a.priceAmount);
      case "discount":
        return list.sort((a, b) => b.discountPercent - a.discountPercent);
      case "rating":
        return list.sort((a, b) => b.rating - a.rating);
      case "recommended":
      default:
        return list.sort((a, b) => b.rating * 100 + b.popularity - (a.rating * 100 + a.popularity));
    }
  }, [filteredProducts, selectedSort]);

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

  const toggleFromArray = (value: string, values: string[], setter: (next: string[]) => void) => {
    if (values.includes(value)) {
      setter(values.filter((item) => item !== value));
      return;
    }
    setter([...values, value]);
  };

  const clearAllFilters = () => {
    setSelectedCategory("");
    setSelectedSubCategory("");
    setSelectedBrands([]);
    setSelectedSizes([]);
    setSelectedColors([]);
    setSelectedMaterials([]);
    setAvailabilityFilter("all");
    setMinDiscount(0);
    setMinRating(0);
    setPriceRange({ min: minCatalogPrice, max: maxCatalogPrice });
  };

  const filtersSidebar = (
    <aside className="rounded-lg border border-[#e7e8ee] bg-white p-4 shadow-[0_3px_14px_rgba(40,44,63,0.05)]">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-lg font-semibold text-[#282c3f]">Filters</p>
        <button type="button" onClick={clearAllFilters} className="text-xs font-semibold uppercase tracking-[0.08em] text-[#ff3f6c]">
          Clear All
        </button>
      </div>

      <div className="space-y-5">
        <div className="border-t border-[#eceef4] pt-4">
          <p className="mb-2 text-[13px] font-semibold uppercase tracking-[0.1em] text-[#3e4152]">Categories</p>
          <div className="space-y-1.5 text-[14px] text-[#3e4152]">
            <button
              type="button"
              onClick={() => {
                setSelectedCategory("");
                setSelectedSubCategory("");
              }}
              className={`block w-full rounded-md px-2 py-1 text-left ${
                !selectedCategory ? "bg-[#f4f5f8] font-semibold text-[#ff3f6c]" : "hover:bg-[#f8f8fb]"
              }`}
            >
              All Categories
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
                  className={`block w-full rounded-md px-2 py-1 text-left ${
                    isSelected ? "bg-[#f4f5f8] font-semibold text-[#ff3f6c]" : "hover:bg-[#f8f8fb]"
                  }`}
                >
                  {category.name}
                </button>
              );
            })}
          </div>
        </div>

        {availableSubCategories.length > 0 ? (
          <div className="border-t border-[#eceef4] pt-4">
            <p className="mb-2 text-[13px] font-semibold uppercase tracking-[0.1em] text-[#3e4152]">Sub Categories</p>
            <div className="space-y-1.5 text-[14px] text-[#3e4152]">
              {availableSubCategories.map((subCategory) => {
                const isSelected =
                  subCategory.slug.toLowerCase() === selectedSubCategory.toLowerCase() ||
                  subCategory.name.toLowerCase() === selectedSubCategory.toLowerCase();

                return (
                  <button
                    key={subCategory.slug}
                    type="button"
                    onClick={() => setSelectedSubCategory(subCategory.slug)}
                    className={`block w-full rounded-md px-2 py-1 text-left ${
                      isSelected ? "bg-[#f4f5f8] font-semibold text-[#ff3f6c]" : "hover:bg-[#f8f8fb]"
                    }`}
                  >
                    {subCategory.name}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        <div className="border-t border-[#eceef4] pt-4">
          <p className="mb-2 text-[13px] font-semibold uppercase tracking-[0.1em] text-[#3e4152]">Brand</p>
          <div className="space-y-1.5">
            {availableBrands.slice(0, 8).map((brand) => (
              <label key={brand.label} className="flex cursor-pointer items-center justify-between gap-2 text-sm text-[#3e4152]">
                <span className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedBrands.includes(brand.label)}
                    onChange={() => toggleFromArray(brand.label, selectedBrands, setSelectedBrands)}
                    className="h-4 w-4 rounded border-[#c9ccd7]"
                  />
                  {brand.label}
                </span>
                <span className="text-xs text-[#94969f]">{brand.count}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="border-t border-[#eceef4] pt-4">
          <p className="mb-2 text-[13px] font-semibold uppercase tracking-[0.1em] text-[#3e4152]">Price Range</p>
          <div className="space-y-3">
            <input
              type="range"
              min={minCatalogPrice}
              max={maxCatalogPrice}
              value={priceRange.min}
              onChange={(event) => {
                const value = Number(event.target.value);
                setPriceRange((prev) => ({ min: Math.min(value, prev.max), max: prev.max }));
              }}
              className="w-full accent-[#ff3f6c]"
            />
            <input
              type="range"
              min={minCatalogPrice}
              max={maxCatalogPrice}
              value={priceRange.max}
              onChange={(event) => {
                const value = Number(event.target.value);
                setPriceRange((prev) => ({ min: prev.min, max: Math.max(value, prev.min) }));
              }}
              className="w-full accent-[#ff3f6c]"
            />
            <p className="text-sm text-[#3e4152]">
              {formatCurrency(priceRange.min, "INR")} - {formatCurrency(priceRange.max, "INR")}
            </p>
          </div>
        </div>

        <div className="border-t border-[#eceef4] pt-4">
          <p className="mb-2 text-[13px] font-semibold uppercase tracking-[0.1em] text-[#3e4152]">Size</p>
          <div className="flex flex-wrap gap-2">
            {availableSizes.map((size) => (
              <button
                key={size.label}
                type="button"
                onClick={() => toggleFromArray(size.label, selectedSizes, setSelectedSizes)}
                className={`rounded-md border px-2.5 py-1 text-xs font-semibold ${
                  selectedSizes.includes(size.label)
                    ? "border-[#ff3f6c] bg-[#fff2f7] text-[#ff3f6c]"
                    : "border-[#d9dbe5] text-[#3e4152]"
                }`}
              >
                {size.label}
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-[#eceef4] pt-4">
          <p className="mb-2 text-[13px] font-semibold uppercase tracking-[0.1em] text-[#3e4152]">Color</p>
          <div className="flex flex-wrap gap-2">
            {availableColors.slice(0, 12).map((color) => (
              <button
                key={color.label}
                type="button"
                onClick={() => toggleFromArray(color.label, selectedColors, setSelectedColors)}
                className={`rounded-full border px-3 py-1 text-xs ${
                  selectedColors.includes(color.label)
                    ? "border-[#ff3f6c] bg-[#fff2f7] text-[#ff3f6c]"
                    : "border-[#d9dbe5] text-[#3e4152]"
                }`}
              >
                {color.label}
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-[#eceef4] pt-4">
          <p className="mb-2 text-[13px] font-semibold uppercase tracking-[0.1em] text-[#3e4152]">Availability</p>
          <div className="space-y-1.5 text-sm text-[#3e4152]">
            <label className="flex items-center gap-2">
              <input type="radio" name="availability" checked={availabilityFilter === "all"} onChange={() => setAvailabilityFilter("all")} />
              All
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name="availability" checked={availabilityFilter === "in"} onChange={() => setAvailabilityFilter("in")} />
              In Stock
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name="availability" checked={availabilityFilter === "out"} onChange={() => setAvailabilityFilter("out")} />
              Out of Stock
            </label>
          </div>
        </div>

        <div className="border-t border-[#eceef4] pt-4">
          <p className="mb-2 text-[13px] font-semibold uppercase tracking-[0.1em] text-[#3e4152]">Discount</p>
          <div className="space-y-1.5 text-sm text-[#3e4152]">
            {[0, 10, 20, 30, 40, 50].map((value) => (
              <label key={value} className="flex items-center gap-2">
                <input type="radio" name="discount" checked={minDiscount === value} onChange={() => setMinDiscount(value)} />
                {value === 0 ? "All" : `${value}% and above`}
              </label>
            ))}
          </div>
        </div>

        <div className="border-t border-[#eceef4] pt-4">
          <p className="mb-2 text-[13px] font-semibold uppercase tracking-[0.1em] text-[#3e4152]">Rating</p>
          <div className="space-y-1.5 text-sm text-[#3e4152]">
            {[0, 4, 3].map((value) => (
              <label key={value} className="flex items-center gap-2">
                <input type="radio" name="rating" checked={minRating === value} onChange={() => setMinRating(value)} />
                {value === 0 ? "All Ratings" : `${value}★ & above`}
              </label>
            ))}
          </div>
        </div>

        <div className="border-t border-[#eceef4] pt-4">
          <p className="mb-2 text-[13px] font-semibold uppercase tracking-[0.1em] text-[#3e4152]">Fabric / Material</p>
          <div className="space-y-1.5">
            {availableMaterials.map((material) => (
              <label key={material.label} className="flex cursor-pointer items-center justify-between gap-2 text-sm text-[#3e4152]">
                <span className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedMaterials.includes(material.label)}
                    onChange={() => toggleFromArray(material.label, selectedMaterials, setSelectedMaterials)}
                    className="h-4 w-4 rounded border-[#c9ccd7]"
                  />
                  {material.label}
                </span>
                <span className="text-xs text-[#94969f]">{material.count}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );

  return (
    <section className="mx-auto w-full max-w-[1600px] px-4 py-8 md:px-6 md:py-10 lg:px-8">
      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-[#282c3f] md:text-4xl">
            {initialCollectionTitle || "Shop"}
          </h1>
          {initialCollectionTitle ? (
            <p className="mt-1 text-sm text-[#696e79]">Collection</p>
          ) : null}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search in catalog"
            className="h-11 w-full rounded-md border border-[#d9dbe5] bg-white px-4 text-sm text-[#282c3f] outline-none shadow-[0_2px_10px_rgba(40,44,63,0.05)] placeholder:text-[#8a8e9b] sm:w-[280px]"
          />

          <button
            type="button"
            onClick={() => setIsMobileFiltersOpen(true)}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-[#d9dbe5] bg-white px-4 text-sm font-medium text-[#3e4152] lg:hidden"
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filters
          </button>

          <div className="inline-flex h-11 items-center rounded-md border border-[#d9dbe5] bg-white px-3 shadow-[0_2px_10px_rgba(40,44,63,0.05)]">
            <label className="mr-2 text-sm text-[#535766]">Sort by:</label>
            <select
              value={selectedSort}
              onChange={(event) => setSelectedSort(event.target.value as SortOption)}
              className="bg-transparent pr-6 text-sm font-semibold text-[#282c3f] outline-none"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <ChevronDown className="h-4 w-4 text-[#8a8e9b]" />
          </div>
        </div>
      </div>

      <div className="mb-4 flex items-center justify-between rounded-md bg-[#f7f8fb] px-3 py-2 text-sm text-[#535766]">
        <p>
          Showing <span className="font-semibold text-[#282c3f]">{sortedProducts.length}</span> products
        </p>
        <p className="hidden sm:block">Sort: {SORT_OPTIONS.find((option) => option.value === selectedSort)?.label}</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[290px_minmax(0,1fr)]">
        <div className="hidden lg:block">{filtersSidebar}</div>

        <div>
          {sortedProducts.length === 0 ? (
            <div className="rounded-lg border border-[#e8eaf0] bg-white p-8 text-center text-[#535766]">
              No products found for selected filters.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
              {sortedProducts.map((product) => (
                <article
                  key={product.id}
                  className="group overflow-hidden rounded-lg border border-[#eceef4] bg-white transition hover:shadow-[0_10px_24px_rgba(40,44,63,0.12)]"
                >
                  <button type="button" className="relative block w-full text-left" onClick={() => handleOpenDetails(product)}>
                    <SafeImage
                      src={product.img}
                      alt={product.name}
                      className="h-[240px] w-full object-cover object-top sm:h-[280px] md:h-[300px]"
                    />
                    <div className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-md bg-white/90 px-2 py-1 text-xs font-semibold text-[#282c3f]">
                      <Star className="h-3.5 w-3.5 fill-[#03a685] text-[#03a685]" />
                      {product.rating.toFixed(1)}
                    </div>
                  </button>

                  <div className="space-y-2 p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#8a8e9b]">{product.brand}</p>
                    <h3 className="line-clamp-1 text-sm font-semibold text-[#282c3f]">{product.name}</h3>
                    <p className="line-clamp-1 text-xs text-[#6c6f7d]">{product.description}</p>

                    <div className="flex items-end gap-2">
                      <p className="text-base font-semibold text-[#282c3f]">
                        {formatCurrency(
                          convertAmount(product.priceAmount, toSupportedCurrency(product.currencyCode), displayCurrency),
                          displayCurrency,
                        )}
                      </p>
                      {product.oldPrice ? (
                        <p className="text-xs text-[#94969f] line-through">
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
                      {product.discountPercent > 0 ? (
                        <p className="text-xs font-semibold text-[#ff905a]">({product.discountPercent}% OFF)</p>
                      ) : null}
                    </div>

                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        className="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-md bg-[#ff3f6c] px-3 text-xs font-semibold uppercase tracking-[0.07em] text-white transition hover:bg-[#e43460]"
                        onClick={() => handleAddToCart(product)}
                      >
                        <ShoppingBag className="h-3.5 w-3.5" />
                        Add
                      </button>
                      <button
                        type="button"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#d7d9e1] text-[#3e4152] transition hover:border-[#ff3f6c] hover:text-[#ff3f6c]"
                        onClick={() => handleToggleWishlist(product)}
                        aria-label={`Toggle wishlist for ${product.name}`}
                      >
                        <Heart className={`h-4 w-4 ${wishlistIds.has(product.id) ? "fill-[#ff3f6c] text-[#ff3f6c]" : ""}`} />
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>

      {isMobileFiltersOpen ? (
        <div className="fixed inset-0 z-[130] bg-black/50 p-3 lg:hidden" onClick={() => setIsMobileFiltersOpen(false)}>
          <div
            className="mx-auto h-full w-full max-w-md overflow-y-auto rounded-xl bg-white p-3"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-2 flex items-center justify-between">
              <p className="text-lg font-semibold text-[#282c3f]">Filters</p>
              <button type="button" onClick={() => setIsMobileFiltersOpen(false)} className="rounded-full p-1 text-[#4b4f5d] hover:bg-[#f1f3f8]">
                <X className="h-5 w-5" />
              </button>
            </div>
            {filtersSidebar}
          </div>
        </div>
      ) : null}
    </section>
  );
}
