import { NextResponse } from "next/server";

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
    const checks = {
      shopifyStoreDomain: hasValue(process.env.SHOPIFY_STORE_DOMAIN),
      shopifyStorefrontAccessToken: hasValue(process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN),
      shopifyAdminAccessToken: hasValue(process.env.SHOPIFY_ADMIN_ACCESS_TOKEN),
      shopifyInventoryLocationId: hasValue(process.env.SHOPIFY_INVENTORY_LOCATION_ID),
      razorpayWebhookSecret: hasValue(process.env.RAZORPAY_WEBHOOK_SECRET),
      qikinkIntegrationImplemented: false,
    };

    const shopifyOrderSyncReady =
      checks.shopifyStoreDomain && checks.shopifyAdminAccessToken && checks.razorpayWebhookSecret;

    const inventorySyncReady =
      checks.shopifyStoreDomain && checks.shopifyAdminAccessToken && checks.shopifyInventoryLocationId;

    const paymentWebhookReady = checks.razorpayWebhookSecret;

    const ready = shopifyOrderSyncReady && inventorySyncReady && paymentWebhookReady;

    const envPreview = {
      SHOPIFY_STORE_DOMAIN: redact(process.env.SHOPIFY_STORE_DOMAIN),
      SHOPIFY_ADMIN_ACCESS_TOKEN: redact(process.env.SHOPIFY_ADMIN_ACCESS_TOKEN),
      SHOPIFY_INVENTORY_LOCATION_ID: redact(process.env.SHOPIFY_INVENTORY_LOCATION_ID),
      RAZORPAY_WEBHOOK_SECRET: redact(process.env.RAZORPAY_WEBHOOK_SECRET),
      SHOPIFY_API_VERSION: (process.env.SHOPIFY_API_VERSION ?? "2025-01").trim(),
      SHOPIFY_ADMIN_API_VERSION: (process.env.SHOPIFY_ADMIN_API_VERSION ?? "").trim() || "(uses SHOPIFY_API_VERSION)",
    };

    const status = ready ? 200 : 503;

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
          qikinkOrderPushReady: false,
        },
        envPreview,
        notes: [
          "If Shopify order sync fails with SHOPIFY_ADMIN_NOT_CONFIGURED, set SHOPIFY_ADMIN_ACCESS_TOKEN in server environment.",
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
