import { NextResponse } from "next/server";
import { getShopifyDraftOrderScopeStatus } from "@/lib/shopify-admin";

export const runtime = "nodejs";

function hasValue(value: string | undefined) {
  return (value ?? "").trim().length > 0;
}

function redact(value: string | undefined) {
  if (!hasValue(value)) {
    return "missing";
  }

  const trimmed = (value ?? "").trim();
  if (trimmed.length <= 8) {
    return "set";
  }

  return `${trimmed.slice(0, 4)}...${trimmed.slice(-4)}`;
}

export async function GET() {
  try {
    const hasShopifyAdminStaticToken = hasValue(process.env.SHOPIFY_ADMIN_ACCESS_TOKEN);
    const hasShopifyAdminClientCredentials =
      hasValue(process.env.SHOPIFY_ADMIN_CLIENT_ID) && hasValue(process.env.SHOPIFY_ADMIN_CLIENT_SECRET);

    const checks = {
      shopifyStoreDomain: hasValue(process.env.SHOPIFY_STORE_DOMAIN),
      shopifyStorefrontAccessToken: hasValue(process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN),
      shopifyAdminAccessToken: hasShopifyAdminStaticToken,
      shopifyAdminClientCredentials: hasShopifyAdminClientCredentials,
      shopifyAdminAuthConfigured: hasShopifyAdminStaticToken || hasShopifyAdminClientCredentials,
      shopifyInventoryLocationId: hasValue(process.env.SHOPIFY_INVENTORY_LOCATION_ID),
      shopifyWebhookSecret: hasValue(process.env.SHOPIFY_WEBHOOK_SECRET),
      razorpayWebhookSecret: hasValue(process.env.RAZORPAY_WEBHOOK_SECRET),
      qikinkIntegrationImplemented: false,
    };

    const shopifyOrderSyncReady =
      checks.shopifyStoreDomain && checks.shopifyAdminAuthConfigured && checks.razorpayWebhookSecret;

    const inventorySyncReady =
      checks.shopifyStoreDomain && checks.shopifyAdminAuthConfigured && checks.shopifyInventoryLocationId;

    const paymentWebhookReady = checks.razorpayWebhookSecret;
    const fulfillmentWebhookReady = checks.shopifyWebhookSecret;

    const ready = shopifyOrderSyncReady && inventorySyncReady && paymentWebhookReady;

    const envPreview = {
      SHOPIFY_STORE_DOMAIN: redact(process.env.SHOPIFY_STORE_DOMAIN),
      SHOPIFY_ADMIN_ACCESS_TOKEN: redact(process.env.SHOPIFY_ADMIN_ACCESS_TOKEN),
      SHOPIFY_ADMIN_CLIENT_ID: redact(process.env.SHOPIFY_ADMIN_CLIENT_ID),
      SHOPIFY_ADMIN_CLIENT_SECRET: redact(process.env.SHOPIFY_ADMIN_CLIENT_SECRET),
      SHOPIFY_INVENTORY_LOCATION_ID: redact(process.env.SHOPIFY_INVENTORY_LOCATION_ID),
      SHOPIFY_WEBHOOK_SECRET: redact(process.env.SHOPIFY_WEBHOOK_SECRET),
      RAZORPAY_WEBHOOK_SECRET: redact(process.env.RAZORPAY_WEBHOOK_SECRET),
      SHOPIFY_API_VERSION: (process.env.SHOPIFY_API_VERSION ?? "2025-01").trim(),
      SHOPIFY_ADMIN_API_VERSION: (process.env.SHOPIFY_ADMIN_API_VERSION ?? "").trim() || "(uses SHOPIFY_API_VERSION)",
    };

    const status = ready ? 200 : 503;

    const draftOrderScope = checks.shopifyAdminAuthConfigured
      ? await getShopifyDraftOrderScopeStatus()
      : {
          ok: false,
          requiredScopePresent: false,
          scopes: [],
          reason: "shopify_admin_auth_not_configured",
        };

    return NextResponse.json(
      {
        ready,
        message: ready
          ? "Commerce sync dependencies are configured."
          : "Commerce sync is not fully configured. Check missing environment variables.",
        checks,
        capabilities: {
          paymentWebhookReady,
          shopifyOrderSyncReady,
          inventorySyncReady,
          draftOrderScopeReady: draftOrderScope.requiredScopePresent,
          fulfillmentWebhookReady,
          qikinkOrderPushReady: false,
        },
        diagnostics: {
          draftOrderScope,
        },
        envPreview,
        notes: [
          "If Shopify order sync fails with SHOPIFY_ADMIN_NOT_CONFIGURED, set SHOPIFY_ADMIN_ACCESS_TOKEN or SHOPIFY_ADMIN_CLIENT_ID + SHOPIFY_ADMIN_CLIENT_SECRET.",
          "If Shopify draft order creation fails with SHOPIFY_DRAFT_ORDER_PERMISSION_DENIED, grant write_draft_orders or write_quick_sale to the app and ensure the staff user can manage draft orders.",
          "To sync vendor dispatch/tracking updates from Shopify automatically, set SHOPIFY_WEBHOOK_SECRET and register fulfillments/create + fulfillments/update + fulfillments/cancelled webhooks to POST /api/webhooks/shopify.",
          "If inventory sync is skipped with shopify_inventory_not_configured, set SHOPIFY_INVENTORY_LOCATION_ID in server environment.",
          "Qikink order push is not implemented yet in this codebase.",
        ],
      },
      { status },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown readiness error";
    console.error("Commerce readiness check failed", error);
    return NextResponse.json(
      {
        ready: false,
        error: "Commerce readiness check failed",
        detail: message,
      },
      { status: 500 },
    );
  }
}
