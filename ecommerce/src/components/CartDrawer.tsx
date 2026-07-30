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
  const [selectedSavedAddressId, setSelectedSavedAddressId] = useState<string | null>(null);
  const [isSavingShippingAddress, setIsSavingShippingAddress] = useState(false);
  const isMountedRef = useRef(false);
  const savedAddresses = profile.savedAddresses ?? [];

  type SavedAddress = NonNullable<typeof profile.savedAddresses>[number];

  const applySavedAddress = (address: SavedAddress) => {
    setSelectedSavedAddressId(address.id);
    if (address.fullName.trim()) {
      setShippingName(address.fullName);
    }
    if (address.email.trim()) {
      setShippingEmail(address.email);
    }
    if (address.phone.trim()) {
      updateProfile({ phone: address.phone.trim() });
    }
    setShippingAddress(address.address);
    setShippingCity(address.city);
    setShippingState(address.state);
    setShippingPinCode(address.pinCode);
    setShippingErrors((prev) => ({
      ...prev,
      fullName: "",
      address: "",
      city: "",
      state: "",
      pinCode: "",
    }));
  };

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

  useEffect(() => {
    if (!isOpen || !isSignedIn) {
      return;
    }

    let cancelled = false;

    const loadSavedAddresses = async () => {
      try {
        const response = await fetch("/api/account/shipping-addresses", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });

        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as { addresses?: SavedAddress[] };
        if (cancelled) {
          return;
        }

        if (payload.addresses) {
          updateProfile({ savedAddresses: payload.addresses });
        }
      } catch {
        // Silent: checkout can still proceed with local profile data.
      }
    };

    void loadSavedAddresses();

    return () => {
      cancelled = true;
    };
  }, [isOpen, isSignedIn, updateProfile]);

  useEffect(() => {
    if (!isOpen || !isSignedIn) {
      return;
    }

    if (savedAddresses.length === 0) {
      setSelectedSavedAddressId(null);
      return;
    }

    const preferred =
      savedAddresses.find((item) => item.id === selectedSavedAddressId) ??
      savedAddresses[0];

    setSelectedSavedAddressId(preferred.id);

    if (!shippingAddress.trim()) {
      applySavedAddress(preferred);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, isSignedIn, savedAddresses]);

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

  const handleProceedToSummary = async () => {
    if (!validateShippingDetails()) { pushToast("Please fix shipping form errors", { variant: "warning" }); return; }

    if (isSignedIn) {
      setIsSavingShippingAddress(true);
      try {
        const response = await fetch("/api/account/shipping-addresses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fullName: shippingName.trim(),
            email: shippingEmail.trim(),
            phone: profile.phone.trim(),
            address: shippingAddress.trim(),
            city: shippingCity.trim(),
            state: shippingState.trim(),
            pinCode: shippingPinCode.trim(),
          }),
        });

        const payload = (await response.json().catch(() => ({}))) as {
          addresses?: SavedAddress[];
          profile?: typeof profile;
          error?: string;
        };

        if (!response.ok) {
          pushToast(payload.error ?? "Could not save shipping address", { variant: "warning" });
        } else {
          updateProfile({
            fullName: shippingName.trim() || profile.fullName,
            address: shippingAddress.trim(),
            city: shippingCity.trim(),
            state: shippingState.trim(),
            pinCode: shippingPinCode.trim(),
            savedAddresses: payload.addresses ?? profile.savedAddresses,
          });

          if (payload.addresses?.[0]?.id) {
            setSelectedSavedAddressId(payload.addresses[0].id);
          }
        }
      } catch {
        pushToast("Could not save shipping address", { variant: "warning" });
      } finally {
        if (isMountedRef.current) {
          setIsSavingShippingAddress(false);
        }
      }
    }

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
          ? "fixed inset-0 z-[95] flex h-[100dvh] w-screen flex-col bg-[#f7f8fc]"
          : `fixed inset-0 z-[95] flex h-[100dvh] w-screen flex-col bg-[#f7f8fc] shadow-2xl transition-transform duration-300 md:inset-y-0 md:left-auto md:w-[min(92vw,760px)] md:border-l md:border-[#e6e8f0] ${
              isOpen ? "translate-x-0" : "translate-x-full"
            }`}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center gap-3 border-b border-[#e6e8f0] bg-white px-5 py-4">
          {prevStep ? (
            <button type="button" onClick={() => setStep(prevStep)} aria-label="Go back" className="rounded-full p-1.5 transition hover:bg-[#f1f3f9]">
              <ArrowLeft className="h-5 w-5" />
            </button>
          ) : null}
          <h3 className="flex-1 text-lg font-semibold">{stepLabels[step]}</h3>
          <button type="button" onClick={onClose} aria-label="Close cart" className="rounded-full p-1.5 transition hover:bg-[#f1f3f9]">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex shrink-0 items-center gap-0 border-b border-[#eceff5] bg-white px-5 py-2.5">
          {STEPS.map((s, idx) => (
            <div key={s} className="flex items-center">
              <div className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold transition ${
                step === s ? "bg-[#ff3f6c] text-white"
                  : idx < STEPS.indexOf(step) ? "bg-emerald-700/60 text-emerald-200"
                  : "bg-[#f1f3f9] text-[#6b7280]"
              }`}>
                {idx < STEPS.indexOf(step) ? <CheckCircle2 className="h-3.5 w-3.5" /> : idx + 1}
              </div>
              {idx < 2 ? (
                <div className={`mx-1.5 h-px w-8 transition ${idx < STEPS.indexOf(step) ? "bg-emerald-700/60" : "bg-[#ff3f6c]/20"}`} />
              ) : null}
            </div>
          ))}
          <span className="ml-3 text-[11px] uppercase tracking-[0.12em] text-[#6b7280]">
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
                    <ShoppingBag className="mb-4 h-12 w-12 text-[#6b7280]" />
                    <p className="text-[#6b7280]">Your cart is empty.</p>
                    <p className="mt-2 text-xs text-[#6b7280]">Sign in to load your saved cart.</p>
                    <button type="button" onClick={() => { onClose(); router.push("/account?tab=overview"); }} className="mt-5 rounded-full bg-[#ff3f6c] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#ff5f84]">
                      Login / Sign Up
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-center text-[#6b7280]">
                    <ShoppingBag className="mb-3 h-10 w-10" />
                    <p>Your cart is empty.</p>
                  </div>
                )
              ) : (
                <div className="space-y-3">
                  {cartItems.map((item) => {
                    const lineTotal = item.product.priceAmount * item.quantity;
                    return (
                      <article key={item.product.id} className="rounded-2xl border border-[#ff3f6c]/30 bg-white p-3">
                        <div className="flex gap-4">
                          <SafeImage src={item.product.img} alt={item.product.name} className="h-24 w-24 shrink-0 rounded-xl object-cover" />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold leading-snug text-[#1f2430]">{item.product.name}</p>
                            {item.product.category ? (
                              <p className="mt-0.5 text-[11px] capitalize text-[#6b7280]">{item.product.category}</p>
                            ) : null}
                            <p className="mt-1.5 text-sm font-medium text-[#eac26a]">
                              {formatCurrency(convertAmount(item.product.priceAmount, "INR", displayCurrency), displayCurrency)}
                              <span className="ml-1 text-xs text-[#6b7280]">/ piece</span>
                            </p>
                            <div className="mt-2.5 flex items-center justify-between">
                              <div className="flex items-center gap-1.5 rounded-full border border-[#ff3f6c]/40 px-1 py-0.5">
                                <button type="button" className="rounded-full p-1 transition hover:bg-[#f1f3f9]" onClick={() => updateCartQuantity(item.product.id, item.quantity - 1)} aria-label={`Decrease ${item.product.name} quantity`}>
                                  <Minus className="h-3 w-3" />
                                </button>
                                <span className="w-6 text-center text-sm font-semibold">{item.quantity}</span>
                                <button type="button" className="rounded-full p-1 transition hover:bg-[#f1f3f9]" onClick={() => updateCartQuantity(item.product.id, item.quantity + 1)} aria-label={`Increase ${item.product.name} quantity`}>
                                  <Plus className="h-3 w-3" />
                                </button>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-sm font-semibold text-[#1f2430]">
                                  {formatCurrency(convertAmount(lineTotal, "INR", displayCurrency), displayCurrency)}
                                </span>
                                <button type="button" className="rounded-full p-1.5 text-[#ff3f6c]/70 transition hover:bg-[#f1f3f9] hover:text-red-400" onClick={() => removeFromCart(item.product.id)} aria-label={`Remove ${item.product.name}`}>
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
              {isSignedIn && savedAddresses.length > 0 ? (
                <div className="rounded-2xl border border-[#ff3f6c]/30 bg-white p-4">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#ff3f6c]">Saved Addresses</p>
                    <button
                      type="button"
                      onClick={() => setSelectedSavedAddressId(null)}
                      className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#ff3f6c] transition hover:text-[#ff5f84]"
                    >
                      Use New Address
                    </button>
                  </div>
                  <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
                    {savedAddresses.map((address) => {
                      const isActive = selectedSavedAddressId === address.id;
                      return (
                        <button
                          key={address.id}
                          type="button"
                          onClick={() => applySavedAddress(address)}
                          className={`w-full rounded-xl border px-3 py-2 text-left transition ${
                            isActive
                              ? "border-[#ff3f6c] bg-[#f1f3f9]"
                              : "border-[#ff3f6c]/25 bg-transparent hover:border-[#ff3f6c]/55"
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            <span className={`mt-1 inline-flex h-4 w-4 shrink-0 rounded-full border ${isActive ? "border-[#ff3f6c]" : "border-[#9ca3af]"}`}>
                              {isActive ? <span className="m-auto h-2 w-2 rounded-full bg-[#ff3f6c]" /> : null}
                            </span>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-[#1f2430]">{address.fullName || shippingName || "Saved address"}</p>
                              <p className="mt-1 text-xs leading-5 text-[#6b7280]">
                                {address.address}
                                {address.city ? `, ${address.city}` : ""}, {address.state}
                                {address.pinCode ? ` - ${address.pinCode}` : ""}
                              </p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              <div>
                <label className="mb-1.5 block text-[11px] uppercase tracking-[0.12em] text-[#6b7280]">Full Name <span className="text-red-400">*</span></label>
                <input type="text" value={shippingName} onChange={(e) => { setSelectedSavedAddressId(null); setShippingName(e.target.value); if (shippingErrors.fullName) setShippingErrors((prev) => ({ ...prev, fullName: "" })); }} placeholder="Your full name" className="w-full rounded-xl border border-[#ff3f6c]/35 bg-white px-4 py-3 text-sm text-[#1f2430] outline-none placeholder:text-[#6b7280] focus:border-[#ff3f6c] transition" />
                {shippingErrors.fullName ? <p className="mt-1.5 text-xs text-red-400">{shippingErrors.fullName}</p> : null}
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] uppercase tracking-[0.12em] text-[#6b7280]">Email Address <span className="text-red-400">*</span></label>
                <input type="email" value={shippingEmail} onChange={(e) => { setShippingEmail(e.target.value); if (shippingErrors.email) setShippingErrors((prev) => ({ ...prev, email: "" })); }} placeholder="name@example.com" className="w-full rounded-xl border border-[#ff3f6c]/35 bg-white px-4 py-3 text-sm text-[#1f2430] outline-none placeholder:text-[#6b7280] focus:border-[#ff3f6c] transition" />
                {shippingErrors.email ? <p className="mt-1.5 text-xs text-red-400">{shippingErrors.email}</p> : null}
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] uppercase tracking-[0.12em] text-[#6b7280]">Shipping Address <span className="text-red-400">*</span></label>
                <textarea rows={3} value={shippingAddress} onChange={(e) => { setSelectedSavedAddressId(null); setShippingAddress(e.target.value); if (shippingErrors.address) setShippingErrors((prev) => ({ ...prev, address: "" })); }} placeholder="House no., street, locality" className="w-full resize-none rounded-xl border border-[#ff3f6c]/35 bg-white px-4 py-3 text-sm text-[#1f2430] outline-none placeholder:text-[#6b7280] focus:border-[#ff3f6c] transition" />
                {shippingErrors.address ? <p className="mt-1.5 text-xs text-red-400">{shippingErrors.address}</p> : null}
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-[11px] uppercase tracking-[0.12em] text-[#6b7280]">City / Town <span className="text-red-400">*</span></label>
                  <input type="text" value={shippingCity} onChange={(e) => { setSelectedSavedAddressId(null); setShippingCity(e.target.value); if (shippingErrors.city) setShippingErrors((prev) => ({ ...prev, city: "" })); }} placeholder="City" className="w-full rounded-xl border border-[#ff3f6c]/35 bg-white px-4 py-3 text-sm text-[#1f2430] outline-none placeholder:text-[#6b7280] focus:border-[#ff3f6c] transition" />
                  {shippingErrors.city ? <p className="mt-1.5 text-xs text-red-400">{shippingErrors.city}</p> : null}
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] uppercase tracking-[0.12em] text-[#6b7280]">PIN Code <span className="text-red-400">*</span></label>
                  <input type="text" inputMode="numeric" maxLength={6} value={shippingPinCode} onChange={(e) => { setSelectedSavedAddressId(null); setShippingPinCode(e.target.value.replace(/\D/g, "").slice(0, 6)); if (shippingErrors.pinCode) setShippingErrors((prev) => ({ ...prev, pinCode: "" })); }} placeholder="6-digit PIN" className="w-full rounded-xl border border-[#ff3f6c]/35 bg-white px-4 py-3 text-sm text-[#1f2430] outline-none placeholder:text-[#6b7280] focus:border-[#ff3f6c] transition" />
                  {shippingErrors.pinCode ? <p className="mt-1.5 text-xs text-red-400">{shippingErrors.pinCode}</p> : null}
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] uppercase tracking-[0.12em] text-[#6b7280]">State <span className="text-red-400">*</span></label>
                <select value={shippingState} onChange={(e) => { setSelectedSavedAddressId(null); setShippingState(e.target.value); if (shippingErrors.state) setShippingErrors((prev) => ({ ...prev, state: "" })); }} className="w-full rounded-xl border border-[#ff3f6c]/35 bg-white px-4 py-3 text-sm text-[#1f2430] outline-none focus:border-[#ff3f6c] transition">
                  <option value="">Select state</option>
                  {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                {shippingErrors.state ? <p className="mt-1.5 text-xs text-red-400">{shippingErrors.state}</p> : null}
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] uppercase tracking-[0.12em] text-[#6b7280]">Shipping Method</label>
                <select value={shippingMethod} onChange={(e) => setShippingMethod(e.target.value as ShippingMethod)} className="w-full rounded-xl border border-[#ff3f6c]/35 bg-white px-4 py-3 text-sm text-[#1f2430] outline-none focus:border-[#ff3f6c] transition">
                  <option value="surface">Surface Shipping</option>
                  <option value="air">Air Shipping</option>
                </select>
              </div>
              {isSignedIn ? (
                <p className="text-xs text-[#ff3f6c]/70">This address will be saved to your profile for future purchases.</p>
              ) : null}
            </div>
          )}

          {/* SUMMARY STEP */}
          {step === "summary" && (
            <div className="space-y-5 p-5">
              {/* Delivery address */}
              <div className="rounded-2xl border border-[#ff3f6c]/30 bg-white p-4">
                <p className="mb-2 text-[11px] uppercase tracking-[0.14em] text-[#ff3f6c]">Delivering to</p>
                <p className="text-sm font-medium text-[#1f2430]">{shippingName || "-"}</p>
                <p className="mt-0.5 text-xs text-[#6b7280]">
                  {shippingAddress}{shippingCity ? `, ${shippingCity}` : ""}, {shippingState} - {shippingPinCode}
                </p>
                <p className="mt-1 text-xs text-[#6b7280]">Method: {shippingMethod === "air" ? "Air Shipping" : "Surface Shipping"}</p>
              </div>

              {/* Items */}
              <div className="rounded-2xl border border-[#ff3f6c]/30 bg-white p-4">
                <p className="mb-3 text-[11px] uppercase tracking-[0.14em] text-[#ff3f6c]">Items ({cartCount})</p>
                <div className="space-y-2.5">
                  {cartItems.map((item) => (
                    <div key={item.product.id} className="flex items-center gap-3">
                      <SafeImage src={item.product.img} alt={item.product.name} className="h-10 w-10 shrink-0 rounded-lg object-cover" />
                      <p className="flex-1 text-xs text-[#1f2430] line-clamp-1">{item.product.name}</p>
                      <span className="text-xs text-[#6b7280]">x{item.quantity}</span>
                      <span className="text-xs font-medium text-[#1f2430]">
                        {formatCurrency(convertAmount(item.product.priceAmount * item.quantity, "INR", displayCurrency), displayCurrency)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Coupon */}
              <div className="rounded-2xl border border-[#ff3f6c]/30 bg-white p-4">
                <p className="mb-3 flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-[#ff3f6c]">
                  <Tag className="h-3 w-3" /> Discount Coupon
                </p>
                {appliedCoupon ? (
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-emerald-700">{appliedCoupon.code}</p>
                      <p className="text-xs text-emerald-600">{appliedCoupon.description}</p>
                    </div>
                    <button type="button" className="text-xs text-[#ff3f6c] transition hover:text-[#ff5f84]" onClick={handleRemoveCoupon}>Remove</button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        value={couponInput}
                        onChange={(e) => { setCouponInput(e.target.value.toUpperCase()); setCouponError(null); }}
                        onKeyDown={(e) => { if (e.key === "Enter") void handleApplyCoupon(); }}
                        placeholder="Enter coupon code"
                        className="min-w-0 flex-1 rounded-xl border border-[#ff3f6c]/35 bg-[#f7f8fc] px-4 py-2.5 text-sm text-[#1f2430] outline-none placeholder:text-[#6b7280] focus:border-[#ff3f6c] transition"
                      />
                      <button type="button" onClick={() => void handleApplyCoupon()} disabled={isValidatingCoupon} className="rounded-xl border border-[#ff3f6c] px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.08em] text-[#ff3f6c] transition hover:bg-[#f1f3f9] disabled:opacity-60">
                        {isValidatingCoupon ? "..." : "Apply"}
                      </button>
                    </div>
                    {couponError ? <p className="text-xs text-amber-300">{couponError}</p> : null}
                  </div>
                )}
              </div>

              {/* Price breakdown */}
              <div className="space-y-2.5 rounded-2xl border border-[#ff3f6c]/30 bg-white p-4">
                <p className="mb-1 text-[11px] uppercase tracking-[0.14em] text-[#ff3f6c]">Price Breakdown</p>
                <div className="flex justify-between text-sm text-[#1f2430]">
                  <span>Subtotal ({cartCount} items)</span>
                  <span>{formatCurrency(convertAmount(pricing.subtotalAmount, "INR", displayCurrency), displayCurrency)}</span>
                </div>
                <div className="flex justify-between text-sm text-[#1f2430]">
                  <span>Shipping {pricing.shippingStatus === "resolved" ? <span className="ml-1 text-[11px] text-[#6b7280]">({pricing.shippingLabel})</span> : null}</span>
                  <span>{pricing.shippingStatus === "resolved" ? formatCurrency(convertAmount(pricing.shippingFee, "INR", displayCurrency), displayCurrency) : "-"}</span>
                </div>
                {pricing.discountAmount > 0 ? (
                  <div className="flex justify-between text-sm text-emerald-300">
                    <span>Discount ({appliedCoupon?.code})</span>
                    <span>-{formatCurrency(convertAmount(pricing.discountAmount, "INR", displayCurrency), displayCurrency)}</span>
                  </div>
                ) : null}
                <div className="flex justify-between border-t border-[#eceff5] pt-2.5 text-base font-semibold text-[#1f2430]">
                  <span>Total Payable</span>
                  <span>{formatCurrency(convertAmount(pricing.totalAmount, "INR", displayCurrency), displayCurrency)}</span>
                </div>
                {pricing.discountAmount > 0 ? (
                  <p className="text-center text-xs text-emerald-400">You save {formatCurrency(convertAmount(pricing.discountAmount, "INR", displayCurrency), displayCurrency)} on this order!</p>
                ) : null}
                {displayCurrency !== "INR" ? (
                  <p className="text-center text-[11px] text-[#6b7280]">Charged in INR via Razorpay</p>
                ) : null}
              </div>

              <div className="flex items-center justify-center gap-2 text-[11px] text-[#6b7280]">
                <Package className="h-3.5 w-3.5" />
                <span>Secured by Razorpay - 256-bit SSL encrypted</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer CTA */}
        <div className="shrink-0 space-y-3 border-t border-[#ff3f6c]/30 p-5">
          {step === "cart" && (
            <>
              {cartItems.length > 0 ? (
                <div className="flex justify-between text-sm text-[#1f2430]">
                  <span>Cart Subtotal</span>
                  <span className="font-semibold">{formatCurrency(convertAmount(subtotal, "INR", displayCurrency), displayCurrency)}</span>
                </div>
              ) : null}
              <button type="button" disabled={cartItems.length === 0} onClick={handleProceedToShipping} className="flex w-full items-center justify-center gap-2 rounded-full bg-[#ff3f6c] px-5 py-3.5 font-semibold text-white transition hover:bg-[#ff5f84] disabled:cursor-not-allowed disabled:opacity-50">
                {mode === "drawer" ? "Checkout on Full Page" : "Proceed to Checkout"} <ChevronRight className="h-4 w-4" />
              </button>
            </>
          )}
          {step === "shipping" && (
            <button type="button" disabled={!hasShippingDetails || isSavingShippingAddress} onClick={() => void handleProceedToSummary()} className="flex w-full items-center justify-center gap-2 rounded-full bg-[#ff3f6c] px-5 py-3.5 font-semibold text-white transition hover:bg-[#ff5f84] disabled:cursor-not-allowed disabled:opacity-50">
              {isSavingShippingAddress ? "Saving Address..." : "Continue to Order Summary"} <ChevronRight className="h-4 w-4" />
            </button>
          )}
          {step === "summary" && (
            <button type="button" disabled={isCheckingOut || !hasShippingDetails || pricing.shippingStatus !== "resolved"} onClick={() => void handleOnlineCheckout()} className="flex w-full items-center justify-center gap-2 rounded-full bg-[#ff3f6c] px-5 py-4 text-base font-bold text-white transition hover:bg-[#ff5f84] disabled:cursor-not-allowed disabled:opacity-50">
              {isCheckingOut ? "Processing..." : <>Pay Securely{pricing.totalAmount > 0 ? ` - ${formatCurrency(convertAmount(pricing.totalAmount, "INR", displayCurrency), displayCurrency)}` : ""}</>}
            </button>
          )}
        </div>
      </aside>
    </>
  );
}



