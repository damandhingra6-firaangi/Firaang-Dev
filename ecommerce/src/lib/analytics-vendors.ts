"use client";

export type AnalyticsCatalogItem = {
  item_id: string;
  item_name: string;
  price?: number;
  quantity?: number;
  item_brand?: string;
  item_category?: string;
  item_category2?: string;
  item_variant?: string;
};

type VendorEventOptions = {
  dedupeKey?: string;
  dedupeTtlMs?: number;
};

type VendorCartEventInput = VendorEventOptions & {
  currencyCode: string;
  value: number;
  items: AnalyticsCatalogItem[];
};

type VendorPurchaseEventInput = VendorEventOptions & {
  transactionId: string;
  currencyCode: string;
  value: number;
  items: AnalyticsCatalogItem[];
  coupon?: string;
  shipping?: number;
  tax?: number;
};

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
    doNotTrack?: string;
  }
}

type PrivacyAwareNavigator = Navigator & {
  doNotTrack?: string;
  globalPrivacyControl?: boolean;
};

type PrivacyAwareWindow = Window & {
  doNotTrack?: string;
};

const DEDUPE_PREFIX = "Firaang-vendor-event";
const DEFAULT_DEDUPE_TTL_MS = 30 * 60 * 1000;

function hasWindow() {
  return typeof window !== "undefined";
}

function isDoNotTrackEnabled() {
  if (!hasWindow()) {
    return false;
  }

  const privacyNavigator = navigator as PrivacyAwareNavigator;
  const privacyWindow = window as PrivacyAwareWindow;

  return (
    privacyNavigator.doNotTrack === "1" ||
    privacyWindow.doNotTrack === "1" ||
    privacyNavigator.globalPrivacyControl === true
  );
}

function shouldSendVendorEvent(options?: VendorEventOptions) {
  if (isDoNotTrackEnabled()) {
    return false;
  }

  if (!hasWindow() || !options?.dedupeKey) {
    return true;
  }

  try {
    const storageKey = `${DEDUPE_PREFIX}:${options.dedupeKey}`;
    const previous = Number.parseInt(window.localStorage.getItem(storageKey) ?? "0", 10);
    const now = Date.now();
    const ttlMs = options.dedupeTtlMs ?? DEFAULT_DEDUPE_TTL_MS;

    if (Number.isFinite(previous) && previous > 0 && now - previous < ttlMs) {
      return false;
    }

    window.localStorage.setItem(storageKey, String(now));
  } catch {
    return true;
  }

  return true;
}

function emitGtag(eventName: string, params: Record<string, unknown>) {
  if (!hasWindow() || typeof window.gtag !== "function") {
    return;
  }

  window.gtag("event", eventName, params);
}

function emitFbq(eventName: string, params: Record<string, unknown>, options?: Record<string, unknown>) {
  if (!hasWindow() || typeof window.fbq !== "function") {
    return;
  }

  window.fbq("track", eventName, params, options);
}

function toMetaContents(items: AnalyticsCatalogItem[]) {
  return items.map((item) => ({
    id: item.item_id,
    quantity: item.quantity ?? 1,
    item_price: item.price ?? 0,
  }));
}

function totalItemQuantity(items: AnalyticsCatalogItem[]) {
  return items.reduce((sum, item) => sum + (item.quantity ?? 1), 0);
}

export function mapProductToAnalyticsItem(input: {
  id: string;
  name: string;
  price?: number;
  quantity?: number;
  brand?: string;
  category?: string;
  subCategory?: string;
  variant?: string;
}) {
  return {
    item_id: input.id,
    item_name: input.name,
    price: input.price,
    quantity: input.quantity,
    item_brand: input.brand,
    item_category: input.category,
    item_category2: input.subCategory,
    item_variant: input.variant,
  } satisfies AnalyticsCatalogItem;
}

export function trackVendorPageView(input: {
  pagePath: string;
  pageLocation?: string;
  pageTitle?: string;
}) {
  if (!shouldSendVendorEvent({ dedupeKey: `page_view:${input.pagePath}`, dedupeTtlMs: 1500 })) {
    return;
  }

  emitGtag("page_view", {
    page_path: input.pagePath,
    page_location: input.pageLocation,
    page_title: input.pageTitle,
  });

  emitFbq("PageView", {});
}

