import {
  findOrderWithCustomerByOrderId,
  normalizePhoneNumber,
  type AccountInventorySyncAttempt,
  updateInventorySyncStatusByOrderId,
} from "@/lib/account-data";

type ShopifyGraphQLError = {
  message: string;
  path?: string[];
};

type ShopifyAdminTokenResponse = {
  access_token?: string;
  expires_in?: number;
  scope?: string;
  error?: string;
  error_description?: string;
};

type ShopifyAdminAccessScopesResponse = {
  data?: {
    currentAppInstallation?: {
      accessScopes?: Array<{
        handle: string;
      }>;
    } | null;
  };
  errors?: ShopifyGraphQLError[];
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

type ShopifyInventoryAdjustResponse = {
  data?: {
    inventoryAdjustQuantities?: {
      userErrors?: Array<{
        field?: string[] | null;
        message: string;
      }>;
    };
  };
  errors?: ShopifyGraphQLError[];
};

type ShopifyInventoryAdjustmentResult = {
  status: "reserved" | "released" | "partial" | "failed" | "skipped";
  attempts: AccountInventorySyncAttempt[];
  reason?: string;
};

type ShopifyAdminConfig = {
  storeDomain: string;
  accessToken: string;
  apiVersion: string;
};

type ShopifyAdminAuthMode = "auto" | "token" | "client_credentials";

type ShopifyDraftOrderScopeStatus = {
  ok: boolean;
  requiredScopePresent: boolean;
  scopes: string[];
  reason?: string;
};

type ShopifyRestOrderCreateResponse = {
  order?: {
    id?: number | string;
    admin_graphql_api_id?: string;
    name?: string;
  };
  errors?: unknown;
};

type ShopifyRestDraftCompleteResponse = {
  draft_order?: {
    id?: number | string;
    order_id?: number | string;
    order?: {
      id?: number | string;
      admin_graphql_api_id?: string;
    };
  };
  errors?: unknown;
};

function getShopifyCustomerEmail(customer: { email: string; authProvider: "google" | "email" | "mobile" | "credentials" } | null) {
  if (!customer || customer.authProvider === "mobile") {
    return undefined;
  }

  const email = customer.email.trim();

  if (!email || email.toLowerCase().endsWith(".local")) {
    return undefined;
  }

  return email;
}

function getShopifyPhoneNumber(phone: string | undefined) {
  const raw = (phone ?? "").trim();

  if (!raw) {
    return undefined;
  }

  return normalizePhoneNumber(raw) || raw;
}

async function findExistingShopifyCustomer(input: { phone?: string; email?: string }) {
  const normalizedPhone = input.phone?.trim();
  const normalizedEmail = input.email?.trim().toLowerCase();
  const adminConfig = await getShopifyAdminConfig();

  const queryCandidates = [
    normalizedPhone ? `phone:${normalizedPhone}` : undefined,
    normalizedPhone ? normalizedPhone : undefined,
    normalizedEmail ? `email:${normalizedEmail}` : undefined,
    normalizedEmail ? normalizedEmail : undefined,
  ].filter((value): value is string => Boolean(value));

  for (const query of queryCandidates) {
    try {
      const response = await fetch(
        `https://${normalizeStoreDomain(adminConfig.storeDomain)}/admin/api/${adminConfig.apiVersion}/customers/search.json?query=${encodeURIComponent(query)}`,
        {
          headers: {
            "X-Shopify-Access-Token": adminConfig.accessToken,
          },
          cache: "no-store",
        },
      );

      if (!response.ok) {
        continue;
      }

      const data = (await response.json()) as { customers?: Array<{ id?: number | string; email?: string | null; phone?: string | null }> };
      const customer = data.customers?.find((entry) => {
        const normalizedEntryPhone = entry.phone ? getShopifyPhoneNumber(entry.phone) : undefined;
        const normalizedEntryEmail = entry.email?.trim().toLowerCase();

        return (normalizedPhone && normalizedEntryPhone && normalizedEntryPhone === normalizedPhone)
          || (normalizedEmail && normalizedEntryEmail && normalizedEntryEmail === normalizedEmail);
      });

      if (customer) {
        return {
          customerId: String(customer.id),
          email: customer.email ?? undefined,
          phone: customer.phone ?? undefined,
        };
      }
    } catch {
      continue;
    }
  }

  return null;
}

async function findExistingShopifyCustomerAcrossAllCustomers(input: { phone?: string; email?: string }) {
  const normalizedPhone = input.phone?.trim();
  const normalizedEmail = input.email?.trim().toLowerCase();
  const adminConfig = await getShopifyAdminConfig();

  try {
    const response = await fetch(
      `https://${normalizeStoreDomain(adminConfig.storeDomain)}/admin/api/${adminConfig.apiVersion}/customers.json?limit=250`,
      {
        headers: {
          "X-Shopify-Access-Token": adminConfig.accessToken,
        },
        cache: "no-store",
      },
    );

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as { customers?: Array<{ id?: number | string; email?: string | null; phone?: string | null }> };
    const customer = data.customers?.find((entry) => {
      const normalizedEntryPhone = entry.phone ? getShopifyPhoneNumber(entry.phone) : undefined;
      const normalizedEntryEmail = entry.email?.trim().toLowerCase();

      return (normalizedPhone && normalizedEntryPhone && normalizedEntryPhone === normalizedPhone)
        || (normalizedEmail && normalizedEntryEmail && normalizedEntryEmail === normalizedEmail);
    });

    if (!customer) {
      return null;
    }

    return {
      customerId: String(customer.id),
      email: customer.email ?? undefined,
      phone: customer.phone ?? undefined,
    };
  } catch {
    return null;
  }
}

async function ensureShopifyCustomerForOrder(input: { phone?: string; email?: string; firstName: string; lastName: string }) {
  const normalizedPhone = input.phone ? getShopifyPhoneNumber(input.phone) : undefined;
  const normalizedEmail = input.email?.trim().toLowerCase();

  const existingCustomer = await findExistingShopifyCustomer({ phone: normalizedPhone, email: normalizedEmail });

  if (existingCustomer) {
    return { customerId: existingCustomer.customerId, created: false };
  }

  const shopifyEmail = normalizedEmail && normalizedEmail.includes("@") ? normalizedEmail : undefined;

  if (!shopifyEmail && !normalizedPhone) {
    return { customerId: undefined, created: false };
  }

  const adminConfig = await getShopifyAdminConfig();

  const response = await fetch(
    `https://${normalizeStoreDomain(adminConfig.storeDomain)}/admin/api/${adminConfig.apiVersion}/customers.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": adminConfig.accessToken,
      },
      body: JSON.stringify({
        customer: {
          first_name: input.firstName,
          last_name: input.lastName,
          email: shopifyEmail,
          phone: normalizedPhone,
          verified_email: Boolean(shopifyEmail),
        },
      }),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    const duplicateErrorText = errorText.toLowerCase();
    const looksLikeDuplicateCustomerError =
      duplicateErrorText.includes("email_address")
      || duplicateErrorText.includes("phone_number")
      || duplicateErrorText.includes("has already been taken")
      || duplicateErrorText.includes("already exists");

    if (looksLikeDuplicateCustomerError) {
      const retriedCustomer =
        (await findExistingShopifyCustomer({ phone: normalizedPhone, email: normalizedEmail }))
        ?? (await findExistingShopifyCustomerAcrossAllCustomers({ phone: normalizedPhone, email: normalizedEmail }));

      if (retriedCustomer) {
        return { customerId: retriedCustomer.customerId, created: false };
      }
    }

    const retriedCustomer = await findExistingShopifyCustomer({ phone: normalizedPhone, email: normalizedEmail });

    if (retriedCustomer) {
      return { customerId: retriedCustomer.customerId, created: false };
    }

    throw new Error(`SHOPIFY_CUSTOMER_CREATE_HTTP_${response.status}:${errorText}`);
  }

  const data = (await response.json()) as { customer?: { id?: number | string } };
  const customerId = data.customer?.id ? String(data.customer.id) : undefined;

  if (!customerId) {
    const retriedCustomer = await findExistingShopifyCustomer({ phone: normalizedPhone, email: normalizedEmail });
    if (retriedCustomer) {
      return { customerId: retriedCustomer.customerId, created: false };
    }

    throw new Error("SHOPIFY_CUSTOMER_CREATE_MISSING_ID");
  }

  return { customerId, created: true };
}

const DRAFT_ORDER_SCOPE_CACHE_TTL_MS = 5 * 60 * 1000;

let cachedShopifyAdminToken:
  | {
      token: string;
      expiresAt: number;
    }
  | null = null;

let cachedDraftOrderScopeCheck:
  | {
      checkedAt: number;
      hasRequiredScope: boolean;
      reason?: string;
    }
  | null = null;

function normalizeStoreDomain(value: string) {
  return value.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

function trimEnv(value: string | undefined) {
  return (value ?? "").trim();
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

function toShopifyGid(resource: "Location" | "InventoryItem", value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return "";
  }

  if (trimmed.startsWith("gid://shopify/")) {
    return trimmed;
  }

  const numeric = normalizeShopifyNumericId(trimmed);
  return numeric ? `gid://shopify/${resource}/${numeric}` : "";
}

function splitCustomerName(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return { firstName: "Firaang", lastName: "Customer" };
  }

  const [firstName, ...rest] = trimmed.split(/\s+/);
  const lastName = rest.join(" ").trim();

  return {
    firstName: firstName || "Firaang",
    lastName: lastName || "Customer",
  };
}

async function runShopifyAdminMutation<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const { storeDomain, accessToken, apiVersion } = await getShopifyAdminConfig();

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

async function getShopifyAdminConfig(): Promise<ShopifyAdminConfig> {
  const storeDomain = trimEnv(process.env.SHOPIFY_STORE_DOMAIN);
  const apiVersion = trimEnv(process.env.SHOPIFY_ADMIN_API_VERSION) || trimEnv(process.env.SHOPIFY_API_VERSION) || "2025-01";

  if (!storeDomain) {
    throw new Error("SHOPIFY_ADMIN_NOT_CONFIGURED");
  }

  const accessToken = await resolveShopifyAdminAccessToken(storeDomain);

  if (!accessToken) {
    throw new Error("SHOPIFY_ADMIN_NOT_CONFIGURED");
  }

  return {
    storeDomain,
    accessToken,
    apiVersion,
  };
}

function readShopifyAdminAuthMode(): ShopifyAdminAuthMode {
  const raw = trimEnv(process.env.SHOPIFY_ADMIN_AUTH_MODE).toLowerCase();

  if (raw === "token") {
    return "token";
  }

  if (raw === "client_credentials") {
    return "client_credentials";
  }

  return "auto";
}

async function fetchShopifyAdminTokenFromClientCredentials(
  storeDomain: string,
  clientId: string,
  clientSecret: string,
) {
  if (cachedShopifyAdminToken && Date.now() < cachedShopifyAdminToken.expiresAt - 60_000) {
    return cachedShopifyAdminToken.token;
  }

  const tokenResponse = await fetch(`https://${normalizeStoreDomain(storeDomain)}/admin/oauth/access_token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
    }),
    cache: "no-store",
  });

  if (!tokenResponse.ok) {
    throw new Error(`SHOPIFY_ADMIN_TOKEN_HTTP_${tokenResponse.status}`);
  }

  const tokenJson = (await tokenResponse.json()) as ShopifyAdminTokenResponse;
  const fetchedToken = trimEnv(tokenJson.access_token);

  if (!fetchedToken) {
    throw new Error("SHOPIFY_ADMIN_TOKEN_MISSING");
  }

  const expiresIn =
    typeof tokenJson.expires_in === "number" && Number.isFinite(tokenJson.expires_in) && tokenJson.expires_in > 0
      ? tokenJson.expires_in
      : 60 * 60;

  cachedShopifyAdminToken = {
    token: fetchedToken,
    expiresAt: Date.now() + expiresIn * 1000,
  };

  return fetchedToken;
}

async function resolveShopifyAdminAccessToken(storeDomain: string) {
  const configuredToken = trimEnv(process.env.SHOPIFY_ADMIN_ACCESS_TOKEN);
  const clientId = trimEnv(process.env.SHOPIFY_ADMIN_CLIENT_ID);
  const clientSecret = trimEnv(process.env.SHOPIFY_ADMIN_CLIENT_SECRET);
  const authMode = readShopifyAdminAuthMode();

  if (authMode === "token") {
    return configuredToken;
  }

  if (authMode === "client_credentials") {
    if (!clientId || !clientSecret) {
      return "";
    }
    return fetchShopifyAdminTokenFromClientCredentials(storeDomain, clientId, clientSecret);
  }

  if (clientId && clientSecret) {
    try {
      return await fetchShopifyAdminTokenFromClientCredentials(storeDomain, clientId, clientSecret);
    } catch {
      if (configuredToken) {
        return configuredToken;
      }
      throw new Error("SHOPIFY_ADMIN_TOKEN_FETCH_FAILED");
    }
  }

  return configuredToken;
}

function hasRequiredDraftOrderScope(scopeHandles: string[]) {
  return scopeHandles.includes("write_draft_orders") || scopeHandles.includes("write_quick_sale");
}

export async function getShopifyDraftOrderScopeStatus(): Promise<ShopifyDraftOrderScopeStatus> {
  try {
    const scopeResult = await runShopifyAdminMutation<ShopifyAdminAccessScopesResponse>(
      `query CurrentAppInstallationScopes {
        currentAppInstallation {
          accessScopes {
            handle
          }
        }
      }`,
      {},
    );

    if ((scopeResult.errors?.length ?? 0) > 0) {
      return {
        ok: false,
        requiredScopePresent: false,
        scopes: [],
        reason: scopeResult.errors?.map((error) => error.message).join("; ") || "Shopify GraphQL error during scope lookup",
      };
    }

    const handles = (scopeResult.data?.currentAppInstallation?.accessScopes ?? []).map((scope) => scope.handle);

    return {
      ok: true,
      requiredScopePresent: hasRequiredDraftOrderScope(handles),
      scopes: handles,
    };
  } catch (error) {
    return {
      ok: false,
      requiredScopePresent: false,
      scopes: [],
      reason: error instanceof Error ? error.message : "Unknown Shopify scope lookup error",
    };
  }
}

async function checkDraftOrderScopeReadiness() {
  if (cachedDraftOrderScopeCheck && Date.now() - cachedDraftOrderScopeCheck.checkedAt < DRAFT_ORDER_SCOPE_CACHE_TTL_MS) {
    return cachedDraftOrderScopeCheck;
  }

  const scopeStatus = await getShopifyDraftOrderScopeStatus();
  const hasRequiredScope = scopeStatus.ok && scopeStatus.requiredScopePresent;

  if (!scopeStatus.ok) {
    cachedDraftOrderScopeCheck = {
      checkedAt: Date.now(),
      hasRequiredScope: true,
      reason: scopeStatus.reason,
    };
    return cachedDraftOrderScopeCheck;
  }

  if (!hasRequiredScope && scopeStatus.scopes.length > 0) {
    const reason =
      "Shopify Admin token is missing required scope for draft orders. Add write_draft_orders or write_quick_sale to the app, reinstall/update app permissions, and ensure the staff user can manage draft orders.";
    cachedDraftOrderScopeCheck = {
      checkedAt: Date.now(),
      hasRequiredScope,
      reason,
    };
    return cachedDraftOrderScopeCheck;
  }

  cachedDraftOrderScopeCheck = {
    checkedAt: Date.now(),
    hasRequiredScope: true,
  };

  return cachedDraftOrderScopeCheck;
}

function isDraftOrderPermissionError(message: string) {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("draftordercreate") ||
    normalized.includes("write_draft_orders") ||
    normalized.includes("write_quick_sale") ||
    normalized.includes("manage draft orders")
  );
}

function formatDraftOrderPermissionError(message: string) {
  return `SHOPIFY_DRAFT_ORDER_PERMISSION_DENIED: ${message}. Fix by granting app scope write_draft_orders or write_quick_sale, then ensure the staff user has permission to manage draft orders.`;
}

function getRestOrderId(order?: ShopifyRestOrderCreateResponse["order"]) {
  if (!order) {
    return "";
  }

  if (typeof order.admin_graphql_api_id === "string" && order.admin_graphql_api_id.trim()) {
    return order.admin_graphql_api_id.trim();
  }

  if (typeof order.id === "number" || typeof order.id === "string") {
    return String(order.id).trim();
  }

  return "";
}

async function createPaidOrderViaRest(input: {
  customerEmail?: string;
  customerFirstName: string;
  customerLastName: string;
  customerPhone?: string;
  customerId?: string;
  orderId: string;
  paymentMethod: string;
  currencyCode?: string;
  shippingFee?: number;
  taxAmount?: number;
  discountAmount?: number;
  shippingLabel?: string;
  shippingMethod?: "surface" | "air";
  couponCode?: string;
  lineItems: Array<{ title: string; quantity: number; price: string; selectedSize?: string; selectedVariantId?: string }>;
  shippingAddress?: {
    firstName: string;
    lastName: string;
    address1: string;
    city: string;
    province: string;
    zip: string;
    country: string;
    phone?: string;
  };
}) {
  const adminConfig = await getShopifyAdminConfig();
  const normalizedCustomerId = input.customerId ? normalizeShopifyNumericId(input.customerId) : "";
  const duplicateCustomerError = (message: string) => {
    const lower = message.toLowerCase();
    return lower.includes("email_address") || lower.includes("phone_number") || lower.includes("has already been taken") || lower.includes("already exists");
  };

  const buildOrderPayload = (customerOverride?: { id?: number } | { first_name: string; last_name: string; email?: string; phone?: string }) => ({
    order: {
      email: input.customerEmail,
      ...(customerOverride ? { customer: customerOverride } : {}),
      financial_status: "paid",
      send_receipt: false,
      send_fulfillment_receipt: false,
      currency: input.currencyCode,
      taxes_included: false,
      note: `Firaang order ${input.orderId}`,
      tags: ["Firaang", "paid", input.paymentMethod, input.orderId].join(","),
      line_items: input.lineItems.map((item) => ({
        title: item.title,
        quantity: item.quantity,
        price: item.price,
        taxable: false,
        tax_lines: [],
        ...(item.selectedSize || item.selectedVariantId
          ? {
              properties: [
                ...(item.selectedSize ? [{ name: "Size", value: item.selectedSize }] : []),
                ...(item.selectedVariantId ? [{ name: "Variant ID", value: item.selectedVariantId }] : []),
              ],
            }
          : {}),
      })),
      tax_lines:
        (input.taxAmount ?? 0) > 0
          ? [
              {
                title: "Tax",
                price: (input.taxAmount ?? 0).toFixed(2),
                rate: 0,
              },
            ]
          : [],
      shipping_lines: [
        {
          title: input.shippingLabel || "Shipping",
          code: input.shippingMethod || "surface",
          price: (input.shippingFee ?? 0).toFixed(2),
          source: "Firaang",
          tax_lines: [],
        },
      ],
      discount_codes:
        (input.discountAmount ?? 0) > 0
          ? [
              {
                code: input.couponCode || "FIRAANG",
                amount: (input.discountAmount ?? 0).toFixed(2),
                type: "fixed_amount",
              },
            ]
          : [],
      shipping_address: input.shippingAddress,
    },
  });

  const createOrderRequest = async (customerOverride?: { id?: number } | { first_name: string; last_name: string; email?: string; phone?: string }) => {
    const response = await fetch(
      `https://${normalizeStoreDomain(adminConfig.storeDomain)}/admin/api/${adminConfig.apiVersion}/orders.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": adminConfig.accessToken,
        },
        body: JSON.stringify(buildOrderPayload(customerOverride)),
        cache: "no-store",
      },
    );

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      return { status: "failed" as const, reason: `SHOPIFY_ORDER_CREATE_HTTP_${response.status}:${body}`, response };
    }

    const data = (await response.json()) as ShopifyRestOrderCreateResponse;
    const shopifyOrderId = getRestOrderId(data.order);

    if (!shopifyOrderId) {
      const errorsAsString = data.errors ? JSON.stringify(data.errors) : "Unknown Shopify REST order create error";
      return { status: "failed" as const, reason: errorsAsString };
    }

    return {
      status: "synced" as const,
      shopifyOrderId,
      shopifyCustomerId: input.customerId,
    };
  };

  const initialCustomerOverride = normalizedCustomerId
    ? { id: Number(normalizedCustomerId) }
    : {
        first_name: input.customerFirstName,
        last_name: input.customerLastName,
        email: input.customerEmail,
        phone: input.customerPhone,
      };

  const initialResult = await createOrderRequest(initialCustomerOverride);

  if (initialResult.status === "synced") {
    return initialResult;
  }

  if (normalizedCustomerId) {
    return initialResult;
  }

  if (!duplicateCustomerError(initialResult.reason)) {
    return initialResult;
  }

  const recoveredCustomer =
    (input.customerEmail ? await findExistingShopifyCustomer({ email: input.customerEmail, phone: input.customerPhone }) : null)
    ?? (input.customerPhone ? await findExistingShopifyCustomer({ phone: input.customerPhone, email: input.customerEmail }) : null)
    ?? (input.customerEmail || input.customerPhone ? await findExistingShopifyCustomerAcrossAllCustomers({ email: input.customerEmail, phone: input.customerPhone }) : null);

  if (recoveredCustomer?.customerId) {
    const recoveredWithCustomerId = await createOrderRequest({ id: Number(normalizeShopifyNumericId(recoveredCustomer.customerId)) });
    if (recoveredWithCustomerId.status === "synced") {
      return { ...recoveredWithCustomerId, shopifyCustomerId: recoveredCustomer.customerId };
    }
    return recoveredWithCustomerId;
  }

  const retryWithoutCustomer = await createOrderRequest();
  if (retryWithoutCustomer.status === "synced") {
    return {
      ...retryWithoutCustomer,
      shopifyCustomerId: input.customerId,
    };
  }

  return initialResult;
}

