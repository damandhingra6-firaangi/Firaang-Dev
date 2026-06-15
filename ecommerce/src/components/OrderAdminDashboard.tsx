"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, Loader2, RefreshCw, Save, ShieldCheck } from "lucide-react";

type AdminOrderItem = {
  productId: string;
  name: string;
  image: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
};

type AdminOrderRecord = {
  id: string;
  createdAt: string;
  totalAmount: number;
  currencyCode: string;
  status: "paid" | "pending" | "failed" | "cancelled";
  paymentMethod: "online" | "cod";
  paymentGateway?: "razorpay";
  paymentStatus?: "created" | "authorized" | "captured" | "failed" | "refunded";
  paymentId?: string;
  refundId?: string;
  refundAmount?: number;
  refundedAt?: string;
  shopifyOrderId?: string;
  shopifySyncStatus?: "pending" | "synced" | "failed" | "skipped";
  shopifySyncError?: string;
  inventorySyncStatus?: "pending" | "reserved" | "released" | "partial" | "failed" | "skipped";
  inventorySyncError?: string;
  inventorySyncAttempts?: Array<{
    variantId: string;
    quantity: number;
    status: "reserved" | "released" | "failed" | "skipped";
    message?: string;
    inventoryItemId?: string;
  }>;
  fulfillmentStatus?: "unfulfilled" | "processing" | "fulfilled" | "cancelled";
  shippingCarrier?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  shippedAt?: string;
  deliveredAt?: string;
  cancelledAt?: string;
  cancelReason?: string;
  shippingName?: string;
  shippingAddress?: string;
  shippingCity?: string;
  shippingState?: string;
  shippingPinCode?: string;
  customer?: {
    email: string;
    fullName: string;
  } | null;
  items: AdminOrderItem[];
};

type OrderUpdateDraft = {
  status?: AdminOrderRecord["status"];
  paymentStatus?: AdminOrderRecord["paymentStatus"];
  paymentId?: string;
  refundId?: string;
  refundAmount?: string;
  shopifyOrderId?: string;
  shopifySyncStatus?: AdminOrderRecord["shopifySyncStatus"];
  shopifySyncError?: string;
  fulfillmentStatus?: AdminOrderRecord["fulfillmentStatus"];
  shippingCarrier?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  shippedAt?: string;
  deliveredAt?: string;
  cancelReason?: string;
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function formatCurrency(amount: number, currencyCode: string) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: currencyCode, maximumFractionDigits: 0 }).format(amount);
}

function toDateTimeLocalValue(value?: string) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const pad = (input: number) => String(input).padStart(2, "0");
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function badgeClass(status?: string) {
  switch (status) {
    case "paid":
    case "captured":
    case "synced":
    case "reserved":
    case "released":
    case "fulfilled":
      return "border-emerald-400/40 bg-emerald-400/10 text-emerald-200";
    case "pending":
    case "created":
    case "processing":
    case "partial":
      return "border-amber-400/40 bg-amber-400/10 text-amber-200";
    case "failed":
      return "border-rose-400/40 bg-rose-400/10 text-rose-200";
    case "cancelled":
    case "refunded":
      return "border-slate-300/40 bg-slate-300/10 text-slate-100";
    default:
      return "border-[var(--gold)]/40 bg-[var(--gold)]/10 text-[var(--gold)]";
  }
}

