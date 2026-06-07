import {
  findOrderWithCustomerByOrderId,
  type AccountInventorySyncAttempt,
  updateInventorySyncStatusByOrderId,
} from "@/lib/account-data";

type ShopifyGraphQLError = {
  message: string;
  path?: string[];
};

type ShopifyDraftOrderResponse = {
  data?: {
    draftOrderCreate?: {
      draftOrder?: {
        id: string;
        name: string;
      } | null;
      userErrors?: Array<{
        field?: string[] | null;
        message: string;
      }>;
    };
    draftOrderComplete?: {
      draftOrder?: {
        id: string;
        name: string;
      } | null;
      order?: {
        id: string;
        name: string;
      } | null;
      userErrors?: Array<{
        field?: string[] | null;
        message: string;
      }>;
    };
  };
  errors?: ShopifyGraphQLError[];
};

type ShopifyVariantInventoryResponse = {
  data?: {
    nodes?: Array<
      | {
          id: string;
          title: string;
          inventoryItem?: {
            id: string;
            tracked: boolean;
          } | null;
        }
      | null
    >;
  };
  errors?: ShopifyGraphQLError[];
};

type ShopifyInventoryAdjustmentResult = {
  status: "reserved" | "released" | "partial" | "failed" | "skipped";
  attempts: AccountInventorySyncAttempt[];
  reason?: string;
};

function normalizeStoreDomain(value: string) {
  return value.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

function normalizeShopifyNumericId(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return "";
  }

  if (/^\d+$/.test(trimmed)) {
    return trimmed;
  }

  const gidMatch = trimmed.match(/\/(\d+)$/);
  return gidMatch?.[1] ?? "";
}

function splitCustomerName(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return { firstName: "Firaangi", lastName: "Customer" };
  }

  const [firstName, ...rest] = trimmed.split(/\s+/);
  const lastName = rest.join(" ").trim();

  return {
    firstName: firstName || "Firaangi",
    lastName: lastName || "Customer",
  };
}

