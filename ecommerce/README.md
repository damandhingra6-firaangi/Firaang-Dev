This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Shopify Storefront API Integration

This project can load the homepage New Arrivals products from Shopify Storefront API.

1. Copy `.env.example` to `.env.local`.
2. Set the following values:
	- `SHOPIFY_STORE_DOMAIN`: your `myshopify.com` domain
	- `SHOPIFY_STOREFRONT_ACCESS_TOKEN`: Storefront API access token
	- `SHOPIFY_API_VERSION`: API version (default: `2025-01`)
3. Restart the dev server.

Implementation details:

- Shopify fetch + mapping logic: `src/lib/shopify.ts`
- Fallback products + shared product type: `src/lib/catalog.ts`
- Homepage data loading: `src/app/page.tsx`
- Product carousel rendering: `src/components/ProductGrid.tsx`

If Shopify credentials are not configured or Shopify is unavailable, the UI falls back to local product data.

## Feedback Admin API

Feedback submissions are stored in MongoDB.
The app auto-creates a descending index on `submittedAt` for faster admin pagination.

Newsletter subscriptions are also stored in MongoDB with a unique index on `email`.

Configure these values in `.env.local`:

MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>/<db>?retryWrites=true&w=majority
MONGODB_DB_NAME=firaangi
MONGODB_FEEDBACK_COLLECTION=feedback
MONGODB_NEWSLETTER_COLLECTION=newsletter_subscribers

FEEDBACK_ADMIN_KEY=your-strong-secret

Then call:

GET /api/feedback?page=1&pageSize=20

with request header:

x-admin-key: your-strong-secret

Health check endpoint:

GET /api/feedback/health

with the same `x-admin-key` header. This verifies Mongo connectivity and reports whether the `feedback_submittedAt_desc` index exists.

Admin dashboard route:

/admin/feedback

Open this page in the app, enter the admin key manually, then run health and recent feedback checks from the UI.

## Newsletter Admin API

Use the same admin key to read paginated newsletter subscribers:

GET /api/newsletter?page=1&pageSize=20

Optional date filters:

GET /api/newsletter?page=1&pageSize=20&from=2026-04-01&to=2026-04-30

CSV export:

GET /api/newsletter?format=csv&limit=5000

CSV export with date range:

GET /api/newsletter?format=csv&limit=5000&from=2026-04-01&to=2026-04-30

with request header:

x-admin-key: your-strong-secret

Admin dashboard route:

/admin/newsletter
