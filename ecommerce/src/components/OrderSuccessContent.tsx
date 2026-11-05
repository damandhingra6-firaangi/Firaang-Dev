"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, CircleAlert, Clock3, PackageCheck, ShoppingBag } from "lucide-react";
import SafeImage from "@/components/SafeImage";
import { trackVendorPurchase } from "@/lib/analytics-vendors";
import { formatCurrency } from "@/lib/currency";

type OrderItem = {
  productId: string;
  selectedSize?: string;
  selectedVariantId?: string;
  name: string;
  image?: string;
  imageUrl?: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
};

type OrderDetails = {
  id: string;
  createdAt: string;
  totalAmount: number;
  subtotalAmount?: number;
  shippingFee?: number;
  taxAmount?: number;
  discountAmount?: number;
  currencyCode: string;
  status: "paid" | "pending" | "failed" | "cancelled";
  paymentMethod: "online" | "cod";
  paymentStatus?: "created" | "pending" | "authorized" | "captured" | "failed" | "refunded";
  shippingName?: string;
  shippingEmail?: string;
  shippingPhone?: string;
  shippingAddress?: string;
  shippingCity?: string;
  shippingState?: string;
  shippingPinCode?: string;
  shippingCountry?: string;
  shippingMethod?: "surface" | "air";
  items: OrderItem[];
  orderConfirmationEmailStatus?: "pending" | "sent";
  couponCode?: string;
};

type OrderResponse = {
  order: OrderDetails;
};

function getEstimatedDelivery(order: OrderDetails) {
  if (order.shippingMethod === "air") {
    return "Estimated delivery: 3–5 business days";
  }

  if (order.shippingMethod === "surface") {
    return "Estimated delivery: 5–8 business days";
  }

  return "Delivery updates will be shared after dispatch";
}

function getPaymentLabel(order: OrderDetails) {
  if (order.paymentMethod === "cod") {
    return "Cash on Delivery";
  }

  return "Razorpay";
}