export default function OrderAdminDashboard() {
  const [adminKey, setAdminKey] = useState("");
  const [orders, setOrders] = useState<AdminOrderRecord[]>([]);
  const [drafts, setDrafts] = useState<Record<string, OrderUpdateDraft>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSavingId, setIsSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const didAutoLoadRef = useRef(false);

  useEffect(() => {
    const savedKey = window.localStorage.getItem("Firaang-admin-key") ?? "";
    if (savedKey) {
      setAdminKey(savedKey);
    }
  }, []);

  useEffect(() => {
    if (didAutoLoadRef.current || !adminKey.trim()) {
      return;
    }

    didAutoLoadRef.current = true;
    void loadOrders();
  }, [adminKey]);

  const stats = useMemo(() => {
    const total = orders.length;
    const paid = orders.filter((order) => order.status === "paid").length;
    const cancelled = orders.filter((order) => order.status === "cancelled").length;
    const fulfilled = orders.filter((order) => order.fulfillmentStatus === "fulfilled").length;

    return { total, paid, cancelled, fulfilled };
  }, [orders]);

  const loadOrders = async () => {
    if (!adminKey.trim()) {
      setError("Enter the admin key to continue.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch("/api/admin/orders?limit=100", {
        headers: { "x-admin-key": adminKey.trim() },
        cache: "no-store",
      });

      const payload = (await response.json().catch(() => ({}))) as { orders?: AdminOrderRecord[]; error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to load orders");
      }

      const nextOrders = payload.orders ?? [];
      setOrders(nextOrders);
      setDrafts(
        Object.fromEntries(
          nextOrders.map((order) => [
            order.id,
            {
              status: order.status,
              paymentStatus: order.paymentStatus,
              paymentId: order.paymentId ?? "",
              refundId: order.refundId ?? "",
              refundAmount: order.refundAmount ? String(order.refundAmount) : "",
              shopifyOrderId: order.shopifyOrderId ?? "",
              shopifySyncStatus: order.shopifySyncStatus ?? "pending",
              shopifySyncError: order.shopifySyncError ?? "",
              fulfillmentStatus: order.fulfillmentStatus ?? "unfulfilled",
              shippingCarrier: order.shippingCarrier ?? "",
              trackingNumber: order.trackingNumber ?? "",
              trackingUrl: order.trackingUrl ?? "",
              shippedAt: order.shippedAt ?? "",
              deliveredAt: order.deliveredAt ?? "",
              cancelReason: order.cancelReason ?? "",
            },
          ]),
        ),
      );
      window.localStorage.setItem("Firaang-admin-key", adminKey.trim());
      setSuccessMessage(`Loaded ${nextOrders.length} orders.`);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load orders");
    } finally {
      setIsLoading(false);
    }
  };

  const updateDraft = (orderId: string, field: keyof OrderUpdateDraft, value: string) => {
    setDrafts((current) => ({
      ...current,
      [orderId]: {
        ...current[orderId],
        [field]: value,
      },
    }));
  };

  const saveOrder = async (orderId: string) => {
    const draft = drafts[orderId];
    if (!draft) {
      return;
    }

    if (!adminKey.trim()) {
      setError("Enter the admin key to continue.");
      return;
    }

    setIsSavingId(orderId);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch("/api/admin/orders", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": adminKey.trim(),
        },
        body: JSON.stringify({
          orderId,
          status: draft.status,
          paymentStatus: draft.paymentStatus,
          paymentId: draft.paymentId,
          refundId: draft.refundId,
          refundAmount: draft.refundAmount ? Number.parseInt(draft.refundAmount, 10) : undefined,
          shopifyOrderId: draft.shopifyOrderId,
          shopifySyncStatus: draft.shopifySyncStatus,
          shopifySyncError: draft.shopifySyncError,
          fulfillmentStatus: draft.fulfillmentStatus,
          shippingCarrier: draft.shippingCarrier,
          trackingNumber: draft.trackingNumber,
          trackingUrl: draft.trackingUrl,
          shippedAt: draft.shippedAt,
          deliveredAt: draft.deliveredAt,
          cancelReason: draft.cancelReason,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as { order?: AdminOrderRecord; error?: string };

      if (!response.ok || !payload.order) {
        throw new Error(payload.error ?? "Could not save order");
      }

      setOrders((current) => current.map((order) => (order.id === orderId ? payload.order! : order)));
      setDrafts((current) => ({
        ...current,
        [orderId]: {
          status: payload.order!.status,
          paymentStatus: payload.order!.paymentStatus,
          paymentId: payload.order!.paymentId ?? "",
          refundId: payload.order!.refundId ?? "",
          refundAmount: payload.order!.refundAmount ? String(payload.order!.refundAmount) : "",
          shopifyOrderId: payload.order!.shopifyOrderId ?? "",
          shopifySyncStatus: payload.order!.shopifySyncStatus ?? "pending",
          shopifySyncError: payload.order!.shopifySyncError ?? "",
          fulfillmentStatus: payload.order!.fulfillmentStatus ?? "unfulfilled",
          shippingCarrier: payload.order!.shippingCarrier ?? "",
          trackingNumber: payload.order!.trackingNumber ?? "",
          trackingUrl: payload.order!.trackingUrl ?? "",
          shippedAt: payload.order!.shippedAt ?? "",
          deliveredAt: payload.order!.deliveredAt ?? "",
          cancelReason: payload.order!.cancelReason ?? "",
        },
      }));
      setSuccessMessage(`Saved order ${orderId}.`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save order");
    } finally {
      setIsSavingId(null);
    }
  };

  return (
    <section className="section-shell py-10 md:py-14">
      <div className="mb-6 rounded-[28px] border border-[var(--gold)]/25 bg-[rgba(43,6,11,0.82)] p-6 shadow-2xl backdrop-blur md:p-8">
        <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-[var(--gold)]/35 px-3 py-1 text-xs uppercase tracking-[0.24em] text-[var(--gold)]">
          <ShieldCheck className="h-3.5 w-3.5" />
          Internal Dashboard
        </p>
        <h1 className="text-4xl md:text-5xl">Orders Admin</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[#e9c9c3] md:text-base">
          Monitor paid orders, update fulfillment and tracking details, and keep Shopify sync state visible from one protected control panel.
        </p>

        <div className="mt-5 flex flex-col gap-3 md:flex-row">
          <input
            type="password"
            value={adminKey}
            onChange={(event) => setAdminKey(event.target.value)}
            placeholder="Enter FEEDBACK_ADMIN_KEY"
            className="min-w-0 flex-1 rounded-xl border border-[var(--gold)]/30 bg-[#3b0d14] px-4 py-3 text-sm text-white outline-none transition focus:border-[var(--gold)]"
          />
          <button
            type="button"
            onClick={() => void loadOrders()}
            disabled={isLoading}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--gold)] px-5 py-3 text-sm font-semibold text-[#2b060b] transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Load Orders
          </button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-4">
          {[
            { label: "Total", value: stats.total },
            { label: "Paid", value: stats.paid },
            { label: "Cancelled", value: stats.cancelled },
            { label: "Fulfilled", value: stats.fulfilled },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.18em] text-[#e9c9c3]">{item.label}</p>
              <p className="mt-2 text-2xl font-semibold text-white">{item.value}</p>
            </div>
          ))}
        </div>

        {error ? <p className="mt-4 rounded-xl border border-rose-400/40 bg-rose-950/50 px-4 py-3 text-sm text-rose-100">{error}</p> : null}
        {successMessage ? <p className="mt-4 rounded-xl border border-emerald-400/30 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-100">{successMessage}</p> : null}
      </div>

      <div className="space-y-5">
        {orders.map((order) => {
          const draft = drafts[order.id];

          return (
            <article key={order.id} className="rounded-[28px] border border-[var(--gold)]/20 bg-[var(--popup-card)] p-5 shadow-xl md:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--gold)]/15 pb-4">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--gold)]">Order #{order.id}</p>
                  <p className="mt-1 text-sm text-[var(--popup-muted)]">{formatDateTime(order.createdAt)}</p>
                  <p className="mt-2 text-sm text-[var(--popup-subtext)]">
                    {order.customer?.fullName || order.shippingName || "Unknown customer"} · {order.customer?.email || "No email"}
                  </p>
                  <p className="mt-1 text-sm text-[var(--popup-subtext)]">
                    {order.shippingCity ? `${order.shippingCity}, ` : ""}{order.shippingState ?? ""} {order.shippingPinCode ? `· ${order.shippingPinCode}` : ""}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xl text-[var(--popup-footer-text)]">{formatCurrency(order.totalAmount, order.currencyCode)}</p>
                  <div className="mt-2 flex flex-wrap justify-end gap-2">
                    <span className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${badgeClass(order.status)}`}>{order.status}</span>
                    <span className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${badgeClass(order.fulfillmentStatus)}`}>{order.fulfillmentStatus ?? "unfulfilled"}</span>
                    <span className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${badgeClass(order.shopifySyncStatus)}`}>{order.shopifySyncStatus ?? "pending"}</span>
                              <span className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${badgeClass(order.inventorySyncStatus)}`}>{order.inventorySyncStatus ?? "pending"}</span>
                  </div>
                </div>
              </div>

              {order.items.length > 0 ? (
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {order.items.map((item) => (
                    <div key={`${order.id}-${item.productId}`} className="rounded-2xl border border-white/10 bg-black/15 px-4 py-3">
                      <p className="text-sm text-[var(--popup-footer-text)]">{item.name}</p>
                      <p className="mt-1 text-xs text-[var(--popup-muted)]">Qty {item.quantity}</p>
                      <p className="mt-1 text-sm text-[var(--gold)]">{formatCurrency(item.lineTotal, order.currencyCode)}</p>
                    </div>
                  ))}
                </div>
              ) : null}

              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                <div className="space-y-3 rounded-2xl border border-[var(--gold)]/15 bg-[var(--popup-inner)] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--gold)]">Payment</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="text-xs uppercase tracking-[0.1em] text-[var(--popup-muted)]">
                      Status
                      <select value={draft?.paymentStatus ?? order.paymentStatus ?? "created"} onChange={(event) => updateDraft(order.id, "paymentStatus", event.target.value)} className="mt-1 w-full rounded-xl border border-[var(--gold)]/25 bg-[var(--popup-bg)] px-3 py-2 text-sm text-[var(--popup-footer-text)]">
                        <option value="created">created</option>
                        <option value="authorized">authorized</option>
                        <option value="captured">captured</option>
                        <option value="failed">failed</option>
                        <option value="refunded">refunded</option>
                      </select>
                    </label>
                    <label className="text-xs uppercase tracking-[0.1em] text-[var(--popup-muted)]">
                      Payment ID
                      <input value={draft?.paymentId ?? order.paymentId ?? ""} onChange={(event) => updateDraft(order.id, "paymentId", event.target.value)} className="mt-1 w-full rounded-xl border border-[var(--gold)]/25 bg-[var(--popup-bg)] px-3 py-2 text-sm text-[var(--popup-footer-text)]" />
                    </label>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="text-xs uppercase tracking-[0.1em] text-[var(--popup-muted)]">
                      Refund ID
                      <input value={draft?.refundId ?? order.refundId ?? ""} onChange={(event) => updateDraft(order.id, "refundId", event.target.value)} className="mt-1 w-full rounded-xl border border-[var(--gold)]/25 bg-[var(--popup-bg)] px-3 py-2 text-sm text-[var(--popup-footer-text)]" />
                    </label>
                    <label className="text-xs uppercase tracking-[0.1em] text-[var(--popup-muted)]">
                      Refund Amount
                      <input value={draft?.refundAmount ?? (order.refundAmount ? String(order.refundAmount) : "")} onChange={(event) => updateDraft(order.id, "refundAmount", event.target.value)} className="mt-1 w-full rounded-xl border border-[var(--gold)]/25 bg-[var(--popup-bg)] px-3 py-2 text-sm text-[var(--popup-footer-text)]" />
                    </label>
                  </div>
                </div>

                <div className="space-y-3 rounded-2xl border border-[var(--gold)]/15 bg-[var(--popup-inner)] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--gold)]">Fulfillment</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="text-xs uppercase tracking-[0.1em] text-[var(--popup-muted)]">
                      Status
                      <select value={draft?.fulfillmentStatus ?? order.fulfillmentStatus ?? "unfulfilled"} onChange={(event) => updateDraft(order.id, "fulfillmentStatus", event.target.value)} className="mt-1 w-full rounded-xl border border-[var(--gold)]/25 bg-[var(--popup-bg)] px-3 py-2 text-sm text-[var(--popup-footer-text)]">
                        <option value="unfulfilled">unfulfilled</option>
                        <option value="processing">processing</option>
                        <option value="fulfilled">fulfilled</option>
                        <option value="cancelled">cancelled</option>
                      </select>
                    </label>
                    <label className="text-xs uppercase tracking-[0.1em] text-[var(--popup-muted)]">
                      Shipping Carrier
                      <input value={draft?.shippingCarrier ?? order.shippingCarrier ?? ""} onChange={(event) => updateDraft(order.id, "shippingCarrier", event.target.value)} className="mt-1 w-full rounded-xl border border-[var(--gold)]/25 bg-[var(--popup-bg)] px-3 py-2 text-sm text-[var(--popup-footer-text)]" />
                    </label>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="text-xs uppercase tracking-[0.1em] text-[var(--popup-muted)]">
                      Tracking Number
                      <input value={draft?.trackingNumber ?? order.trackingNumber ?? ""} onChange={(event) => updateDraft(order.id, "trackingNumber", event.target.value)} className="mt-1 w-full rounded-xl border border-[var(--gold)]/25 bg-[var(--popup-bg)] px-3 py-2 text-sm text-[var(--popup-footer-text)]" />
                    </label>
                    <label className="text-xs uppercase tracking-[0.1em] text-[var(--popup-muted)]">
                      Tracking URL
                      <input value={draft?.trackingUrl ?? order.trackingUrl ?? ""} onChange={(event) => updateDraft(order.id, "trackingUrl", event.target.value)} className="mt-1 w-full rounded-xl border border-[var(--gold)]/25 bg-[var(--popup-bg)] px-3 py-2 text-sm text-[var(--popup-footer-text)]" />
                    </label>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="text-xs uppercase tracking-[0.1em] text-[var(--popup-muted)]">
                      Shipped At
                      <input type="datetime-local" value={draft?.shippedAt ?? toDateTimeLocalValue(order.shippedAt)} onChange={(event) => updateDraft(order.id, "shippedAt", event.target.value)} className="mt-1 w-full rounded-xl border border-[var(--gold)]/25 bg-[var(--popup-bg)] px-3 py-2 text-sm text-[var(--popup-footer-text)]" />
                    </label>
                    <label className="text-xs uppercase tracking-[0.1em] text-[var(--popup-muted)]">
                      Delivered At
                      <input type="datetime-local" value={draft?.deliveredAt ?? toDateTimeLocalValue(order.deliveredAt)} onChange={(event) => updateDraft(order.id, "deliveredAt", event.target.value)} className="mt-1 w-full rounded-xl border border-[var(--gold)]/25 bg-[var(--popup-bg)] px-3 py-2 text-sm text-[var(--popup-footer-text)]" />
                    </label>
                  </div>
                </div>

                <div className="space-y-3 rounded-2xl border border-[var(--gold)]/15 bg-[var(--popup-inner)] p-4 lg:col-span-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--gold)]">Commerce Sync</p>
                  <div className="grid gap-3 md:grid-cols-3">
                    <label className="text-xs uppercase tracking-[0.1em] text-[var(--popup-muted)]">
                      Shopify Order ID
                      <input value={draft?.shopifyOrderId ?? order.shopifyOrderId ?? ""} onChange={(event) => updateDraft(order.id, "shopifyOrderId", event.target.value)} className="mt-1 w-full rounded-xl border border-[var(--gold)]/25 bg-[var(--popup-bg)] px-3 py-2 text-sm text-[var(--popup-footer-text)]" />
                    </label>
                    <label className="text-xs uppercase tracking-[0.1em] text-[var(--popup-muted)]">
                      Shopify Sync
                      <select value={draft?.shopifySyncStatus ?? order.shopifySyncStatus ?? "pending"} onChange={(event) => updateDraft(order.id, "shopifySyncStatus", event.target.value)} className="mt-1 w-full rounded-xl border border-[var(--gold)]/25 bg-[var(--popup-bg)] px-3 py-2 text-sm text-[var(--popup-footer-text)]">
                        <option value="pending">pending</option>
                        <option value="synced">synced</option>
                        <option value="failed">failed</option>
                        <option value="skipped">skipped</option>
                      </select>
                    </label>
                    <label className="text-xs uppercase tracking-[0.1em] text-[var(--popup-muted)]">
                      Shopify Error
                      <input value={draft?.shopifySyncError ?? order.shopifySyncError ?? ""} onChange={(event) => updateDraft(order.id, "shopifySyncError", event.target.value)} className="mt-1 w-full rounded-xl border border-[var(--gold)]/25 bg-[var(--popup-bg)] px-3 py-2 text-sm text-[var(--popup-footer-text)]" />
                    </label>
                  </div>
                  <label className="text-xs uppercase tracking-[0.1em] text-[var(--popup-muted)]">
                    Cancel Reason
                    <input value={draft?.cancelReason ?? order.cancelReason ?? ""} onChange={(event) => updateDraft(order.id, "cancelReason", event.target.value)} className="mt-1 w-full rounded-xl border border-[var(--gold)]/25 bg-[var(--popup-bg)] px-3 py-2 text-sm text-[var(--popup-footer-text)]" />
                  </label>
                </div>
                  {order.inventorySyncAttempts?.length ? (
                    <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--popup-muted)]">Inventory Adjustments</p>
                      <div className="mt-3 space-y-2">
                        {order.inventorySyncAttempts.map((attempt, index) => (
                          <div key={`${order.id}-${attempt.variantId}-${index}`} className="rounded-xl border border-white/10 bg-[rgba(255,255,255,0.03)] px-3 py-2">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="text-sm text-[var(--popup-footer-text)]">{attempt.variantId}</p>
                              <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${badgeClass(attempt.status)}`}>{attempt.status}</span>
                            </div>
                            <p className="mt-1 text-xs text-[var(--popup-muted)]">Qty {attempt.quantity}{attempt.inventoryItemId ? ` · ${attempt.inventoryItemId}` : ""}</p>
                            {attempt.message ? <p className="mt-1 text-xs text-rose-100/90">{attempt.message}</p> : null}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  {order.inventorySyncError || order.shopifySyncError ? (
                    <div className="rounded-xl border border-rose-400/20 bg-rose-950/30 px-3 py-2 text-xs text-rose-100">
                      {order.inventorySyncError ? <p>Inventory sync: {order.inventorySyncError}</p> : null}
                      {order.shopifySyncError ? <p>Shopify sync: {order.shopifySyncError}</p> : null}
                    </div>
                  ) : null}
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => void saveOrder(order.id)}
                  disabled={isSavingId === order.id}
                  className="inline-flex items-center gap-2 rounded-full bg-[var(--gold)] px-4 py-2.5 text-sm font-semibold text-[#2b060b] transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSavingId === order.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save Changes
                </button>
                <p className="text-sm text-[var(--popup-muted)]">
                  Payment: {order.paymentMethod === "cod" ? "Cash on Delivery" : "Online"}
                  {order.paymentId ? ` · ${order.paymentId}` : ""}
                </p>
              </div>
            </article>
          );
        })}

        {orders.length === 0 ? (
          <div className="rounded-[28px] border border-[var(--gold)]/20 bg-[var(--popup-inner)] p-6 text-sm text-[var(--popup-subtext)]">
            No orders loaded yet. Enter the admin key and click Load Orders.
          </div>
        ) : null}
      </div>
    </section>
  );
}