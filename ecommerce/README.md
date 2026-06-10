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

## Deploy on cPanel

This project can also run on cPanel if your hosting plan includes Node.js application support.

1. Build the app with standalone output:

```bash
npm install
npm run build
npm run package:cpanel
```

2. Upload these items from the project root:

- `dist/cpanel-deploy.zip`

3. In cPanel, create a Node.js app and use the generated `server.js` from `.next/standalone` as the startup file.
4. Set the same environment variables you use locally. A template is available in `.env.example`.
5. Restart the Node.js app after each deployment.

Detailed steps are documented in `CPANEL_DEPLOYMENT.md`.

## Account Sign-In And Order Sync

The account modal now supports Google sign-in with Mongo-backed sessions and order history.

Required environment variables:

- `GOOGLE_CLIENT_ID`
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
- `MONGODB_URI`
- `MONGODB_DB_NAME`
- `MONGODB_USERS_COLLECTION` (default: `users`)
- `MONGODB_SESSIONS_COLLECTION` (default: `account_sessions`)
- `MONGODB_ORDERS_COLLECTION` (default: `orders`)
- `MONGODB_MOBILE_OTPS_COLLECTION` (default: `account_mobile_otps`)
- `SMS_PROVIDER` (use `twilio`)
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_FROM_NUMBER` or `TWILIO_MESSAGING_SERVICE_SID`
- `TWILIO_VERIFY_SERVICE_SID` (optional, enables Twilio Verify API)
- `SMS_OTP_MESSAGE_TEMPLATE` (optional)

How it works:

- Google sign-in verifies the Google ID token on the server
- Mobile OTP login sends OTP over SMS through Twilio
- If `TWILIO_VERIFY_SERVICE_SID` is set, OTP send/check uses Twilio Verify API
- If Twilio Verify is not enabled, app uses local OTP storage + Twilio SMS delivery
- A Mongo-backed session cookie is created for the account
- Authenticated checkouts create pending orders in MongoDB
- Successful payment verification marks those orders as paid
- The account modal reads synced profile and order history from MongoDB

OTP delivery setup details:

- `docs/sms-otp-setup.md`

If Google sign-in is not configured, the account modal will show a configuration message instead of a fake local sign-in flow.

## Shopify Storefront API Integration

This project can load the homepage New Arrivals products from Shopify Storefront API.

1. Copy `.env.example` to `.env.local`.
2. Set the following values:
	- `SHOPIFY_STORE_DOMAIN`: your `myshopify.com` domain
	- `SHOPIFY_STOREFRONT_ACCESS_TOKEN`: Storefront API access token
	- `SHOPIFY_API_VERSION`: API version (default: `2025-01`)
3. Restart the dev server.

Optional display-currency environment variables:

- `NEXT_PUBLIC_FX_USD_TO_INR` (default: `83`)
- `NEXT_PUBLIC_FX_AED_TO_INR` (default: `22.6`)

Notes:

- These rates are used only for display conversion in UI when user selects USD/AED.
- Razorpay checkout is still charged in INR.
- After changing FX values, restart the app/server.

Implementation details:

- Shopify fetch + mapping logic: `src/lib/shopify.ts`
- Fallback products + shared product type: `src/lib/catalog.ts`
- Homepage data loading: `src/app/page.tsx`
- Product carousel rendering: `src/components/ProductGrid.tsx`

If Shopify credentials are not configured or Shopify is unavailable, the UI falls back to local product data.

## Shopify Admin Order And Inventory Sync

Paid-order sync to Shopify Admin and Shopify inventory adjustments require additional server-side environment variables:

- `SHOPIFY_ADMIN_ACCESS_TOKEN`
- or `SHOPIFY_ADMIN_CLIENT_ID` + `SHOPIFY_ADMIN_CLIENT_SECRET` (short-lived token fetch)
- `SHOPIFY_INVENTORY_LOCATION_ID`
- `RAZORPAY_WEBHOOK_SECRET`
- Optional: `SHOPIFY_ADMIN_API_VERSION` (falls back to `SHOPIFY_API_VERSION`)

Shopify app permissions required for draft-order sync:

- `write_draft_orders` or `write_quick_sale`
- Staff account permission to manage draft orders

Runtime fallback behavior:

- If `draftOrderCreate` is blocked by permissions, the app now falls back to Shopify Admin REST `orders` create flow for paid-order sync.
- If `draftOrderComplete` fails, the app now falls back to Shopify Admin REST draft completion so drafts do not remain open.

## Shopify Fulfillment Webhook Sync

To sync vendor shipment and delivery updates from Shopify into Mongo/app order tracking:

1. Set `SHOPIFY_WEBHOOK_SECRET` in server environment.
2. In Shopify app webhook settings, subscribe these topics:
	- `fulfillments/create`
	- `fulfillments/update`
	- `fulfillments/cancelled`
3. Point each webhook endpoint to:
	- `POST /api/webhooks/shopify`

What syncs automatically:

- `fulfillmentStatus` (processing, fulfilled, cancelled)
- `shippingCarrier`
- `trackingNumber`
- `trackingUrl`
- `shippedAt` and `deliveredAt` timestamps

If these are missing in production, order documents can be marked paid in MongoDB but:

- `shopifySyncStatus` may become `failed` with `SHOPIFY_ADMIN_NOT_CONFIGURED`
- `shopifySyncStatus` may become `failed` with `SHOPIFY_DRAFT_ORDER_PERMISSION_DENIED` when app/user permissions are insufficient
- `inventorySyncStatus` may become `skipped` with `shopify_inventory_not_configured`

Readiness check endpoint:

- `GET /api/health/commerce-readiness`

This endpoint reports whether webhook, Shopify Admin sync, and inventory sync are properly configured.

Note:

- Qikink order push is not implemented in this repository yet.

## Product Size Charts Configuration

Product-level fallback size charts are configured in `src/lib/size-charts.ts`.

The modal resolves size charts in this order:

1. Shopify metafield chart (`custom.size_chart_json` or `custom.size_chart`)
2. Configured chart rule from `src/lib/size-charts.ts` (handle-first, then title match)
3. Generic fallback chart from available size options

### Add a New Product Size Chart in 1 Minute

1. Open `src/lib/size-charts.ts`.
2. Add a new object inside `PRODUCT_SIZE_CHART_RULES`.
3. Prefer `handle` for exact matching.
4. Use `titleIncludes` only as a backup pattern.
5. Fill the `chart.headers` and `chart.rows` with garment measurements.

Template:

```ts
{
	key: "my-product-chart",
	handle: "my-product-handle",
	titleIncludes: "my product",
	chart: {
		headers: ["Size", "Chest", "Length", "Shoulder"],
		rows: [
			["XS", "-", "-", "-"],
			["S", "-", "-", "-"],
			["M", "-", "-", "-"],
			["L", "-", "-", "-"],
			["XL", "-", "-", "-"],
			["2XL", "-", "-", "-"],
		],
		note: "*All measurements are in inches.",
	},
}
```

Notes:

- Keep units consistent per chart (inches or cm).
- If handle is known, do not rely only on `titleIncludes`.
- Prefer real garment measurements over body measurements unless explicitly labeled.

## Catalog Sub-Categories

The catalog now supports category + sub-category filters and metadata in API/UI.

- Taxonomy helpers and dynamic category tree: `src/lib/product-taxonomy.ts`
- Product API with category/sub-category filters: `src/app/api/products/route.ts`
- Sub-category lookup endpoint: `src/app/api/products/sub-categories/route.ts`
- Shop filter chips UI: `src/components/ShopListing.tsx`
- Full architecture + Mongoose schema blueprint: `docs/catalog-subcategories.md`

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

Full MongoDB setup (Atlas, env vars, schema, indexes, troubleshooting):

- docs/mongodb-setup.md

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