function formatDate(dateString?: string) {
  if (!dateString) {
    return "—";
  }

  return new Date(dateString).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatAmount(amount: number | undefined, currencyCode: string) {
  return formatCurrency(amount ?? 0, currencyCode === "INR" ? "INR" : "INR");
}

export default function OrderSuccessContent({ orderId }: { orderId: string }) {
  const [isLoading, setIsLoading] = useState(true);
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadOrder() {
      setIsLoading(true);
      setNotFound(false);

      try {
        const startedAt = performance.now();
        console.info("[order-success] fetch start", { orderId });
        const response = await fetch(`/api/orders/${encodeURIComponent(orderId)}`, { cache: "no-store" });

        if (!response.ok) {
          console.info("[order-success] fetch failed", { orderId, elapsedMs: performance.now() - startedAt, status: response.status });
          if (isMounted) {
            setNotFound(true);
          }
          return;
        }

        const payload = (await response.json()) as OrderResponse;

        console.info("[order-success] fetch resolved", { orderId, elapsedMs: performance.now() - startedAt, status: payload.order?.status });

        if (!isMounted) {
          return;
        }

        setOrder(payload.order ?? null);
      } catch (error) {
        console.error("Unable to load order confirmation", error);

        if (isMounted) {
          setNotFound(true);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadOrder();

    return () => {
      isMounted = false;
    };
  }, [orderId]);

  useEffect(() => {
    if (!order || order.status !== "paid") {
      return;
    }

    const storageKey = `firaang-purchase-${order.id}`;

    try {
      if (window.sessionStorage.getItem(storageKey) === "1") {
        return;
      }

      const analyticsItems = order.items.map((item) => ({
        item_id: item.productId,
        item_name: item.name,
        price: item.unitPrice,
        quantity: item.quantity,
        item_variant: item.selectedVariantId ?? item.selectedSize,
      }));

      console.info("[order-success] firing purchase analytics", {
        orderId: order.id,
        value: order.totalAmount,
        itemCount: analyticsItems.length,
      });

      trackVendorPurchase({
        transactionId: order.id,
        currencyCode: order.currencyCode,
        value: order.totalAmount,
        coupon: order.couponCode,
        shipping: order.shippingFee ?? 0,
        tax: order.taxAmount ?? 0,
        items: analyticsItems,
        dedupeKey: `purchase:${order.id}`,
      });

      window.sessionStorage.setItem(storageKey, "1");
    } catch {
      // Analytics should never block order confirmation UI.
    }
  }, [order]);

  if (isLoading) {
    return (
      <div className="space-y-5">
        <div className="animate-pulse rounded-3xl border border-[#f3d7d5] bg-white p-6 shadow-sm">
          <div className="h-4 w-32 rounded-full bg-[#f1d8d7]" />
          <div className="mt-4 h-10 w-3/4 rounded-2xl bg-[#f5dfe1]" />
          <div className="mt-3 h-4 w-2/3 rounded-full bg-[#f6ebea]" />
        </div>
        <div className="grid gap-5 lg:grid-cols-[1.4fr_0.6fr]">
          <div className="animate-pulse rounded-3xl border border-[#f3d7d5] bg-white p-5 shadow-sm">
            <div className="h-5 w-40 rounded-full bg-[#f5dfe1]" />
            <div className="mt-4 space-y-3">
              <div className="h-20 rounded-2xl bg-[#f8e7e6]" />
              <div className="h-20 rounded-2xl bg-[#f8e7e6]" />
            </div>
          </div>
          <div className="animate-pulse rounded-3xl border border-[#f3d7d5] bg-white p-5 shadow-sm">
            <div className="h-5 w-32 rounded-full bg-[#f5dfe1]" />
            <div className="mt-4 space-y-3">
              <div className="h-4 w-2/3 rounded-full bg-[#f6ebea]" />
              <div className="h-4 w-2/3 rounded-full bg-[#f6ebea]" />
              <div className="h-4 w-2/3 rounded-full bg-[#f6ebea]" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="rounded-[28px] border border-[#f0d0cb] bg-white p-8 text-center shadow-[0_16px_38px_rgba(0,0,0,0.08)] md:p-10">
        <CircleAlert className="mx-auto h-12 w-12 text-[#ff3f6c]" />
        <h1 className="mt-5 text-3xl font-semibold text-[#1f2430] md:text-4xl">Order Not Found</h1>
        <p className="mt-4 text-sm leading-7 text-[#596172] md:text-base">
          We couldn’t find an order matching this session. If you think this is a mistake, please contact support or check your account order history.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/shop" className="inline-flex h-11 items-center justify-center rounded-full bg-[#ff3f6c] px-6 text-sm font-semibold text-white transition hover:bg-[#e63762]">
            Continue Shopping
          </Link>
          <Link href="/account?tab=orders" className="inline-flex h-11 items-center justify-center rounded-full border border-[#ff3f6c]/30 bg-[#fff1f4] px-6 text-sm font-semibold text-[#1f2430] transition hover:border-[#ff3f6c]">
            View My Orders
          </Link>
        </div>
      </div>
    );
  }

  if (!order) {
    return null;
  }

  if (order.status === "pending") {
    return (
      <div className="rounded-[28px] border border-[#f0d0cb] bg-white p-8 text-center shadow-[0_16px_38px_rgba(0,0,0,0.08)] md:p-10">
        <Clock3 className="mx-auto h-12 w-12 text-[#ffb33d]" />
        <h1 className="mt-5 text-3xl font-semibold text-[#1f2430] md:text-4xl">We’re confirming your payment</h1>
        <p className="mt-4 text-sm leading-7 text-[#596172] md:text-base">
          Your order #{order.id} is currently being verified. We’ll update the status as soon as payment confirmation is complete.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/shop" className="inline-flex h-11 items-center justify-center rounded-full bg-[#ff3f6c] px-6 text-sm font-semibold text-white transition hover:bg-[#e63762]">
            Continue Shopping
          </Link>
          <Link href="/account?tab=orders" className="inline-flex h-11 items-center justify-center rounded-full border border-[#ff3f6c]/30 bg-[#fff1f4] px-6 text-sm font-semibold text-[#1f2430] transition hover:border-[#ff3f6c]">
            View My Orders
          </Link>
        </div>
      </div>
    );
  }

  if (order.status === "failed" || order.status === "cancelled") {
    return (
      <div className="rounded-[28px] border border-[#f0d0cb] bg-white p-8 text-center shadow-[0_16px_38px_rgba(0,0,0,0.08)] md:p-10">
        <CircleAlert className="mx-auto h-12 w-12 text-[#ff3f6c]" />
        <h1 className="mt-5 text-3xl font-semibold text-[#1f2430] md:text-4xl">Payment not completed</h1>
        <p className="mt-4 text-sm leading-7 text-[#596172] md:text-base">
          This order was not completed successfully, so it is not available as a successful purchase conversion event.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/shop" className="inline-flex h-11 items-center justify-center rounded-full bg-[#ff3f6c] px-6 text-sm font-semibold text-white transition hover:bg-[#e63762]">
            Continue Shopping
          </Link>
          <Link href="/account?tab=orders" className="inline-flex h-11 items-center justify-center rounded-full border border-[#ff3f6c]/30 bg-[#fff1f4] px-6 text-sm font-semibold text-[#1f2430] transition hover:border-[#ff3f6c]">
            View My Orders
          </Link>
        </div>
      </div>
    );
  }

  const subtotal = order.subtotalAmount ?? order.items.reduce((sum, item) => sum + item.lineTotal, 0);
  const shipping = order.shippingFee ?? 0;
  const discount = order.discountAmount ?? 0;
  const total = order.totalAmount;

  return (
    <div className="space-y-5">
      <div className="rounded-[28px] border border-[#efd2cf] bg-white p-6 shadow-[0_18px_38px_rgba(0,0,0,0.06)] md:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-[#eafaf1] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#219653]">
              <CheckCircle2 className="h-4 w-4" />
              Order confirmed
            </div>
            <h1 className="mt-4 text-3xl font-semibold text-[#1f2430] md:text-4xl">Thank you for your order!</h1>
          </div>
          <div className="rounded-2xl border border-[#eed6d2] bg-[#fff5f4] px-4 py-3 text-right">
            <p className="text-[11px] uppercase tracking-[0.18em] text-[#7b8798]">Order ID</p>
            <p className="mt-1 text-sm font-semibold text-[#1f2430]">#{order.id}</p>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3 text-sm text-[#596172] md:flex-row md:items-center md:justify-between">
          <p>Placed on {formatDate(order.createdAt)}</p>
          <p>{getEstimatedDelivery(order)}</p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.45fr_0.55fr]">
        <div className="rounded-[28px] border border-[#efd2cf] bg-white p-5 shadow-[0_18px_38px_rgba(0,0,0,0.06)] md:p-6">
          <div className="flex items-center gap-2">
            <PackageCheck className="h-5 w-5 text-[#ff3f6c]" />
            <h2 className="text-lg font-semibold text-[#1f2430]">Your items</h2>
          </div>

          <div className="mt-5 space-y-4">
            {order.items.map((item) => (
              <div key={`${order.id}-${item.productId}`} className="flex gap-3 rounded-2xl border border-[#f0e7e5] bg-[#fffaf8] p-3">
                <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-[#f5f1ef]">
                  <SafeImage src={item.image ?? item.imageUrl ?? "/placeholder-product.jpg"} alt={item.name} className="h-full w-full object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="line-clamp-2 text-sm font-semibold text-[#1f2430]">{item.name}</p>
                      <p className="mt-1 text-xs text-[#6b7280]">
                        {item.selectedSize ? `Size: ${item.selectedSize}` : "Type: Standard"}
                        {item.selectedVariantId ? " • Variant selected" : ""}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-[#1f2430]">{formatAmount(item.lineTotal, order.currencyCode)}</p>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-[#596172]">
                    <span>Qty {item.quantity}</span>
                    <span>{formatAmount(item.unitPrice, order.currencyCode)} each</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[28px] border border-[#efd2cf] bg-white p-5 shadow-[0_18px_38px_rgba(0,0,0,0.06)] md:p-6">
          <h2 className="text-lg font-semibold text-[#1f2430]">Price summary</h2>
          <div className="mt-4 space-y-3 text-sm text-[#596172]">
            <div className="flex items-center justify-between">
              <span>Subtotal</span>
              <span className="font-medium text-[#1f2430]">{formatAmount(subtotal, order.currencyCode)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Shipping</span>
              <span className="font-medium text-[#1f2430]">{shipping > 0 ? formatAmount(shipping, order.currencyCode) : "Free"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Discount</span>
              <span className="font-medium text-emerald-600">-{discount > 0 ? formatAmount(discount, order.currencyCode) : formatAmount(0, order.currencyCode)}</span>
            </div>
            <div className="border-t border-[#f3e5e4] pt-3 text-base font-semibold text-[#1f2430]">
              <div className="flex items-center justify-between">
                <span>Total paid</span>
                <span>{formatAmount(total, order.currencyCode)}</span>
              </div>
            </div>
          </div>

          <div className="mt-5 rounded-2xl bg-[#fff7f7] p-3 text-xs text-[#596172]">
            <p className="font-semibold uppercase tracking-[0.12em] text-[#ff3f6c]">Payment</p>
            <p className="mt-2 text-[#1f2430]">{getPaymentLabel(order)} • {order.paymentStatus === "captured" ? "Paid" : order.paymentStatus ?? "Verified"}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-[28px] border border-[#efd2cf] bg-white p-5 shadow-[0_18px_38px_rgba(0,0,0,0.06)] md:p-6">
          <h2 className="text-lg font-semibold text-[#1f2430]">Shipping details</h2>
          <div className="mt-4 space-y-2 text-sm text-[#596172]">
            <p className="font-medium text-[#1f2430]">{order.shippingName ?? "Customer"}</p>
            <p>{order.shippingAddress || "Address unavailable"}</p>
            <p>
              {order.shippingCity || "City"}
              {order.shippingCity && order.shippingState ? ", " : ""}
              {order.shippingState || ""}
              {order.shippingPinCode ? ` ${order.shippingPinCode}` : ""}
            </p>
            <p>{order.shippingCountry || "India"}</p>
            <p className="pt-2">Email: {order.shippingEmail || "—"}</p>
            <p>Phone: {order.shippingPhone || "—"}</p>
          </div>
        </div>

        <div className="rounded-[28px] border border-[#efd2cf] bg-white p-5 shadow-[0_18px_38px_rgba(0,0,0,0.06)] md:p-6">
          <h2 className="text-lg font-semibold text-[#1f2430]">Order details</h2>
          <div className="mt-4 space-y-3 text-sm text-[#596172]">
            <div className="flex items-center justify-between gap-3">
              <span>Payment method</span>
              <span className="font-medium text-[#1f2430]">{getPaymentLabel(order)}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span>Payment status</span>
              <span className="font-medium text-[#1f2430]">{order.paymentStatus ?? "Paid"}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span>Shipment</span>
              <span className="font-medium text-[#1f2430]">{order.shippingMethod ? order.shippingMethod.toUpperCase() : "STANDARD"}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span>Estimated delivery</span>
              <span className="font-medium text-[#1f2430]">{getEstimatedDelivery(order).replace("Estimated delivery: ", "")}</span>
            </div>
          </div>
        </div>
      </div>

      {order.orderConfirmationEmailStatus === "sent" ? (
        <div className="rounded-[24px] border border-[#e3f7ec] bg-[#f4fff8] px-4 py-3 text-sm text-[#17673a]">
          Confirmation email sent to {order.shippingEmail || "your email"}.
        </div>
      ) : null}

      <div className="flex flex-col gap-3 pt-1 sm:flex-row">
        <Link href="/shop" className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#ff3f6c] px-5 text-sm font-semibold text-white transition hover:bg-[#e63762]">
          <ShoppingBag className="h-4 w-4" />
          Continue Shopping
        </Link>
        <Link href="/account?tab=orders" className="inline-flex h-11 items-center justify-center rounded-full border border-[#ff3f6c]/30 bg-[#fff1f4] px-5 text-sm font-semibold text-[#1f2430] transition hover:border-[#ff3f6c]">
          View My Orders
        </Link>
      </div>
    </div>
  );
}