async function runShopifyAdminMutation<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const storeDomain = process.env.SHOPIFY_STORE_DOMAIN;
  const accessToken = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
  const apiVersion = process.env.SHOPIFY_ADMIN_API_VERSION ?? process.env.SHOPIFY_API_VERSION ?? "2025-01";

  if (!storeDomain || !accessToken) {
    throw new Error("SHOPIFY_ADMIN_NOT_CONFIGURED");
  }

  const response = await fetch(`https://${normalizeStoreDomain(storeDomain)}/admin/api/${apiVersion}/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": accessToken,
    },
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`SHOPIFY_ADMIN_HTTP_${response.status}`);
  }

  return (await response.json()) as T;
}

async function adjustShopifyInventoryForVariants(
  items: Array<{ variantId: string; quantity: number }>,
  movement: "reserve" | "release",
) : Promise<ShopifyInventoryAdjustmentResult> {
  const storeDomain = process.env.SHOPIFY_STORE_DOMAIN;
  const accessToken = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
  const locationId = process.env.SHOPIFY_INVENTORY_LOCATION_ID;
  const apiVersion = process.env.SHOPIFY_ADMIN_API_VERSION ?? process.env.SHOPIFY_API_VERSION ?? "2025-01";
  const normalizedLocationId = normalizeShopifyNumericId(locationId ?? "");

  if (!storeDomain || !accessToken || !locationId || !normalizedLocationId) {
    return { status: "skipped", reason: "shopify_inventory_not_configured", attempts: [] };
  }

  const normalizedItems = Array.from(
    items.reduce((map, item) => {
      const key = item.variantId.trim();
      if (!key) {
        return map;
      }

      map.set(key, (map.get(key) ?? 0) + Math.max(1, Math.floor(item.quantity)));
      return map;
    }, new Map<string, number>()),
  ).map(([variantId, quantity]) => ({ variantId, quantity }));

  if (normalizedItems.length === 0) {
    return { status: "skipped", reason: "no_variant_items", attempts: [] };
  }

  const variantQuery = `query InventoryVariants($ids: [ID!]!) {
    nodes(ids: $ids) {
      ... on ProductVariant {
        id
        title
        inventoryItem {
          id
          tracked
        }
      }
    }
  }`;

  const variantResponse = await runShopifyAdminMutation<ShopifyVariantInventoryResponse>(variantQuery, {
    ids: normalizedItems.map((item) => item.variantId),
  });

  const nodes = variantResponse.data?.nodes ?? [];
  const attempts: AccountInventorySyncAttempt[] = [];

  if ((variantResponse.errors?.length ?? 0) > 0) {
    attempts.push(
      ...normalizedItems.map((item) => ({
        variantId: item.variantId,
        quantity: item.quantity,
        status: "failed" as const,
        message: variantResponse.errors?.map((error) => error.message).join("; ") ?? "Shopify returned a GraphQL error",
      })),
    );

    return {
      status: "failed",
      reason: variantResponse.errors?.map((error) => error.message).join("; ") ?? "Shopify variant lookup failed",
      attempts,
    };
  }

  normalizedItems.forEach((requested, index) => {
    const node = nodes[index];
    const inventoryItemId = node?.inventoryItem?.id;
    const tracked = node?.inventoryItem?.tracked ?? false;

    if (!node) {
      attempts.push({
        variantId: requested.variantId,
        quantity: requested.quantity,
        status: "failed",
        message: "Shopify variant was not returned for inventory sync",
      });
      return;
    }

    if (!inventoryItemId) {
      attempts.push({
        variantId: requested.variantId,
        quantity: requested.quantity,
        status: "skipped",
        message: "Variant has no inventory item",
      });
      return;
    }

    if (!tracked) {
      attempts.push({
        variantId: requested.variantId,
        quantity: requested.quantity,
        status: "skipped",
        inventoryItemId,
        message: "Inventory item is not tracked in Shopify",
      });
      return;
    }

    attempts.push({
      variantId: requested.variantId,
      quantity: requested.quantity,
      status: movement === "reserve" ? "reserved" : "released",
      inventoryItemId,
    });
  });

  const actionableAttempts = attempts.filter((attempt) => attempt.status === "reserved" || attempt.status === "released");

  if (actionableAttempts.length === 0) {
    const reason = attempts.some((attempt) => attempt.status === "failed") ? "no_successful_inventory_items" : "no_tracked_inventory_items";
    return { status: attempts.some((attempt) => attempt.status === "failed") ? "failed" : "skipped", reason, attempts };
  }

  const adjustmentValue = movement === "reserve" ? -1 : 1;

  for (const attempt of actionableAttempts) {
    try {
      const response = await fetch(
        `https://${normalizeStoreDomain(storeDomain)}/admin/api/${apiVersion}/inventory_levels/adjust.json`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Shopify-Access-Token": accessToken,
          },
          body: JSON.stringify({
            location_id: Number.parseInt(normalizedLocationId, 10),
            inventory_item_id: Number.parseInt(normalizeShopifyNumericId(attempt.inventoryItemId ?? "0"), 10),
            available_adjustment: attempt.quantity * adjustmentValue,
          }),
          cache: "no-store",
        },
      );

      if (!response.ok) {
        const body = await response.text().catch(() => "");
        attempt.status = "failed";
        attempt.message = `SHOPIFY_INVENTORY_HTTP_${response.status}:${body}`;
      }
    } catch (error) {
      attempt.status = "failed";
      attempt.message = error instanceof Error ? error.message : "Unknown Shopify inventory adjustment error";
    }
  }

  const successCount = attempts.filter((attempt) => attempt.status === "reserved" || attempt.status === "released").length;
  const failureCount = attempts.filter((attempt) => attempt.status === "failed").length;
  const skippedCount = attempts.filter((attempt) => attempt.status === "skipped").length;

  const summaryStatus =
    failureCount > 0
      ? successCount > 0 || skippedCount > 0
        ? "partial"
        : "failed"
      : skippedCount > 0
        ? successCount > 0
          ? "partial"
          : "skipped"
        : movement === "reserve"
          ? "reserved"
          : "released";

  return { status: summaryStatus, attempts };
}