async function completeDraftOrderViaRest(draftOrderId: string, paymentPending: boolean) {
  const adminConfig = await getShopifyAdminConfig();
  const numericDraftId = normalizeShopifyNumericId(draftOrderId);

  if (!numericDraftId) {
    return {
      status: "failed" as const,
      reason: "SHOPIFY_DRAFT_COMPLETE_INVALID_DRAFT_ID",
    };
  }

  const response = await fetch(
    `https://${normalizeStoreDomain(adminConfig.storeDomain)}/admin/api/${adminConfig.apiVersion}/draft_orders/${numericDraftId}/complete.json?payment_pending=${paymentPending ? "true" : "false"}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": adminConfig.accessToken,
      },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    return {
      status: "failed" as const,
      reason: `SHOPIFY_DRAFT_COMPLETE_HTTP_${response.status}:${body}`,
    };
  }

  const data = (await response.json()) as ShopifyRestDraftCompleteResponse;

  const graphOrderId = data.draft_order?.order?.admin_graphql_api_id;
  const restOrderId = data.draft_order?.order?.id ?? data.draft_order?.order_id;
  const shopifyOrderId = (graphOrderId && String(graphOrderId).trim()) || (restOrderId ? String(restOrderId).trim() : "");

  if (!shopifyOrderId) {
    const errorsAsString = data.errors ? JSON.stringify(data.errors) : "Unknown Shopify draft complete error";
    return {
      status: "failed" as const,
      reason: errorsAsString,
    };
  }

  return {
    status: "synced" as const,
    shopifyOrderId,
  };
}

async function adjustShopifyInventoryForVariants(
  items: Array<{ variantId: string; quantity: number }>,
  movement: "reserve" | "release",
) : Promise<ShopifyInventoryAdjustmentResult> {
  const locationId = process.env.SHOPIFY_INVENTORY_LOCATION_ID;
  const locationGid = toShopifyGid("Location", locationId ?? "");

  if (!locationGid) {
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
  const adjustmentMutation = `mutation InventoryAdjustQuantities($input: InventoryAdjustQuantitiesInput!, $idempotencyKey: String!) {
    inventoryAdjustQuantities(input: $input) @idempotent(key: $idempotencyKey) {
      userErrors {
        field
        message
      }
    }
  }`;

  for (const attempt of actionableAttempts) {
    try {
      const inventoryItemId = toShopifyGid("InventoryItem", attempt.inventoryItemId ?? "");

      if (!inventoryItemId) {
        attempt.status = "failed";
        attempt.message = "Invalid Shopify inventory item id";
        continue;
      }

      const mutationResult = await runShopifyAdminMutation<ShopifyInventoryAdjustResponse>(adjustmentMutation, {
        idempotencyKey: `inventory-${movement}-${attempt.variantId}-${attempt.quantity}`,
        input: {
          reason: "correction",
          name: "available",
          referenceDocumentUri: `firaang://order/${attempt.variantId}`,
          changes: [
            {
              inventoryItemId,
              locationId: locationGid,
              delta: attempt.quantity * adjustmentValue,
              changeFromQuantity: null,
            },
          ],
        },
      });

      const topLevelErrors = mutationResult.errors?.map((error) => error.message) ?? [];
      const userErrors = mutationResult.data?.inventoryAdjustQuantities?.userErrors ?? [];

      if (topLevelErrors.length > 0 || userErrors.length > 0) {
        attempt.status = "failed";
        attempt.message = [...topLevelErrors, ...userErrors.map((error) => error.message)].join("; ") || "Shopify inventory adjustment failed";
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
      shopifyCustomerId: orderWithCustomer.order.shopifyCustomerId,
    };
  }

  const customerName = orderWithCustomer.order.shippingName ?? orderWithCustomer.customer?.fullName ?? "Firaang Customer";
  const customerEmail = getShopifyCustomerEmail(orderWithCustomer.customer) ?? orderWithCustomer.order.shippingEmail;
  const customerPhone = getShopifyPhoneNumber(orderWithCustomer.order.shippingPhone ?? orderWithCustomer.customer?.phone);
  const { firstName, lastName } = splitCustomerName(customerName);
  const customerRecord = await ensureShopifyCustomerForOrder({
    email: customerEmail,
    phone: customerPhone,
    firstName,
    lastName,
  });

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
        country: orderWithCustomer.order.shippingCountry ?? "India",
        phone: customerPhone,
      }
    : undefined;

  return createPaidOrderViaRest({
    customerEmail,
    customerFirstName: firstName,
    customerLastName: lastName,
    customerPhone,
    customerId: customerRecord.customerId,
    orderId: orderWithCustomer.order.id,
    paymentMethod: orderWithCustomer.order.paymentMethod,
    currencyCode: orderWithCustomer.order.currencyCode,
    shippingFee: orderWithCustomer.order.shippingFee,
    taxAmount: orderWithCustomer.order.taxAmount,
    discountAmount: orderWithCustomer.order.discountAmount,
    shippingLabel: orderWithCustomer.order.shippingLabel,
    shippingMethod: orderWithCustomer.order.shippingMethod,
    couponCode: orderWithCustomer.order.couponCode,
    lineItems: lineItems.map((item) => ({
      title: item.title,
      quantity: item.quantity,
      price: item.originalUnitPrice,
    })),
    shippingAddress,
  });
}