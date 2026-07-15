# Analytics System Setup

This project now includes a custom, admin-only analytics pipeline for Next.js + MongoDB.

## Architecture Chosen

Hybrid approach:

1. First-party custom analytics in MongoDB for operational business metrics and private dashboarding.
2. Optional GA4 and/or Microsoft Clarity for marketing UX tooling and heatmaps.

Why this hybrid works:
- Keeps sensitive business funnel and order-attribution data in your own database.
- Works without vendor lock-in for core metrics.
- Lets you add free external tools later (GA4/Clarity) without replacing your dashboard.

## What Is Tracked

- Total events and unique visitors
- Page views and top pages
- Product views and top products
- Search keywords (from product API search query)
- Traffic source attribution (UTM/referrer/ad click ids)
- Location approximation (country/region/city from deployment headers where available)
- Device/browser/OS
- Session duration and bounce rate
- New vs returning visitors
- Conversion funnel counts:
  - Home
  - Product
  - Cart (add-to-cart)
  - Checkout
  - Payment
- Orders and revenue by traffic source
- Real-time active users (5-minute activity window)

## Admin Access Control

Analytics dashboard and API use account-session auth + email authorization.

Required env var:

- `ADMIN_EMAILS`
  - Comma-separated list of allowed admin account emails.
  - Example: `owner@firaang.com,ops@firaang.com`

If the logged-in account email is not in `ADMIN_EMAILS`, analytics endpoints return `401`, and `/admin/analytics` redirects to `/account`.

## Required Environment Variables

Existing MongoDB env vars are reused.

Optional analytics collection names:
- `MONGODB_ANALYTICS_EVENTS_COLLECTION` (default: `analytics_events`)
- `MONGODB_ANALYTICS_SESSIONS_COLLECTION` (default: `analytics_sessions`)

## Privacy Notes

- Analytics does not identify anonymous users by real identity.
- Visitor/session IDs are random pseudonymous IDs.
- Do Not Track (`DNT: 1`) requests are ignored by the tracking endpoint.
- Order and funnel attribution uses campaign/referrer metadata, not personal identity.

## Endpoints

- Track events: `POST /api/analytics/track`
- Dashboard summary: `GET /api/admin/analytics?preset=7d|30d|90d`

## UI Route

- `/admin/analytics`

## Important Limitations

- Anonymous visitors cannot be reliably tied to a real person.
- Geolocation is approximate and depends on hosting headers (Vercel/Cloudflare/proxy support).
- Ad attribution (gclid/fbclid/etc.) depends on campaign URL parameters and browser cookie continuity.
- Cross-device journeys are counted as different visitors unless user identity is explicitly linked.

## Optional External Integrations

You can still layer free external analytics:
- GA4 for ad-platform integrations and attribution reports.
- Microsoft Clarity for recordings and heatmaps.
- PostHog/Plausible for product analytics alternatives.

Custom dashboard remains source-of-truth for internal operational metrics.
