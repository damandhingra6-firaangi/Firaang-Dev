"use client";

import { useState } from "react";
import { Search, PackageSearch } from "lucide-react";
import Navbar from "@/components/Navbar";
import Newsletter from "@/components/Newsletter";
import FeedbackPill from "@/components/FeedbackPill";

type TrackedOrder = {
  id: string;
  createdAt: string;
  totalAmount: number;
  currencyCode: string;
  status: "paid" | "pending" | "failed" | "cancelled";
  paymentMethod: "online" | "cod";
  items: Array<{
    productId: string;
    name: string;
    unitPrice: number;
    quantity: number;
    lineTotal: number;
  }>;
};

export default function TrackOrderPage() {
  const [orderId, setOrderId] = useState("");
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lookupError, setLookupError] = useState("");
  const [order, setOrder] = useState<TrackedOrder | null>(null);

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setLookupError("");
    setOrder(null);

    try {
      const response = await fetch("/api/orders/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, email }),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        found?: boolean;
        order?: TrackedOrder;
        error?: string;
      };

      if (!response.ok) {
        setLookupError(payload.error ?? "Order not found for this email.");
        return;
      }

      if (!payload.found || !payload.order) {
        setLookupError("Order not found for this email.");
        return;
      }

      setOrder(payload.order);
    } catch (error) {
      console.error("Track order failed", error);
      setLookupError("Unable to track order right now. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const statusLabel = order?.status ? order.status.toUpperCase() : "";

  return (
    <main>
      <Navbar />

      <section className="relative overflow-hidden pt-[148px] md:pt-[160px]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_20%,rgba(211,167,54,0.18),transparent_34%)]" />
        <div className="section-shell relative pb-10 md:pb-14">
          <p className="text-xs uppercase tracking-[0.28em] text-[var(--gold)]">Orders</p>
          <h1 className="mt-3 max-w-3xl text-4xl leading-tight text-[var(--page-fg)] md:text-6xl">Track Your Order</h1>
          <p className="mt-5 max-w-2xl text-sm leading-7 text-[var(--popup-subtext)] md:text-base">
            Enter your order ID and email to check the latest status of your delivery.
          </p>
        </div>
      </section>

      <section className="pb-16 pt-2">
        <div className="section-shell max-w-xl">
          <form
            onSubmit={handleTrack}
            className="relative overflow-hidden rounded-2xl border border-[var(--gold)]/40 bg-[var(--popup-card)] p-7 shadow-[0_16px_38px_rgba(0,0,0,0.32)] backdrop-blur"
          >
            <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[radial-gradient(circle,rgba(211,167,54,0.20),rgba(211,167,54,0))] opacity-70" />
            <div className="mb-5">
              <label htmlFor="orderId" className="mb-1.5 block text-xs uppercase tracking-[0.18em] text-[var(--gold)]">
                Order ID
              </label>
              <input
                id="orderId"
                type="text"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                placeholder="e.g. FIR-2026-XXXXXX"
                required
                className="w-full rounded-xl border border-[var(--gold)]/30 bg-[var(--popup-input)] px-4 py-3 text-sm text-[var(--popup-input-text)] outline-none transition placeholder:text-[var(--popup-input-ph)] focus:border-[var(--gold)]"
              />
            </div>
            <div className="mb-6">
              <label htmlFor="email" className="mb-1.5 block text-xs uppercase tracking-[0.18em] text-[var(--gold)]">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                className="w-full rounded-xl border border-[var(--gold)]/30 bg-[var(--popup-input)] px-4 py-3 text-sm text-[var(--popup-input-text)] outline-none transition placeholder:text-[var(--popup-input-ph)] focus:border-[var(--gold)]"
              />
            </div>
            <button type="submit" disabled={isSubmitting} className="gold-button inline-flex w-full items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-70">
              <Search className="h-4 w-4" />
              {isSubmitting ? "Tracking..." : "Track Order"}
            </button>
          </form>

          {lookupError ? (
            <div className="relative overflow-hidden rounded-2xl border border-[var(--gold)]/40 bg-[var(--popup-card)] p-8 text-center shadow-[0_16px_38px_rgba(0,0,0,0.32)] backdrop-blur">
              <PackageSearch className="mx-auto mb-4 h-12 w-12 text-[var(--gold)]/60" />
              <h2 className="text-2xl text-[var(--popup-footer-text)]">Order Not Found</h2>
              <p className="mt-3 text-sm leading-7 text-[var(--popup-subtext)]">
                {lookupError} We couldn't find order <span className="font-semibold text-[var(--gold)]">{orderId}</span> linked to that email.
                Please double-check your order confirmation email or contact support.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
                <button type="button" onClick={() => setLookupError("")} className="outline-button">
                  Try Again
                </button>
                <a href="mailto:support@firaangi.com?subject=Track%20Order" className="gold-button text-center">
                  Contact Support
                </a>
              </div>
            </div>
          ) : null}

          {order ? (
            <div className="mt-6 rounded-2xl border border-[var(--gold)]/40 bg-[var(--popup-card)] p-6 shadow-[0_16px_38px_rgba(0,0,0,0.32)] backdrop-blur">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--gold)]/20 pb-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-[var(--gold)]">Order ID</p>
                  <p className="mt-1 text-lg text-[var(--popup-footer-text)]">{order.id}</p>
                </div>
                <div className="rounded-full border border-[var(--gold)]/40 bg-[var(--gold)]/15 px-3 py-1 text-xs font-semibold tracking-[0.12em] text-[var(--gold)]">
                  {statusLabel}
                </div>
              </div>

              <div className="mt-4 grid gap-3 text-sm text-[var(--popup-subtext)] sm:grid-cols-3">
                <p>
                  <span className="text-[var(--popup-muted)]">Placed on:</span> {new Date(order.createdAt).toLocaleString()}
                </p>
                <p>
                  <span className="text-[var(--popup-muted)]">Payment:</span> {order.paymentMethod === "cod" ? "Cash on Delivery" : "Online"}
                </p>
                <p>
                  <span className="text-[var(--popup-muted)]">Total:</span> {order.currencyCode} {order.totalAmount}
                </p>
              </div>

              <div className="mt-5 space-y-3">
                {order.items.map((item) => (
                  <div key={`${order.id}-${item.productId}`} className="flex items-center justify-between rounded-xl border border-[var(--gold)]/20 bg-[var(--popup-inner)] px-4 py-3 text-sm">
                    <div>
                      <p className="text-[var(--popup-footer-text)]">{item.name}</p>
                      <p className="text-xs text-[var(--popup-muted)]">Qty: {item.quantity}</p>
                    </div>
                    <p className="text-[var(--gold)]">{order.currencyCode} {item.lineTotal}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="mt-6 rounded-2xl border border-[var(--gold)]/25 bg-[var(--popup-inner)] p-5 text-sm text-[var(--popup-subtext)]">
            <p className="font-medium text-[var(--gold)]">Pro tip</p>
            <p className="mt-1 leading-6">
              If you placed your order while signed in, your order history is available under{" "}
              <span className="font-medium text-[var(--popup-footer-text)]">My Account → Orders</span> for real-time status.
            </p>
          </div>
        </div>
      </section>

      <Newsletter />
      <FeedbackPill />
    </main>
  );
}