export async function syncShopifyInventoryForOrder(orderId: string, movement: "reserve" | "release") {
  const orderWithCustomer = await findOrderWithCustomerByOrderId(orderId);

  if (!orderWithCustomer) {
    await updateInventorySyncStatusByOrderId(orderId, {
      status: "failed",
      error: "Order not found for inventory sync",
    });
    return { status: "failed" as const, reason: "order_not_found" };
  }

  try {
    const result = await adjustShopifyInventoryForVariants(
      orderWithCustomer.order.items.map((item) => ({ variantId: item.productId, quantity: item.quantity })),
      movement,
    );

    if (result.status === "reserved" || result.status === "released" || result.status === "partial") {
      await updateInventorySyncStatusByOrderId(orderId, {
        status: result.status,
        attempts: result.attempts,
        error: result.status === "partial" ? "One or more Shopify inventory adjustments failed" : undefined,
      });
    } else {
      await updateInventorySyncStatusByOrderId(orderId, {
        status: "skipped",
        error: result.reason,
        attempts: result.attempts,
      });
    }

    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Shopify inventory sync error";
    await updateInventorySyncStatusByOrderId(orderId, {
      status: "failed",
      error: message,
      attempts: [],
    });
    return { status: "failed" as const, reason: message, attempts: [] };
  }
}

export async function syncPaidOrderToShopify(orderId: string) {
  const orderWithCustomer = await findOrderWithCustomerByOrderId(orderId);

  if (!orderWithCustomer) {
    return { status: "skipped" as const, reason: "order_not_found" };
  }

  if (orderWithCustomer.order.shopifyOrderId || orderWithCustomer.order.shopifySyncStatus === "synced") {
    return {
      status: "skipped" as const,
      reason: "already_synced",
      shopifyOrderId: orderWithCustomer.order.shopifyOrderId,
    };
  }

  const customerName = orderWithCustomer.order.shippingName ?? orderWithCustomer.customer?.fullName ?? "Firaangi Customer";
  const customerEmail = orderWithCustomer.customer?.email;
  const { firstName, lastName } = splitCustomerName(customerName);

  const lineItems = orderWithCustomer.order.items.map((item) => ({
    title: item.name,
    quantity: item.quantity,
    originalUnitPrice: item.unitPrice.toFixed(2),
  }));

  const shippingAddress = orderWithCustomer.order.shippingAddress
    ? {
        firstName,
        lastName,
        address1: orderWithCustomer.order.shippingAddress,
        city: orderWithCustomer.order.shippingCity ?? "",
        province: orderWithCustomer.order.shippingState ?? "",
        zip: orderWithCustomer.order.shippingPinCode ?? "",
        country: "India",
        phone: "",
      }
    : undefined;

  const createResult = await runShopifyAdminMutation<ShopifyDraftOrderResponse>(
    `mutation DraftOrderCreate($input: DraftOrderInput!) {
      draftOrderCreate(input: $input) {
        draftOrder {
          id
          name
        }
        userErrors {
          field
          message
        }
      }
    }`,
    {
      input: {
        email: customerEmail,
        note: `Firaangi order ${orderWithCustomer.order.id}`,
        tags: ["firaangi", "paid", orderWithCustomer.order.paymentMethod, orderWithCustomer.order.id],
        lineItems,
        shippingAddress,
      },
    },
  );

  const createErrors = createResult.data?.draftOrderCreate?.userErrors ?? [];
  const draftOrder = createResult.data?.draftOrderCreate?.draftOrder;

  if (createErrors.length > 0 || !draftOrder) {
    const message = createErrors.map((item) => item.message).join("; ") || createResult.errors?.[0]?.message || "Unknown Shopify admin error";
    return { status: "failed" as const, reason: message };
  }

  const completeResult = await runShopifyAdminMutation<ShopifyDraftOrderResponse>(
    `mutation DraftOrderComplete($id: ID!, $paymentPending: Boolean!) {
      draftOrderComplete(id: $id, paymentPending: $paymentPending) {
        draftOrder {
          id
          name
        }
        order {
          id
          name
        }
        userErrors {
          field
          message
        }
      }
    }`,
    {
      id: draftOrder.id,
      paymentPending: false,
    },
  );

  const completeErrors = completeResult.data?.draftOrderComplete?.userErrors ?? [];
  const completedOrderId = completeResult.data?.draftOrderComplete?.order?.id ?? draftOrder.id;

  if (completeErrors.length > 0) {
    return {
      status: "failed" as const,
      reason: completeErrors.map((item) => item.message).join("; "),
      shopifyOrderId: completedOrderId,
    };
  }

  return {
    status: "synced" as const,
    shopifyOrderId: completedOrderId,
  };
}