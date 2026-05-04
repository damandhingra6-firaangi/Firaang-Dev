"use client";

import { useEffect, useRef, useState } from "react";
import { Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import SafeImage from "@/components/SafeImage";
import { COD_FEE_INR, COD_MAX_SUBTOTAL_INR } from "@/lib/checkout-config";
import { convertAmount, formatCurrency } from "@/lib/currency";
import { getCartCount, getCartItems, getCartSubtotal, useShopStore } from "@/store/useShopStore";
import { useAccountStore } from "@/store/useAccountStore";
import { useUiStore } from "@/store/useUiStore";

type CartDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
};

function formatRupees(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const [paymentMethod, setPaymentMethod] = useState<"online" | "cod">("online");
  const cart = useShopStore((state) => state.cart);
  const removeFromCart = useShopStore((state) => state.removeFromCart);
  const updateCartQuantity = useShopStore((state) => state.updateCartQuantity);
  const clearCart = useShopStore((state) => state.clearCart);
  const isSignedIn = useAccountStore((state) => state.isSignedIn);
  const upsertOrder = useAccountStore((state) => state.upsertOrder);
  const pushToast = useUiStore((state) => state.pushToast);
  const displayCurrency = useUiStore((state) => state.currency);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const isMountedRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const cartItems = getCartItems(cart);
  const cartCount = getCartCount(cart);
  const subtotal = getCartSubtotal(cart);
  const isCodEligible = subtotal > 0 && subtotal <= COD_MAX_SUBTOTAL_INR;
  const codFee = paymentMethod === "cod" && isCodEligible ? COD_FEE_INR : 0;
  const totalPayable = subtotal + codFee;

  const loadRazorpayScript = async () => {
    if (typeof window === "undefined") return false;
    if (window.Razorpay) return true;
    return new Promise<boolean>((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleOnlineCheckout = async () => {
    const razorpayKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    if (!razorpayKey) {
      pushToast("Checkout is not configured", { variant: "error" });
      return;
    }
    setIsCheckingOut(true);
    try {
      const scriptReady = await loadRazorpayScript();
      if (!scriptReady) {
        pushToast("Failed to load payment gateway", { variant: "error" });
        return;
      }
      const orderResponse = await fetch("/api/checkout/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cartItems.map((item) => ({ productId: item.product.id, quantity: item.quantity })),
        }),
      });
      if (!orderResponse.ok) {
        pushToast("Unable to create order", { variant: "error" });
        return;
      }
      const orderData = (await orderResponse.json()) as {
        orderId: string;
        amount: number;
        currency: string;
        meta?: { accountLinked?: boolean };
      };
      const razorpay = new window.Razorpay({
        key: razorpayKey,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "Firaangi",
        description: "Secure checkout",
        order_id: orderData.orderId,
        theme: { color: "#D3A736" },
        modal: {
          ondismiss: () => { pushToast("Payment cancelled", { variant: "warning" }); },
        },
        handler: async (response) => {
          const verifyResponse = await fetch("/api/checkout/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(response),
          });
          if (!verifyResponse.ok) {
            pushToast("Payment verification failed", { variant: "error" });
            return;
          }
          const verification = (await verifyResponse.json()) as {
            verified?: boolean;
            order?: {
              id: string;
              createdAt: string;
              totalAmount: number;
              currencyCode: string;
              status: "paid" | "pending" | "failed" | "cancelled";
              paymentMethod: "online" | "cod";
              paymentId?: string;
              items: Array<{
                productId: string;
                name: string;
                image: string;
                unitPrice: number;
                quantity: number;
                lineTotal: number;
              }>;
            };
            meta?: { accountLinked?: boolean };
          };
          if (!verification.verified) {
            pushToast("Payment could not be verified", { variant: "error" });
            return;
          }
          if (verification.order) upsertOrder(verification.order);
          clearCart();
          onClose();
          if (verification.meta?.accountLinked) {
            pushToast("Payment successful. Order saved to your account!", { variant: "success" });
            return;
          }
          if (isSignedIn) {
            pushToast("Payment successful, but the order could not be linked to your account.", { variant: "warning" });
            return;
          }
          pushToast("Payment successful. Sign in next time to sync orders across devices.", { variant: "success" });
        },
      });
      razorpay.on("payment.failed", (event) => {
        const message = event.error?.description ?? "Payment failed";
        pushToast(message, { variant: "error" });
      });
      razorpay.open();
    } catch (error) {
      console.error("Checkout failed", error);
      pushToast("Checkout failed. Please try again.", { variant: "error" });
    } finally {
      if (isMountedRef.current) setIsCheckingOut(false);
    }
  };

  const handlePaymentMethodSelect = async (method: "online" | "cod") => {
    setPaymentMethod(method);
    if (method !== "online") return;
    if (cartItems.length === 0) {
      pushToast("Add items to cart before checkout", { variant: "warning" });
      return;
    }
    if (isCheckingOut) return;
    await handleOnlineCheckout();
  };

  const handleCheckout = async () => {
    if (cartItems.length === 0 || isCheckingOut) return;

    if (paymentMethod === "cod") {
      if (!isCodEligible) {
        pushToast(`COD is available only up to ${formatRupees(COD_MAX_SUBTOTAL_INR)} subtotal`, { variant: "warning" });
        return;
      }
      setIsCheckingOut(true);
      try {
        const response = await fetch("/api/checkout/cod", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: cartItems.map((item) => ({ productId: item.product.id, quantity: item.quantity })),
          }),
        });
        const payload = (await response.json().catch(() => ({}))) as {
          error?: string;
          subtotalAmount?: number;
          codFee?: number;
          amount?: number;
          order?: {
            id: string;
            createdAt: string;
            totalAmount: number;
            currencyCode: string;
            status: "paid" | "pending" | "failed";
            paymentMethod: "online" | "cod";
            paymentId?: string;
            items: Array<{
              productId: string;
              name: string;
              image: string;
              unitPrice: number;
              quantity: number;
              lineTotal: number;
            }>;
          };
          meta?: { accountLinked?: boolean };
        };
        if (!response.ok) {
          pushToast(payload.error ?? "Unable to place COD order", { variant: "error" });
          return;
        }
        if (payload.order) upsertOrder(payload.order);
        clearCart();
        onClose();
        if (payload.meta?.accountLinked) {
          pushToast("COD order placed. We will confirm your order shortly.", { variant: "success" });
          return;
        }
        if (isSignedIn) {
          pushToast("COD order placed, but it could not be linked to your account.", { variant: "warning" });
          return;
        }
        pushToast("COD order placed. Sign in to sync orders across devices.", { variant: "success" });
      } catch (error) {
        console.error("COD checkout failed", error);
        pushToast("COD checkout failed. Please try again.", { variant: "error" });
      } finally {
        if (isMountedRef.current) setIsCheckingOut(false);
      }
      return;
    }

    await handleOnlineCheckout();
  };

  return (
    <>
      <div
        className={`fixed inset-0 z-[85] bg-black/50 transition ${isOpen ? "visible opacity-100" : "invisible opacity-0"}`}
        onClick={onClose}
      />

      <aside
        className={`fixed right-0 top-0 z-[95] h-full w-full max-w-md transform border-l border-[var(--gold)]/40 bg-[var(--popup-bg)] transition duration-300 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[var(--gold)]/40 px-5 py-4">
            <h3 className="text-xl">Your Cart ({cartCount})</h3>
            <button type="button" onClick={onClose} aria-label="Close cart" className="rounded-full p-2 hover:bg-[var(--popup-hover)]">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-5 py-4">
            {cartItems.length === 0 ? (
              !isSignedIn ? (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <ShoppingBag className="mb-4 h-10 w-10 text-[var(--popup-muted)]" />
                  <p className="text-[var(--popup-muted)]">Your cart is empty.</p>
                  <p className="mt-2 text-xs text-[var(--popup-muted)]">Have an account? Sign in to load your cart faster.</p>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      useUiStore.getState().openAccountModal();
                    }}
                    className="gold-button mt-5 px-6 py-2.5 text-sm"
                  >
                    Login / Sign Up
                  </button>
                </div>
              ) : (
                <div className="flex h-full flex-col items-center justify-center text-center text-[var(--popup-muted)]">
                  <ShoppingBag className="mb-3 h-8 w-8" />
                  <p>Your cart is empty.</p>
                </div>
              )
            ) : (
              <div className="space-y-4">
                {cartItems.map((item) => (
                  <article key={item.product.id} className="rounded-xl border border-[var(--gold)]/40 p-3">
                    <div className="flex gap-3">
                      <SafeImage src={item.product.img} alt={item.product.name} className="h-20 w-20 rounded-lg object-cover" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{item.product.name}</p>
                        <p className="text-[#eac26a]">
                          {formatCurrency(convertAmount(item.product.priceAmount, "INR", displayCurrency), displayCurrency)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="rounded-full border border-[var(--gold)]/50 p-1"
                          onClick={() => updateCartQuantity(item.product.id, item.quantity - 1)}
                          aria-label={`Decrease ${item.product.name} quantity`}
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-6 text-center">{item.quantity}</span>
                        <button
                          type="button"
                          className="rounded-full border border-[var(--gold)]/50 p-1"
                          onClick={() => updateCartQuantity(item.product.id, item.quantity + 1)}
                          aria-label={`Increase ${item.product.name} quantity`}
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                      <button
                        type="button"
                        className="rounded-full p-2 text-[var(--gold)] transition hover:bg-[var(--popup-hover)]"
                        onClick={() => removeFromCart(item.product.id)}
                        aria-label={`Remove ${item.product.name} from cart`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-[var(--gold)]/40 px-5 py-4">
            <div className="mb-4 rounded-xl border border-[var(--gold)]/30 bg-[var(--popup-footer-bg)] p-3">
              <p className="mb-2 text-[11px] uppercase tracking-[0.14em] text-[var(--gold)]">Payment Method</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => { void handlePaymentMethodSelect("online"); }}
                  className={`rounded-lg border px-3 py-2 text-xs uppercase tracking-[0.08em] transition ${
                    paymentMethod === "online"
                      ? "border-[var(--gold)] bg-[var(--gold)] text-[#3b0810]"
                      : "border-[var(--gold)]/35 text-[var(--popup-footer-inactive)] hover:border-[var(--gold)]/65"
                  }`}
                >
                  Online
                </button>
                <button
                  type="button"
                  onClick={() => { void handlePaymentMethodSelect("cod"); }}
                  className={`rounded-lg border px-3 py-2 text-xs uppercase tracking-[0.08em] transition ${
                    paymentMethod === "cod"
                      ? "border-[var(--gold)] bg-[var(--gold)] text-[#3b0810]"
                      : "border-[var(--gold)]/35 text-[var(--popup-footer-inactive)] hover:border-[var(--gold)]/65"
                  }`}
                >
                  Cash on Delivery
                </button>
              </div>
            </div>

            <div className="mb-3 flex items-center justify-between text-[var(--popup-footer-text)]">
              <span>Subtotal</span>
              <span className="text-lg font-semibold">
                {formatCurrency(convertAmount(subtotal, "INR", displayCurrency), displayCurrency)}
              </span>
            </div>

            {paymentMethod === "cod" ? (
              <>
                <div className="mb-2 flex items-center justify-between text-[#f6e4de]">
                  <span>COD Fee</span>
                  <span className="font-medium">
                    {formatCurrency(convertAmount(codFee, "INR", displayCurrency), displayCurrency)}
                  </span>
                </div>
                <div className="mb-3 flex items-center justify-between text-[#fff4ef]">
                  <span>Total Payable</span>
                  <span className="text-lg font-semibold">
                    {formatCurrency(convertAmount(totalPayable, "INR", displayCurrency), displayCurrency)}
                  </span>
                </div>
                <p className={`mb-3 text-xs ${isCodEligible ? "text-[#d7bbb5]" : "text-amber-200"}`}>
                  {isCodEligible
                    ? `COD available up to ${formatRupees(COD_MAX_SUBTOTAL_INR)} subtotal. A flat ${formatRupees(COD_FEE_INR)} fee applies.`
                    : `COD unavailable for this cart. Subtotal exceeds ${formatRupees(COD_MAX_SUBTOTAL_INR)}.`}
                </p>
              </>
            ) : null}
            {displayCurrency !== "INR" ? (
              <p className="mb-3 text-[11px] text-[#c9aaa4]">Charged in INR at checkout via Razorpay.</p>
            ) : null}

            <button
              type="button"
              className="w-full rounded-full bg-[var(--gold)] px-5 py-3 font-medium text-[#3b0810] transition hover:bg-[#f0c654]"
              disabled={cartItems.length === 0 || isCheckingOut || (paymentMethod === "cod" && !isCodEligible)}
              onClick={handleCheckout}
            >
              {isCheckingOut ? "Processing..." : paymentMethod === "cod" ? "Place COD Order" : "Proceed to Checkout"}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