export function trackVendorItemListView(input: VendorEventOptions & {
  listId: string;
  listName: string;
  items: AnalyticsCatalogItem[];
}) {
  if (!shouldSendVendorEvent(input)) {
    return;
  }

  emitGtag("view_item_list", {
    item_list_id: input.listId,
    item_list_name: input.listName,
    items: input.items,
  });
}

export function trackVendorSelectItem(input: VendorEventOptions & {
  listId: string;
  listName: string;
  item: AnalyticsCatalogItem;
}) {
  if (!shouldSendVendorEvent(input)) {
    return;
  }

  emitGtag("select_item", {
    item_list_id: input.listId,
    item_list_name: input.listName,
    items: [input.item],
  });
}

export function trackVendorProductView(input: VendorEventOptions & {
  currencyCode: string;
  value: number;
  item: AnalyticsCatalogItem;
}) {
  if (!shouldSendVendorEvent(input)) {
    return;
  }

  emitGtag("view_item", {
    currency: input.currencyCode,
    value: input.value,
    items: [input.item],
  });

  emitFbq("ViewContent", {
    content_ids: [input.item.item_id],
    content_name: input.item.item_name,
    content_type: "product",
    content_category: input.item.item_category,
    value: input.value,
    currency: input.currencyCode,
  });
}

export function trackVendorAddToCart(input: VendorCartEventInput) {
  if (!shouldSendVendorEvent(input)) {
    return;
  }

  emitGtag("add_to_cart", {
    currency: input.currencyCode,
    value: input.value,
    items: input.items,
  });

  emitFbq("AddToCart", {
    content_ids: input.items.map((item) => item.item_id),
    contents: toMetaContents(input.items),
    content_type: "product",
    num_items: totalItemQuantity(input.items),
    value: input.value,
    currency: input.currencyCode,
  });
}

export function trackVendorRemoveFromCart(input: VendorCartEventInput) {
  if (!shouldSendVendorEvent(input)) {
    return;
  }

  emitGtag("remove_from_cart", {
    currency: input.currencyCode,
    value: input.value,
    items: input.items,
  });
}

export function trackVendorViewCart(input: VendorCartEventInput) {
  if (!shouldSendVendorEvent(input)) {
    return;
  }

  emitGtag("view_cart", {
    currency: input.currencyCode,
    value: input.value,
    items: input.items,
  });
}

export function trackVendorBeginCheckout(input: VendorCartEventInput) {
  if (!shouldSendVendorEvent(input)) {
    return;
  }

  emitGtag("begin_checkout", {
    currency: input.currencyCode,
    value: input.value,
    items: input.items,
  });

  emitFbq("InitiateCheckout", {
    content_ids: input.items.map((item) => item.item_id),
    contents: toMetaContents(input.items),
    content_type: "product",
    num_items: totalItemQuantity(input.items),
    value: input.value,
    currency: input.currencyCode,
  });
}

export function trackVendorAddShippingInfo(input: VendorCartEventInput & { shippingTier: string }) {
  if (!shouldSendVendorEvent(input)) {
    return;
  }

  emitGtag("add_shipping_info", {
    currency: input.currencyCode,
    value: input.value,
    shipping_tier: input.shippingTier,
    items: input.items,
  });
}

export function trackVendorAddPaymentInfo(input: VendorCartEventInput & { paymentType: string }) {
  if (!shouldSendVendorEvent(input)) {
    return;
  }

  emitGtag("add_payment_info", {
    currency: input.currencyCode,
    value: input.value,
    payment_type: input.paymentType,
    items: input.items,
  });
}

export function trackVendorPurchase(input: VendorPurchaseEventInput) {
  if (!shouldSendVendorEvent({
    dedupeKey: input.dedupeKey ?? `purchase:${input.transactionId}`,
    dedupeTtlMs: input.dedupeTtlMs ?? 7 * 24 * 60 * 60 * 1000,
  })) {
    return;
  }

  emitGtag("purchase", {
    transaction_id: input.transactionId,
    currency: input.currencyCode,
    value: input.value,
    coupon: input.coupon,
    shipping: input.shipping,
    tax: input.tax,
    items: input.items,
  });

  emitFbq(
    "Purchase",
    {
      content_ids: input.items.map((item) => item.item_id),
      contents: toMetaContents(input.items),
      content_type: "product",
      num_items: totalItemQuantity(input.items),
      value: input.value,
      currency: input.currencyCode,
    },
    { eventID: input.transactionId },
  );
}