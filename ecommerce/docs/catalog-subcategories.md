# Catalog Category/Sub-Category Architecture

This document covers scalable category + sub-category organization for the product catalog.

## 1) MongoDB / Mongoose Schema Design

Use normalized `Category` and `SubCategory` collections and keep denormalized labels on products for fast reads.

```ts
import { Schema, model, Types } from "mongoose";

const CategorySchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, index: true },
    description: { type: String, default: "" },
    isActive: { type: Boolean, default: true, index: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const SubCategorySchema = new Schema(
  {
    categoryId: { type: Types.ObjectId, ref: "Category", required: true, index: true },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, index: true },
    isActive: { type: Boolean, default: true, index: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

SubCategorySchema.index({ categoryId: 1, slug: 1 }, { unique: true });

const ProductSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, index: true },
    slug: { type: String, required: true, unique: true, index: true },
    handle: { type: String, index: true },

    categoryId: { type: Types.ObjectId, ref: "Category", index: true },
    subCategoryId: { type: Types.ObjectId, ref: "SubCategory", index: true },

    // Denormalized fields for read performance and resilience
    category: { type: String, index: true },
    categorySlug: { type: String, index: true },
    subCategory: { type: String, index: true },
    subCategorySlug: { type: String, index: true },

    tags: { type: [String], default: [] },
    priceAmount: { type: Number, required: true, index: true },
    currencyCode: { type: String, default: "INR" },
    images: { type: [String], default: [] },

    // Future-proof attributes / faceted filters
    attributes: {
      size: { type: [String], default: [] },
      color: { type: [String], default: [] },
      material: { type: [String], default: [] },
    },

    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

ProductSchema.index({ categorySlug: 1, subCategorySlug: 1, isActive: 1 });
ProductSchema.index({ title: "text", tags: "text" });

export const Category = model("Category", CategorySchema);
export const SubCategory = model("SubCategory", SubCategorySchema);
export const Product = model("Product", ProductSchema);
```

## 2) API Structure

Implemented in this codebase:

- `GET /api/products`
  - Supports filters:
    - `category`
    - `subCategory`
    - `q`
  - Returns:
    - `products`
    - `categories` tree
    - `subCategories` for selected category

- `GET /api/products/sub-categories?category=<slug-or-name>`
  - Returns all sub-categories under the category.

Suggested scalable extension:

- `GET /api/products/filters?category=<slug>` for future facets (`size`, `color`, `priceRange`).

## 3) Frontend Implementation

Implemented in `ShopListing`:

- Category chips (horizontal scroll, mobile-friendly)
- Contextual sub-category chips under selected category
- Dynamic list filtering by category + sub-category + search query
- URL sync through query params (`q`, `category`, `subCategory`)

## 4) UI/UX Recommendations

- Use chips for category and sub-category on mobile and desktop.
- Keep sub-category section contextual (show only when a category is selected).
- Keep `All` option at both levels for quick reset.
- Show filter state in URL for sharing and deep links.
- For larger catalogs, add:
  - Sticky left sidebar on desktop
  - Collapsible bottom sheet filters on mobile

## 5) SEO-Friendly URL Strategy

Recommended canonical routes:

- `/shop/<category-slug>`
- `/shop/<category-slug>/<sub-category-slug>`

Examples:

- `/shop/t-shirts`
- `/shop/t-shirts/gen-z-t-shirts`
- `/shop/t-shirts/oversized-t-shirts`

Current implementation uses query params for immediate compatibility. You can add route segments later without changing taxonomy data.

## 6) Naming & Organization Best Practices

- Keep slugs stable and lowercase with hyphens.
- Use display names for UI, slugs for routing/filtering.
- Avoid renaming slugs after indexing by search engines.
- Use singular/plural naming consistently:
  - Category: `t-shirts`
  - Sub-category: `graphic-t-shirts`
- Keep taxonomy config data-driven so adding sub-categories does not require UI code edits.
