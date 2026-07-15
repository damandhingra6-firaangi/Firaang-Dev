"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, ChevronRight, Minus, Package, Plus, ShoppingBag, Tag, Trash2, X } from "lucide-react";
import SafeImage from "@/components/SafeImage";
import { INDIAN_STATES, calculateCheckoutPricing, type ShippingMethod } from "@/lib/checkout-config";
import { convertAmount, formatCurrency } from "@/lib/currency";
import { getCartCount, getCartItems, getCartSubtotal, useShopStore } from "@/store/useShopStore";
import { useAccountStore } from "@/store/useAccountStore";
import { useUiStore } from "@/store/useUiStore";

type CartDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
  mode?: "drawer" | "page";
};

type CheckoutStep = "cart" | "shipping" | "summary";

type AppliedCoupon = {
  code: string;
  label: string;
  description: string;
  discountAmount: number;
};

export default function CartDrawer({ isOpen, onClose, mode = "drawer" }: CartDrawerProps) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const router = useRouter();
  const cart = useShopStore((state) => state.cart);
  const removeFromCart = useShopStore((state) => state.removeFromCart);
  const updateCartQuantity = useShopStore((state) => state.updateCartQuantity);
  const clearCart = useShopStore((state) => state.clearCart);
  const isSignedIn = useAccountStore((state) => state.isSignedIn);
  const profile = useAccountStore((state) => state.profile);
  const upsertOrder = useAccountStore((state) => state.upsertOrder);
  const updateProfile = useAccountStore((state) => state.updateProfile);
  const pushToast = useUiStore((state) => state.pushToast);
  const displayCurrency = useUiStore((state) => state.currency);

  const [step, setStep] = useState<CheckoutStep>("cart");
  const [shippingName, setShippingName] = useState("");
  const [shippingEmail, setShippingEmail] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [shippingCity, setShippingCity] = useState("");
  const [shippingState, setShippingState] = useState("");
  const [shippingPinCode, setShippingPinCode] = useState("");
  const [shippingMethod, setShippingMethod] = useState<ShippingMethod>("surface");
  const [shippingErrors, setShippingErrors] = useState<Partial<Record<"fullName" | "email" | "address" | "city" | "state" | "pinCode", string>>>({});
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const isMountedRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    setShippingName((cur) => cur || profile.fullName);
    setShippingEmail((cur) => cur || profile.email);
    setShippingAddress((cur) => cur || profile.address);
    setShippingCity((cur) => cur || profile.city);
    setShippingState((cur) => cur || profile.state);
    setShippingPinCode((cur) => cur || profile.pinCode);
  }, [isOpen, profile]);

  useEffect(() => {
    if (!isOpen) {
      const timer = setTimeout(() => setStep("cart"), 350);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const cartItems = getCartItems(cart);
  const cartCount = getCartCount(cart);
  const subtotal = getCartSubtotal(cart);

  const pricing = calculateCheckoutPricing({
    subtotalAmount: subtotal,
    shippingState,
    shippingMethod,
    lineItems: cartItems.map((item) => ({
      quantity: item.quantity,
      tags: item.product.tags,
    })),
    validatedCoupon: appliedCoupon,
  });

  const hasShippingDetails =
    shippingName.trim().length > 0 &&
    emailRegex.test(shippingEmail.trim()) &&
    shippingAddress.trim().length > 0 &&
    shippingCity.trim().length > 0 &&
    shippingState.trim().length > 0 &&
    /^\d{6}$/.test(shippingPinCode.trim());

  const validateShippingDetails = () => {
    const nextErrors: Partial<Record<"fullName" | "email" | "address" | "city" | "state" | "pinCode", string>> = {};

    if (!shippingName.trim()) nextErrors.fullName = "Full name is required";
    if (!shippingEmail.trim()) {
      nextErrors.email = "Email address is required";
    } else if (!emailRegex.test(shippingEmail.trim())) {
      nextErrors.email = "Please enter a valid email address";
    }
    if (!shippingAddress.trim()) nextErrors.address = "Shipping address is required";
    if (!shippingCity.trim()) nextErrors.city = "City / town is required";
    if (!shippingState.trim()) nextErrors.state = "State is required";

    if (!shippingPinCode.trim()) {
      nextErrors.pinCode = "PIN code is required";
    } else if (!/^\d{6}$/.test(shippingPinCode.trim())) {
      nextErrors.pinCode = "PIN code must be 6 digits";
    }

    setShippingErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const stepLabels: Record<CheckoutStep, string> = {
    cart: `Your Cart (${cartCount})`,
    shipping: "Shipping Details",
    summary: "Order Summary",
  };

  const stepBack: Record<CheckoutStep, CheckoutStep | null> = {
    cart: null,
    shipping: "cart",
    summary: "shipping",
  };

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

  const handleApplyCoupon = async () => {
    const code = couponInput.trim().toUpperCase();
    if (!code) { setCouponError("Enter a coupon code"); return; }
    setIsValidatingCoupon(true);
    setCouponError(null);
    try {
      const response = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, subtotalAmount: subtotal }),
      });
      const data = (await response.json()) as { valid?: boolean; coupon?: AppliedCoupon; message?: string };
      if (!data.valid || !data.coupon) {
        setCouponError(data.message ?? "Coupon could not be applied");
        setAppliedCoupon(null);
        return;
      }
      setAppliedCoupon(data.coupon);
      setCouponInput(data.coupon.code);
      pushToast(data.message ?? `${data.coupon.code} applied`, { variant: "success" });
    } catch {
      setCouponError("Could not validate coupon. Please try again.");
    } finally {
      if (isMountedRef.current) setIsValidatingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput("");
    setCouponError(null);
    pushToast("Coupon removed", { variant: "info" });
  };

  const handleProceedToShipping = () => {
    if (cartItems.length === 0) { pushToast("Add items to cart before checkout", { variant: "warning" }); return; }
    if (!isSignedIn) { pushToast("Sign in to proceed to checkout", { variant: "warning" }); onClose(); router.push("/account?tab=overview"); return; }
    if (mode === "drawer") {
      onClose();
      router.push("/checkout");
      return;
    }
    setStep("shipping");
  };

  const handleProceedToSummary = () => {
    if (!validateShippingDetails()) { pushToast("Please fix shipping form errors", { variant: "warning" }); return; }
    setStep("summary");
  };

  const handleOnlineCheckout = async () => {
    const razorpayKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    if (!razorpayKey) { pushToast("Checkout is not configured", { variant: "error" }); return; }
    setIsCheckingOut(true);
    try {
      const scriptReady = await loadRazorpayScript();
      if (!scriptReady) { pushToast("Failed to load payment gateway", { variant: "error" }); return; }

      const orderResponse = await fetch("/api/checkout/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cartItems.map((item) => ({ productId: item.product.id, quantity: item.quantity })),
          shippingName: shippingName.trim(),
          shippingEmail: shippingEmail.trim(),
          shippingAddress: shippingAddress.trim(),
          shippingCity: shippingCity.trim(),
          shippingState: shippingState.trim(),
          shippingPinCode: shippingPinCode.trim(),
          shippingMethod,
          couponCode: appliedCoupon?.code || undefined,
        }),
      });

      const orderData = (await orderResponse.json().catch(() => ({}))) as {
        orderId?: string; amount?: number; currency?: string; keyId?: string; error?: string;
      };

      const effectiveRazorpayKey = orderData.keyId ?? razorpayKey;

      if (!orderResponse.ok || !orderData.orderId || !orderData.amount || !orderData.currency) {
        pushToast(orderData.error ?? "Unable to create order", { variant: "error" });
        return;
      }

      if (!effectiveRazorpayKey) {
        pushToast("Checkout key is missing on server", { variant: "error" });
        return;
      }

      const razorpay = new window.Razorpay({
        key: effectiveRazorpayKey,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "Firaang",
        description: "Secure checkout",
        order_id: orderData.orderId,
        prefill: { name: shippingName.trim() || undefined, email: shippingEmail.trim() || undefined },
        theme: { color: "#D3A736" },
        modal: { ondismiss: () => { pushToast("Payment cancelled", { variant: "warning" }); } },
        handler: async (response) => {
          const verifyResponse = await fetch("/api/checkout/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(response),
          });
          if (!verifyResponse.ok) { pushToast("Payment verification failed", { variant: "error" }); return; }

          const verification = (await verifyResponse.json()) as {
            verified?: boolean;
            order?: {
              id: string; createdAt: string; totalAmount: number; currencyCode: string;
              status: "paid" | "pending" | "failed" | "cancelled"; paymentMethod: "online" | "cod";
              paymentId?: string;
              items: Array<{ productId: string; name: string; image: string; unitPrice: number; quantity: number; lineTotal: number }>;
            };
            meta?: { accountLinked?: boolean };
          };

          if (!verification.verified) { pushToast("Payment could not be verified", { variant: "error" }); return; }
          if (verification.order) upsertOrder(verification.order);

          updateProfile({
            fullName: shippingName.trim() || profile.fullName,
            email: shippingEmail.trim() || profile.email,
            address: shippingAddress.trim(),
            city: shippingCity.trim(),
            state: shippingState.trim(),
            pinCode: shippingPinCode.trim(),
          });

          clearCart();
          setAppliedCoupon(null);
          setCouponInput("");
          setStep("cart");
          onClose();
          pushToast(
            verification.meta?.accountLinked
              ? "Payment successful! Order saved to your account."
              : "Payment successful! Sign in to sync orders across devices.",
            { variant: "success" }
          );
        },
      });

      razorpay.on("payment.failed", (event) => {
        pushToast(event.error?.description ?? "Payment failed", { variant: "error" });
      });
      razorpay.open();
    } catch (error) {
      console.error("Checkout failed", error);
      pushToast("Checkout failed. Please try again.", { variant: "error" });
    } finally {
      if (isMountedRef.current) setIsCheckingOut(false);
    }
  };

  const prevStep = stepBack[step];
  const STEPS: CheckoutStep[] = ["cart", "shipping", "summary"];

  if (mode === "drawer" && !isOpen) {
    return null;
  }

  return (
    <>
      {mode === "drawer" ? (
        <div
          className={`fixed inset-0 z-[85] bg-black/60 transition-opacity duration-300 ${isOpen ? "visible opacity-100" : "invisible opacity-0"}`}
          onClick={onClose}
        />
      ) : null}

      <aside
        className={mode === "page"
          ? "fixed inset-0 z-[95] flex h-[100dvh] w-screen flex-col bg-[var(--popup-bg)]"
          : `fixed inset-0 z-[95] flex h-[100dvh] w-screen flex-col bg-[var(--popup-bg)] shadow-2xl transition-transform duration-300 md:inset-y-0 md:left-auto md:w-[min(92vw,760px)] md:border-l md:border-[var(--gold)]/30 ${
              isOpen ? "translate-x-0" : "translate-x-full"
            }`}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center gap-3 border-b border-[var(--gold)]/30 px-5 py-4">
          {prevStep ? (
            <button type="button" onClick={() => setStep(prevStep)} aria-label="Go back" className="rounded-full p-1.5 transition hover:bg-[var(--popup-hover)]">
              <ArrowLeft className="h-5 w-5" />
            </button>
          ) : null}
          <h3 className="flex-1 text-lg font-semibold">{stepLabels[step]}</h3>
          <button type="button" onClick={onClose} aria-label="Close cart" className="rounded-full p-1.5 transition hover:bg-[var(--popup-hover)]">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex shrink-0 items-center gap-0 border-b border-[var(--gold)]/20 px-5 py-2.5">
          {STEPS.map((s, idx) => (
            <div key={s} className="flex items-center">
              <div className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold transition ${
                step === s ? "bg-[var(--gold)] text-[#3b0810]"
                  : idx < STEPS.indexOf(step) ? "bg-emerald-700/60 text-emerald-200"
                  : "bg-[var(--popup-hover)] text-[var(--popup-muted)]"
              }`}>
                {idx < STEPS.indexOf(step) ? <CheckCircle2 className="h-3.5 w-3.5" /> : idx + 1}
              </div>
              {idx < 2 ? (
                <div className={`mx-1.5 h-px w-8 transition ${idx < STEPS.indexOf(step) ? "bg-emerald-700/60" : "bg-[var(--gold)]/20"}`} />
              ) : null}
            </div>
          ))}
          <span className="ml-3 text-[11px] uppercase tracking-[0.12em] text-[var(--popup-muted)]">
            {step === "cart" ? "Review Items" : step === "shipping" ? "Delivery" : "Payment"}
          </span>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">

          {/* CART STEP */}
          {step === "cart" && (
            <div className="p-5">
              {cartItems.length === 0 ? (
                !isSignedIn ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <ShoppingBag className="mb-4 h-12 w-12 text-[var(--popup-muted)]" />
                    <p className="text-[var(--popup-muted)]">Your cart is empty.</p>
                    <p className="mt-2 text-xs text-[var(--popup-muted)]">Sign in to load your saved cart.</p>
                    <button type="button" onClick={() => { onClose(); router.push("/account?tab=overview"); }} className="gold-button mt-5 px-6 py-2.5 text-sm">
                      Login / Sign Up
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-center text-[var(--popup-muted)]">
                    <ShoppingBag className="mb-3 h-10 w-10" />
                    <p>Your cart is empty.</p>
                  </div>
                )
              ) : (
                <div className="space-y-3">
                  {cartItems.map((item) => {
                    const lineTotal = item.product.priceAmount * item.quantity;
                    return (
                      <article key={item.product.id} className="rounded-2xl border border-[var(--gold)]/30 bg-[var(--popup-footer-bg)] p-3">
                        <div className="flex gap-4">
                          <SafeImage src={item.product.img} alt={item.product.name} className="h-24 w-24 shrink-0 rounded-xl object-cover" />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold leading-snug text-[var(--popup-footer-text)]">{item.product.name}</p>
                            {item.product.category ? (
                              <p className="mt-0.5 text-[11px] capitalize text-[var(--popup-muted)]">{item.product.category}</p>
                            ) : null}
                            <p className="mt-1.5 text-sm font-medium text-[#eac26a]">
                              {formatCurrency(convertAmount(item.product.priceAmount, "INR", displayCurrency), displayCurrency)}
                              <span className="ml-1 text-xs text-[var(--popup-muted)]">/ piece</span>
                            </p>
                            <div className="mt-2.5 flex items-center justify-between">
                              <div className="flex items-center gap-1.5 rounded-full border border-[var(--gold)]/40 px-1 py-0.5">
                                <button type="button" className="rounded-full p-1 transition hover:bg-[var(--popup-hover)]" onClick={() => updateCartQuantity(item.product.id, item.quantity - 1)} aria-label={`Decrease ${item.product.name} quantity`}>
                                  <Minus className="h-3 w-3" />
                                </button>
                                <span className="w-6 text-center text-sm font-semibold">{item.quantity}</span>
                                <button type="button" className="rounded-full p-1 transition hover:bg-[var(--popup-hover)]" onClick={() => updateCartQuantity(item.product.id, item.quantity + 1)} aria-label={`Increase ${item.product.name} quantity`}>
                                  <Plus className="h-3 w-3" />
                                </button>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-sm font-semibold text-[var(--popup-footer-text)]">
                                  {formatCurrency(convertAmount(lineTotal, "INR", displayCurrency), displayCurrency)}
                                </span>
                                <button type="button" className="rounded-full p-1.5 text-[var(--gold)]/70 transition hover:bg-[var(--popup-hover)] hover:text-red-400" onClick={() => removeFromCart(item.product.id)} aria-label={`Remove ${item.product.name}`}>
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* SHIPPING STEP */}
          {step === "shipping" && (
            <div className="space-y-4 p-5">
              <div>
                <label className="mb-1.5 block text-[11px] uppercase tracking-[0.12em] text-[var(--popup-muted)]">Full Name <span className="text-red-400">*</span></label>
                <input type="text" value={shippingName} onChange={(e) => { setShippingName(e.target.value); if (shippingErrors.fullName) setShippingErrors((prev) => ({ ...prev, fullName: "" })); }} placeholder="Your full name" className="w-full rounded-xl border border-[var(--gold)]/35 bg-[var(--popup-footer-bg)] px-4 py-3 text-sm text-[var(--popup-footer-text)] outline-none placeholder:text-[var(--popup-muted)] focus:border-[var(--gold)] transition" />
                {shippingErrors.fullName ? <p className="mt-1.5 text-xs text-red-400">{shippingErrors.fullName}</p> : null}
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] uppercase tracking-[0.12em] text-[var(--popup-muted)]">Email Address <span className="text-red-400">*</span></label>
                <input type="email" value={shippingEmail} onChange={(e) => { setShippingEmail(e.target.value); if (shippingErrors.email) setShippingErrors((prev) => ({ ...prev, email: "" })); }} placeholder="name@example.com" className="w-full rounded-xl border border-[var(--gold)]/35 bg-[var(--popup-footer-bg)] px-4 py-3 text-sm text-[var(--popup-footer-text)] outline-none placeholder:text-[var(--popup-muted)] focus:border-[var(--gold)] transition" />
                {shippingErrors.email ? <p className="mt-1.5 text-xs text-red-400">{shippingErrors.email}</p> : null}
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] uppercase tracking-[0.12em] text-[var(--popup-muted)]">Shipping Address <span className="text-red-400">*</span></label>
                <textarea rows={3} value={shippingAddress} onChange={(e) => { setShippingAddress(e.target.value); if (shippingErrors.address) setShippingErrors((prev) => ({ ...prev, address: "" })); }} placeholder="House no., street, locality" className="w-full resize-none rounded-xl border border-[var(--gold)]/35 bg-[var(--popup-footer-bg)] px-4 py-3 text-sm text-[var(--popup-footer-text)] outline-none placeholder:text-[var(--popup-muted)] focus:border-[var(--gold)] transition" />
                {shippingErrors.address ? <p className="mt-1.5 text-xs text-red-400">{shippingErrors.address}</p> : null}
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-[11px] uppercase tracking-[0.12em] text-[var(--popup-muted)]">City / Town <span className="text-red-400">*</span></label>
                  <input type="text" value={shippingCity} onChange={(e) => { setShippingCity(e.target.value); if (shippingErrors.city) setShippingErrors((prev) => ({ ...prev, city: "" })); }} placeholder="City" className="w-full rounded-xl border border-[var(--gold)]/35 bg-[var(--popup-footer-bg)] px-4 py-3 text-sm text-[var(--popup-footer-text)] outline-none placeholder:text-[var(--popup-muted)] focus:border-[var(--gold)] transition" />
                  {shippingErrors.city ? <p className="mt-1.5 text-xs text-red-400">{shippingErrors.city}</p> : null}
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] uppercase tracking-[0.12em] text-[var(--popup-muted)]">PIN Code <span className="text-red-400">*</span></label>
                  <input type="text" inputMode="numeric" maxLength={6} value={shippingPinCode} onChange={(e) => { setShippingPinCode(e.target.value.replace(/\D/g, "").slice(0, 6)); if (shippingErrors.pinCode) setShippingErrors((prev) => ({ ...prev, pinCode: "" })); }} placeholder="6-digit PIN" className="w-full rounded-xl border border-[var(--gold)]/35 bg-[var(--popup-footer-bg)] px-4 py-3 text-sm text-[var(--popup-footer-text)] outline-none placeholder:text-[var(--popup-muted)] focus:border-[var(--gold)] transition" />
                  {shippingErrors.pinCode ? <p className="mt-1.5 text-xs text-red-400">{shippingErrors.pinCode}</p> : null}
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] uppercase tracking-[0.12em] text-[var(--popup-muted)]">State <span className="text-red-400">*</span></label>
                <select value={shippingState} onChange={(e) => { setShippingState(e.target.value); if (shippingErrors.state) setShippingErrors((prev) => ({ ...prev, state: "" })); }} className="w-full rounded-xl border border-[var(--gold)]/35 bg-[var(--popup-footer-bg)] px-4 py-3 text-sm text-[var(--popup-footer-text)] outline-none focus:border-[var(--gold)] transition">
                  <option value="">Select state</option>
                  {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                {shippingErrors.state ? <p className="mt-1.5 text-xs text-red-400">{shippingErrors.state}</p> : null}
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] uppercase tracking-[0.12em] text-[var(--popup-muted)]">Shipping Method</label>
                <select value={shippingMethod} onChange={(e) => setShippingMethod(e.target.value as ShippingMethod)} className="w-full rounded-xl border border-[var(--gold)]/35 bg-[var(--popup-footer-bg)] px-4 py-3 text-sm text-[var(--popup-footer-text)] outline-none focus:border-[var(--gold)] transition">
                  <option value="surface">Surface Shipping</option>
                  <option value="air">Air Shipping</option>
                </select>
              </div>
              {isSignedIn ? (
                <p className="text-xs text-[var(--gold)]/70">This address will be saved to your profile for future purchases.</p>
              ) : null}
            </div>
          )}

          {/* SUMMARY STEP */}
          {step === "summary" && (
            <div className="space-y-5 p-5">
              {/* Delivery address */}
              <div className="rounded-2xl border border-[var(--gold)]/30 bg-[var(--popup-footer-bg)] p-4">
                <p className="mb-2 text-[11px] uppercase tracking-[0.14em] text-[var(--gold)]">Delivering to</p>
                <p className="text-sm font-medium text-[var(--popup-footer-text)]">{shippingName || "-"}</p>
                <p className="mt-0.5 text-xs text-[var(--popup-muted)]">
                  {shippingAddress}{shippingCity ? `, ${shippingCity}` : ""}, {shippingState} - {shippingPinCode}
                </p>
                <p className="mt-1 text-xs text-[var(--popup-muted)]">Method: {shippingMethod === "air" ? "Air Shipping" : "Surface Shipping"}</p>
              </div>

              {/* Items */}
              <div className="rounded-2xl border border-[var(--gold)]/30 bg-[var(--popup-footer-bg)] p-4">
                <p className="mb-3 text-[11px] uppercase tracking-[0.14em] text-[var(--gold)]">Items ({cartCount})</p>
                <div className="space-y-2.5">
                  {cartItems.map((item) => (
                    <div key={item.product.id} className="flex items-center gap-3">
                      <SafeImage src={item.product.img} alt={item.product.name} className="h-10 w-10 shrink-0 rounded-lg object-cover" />
                      <p className="flex-1 text-xs text-[var(--popup-footer-text)] line-clamp-1">{item.product.name}</p>
                      <span className="text-xs text-[var(--popup-muted)]">x{item.quantity}</span>
                      <span className="text-xs font-medium text-[var(--popup-footer-text)]">
                        {formatCurrency(convertAmount(item.product.priceAmount * item.quantity, "INR", displayCurrency), displayCurrency)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Coupon */}
              <div className="rounded-2xl border border-[var(--gold)]/30 bg-[var(--popup-footer-bg)] p-4">
                <p className="mb-3 flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-[var(--gold)]">
                  <Tag className="h-3 w-3" /> Discount Coupon
                </p>
                {appliedCoupon ? (
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-700/40 bg-emerald-900/20 px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-emerald-300">{appliedCoupon.code}</p>
                      <p className="text-xs text-emerald-400/80">{appliedCoupon.description}</p>
                    </div>
                    <button type="button" className="text-xs text-[var(--gold)] transition hover:text-[#f0c654]" onClick={handleRemoveCoupon}>Remove</button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        value={couponInput}
                        onChange={(e) => { setCouponInput(e.target.value.toUpperCase()); setCouponError(null); }}
                        onKeyDown={(e) => { if (e.key === "Enter") void handleApplyCoupon(); }}
                        placeholder="Enter coupon code"
                        className="min-w-0 flex-1 rounded-xl border border-[var(--gold)]/35 bg-[var(--popup-bg)] px-4 py-2.5 text-sm text-[var(--popup-footer-text)] outline-none placeholder:text-[var(--popup-muted)] focus:border-[var(--gold)] transition"
                      />
                      <button type="button" onClick={() => void handleApplyCoupon()} disabled={isValidatingCoupon} className="rounded-xl border border-[var(--gold)] px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--gold)] transition hover:bg-[var(--popup-hover)] disabled:opacity-60">
                        {isValidatingCoupon ? "..." : "Apply"}
                      </button>
                    </div>
                    {couponError ? <p className="text-xs text-amber-300">{couponError}</p> : null}
                  </div>
                )}
              </div>

              {/* Price breakdown */}
              <div className="space-y-2.5 rounded-2xl border border-[var(--gold)]/30 bg-[var(--popup-footer-bg)] p-4">
                <p className="mb-1 text-[11px] uppercase tracking-[0.14em] text-[var(--gold)]">Price Breakdown</p>
                <div className="flex justify-between text-sm text-[var(--popup-footer-text)]">
                  <span>Subtotal ({cartCount} items)</span>
                  <span>{formatCurrency(convertAmount(pricing.subtotalAmount, "INR", displayCurrency), displayCurrency)}</span>
                </div>
                <div className="flex justify-between text-sm text-[var(--popup-footer-text)]">
                  <span>Shipping {pricing.shippingStatus === "resolved" ? <span className="ml-1 text-[11px] text-[var(--popup-muted)]">({pricing.shippingLabel})</span> : null}</span>
                  <span>{pricing.shippingStatus === "resolved" ? formatCurrency(convertAmount(pricing.shippingFee, "INR", displayCurrency), displayCurrency) : "-"}</span>
                </div>
                {pricing.discountAmount > 0 ? (
                  <div className="flex justify-between text-sm text-emerald-300">
                    <span>Discount ({appliedCoupon?.code})</span>
                    <span>-{formatCurrency(convertAmount(pricing.discountAmount, "INR", displayCurrency), displayCurrency)}</span>
                  </div>
                ) : null}
                <div className="flex justify-between border-t border-[var(--gold)]/20 pt-2.5 text-base font-semibold text-[#fff4ef]">
                  <span>Total Payable</span>
                  <span>{formatCurrency(convertAmount(pricing.totalAmount, "INR", displayCurrency), displayCurrency)}</span>
                </div>
                {pricing.discountAmount > 0 ? (
                  <p className="text-center text-xs text-emerald-400">You save {formatCurrency(convertAmount(pricing.discountAmount, "INR", displayCurrency), displayCurrency)} on this order!</p>
                ) : null}
                {displayCurrency !== "INR" ? (
                  <p className="text-center text-[11px] text-[var(--popup-muted)]">Charged in INR via Razorpay</p>
                ) : null}
              </div>

              <div className="flex items-center justify-center gap-2 text-[11px] text-[var(--popup-muted)]">
                <Package className="h-3.5 w-3.5" />
                <span>Secured by Razorpay - 256-bit SSL encrypted</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer CTA */}
        <div className="shrink-0 space-y-3 border-t border-[var(--gold)]/30 p-5">
          {step === "cart" && (
            <>
              {cartItems.length > 0 ? (
                <div className="flex justify-between text-sm text-[var(--popup-footer-text)]">
                  <span>Cart Subtotal</span>
                  <span className="font-semibold">{formatCurrency(convertAmount(subtotal, "INR", displayCurrency), displayCurrency)}</span>
                </div>
              ) : null}
              <button type="button" disabled={cartItems.length === 0} onClick={handleProceedToShipping} className="flex w-full items-center justify-center gap-2 rounded-full bg-[var(--gold)] px-5 py-3.5 font-semibold text-[#3b0810] transition hover:bg-[#f0c654] disabled:cursor-not-allowed disabled:opacity-50">
                {mode === "drawer" ? "Checkout on Full Page" : "Proceed to Checkout"} <ChevronRight className="h-4 w-4" />
              </button>
            </>
          )}
          {step === "shipping" && (
            <button type="button" disabled={!hasShippingDetails} onClick={handleProceedToSummary} className="flex w-full items-center justify-center gap-2 rounded-full bg-[var(--gold)] px-5 py-3.5 font-semibold text-[#3b0810] transition hover:bg-[#f0c654] disabled:cursor-not-allowed disabled:opacity-50">
              Continue to Order Summary <ChevronRight className="h-4 w-4" />
            </button>
          )}
          {step === "summary" && (
            <button type="button" disabled={isCheckingOut || !hasShippingDetails || pricing.shippingStatus !== "resolved"} onClick={() => void handleOnlineCheckout()} className="flex w-full items-center justify-center gap-2 rounded-full bg-[var(--gold)] px-5 py-4 text-base font-bold text-[#3b0810] transition hover:bg-[#f0c654] disabled:cursor-not-allowed disabled:opacity-50">
              {isCheckingOut ? "Processing..." : <>Pay Securely{pricing.totalAmount > 0 ? ` - ${formatCurrency(convertAmount(pricing.totalAmount, "INR", displayCurrency), displayCurrency)}` : ""}</>}
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
