# Upstream timeout investigation

## Findings and inventory

The production host cannot be established from `fetch failed` alone. An AggregateError with two errors does not prove an IPv6 problem: inspect the nested connection errors and their addresses. No application route proxies an upstream response body, and there are no external rewrites or middleware fetches. The design-file route streams a local disk file, not HTTP.

Local verification on November 12, 2026: Node 24.13.1, Next 16.2.1, Windows. All six unauthenticated host probes succeeded in all four network profiles; DNS returned IPv4 only, and no proxy environment variables were present. However, the production build emitted three first-attempt ETIMEDOUT logs for `naya-moda.myshopify.com` and still completed successfully. This confirms intermittent Shopify API timeouts locally; it does not establish the production routing cause or prove that image requests caused the reported production pipe error.

A separate cPanel smoke test exposed missing-module HTTP 500s: the packaging script removed `.next/node_modules`, deleting Turbopack's MongoDB alias. The script now preserves those aliases. This is distinct from ETIMEDOUT, and a top-level npm install alone cannot restore the alias directory.

All direct server HTTP call sites found before this change:

| File and owning function | Target host | Frequency and behavior |
| --- | --- | --- |
| `src/lib/shopify.ts`: `fetchShopifyGraphQL` | `SHOPIFY_STORE_DOMAIN` (local configuration: `naya-moda.myshopify.com`) | Product, metadata, collection queries; pagination. Existing Next revalidation retained. |
| `src/lib/shopify-collections.ts`: `fetchCollectionsUncached` | `SHOPIFY_STORE_DOMAIN` | Pagination used by home and navbar. Previously no abort timeout; now bounded, with 30-second per-process cache and in-flight coalescing. |
| `src/lib/shopify-admin.ts`: `findExistingShopifyCustomer` | `SHOPIFY_STORE_DOMAIN` | Up to four search candidates per customer lookup; uncached private data. |
| Same: `findExistingShopifyCustomerAcrossAllCustomers` | `SHOPIFY_STORE_DOMAIN` | Recovery lookup; uncached private data. |
| Same: `ensureShopifyCustomerForOrder` | `SHOPIFY_STORE_DOMAIN` | Customer creation; not automatically retried. |
| Same: `runShopifyAdminMutation` | `SHOPIFY_STORE_DOMAIN` | GraphQL queries/mutations; conservative single attempt. |
| Same: `fetchShopifyAdminTokenFromClientCredentials` | `SHOPIFY_STORE_DOMAIN` | OAuth token exchange; existing expiry cache retained. |
| Same: `createOrderRequest` | `SHOPIFY_STORE_DOMAIN` | Paid order creation; no automatic replay. Existing duplicate-customer recovery remains. |
| Same: `completeDraftOrderViaRest` | `SHOPIFY_STORE_DOMAIN` | Draft completion; no automatic replay. |
| `src/lib/sms.ts`: `postTwilioForm` | `api.twilio.com` | SMS requests; not automatically retried to avoid duplicate sends. |
| Same: `postTwilioVerifyForm` | `verify.twilio.com` | OTP verification requests; no automatic replay. |
| `src/lib/order-notifications.ts`: `sendEmailViaResend` | `api.resend.com` | Order emails; no automatic replay. |
| `src/app/api/design/inquiry/route.ts`: `sendEmail` | `api.resend.com` | Two concurrent inquiry emails; existing non-fatal failure handling retained. |
| `src/app/api/webhooks/razorpay/route.ts`: `POST` | `api.razorpay.com` | Order GET on paid/authorized webhooks; optional enrichment failure remains non-fatal. |

Browser event-handler/effect fetches use same-origin `/api/...` endpoints and are not server outbound fetches. MongoDB, Razorpay SDK, and Google OAuth SDK have separate transports; this helper does not change those. No NetSuite, Microsoft Graph, or Teams webhook fetches were found.

The image configuration permits `cdn.shopify.com`. In Next 16.2.1, the built-in optimizer calls `fetchExternalImage` with a 7-second deadline, but rethrows network `TypeError` errors; that can surface as a pipe failure. `SafeImage` now uses Shopify CDN width transformations directly for that exact host. Local assets still use Next optimization. Hero images are already unoptimized. Old cached HTML or direct `/_next/image` URLs can still invoke the built-in optimizer.

