"use client";

import { useEffect, useRef, useState } from "react";
import { Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import { getCartCount, getCartItems, getCartSubtotal, useShopStore } from "@/store/useShopStore";
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
  const cart = useShopStore((state) => state.cart);
  const removeFromCart = useShopStore((state) => state.removeFromCart);
  const updateCartQuantity = useShopStore((state) => state.updateCartQuantity);
  const clearCart = useShopStore((state) => state.clearCart);
  const pushToast = useUiStore((state) => state.pushToast);
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

  const loadRazorpayScript = async () => {
    if (typeof window === "undefined") {
      return false;
    }

    if (window.Razorpay) {
      return true;
    }

    return new Promise<boolean>((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleCheckout = async () => {
    if (cartItems.length === 0 || isCheckingOut) {
      return;
    }

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
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items: cartItems.map((item) => ({
            productId: item.product.id,
            quantity: item.quantity,
          })),
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
      };

      const razorpay = new window.Razorpay({
        key: razorpayKey,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "Firaangi",
        description: "Secure checkout",
        order_id: orderData.orderId,
        theme: {
          color: "#D3A736",
        },
        modal: {
          ondismiss: () => {
            pushToast("Payment cancelled", { variant: "warning" });
          },
        },
        handler: async (response) => {
          const verifyResponse = await fetch("/api/checkout/verify", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(response),
          });

          if (!verifyResponse.ok) {
            pushToast("Payment verification failed", { variant: "error" });
            return;
          }

          const verification = (await verifyResponse.json()) as { verified?: boolean };

          if (!verification.verified) {
            pushToast("Payment could not be verified", { variant: "error" });
            return;
          }

          clearCart();
          onClose();
          pushToast("Payment successful. Order placed!", { variant: "success" });
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
      if (isMountedRef.current) {
        setIsCheckingOut(false);
      }
    }
  };

  return (
    <>
      <div
        className={`fixed inset-0 z-[85] bg-black/50 transition ${isOpen ? "visible opacity-100" : "invisible opacity-0"}`}
        onClick={onClose}
      />

      <aside
        className={`fixed right-0 top-0 z-[95] h-full w-full max-w-md transform border-l border-[var(--gold)]/40 bg-[#2b060b] transition duration-300 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-[var(--gold)]/40 px-5 py-4">
            <h3 className="text-xl">Your Cart ({cartCount})</h3>
            <button type="button" onClick={onClose} aria-label="Close cart" className="rounded-full p-2 hover:bg-[#461017]">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4">
            {cartItems.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center text-[#d5bdb9]">
                <ShoppingBag className="mb-3 h-8 w-8" />
                <p>Your cart is empty.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {cartItems.map((item) => (
                  <article key={item.product.id} className="rounded-xl border border-[var(--gold)]/40 p-3">
                    <div className="flex gap-3">
                      <img src={item.product.img} alt={item.product.name} className="h-20 w-20 rounded-lg object-cover" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{item.product.name}</p>
                        <p className="text-[#eac26a]">{item.product.price}</p>
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
                        className="rounded-full p-2 text-[#eac26a] transition hover:bg-[#461017]"
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

          <div className="border-t border-[var(--gold)]/40 px-5 py-4">
            <div className="mb-3 flex items-center justify-between text-[#f6e4de]">
              <span>Subtotal</span>
              <span className="text-lg font-semibold">{formatRupees(subtotal)}</span>
            </div>
            <button
              type="button"
              className="w-full rounded-full bg-[var(--gold)] px-5 py-3 font-medium text-[#3b0810] transition hover:bg-[#f0c654]"
              disabled={cartItems.length === 0 || isCheckingOut}
              onClick={handleCheckout}
            >
              {isCheckingOut ? "Processing..." : "Proceed to Checkout"}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