## Resilience changes

`src/lib/upstream-fetch.ts` bounds each request, including body consumption, at 10 seconds by default. Safe reads retry ETIMEDOUT, ECONNRESET and transient connection errors, plus HTTP 429/502/503/504, with exponential backoff and jitter, up to three attempts. Other 4xx responses are returned without retry. Writes are single-attempt unless explicitly designated safe, such as Storefront GraphQL queries. No token, body, full URL, or upstream error message is logged.

The helper emits:

```text
[upstream-fetch] failed { host: 'naya-moda.myshopify.com', attempt: 1, code: 'ETIMEDOUT', operation: 'shopify-products', phase: 'headers', deadlineExceeded: true }
```

After three failed operations a host circuit opens for 30 seconds; each host allows at most eight active operations, and only one recovery probe after the cooldown. The circuit is process-local, not distributed. Retries take up to about 32 seconds in total at default settings. `SHOPIFY_FETCH_TIMEOUT_MS` and `SHOPIFY_FETCH_RETRIES` remain supported, with attempts capped at three.

`/api/products` returns JSON 504 for timeouts or 502 for other upstream network failures, instead of reporting an empty successful catalog. Existing page and metadata fallbacks remain unchanged. No upstream piping route needed conversion; the helper buffers API bodies before callers send a response.

## Network diagnosis

Run on the actual failing host (Node 20.12+), from the project directory:

```sh
node scripts/check-upstreams.mjs
```

For an extracted cPanel deployment, upload the diagnostic script into `scripts/` first. The runtime ZIP does not include diagnostic scripts. The probe requires the installed `next` dependency and reads local environment configuration only if present.

The credential-free probe reports Node/Next versions, only the presence of proxy environment variables, DNS families, HTTP reachability, and nested network error codes/addresses. It launches four fresh Node processes: default, `NODE_OPTIONS=--dns-result-order=ipv4first`, `NODE_OPTIONS=--no-network-family-autoselection`, and both flags. Existing NODE_OPTIONS are retained. Even HTTP 401/403/404/405 from these unauthenticated HEAD requests proves basic HTTP connectivity, not API authorization or access to a particular image. The probe does not test MongoDB or send emails, SMS, payments, or authenticated API requests.

If only one profile succeeds, investigate that host's IPv6 routing and DNS behavior before applying a process-wide workaround. Do not disable TLS validation. An application retry cannot repair missing outbound routing.

## Operator checklist

- Record the failing request pathname (`/_next/image` versus `/api/...` or a rendered page), timestamp, full nested connection codes/addresses, Node version, and deployment platform. Avoid logging URL query tokens.
- Permit outbound TCP 443 and DNS resolution for the hosts above. On AWS private subnets, verify NAT gateway/routes, security-group egress and network ACLs including return ephemeral ports. On cPanel, ask the provider about outbound restrictions and IPv6 connectivity.
- Verify upstream IP allowlists/WAF rules against the production egress IP. A local success cannot establish production connectivity.
- Verify `SHOPIFY_STORE_DOMAIN` is a hostname without path, and the API version and server-only credentials are configured. Missing config currently yields empty/fallback data; malformed config must be corrected.
- Check HTTP_PROXY, HTTPS_PROXY, NO_PROXY and lowercase equivalents without printing credentials. Native Node fetch does not universally honor these automatically. Recent Node supports opt-in `NODE_USE_ENV_PROXY=1` / `--use-env-proxy`; check the deployed runtime. Older runtimes need an explicitly configured proxy dispatcher. No proxy is enabled automatically by this patch.
- Check MongoDB Atlas network access separately; its driver is not fetch. Check Razorpay/Google SDK timeouts independently if their logs show failures.
- Deploy a new build, clear stale page/CDN HTML where necessary, and monitor host-tagged logs and circuit events. Regenerate the cPanel ZIP after source changes; install production dependencies on the host and preserve the packaged `.next/node_modules` alias directory.