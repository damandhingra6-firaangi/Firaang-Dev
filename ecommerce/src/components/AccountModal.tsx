"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { ClipboardList, KeyRound, Loader2, LogOut, Sparkles, Smartphone, X } from "lucide-react";
import SafeImage from "@/components/SafeImage";
import { ORDER_CANCELLATION_WINDOW_DAYS } from "@/lib/checkout-config";
import { useAccountStore } from "@/store/useAccountStore";
import { useUiStore } from "@/store/useUiStore";

type AccountView = "signin" | "profile" | "orders";

type AccountModalProps = {
  isOpen: boolean;
  initialView: AccountView;
  onClose?: () => void;
  mode?: "modal" | "page";
};

const CANCEL_REASONS = [
  "Ordered by mistake",
  "Need to change size or variant",
  "Delivery is taking too long",
  "Found a better price elsewhere",
  "Other",
] as const;

type ProfileFormErrors = {
  fullName?: string;
  email?: string;
};

const profileEmailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function formatCurrency(value: number, currencyCode: string) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function canCancelOrder(createdAt: string, status: "paid" | "pending" | "failed" | "cancelled") {
  if (status !== "paid" && status !== "pending") {
    return false;
  }

  const createdAtMs = new Date(createdAt).getTime();
  const elapsedMs = Date.now() - createdAtMs;
  const windowMs = ORDER_CANCELLATION_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  return elapsedMs <= windowMs;
}

function loadGoogleScript() {
  if (typeof window === "undefined") {
    return Promise.resolve(false);
  }

  if (window.google?.accounts?.id) {
    return Promise.resolve(true);
  }

  return new Promise<boolean>((resolve) => {
    const existing = document.querySelector<HTMLScriptElement>('script[src="https://accounts.google.com/gsi/client"]');

    if (existing) {
      existing.addEventListener("load", () => resolve(true), { once: true });
      existing.addEventListener("error", () => resolve(false), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });
}

function isConfiguredGoogleClientId(value: string) {
  const clientId = value.trim();

  if (!clientId) {
    return false;
  }

  if (clientId.includes("your-google-oauth-client-id")) {
    return false;
  }

  return /\.apps\.googleusercontent\.com$/i.test(clientId);
}

export default function AccountModal({ isOpen, initialView, onClose, mode = "modal" }: AccountModalProps) {
  const safeOnClose = onClose ?? (() => {});
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";
  const isGoogleConfigured = isConfiguredGoogleClientId(googleClientId);
  const isLoading = useAccountStore((state) => state.isLoading);
  const isSignedIn = useAccountStore((state) => state.isSignedIn);
  const profile = useAccountStore((state) => state.profile);
  const orders = useAccountStore((state) => state.orders);
  const setSession = useAccountStore((state) => state.setSession);
  const clearSession = useAccountStore((state) => state.clearSession);
  const updateProfile = useAccountStore((state) => state.updateProfile);
  const upsertOrder = useAccountStore((state) => state.upsertOrder);
  const pushToast = useUiStore((state) => state.pushToast);

  const [activeView, setActiveView] = useState<AccountView>(initialView);
  const [profileDraft, setProfileDraft] = useState(profile);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [googleState, setGoogleState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [mobileNumber, setMobileNumber] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [normalizedOtpPhone, setNormalizedOtpPhone] = useState("");
  const [mobileOtpStep, setMobileOtpStep] = useState<"phone" | "otp">("phone");
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [debugOtp, setDebugOtp] = useState("");
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);
  const [cancelTargetOrderId, setCancelTargetOrderId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState<(typeof CANCEL_REASONS)[number]>(CANCEL_REASONS[0]);
  const [cancelReasonDetail, setCancelReasonDetail] = useState("");
  const [profileErrors, setProfileErrors] = useState<ProfileFormErrors>({});
  const googleButtonRef = useRef<HTMLDivElement | null>(null);

  const profileInitials = useMemo(() => {
    const source = (profile.fullName || profile.email || "").trim();

    if (!source) {
      return "FR";
    }

    const words = source.split(/\s+/).filter(Boolean);
    if (words.length === 1) {
      return words[0].slice(0, 2).toUpperCase();
    }

    return `${words[0][0] ?? ""}${words[1][0] ?? ""}`.toUpperCase();
  }, [profile.email, profile.fullName]);

  const isModal = mode === "modal";
  const isVisible = isModal ? isOpen : true;

  useEffect(() => {
    if (!isVisible) {
      return;
    }

    setActiveView(initialView);
    setMobileOtpStep("phone");
    setOtpCode("");
    setDebugOtp("");
    setNormalizedOtpPhone("");
  }, [initialView, isVisible]);

  useEffect(() => {
    if (!isVisible) {
      return;
    }

    setProfileDraft(profile);
    setProfileErrors({});
  }, [isVisible, profile]);

  useEffect(() => {
    if (!isModal || !isVisible) {
      return;
    }

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        safeOnClose();
      }
    };

    document.addEventListener("keydown", onEscape);
    return () => document.removeEventListener("keydown", onEscape);
  }, [isModal, isVisible, safeOnClose]);

  useEffect(() => {
    setAvatarLoadFailed(false);
  }, [profile.avatarUrl]);

  const totalSpend = useMemo(
    () => orders.reduce((sum, order) => (order.status === "cancelled" ? sum : sum + order.totalAmount), 0),
    [orders],
  );

  const handleOrderCancel = async (orderId: string, reason: string) => {
    if (cancellingOrderId) {
      return;
    }

    setCancellingOrderId(orderId);

    try {
      const response = await fetch("/api/account/orders/cancel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ orderId, reason }),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        order?: typeof orders[number];
      };

      if (!response.ok || !payload.order) {
        pushToast(payload.error ?? "Could not cancel order", { variant: "error" });
        return;
      }

      upsertOrder(payload.order);
      pushToast("Order cancelled successfully", { variant: "success" });
      setCancelTargetOrderId(null);
      setCancelReason(CANCEL_REASONS[0]);
      setCancelReasonDetail("");
    } catch (error) {
      console.error("Order cancellation failed", error);
      pushToast("Could not cancel order", { variant: "error" });
    } finally {
      setCancellingOrderId(null);
    }
  };

  const handleCancelConfirmation = async () => {
    if (!cancelTargetOrderId) {
      return;
    }

    const finalReason =
      cancelReason === "Other" && cancelReasonDetail.trim().length > 0
        ? `Other: ${cancelReasonDetail.trim()}`
        : cancelReason;

    await handleOrderCancel(cancelTargetOrderId, finalReason);
  };

  const handleGoogleCredential = async (credential: string) => {
    setIsAuthenticating(true);

    try {
      const response = await fetch("/api/auth/google", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ credential }),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        profile?: typeof profile;
        orders?: typeof orders;
      };

      if (!response.ok || !payload.profile || !payload.orders) {
        pushToast(payload.error ?? "Google sign-in failed", { variant: "error" });
        return;
      }

      setSession({
        profile: payload.profile,
        orders: payload.orders,
      });
      setActiveView("profile");
      pushToast("Signed in with Google", { variant: "success" });
    } catch (error) {
      console.error("Google credential sign-in failed", error);
      pushToast("Google sign-in failed", { variant: "error" });
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleRequestOtp = async () => {
    if (isSendingOtp) {
      return;
    }

    if (!mobileNumber.trim()) {
      pushToast("Enter your mobile number", { variant: "warning" });
      return;
    }

    setIsSendingOtp(true);

    try {
      const response = await fetch("/api/auth/mobile/request-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone: mobileNumber,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        phone?: string;
        debugOtp?: string;
      };

      if (!response.ok || !payload.phone) {
        pushToast(payload.error ?? "Could not send OTP", { variant: "error" });
        return;
      }

      setNormalizedOtpPhone(payload.phone);
      setMobileNumber(payload.phone);
      setDebugOtp(payload.debugOtp ?? "");
      setOtpCode("");
      setMobileOtpStep("otp");
      pushToast("OTP sent", { variant: "success" });
    } catch (error) {
      console.error("Request OTP failed", error);
      pushToast("Could not send OTP", { variant: "error" });
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (isVerifyingOtp) {
      return;
    }

    if (!otpCode.trim()) {
      pushToast("Enter the OTP", { variant: "warning" });
      return;
    }

    setIsVerifyingOtp(true);

    try {
      const response = await fetch("/api/auth/mobile/verify-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone: normalizedOtpPhone || mobileNumber,
          otp: otpCode.trim(),
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        profile?: typeof profile;
        orders?: typeof orders;
      };

      if (!response.ok || !payload.profile || !payload.orders) {
        pushToast(payload.error ?? "Could not verify OTP", { variant: "error" });
        return;
      }

      setSession({
        profile: payload.profile,
        orders: payload.orders,
      });
      setActiveView("profile");
      setMobileOtpStep("phone");
      setOtpCode("");
      setDebugOtp("");
      setNormalizedOtpPhone("");
      pushToast("Logged in successfully", { variant: "success" });
    } catch (error) {
      console.error("Verify OTP failed", error);
      pushToast("Could not verify OTP", { variant: "error" });
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  useEffect(() => {
    if (!isVisible || activeView !== "signin" || isSignedIn || !isGoogleConfigured || !googleButtonRef.current) {
      return;
    }

    let cancelled = false;

    const mountGoogleButton = async () => {
      setGoogleState("loading");
      const ready = await loadGoogleScript();

      if (cancelled) {
        return;
      }

      if (!ready || !window.google?.accounts?.id || !googleButtonRef.current) {
        setGoogleState("error");
        return;
      }

      googleButtonRef.current.innerHTML = "";
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: (response) => {
          void handleGoogleCredential(response.credential);
        },
      });
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        theme: "filled_black",
        size: "large",
        text: "continue_with",
        shape: "pill",
        width: Math.max(googleButtonRef.current.clientWidth, 280),
        logo_alignment: "left",
      });
      setGoogleState("ready");
    };

    void mountGoogleButton();

    return () => {
      cancelled = true;
    };
  }, [activeView, googleClientId, isGoogleConfigured, isSignedIn, isVisible]);

  const handleProfileSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedFullName = profileDraft.fullName.trim();
    const trimmedEmail = profileDraft.email.trim();
    const nextErrors: ProfileFormErrors = {};

    if (!trimmedFullName) {
      nextErrors.fullName = "Full name is required.";
    }

    if (!trimmedEmail) {
      nextErrors.email = "Email is required.";
    } else if (!profileEmailRegex.test(trimmedEmail)) {
      nextErrors.email = "Please enter a valid email address.";
    }

    if (nextErrors.fullName || nextErrors.email) {
      setProfileErrors(nextErrors);
      pushToast(nextErrors.email ?? nextErrors.fullName ?? "Please complete required fields", { variant: "warning" });
      return;
    }

    setProfileErrors({});

    setIsSavingProfile(true);

    try {
      const response = await fetch("/api/account/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fullName: trimmedFullName,
          email: trimmedEmail,
          avatarUrl: profileDraft.avatarUrl.trim(),
          phone: profileDraft.phone.trim(),
          address: profileDraft.address.trim(),
          city: profileDraft.city.trim(),
          state: profileDraft.state.trim(),
          pinCode: profileDraft.pinCode.trim(),
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        profile?: typeof profile;
      };

      if (!response.ok || !payload.profile) {
        pushToast(payload.error ?? "Could not update profile", { variant: "error" });
        return;
      }

      updateProfile(payload.profile);
      setProfileDraft(payload.profile);
      pushToast("Profile updated", { variant: "success" });
    } catch (error) {
      console.error("Failed to save account profile", error);
      pushToast("Could not update profile", { variant: "error" });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const trimmedProfileEmail = profileDraft.email.trim();
  const profileEmailLooksValid = trimmedProfileEmail.length > 0 && profileEmailRegex.test(trimmedProfileEmail);
  const canSaveProfile = profileDraft.fullName.trim().length > 0 && profileEmailLooksValid && !isSavingProfile;

  const handleSignOut = async () => {
    try {
      await fetch("/api/auth/signout", {
        method: "POST",
      });
    } catch (error) {
      console.error("Failed to sign out cleanly", error);
    } finally {
      clearSession();
      setActiveView("signin");
      pushToast("Signed out", { variant: "info" });
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div
      className={
        isModal
          ? "fixed inset-0 z-[120] overflow-y-auto bg-black/65 px-3 py-3 sm:px-4 sm:py-4 md:px-6 md:py-6"
          : "relative z-10 overflow-visible px-0 py-0"
      }
    >
      <section
        className={`mx-auto flex w-full flex-col overflow-hidden border border-[#e6e8f0] bg-white ${
          isModal
            ? "my-1 max-w-4xl rounded-[30px] shadow-[0_30px_80px_rgba(0,0,0,0.45)] max-h-[calc(100dvh-0.5rem)] sm:max-h-[calc(100dvh-1rem)]"
            : "max-w-6xl rounded-[20px] shadow-[0_18px_46px_rgba(0,0,0,0.14)]"
        }`}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-start justify-between border-b border-[#f0f2f7] bg-white px-5 py-5 md:px-7">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#ff3f6c]">Account</p>
            <h2 className="mt-1.5 text-2xl font-semibold text-[#1f2430] md:text-3xl">Your Space</h2>
          </div>
          {isModal ? (
            <button
              type="button"
              onClick={safeOnClose}
              aria-label="Close account panel"
              className="rounded-full p-2 transition hover:bg-[#f7f8fc]"
            >
              <X className="h-6 w-6" />
            </button>
          ) : null}
        </header>

        <div className="border-b border-[#e6e8f0] px-5 py-4 md:px-7">
          <div className="flex flex-wrap gap-2">
            {(["signin", "profile", "orders"] as const).map((view) => (
              <button
                key={view}
                type="button"
                onClick={() => setActiveView(view)}
                className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] transition ${
                  activeView === view
                    ? "bg-[#ff3f6c] text-white shadow-sm"
                    : "border border-[#e6e8f0] bg-white text-[#6b7280] hover:border-[#ff3f6c]/50 hover:text-[#ff3f6c]"
                }`}
              >
                {view === "signin" ? "Login or Signup" : view === "profile" ? "My Profile" : "Orders"}
              </button>
            ))}
          </div>
        </div>

        <div className={`min-h-0 flex-1 bg-[#f7f8fc] px-5 py-5 md:px-7 md:py-6 ${isModal ? "overflow-y-auto" : "overflow-visible"}`}>
          {activeView === "signin" ? (
            <div className="mx-auto w-full max-w-2xl space-y-4">
              <div className="rounded-[24px] border border-[#e6e8f0] bg-white p-5 shadow-sm md:p-6">
                <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#e6e8f0] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-[#ff3f6c]">
                  <Sparkles className="h-3.5 w-3.5" />
                  Login or Signup
                </p>

                {isSignedIn ? (
                  <div className="rounded-2xl border border-[var(--success-border)] bg-[var(--success-bg)] p-4 text-sm text-[var(--success-text)]">
                    <p className="font-semibold">You are signed in as {profile.email || profile.phone}</p>
                  </div>
                ) : (
                  <div className="space-y-5">
<div className="rounded-2xl border border-[#e6e8f0] bg-white p-4">
                      <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#1f2430]">
                        <Sparkles className="h-4 w-4 text-[#ff3f6c]" />
                        Continue with Google
                      </p>

                      {isGoogleConfigured ? (
                        <>
                          <div className="min-h-12" ref={googleButtonRef} />
                          {googleState === "loading" || isAuthenticating ? (
                            <p className="mt-3 inline-flex items-center gap-2 text-sm text-[#6b7280]">
                              <Loader2 className="h-4 w-4 animate-spin text-[#ff3f6c]" />
                              Loading Google...
                            </p>
                          ) : null}
                          {googleState === "error" ? (
                            <p className="mt-3 rounded-xl border border-rose-400/30 bg-rose-950/45 px-4 py-3 text-sm text-rose-100">
                              Google login is unavailable right now.
                            </p>
                          ) : null}
                        </>
                      ) : (
                        <p className="text-sm text-[#6b7280]">Google login is not configured.</p>
                      )}
                    </div>

<div className="rounded-2xl border border-[#e6e8f0] bg-white p-4">
                      <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#1f2430]">
                        <Smartphone className="h-4 w-4 text-[#ff3f6c]" />
                        Login with Mobile OTP
                      </p>

                      {mobileOtpStep === "phone" ? (
                        <div className="space-y-3">
                          <input
                            type="tel"
                            value={mobileNumber}
                            onChange={(event) => setMobileNumber(event.target.value)}
                            placeholder="Enter mobile number"
                            className="w-full rounded-xl border border-[#e6e8f0] bg-[#f7f8fc] px-4 py-3 text-sm text-[#1f2430] outline-none transition focus:border-[#ff3f6c]"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              void handleRequestOtp();
                            }}
                            disabled={isSendingOtp}
                            className="gold-button w-full"
                          >
                            {isSendingOtp ? "Sending OTP..." : "Send OTP"}
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <p className="text-xs text-[#9ca3af]">OTP sent to {normalizedOtpPhone || mobileNumber}</p>
                          <div className="relative">
                            <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#ff3f6c]/80" />
                            <input
                              type="text"
                              inputMode="numeric"
                              maxLength={6}
                              value={otpCode}
                              onChange={(event) => setOtpCode(event.target.value.replace(/\D/g, ""))}
                              placeholder="Enter 6-digit OTP"
                              className="w-full rounded-xl border border-[#e6e8f0] bg-[#f7f8fc] py-3 pl-10 pr-4 text-sm text-[#1f2430] outline-none transition focus:border-[#ff3f6c]"
                            />
                          </div>
                          {debugOtp ? <p className="text-xs text-[#ff3f6c]">Dev OTP: {debugOtp}</p> : null}
                          <div className="flex flex-col gap-2 sm:flex-row">
                            <button
                              type="button"
                              onClick={() => {
                                void handleVerifyOtp();
                              }}
                              disabled={isVerifyingOtp}
                              className="gold-button w-full"
                            >
                              {isVerifyingOtp ? "Verifying..." : "Verify OTP"}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setMobileOtpStep("phone");
                                setOtpCode("");
                                setDebugOtp("");
                              }}
                              className="outline-button w-full"
                            >
                              Change Number
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : null}

          {activeView === "profile" ? (
            isLoading ? (
              <div className="rounded-2xl border border-[#e6e8f0] bg-[#f7f8fc] p-5 text-sm text-[#6b7280]">Loading your profile...</div>
            ) : isSignedIn ? (
              <form className="grid gap-4 md:grid-cols-2" onSubmit={handleProfileSave}>
                <div className="md:col-span-2 flex flex-wrap items-center justify-between gap-4 rounded-[24px] border border-[#e6e8f0] bg-[#f7f8fc] p-5">
                  <div className="flex items-center gap-4">
                    {profile.avatarUrl && !avatarLoadFailed ? (
                      <img
                        src={profile.avatarUrl}
                        alt={profile.fullName || profile.email}
                        onError={() => setAvatarLoadFailed(true)}
                        referrerPolicy="no-referrer"
                        className="h-14 w-14 rounded-full border border-[#ff3f6c]/30 object-cover"
                      />
                    ) : (
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#ff3f6c] text-sm font-semibold tracking-[0.06em] text-white">
                        {profileInitials}
                      </div>
                    )}
                    <div>
                      <p className="text-lg font-semibold text-[#1f2430]">{profile.fullName || "Firaang Shopper"}</p>
                      <p className="text-sm text-[#6b7280]">{profile.email || "Add your email to complete your profile"}</p>
                      <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-[#ff3f6c]">Signed in with {profile.authProvider}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="inline-flex items-center gap-2 rounded-full border border-[#e6e8f0] px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#6b7280] transition hover:border-red-200 hover:bg-red-50 hover:text-red-500"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </button>
                </div>

                <label>
                  <span className="mb-1 block text-xs uppercase tracking-[0.12em] text-[#9ca3af]">Full Name</span>
                  <input
                    type="text"
                    value={profileDraft.fullName}
                    onChange={(event) => {
                      setProfileDraft((prev) => ({ ...prev, fullName: event.target.value }));
                      if (profileErrors.fullName) {
                        setProfileErrors((prev) => ({ ...prev, fullName: undefined }));
                      }
                    }}
                    className="w-full rounded-xl border border-[#e6e8f0] bg-white px-4 py-3 text-sm text-[#1f2430] outline-none transition focus:border-[#ff3f6c]"
                  />
                  {profileErrors.fullName ? <p className="mt-1 text-xs text-[#c65353]">{profileErrors.fullName}</p> : null}
                </label>

                <label>
                  <span className="mb-1 block text-xs uppercase tracking-[0.12em] text-[#9ca3af]">Email</span>
                  <input
                    type="email"
                    value={profileDraft.email}
                    onChange={(event) => {
                      setProfileDraft((prev) => ({ ...prev, email: event.target.value }));
                      if (profileErrors.email) {
                        setProfileErrors((prev) => ({ ...prev, email: undefined }));
                      }
                    }}
                    required
                    placeholder="name@example.com"
                    className="w-full rounded-xl border border-[#e6e8f0] bg-white px-4 py-3 text-sm text-[#1f2430] outline-none transition focus:border-[#ff3f6c]"
                  />
                  {profileErrors.email ? <p className="mt-1 text-xs text-[#c65353]">{profileErrors.email}</p> : null}
                </label>

                <label>
                  <span className="mb-1 block text-xs uppercase tracking-[0.12em] text-[#9ca3af]">Phone</span>
                  <input
                    type="tel"
                    value={profileDraft.phone}
                    onChange={(event) => setProfileDraft((prev) => ({ ...prev, phone: event.target.value }))}
                    className="w-full rounded-xl border border-[#e6e8f0] bg-white px-4 py-3 text-sm text-[#1f2430] outline-none transition focus:border-[#ff3f6c]"
                  />
                </label>

                <label>
                  <span className="mb-1 block text-xs uppercase tracking-[0.12em] text-[#9ca3af]">City</span>
                  <input
                    type="text"
                    value={profileDraft.city}
                    onChange={(event) => setProfileDraft((prev) => ({ ...prev, city: event.target.value }))}
                    className="w-full rounded-xl border border-[#e6e8f0] bg-white px-4 py-3 text-sm text-[#1f2430] outline-none transition focus:border-[#ff3f6c]"
                  />
                </label>

                <label>
                  <span className="mb-1 block text-xs uppercase tracking-[0.12em] text-[#9ca3af]">State</span>
                  <input
                    type="text"
                    value={profileDraft.state}
                    onChange={(event) => setProfileDraft((prev) => ({ ...prev, state: event.target.value }))}
                    className="w-full rounded-xl border border-[#e6e8f0] bg-white px-4 py-3 text-sm text-[#1f2430] outline-none transition focus:border-[#ff3f6c]"
                  />
                </label>

                <label>
                  <span className="mb-1 block text-xs uppercase tracking-[0.12em] text-[#9ca3af]">PIN Code</span>
                  <input
                    type="text"
                    value={profileDraft.pinCode}
                    onChange={(event) => setProfileDraft((prev) => ({ ...prev, pinCode: event.target.value }))}
                    className="w-full rounded-xl border border-[#e6e8f0] bg-white px-4 py-3 text-sm text-[#1f2430] outline-none transition focus:border-[#ff3f6c]"
                  />
                </label>

                <label className="md:col-span-2">
                  <span className="mb-1 block text-xs uppercase tracking-[0.12em] text-[#9ca3af]">Address</span>
                  <textarea
                    value={profileDraft.address}
                    onChange={(event) => setProfileDraft((prev) => ({ ...prev, address: event.target.value }))}
                    rows={4}
                    className="w-full resize-none rounded-xl border border-[#e6e8f0] bg-white px-4 py-3 text-sm text-[#1f2430] outline-none transition focus:border-[#ff3f6c]"
                  />
                </label>

                <div className="md:col-span-2 flex justify-end">
                  <button type="submit" className="gold-button min-w-[180px]" disabled={!canSaveProfile}>
                    {isSavingProfile ? "Saving..." : "Save Profile"}
                  </button>
                </div>
              </form>
            ) : (
              <div className="rounded-[24px] border border-[#e6e8f0] bg-[#f7f8fc] p-5 text-center">
                <p className="text-sm text-[#6b7280]">Login to manage your profile.</p>
                <button type="button" onClick={() => setActiveView("signin")} className="gold-button mt-4">
                  Go To Login
                </button>
              </div>
            )
          ) : null}

          {activeView === "orders" ? (
            isLoading ? (
              <div className="rounded-2xl border border-[#e6e8f0] bg-[#f7f8fc] p-5 text-sm text-[#6b7280]">Loading your orders...</div>
            ) : isSignedIn ? (
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-[24px] border border-[#e6e8f0] bg-[#f7f8fc] p-5">
                    <p className="mb-2 flex items-center gap-2 text-sm text-[#6b7280]">
                      <ClipboardList className="h-4 w-4 text-[#ff3f6c]" />
                      Total orders synced
                    </p>
                    <p className="text-3xl font-semibold text-[#1f2430]">{orders.length}</p>
                  </div>
                  <div className="rounded-[24px] border border-[#e6e8f0] bg-[#f7f8fc] p-5">
                    <p className="mb-2 flex items-center gap-2 text-sm text-[#6b7280]">
                      <Sparkles className="h-4 w-4 text-[#ff3f6c]" />
                      Lifetime spend
                    </p>
                    <p className="text-3xl font-semibold text-[#1f2430]">{formatCurrency(totalSpend, "INR")}</p>
                  </div>
                </div>

                {orders.length === 0 ? (
                  <div className="rounded-[24px] border border-[#e6e8f0] bg-[#f7f8fc] p-5 text-sm text-[#6b7280]">
                    No synced orders yet. Login before checkout and paid orders will appear here automatically.
                  </div>
                ) : (
                  orders.map((order) => (
                    <article key={order.id} className="rounded-[24px] border border-[#e6e8f0] bg-white p-5 shadow-sm transition hover:border-[#ff3f6c]/20">
                      <div className="mb-4 flex flex-wrap items-start justify-between gap-4 border-b border-[#e6e8f0] pb-3">
                        <div>
                          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#ff3f6c]">Order #{order.id.slice(-8).toUpperCase()}</p>
                          <p className="mt-1 text-sm text-[#9ca3af]">{formatDate(order.createdAt)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg text-[#1f2430]">{formatCurrency(order.totalAmount, order.currencyCode)}</p>
                          <p className={`text-xs font-semibold uppercase tracking-[0.12em] ${order.status === "paid" ? "text-emerald-600" : order.status === "pending" ? "text-amber-600" : order.status === "cancelled" ? "text-slate-400" : "text-red-500"}`}>
                            {order.status}
                          </p>
                          <p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-[#9ca3af]">
                            {order.paymentMethod === "cod" ? "Cash on Delivery" : "Online"}
                          </p>
                          {order.status === "cancelled" && order.cancelledAt ? (
                            <p className="mt-1 text-[10px] uppercase tracking-[0.1em] text-slate-400">
                              Cancelled on {formatDate(order.cancelledAt)}
                            </p>
                          ) : null}
                          {canCancelOrder(order.createdAt, order.status) ? (
                            <button
                              type="button"
                              onClick={() => {
                                setCancelTargetOrderId(order.id);
                              }}
                              disabled={cancellingOrderId === order.id}
                              className="mt-2 rounded-full border border-red-200 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-red-500 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {cancellingOrderId === order.id ? "Cancelling..." : `Cancel (within ${ORDER_CANCELLATION_WINDOW_DAYS} days)`}
                            </button>
                          ) : null}
                        </div>
                      </div>

                      <div className="space-y-3">
                        {order.status === "cancelled" && order.cancelReason ? (
                          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                            <p className="text-[11px] uppercase tracking-[0.12em] text-slate-200">Cancellation Reason</p>
                            <p className="mt-1 text-sm text-slate-100/90">{order.cancelReason}</p>
                          </div>
                        ) : null}
                        {order.items.map((item) => (
                          <div key={`${order.id}-${item.productId}`} className="flex items-center gap-3 rounded-2xl border border-[#e6e8f0] bg-[#f7f8fc] p-3">
                            <SafeImage src={item.image} alt={item.name} className="h-14 w-14 rounded-xl object-cover" />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm text-[#1f2430]">{item.name}</p>
                              <p className="text-xs text-[#9ca3af]">Qty {item.quantity}</p>
                            </div>
                            <p className="text-sm font-semibold text-[#1f2430]">{formatCurrency(item.lineTotal, order.currencyCode)}</p>
                          </div>
                        ))}
                      </div>
                    </article>
                  ))
                )}
              </div>
            ) : (
              <div className="rounded-[24px] border border-[#e6e8f0] bg-[#f7f8fc] p-5 text-center">
                <p className="text-sm text-[#6b7280]">Login to view your synced orders.</p>
                <button type="button" onClick={() => setActiveView("signin")} className="gold-button mt-4">
                  Go To Login
                </button>
              </div>
            )
          ) : null}
        </div>
      </section>

      {cancelTargetOrderId ? (
        <div className="fixed inset-0 z-[121] bg-black/70 px-4 py-8" onClick={() => setCancelTargetOrderId(null)}>
          <div
            className="mx-auto mt-12 w-full max-w-lg rounded-2xl border border-[#e6e8f0] bg-white p-5 shadow-2xl md:mt-24 md:p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ff3f6c]">Confirm Cancellation</p>
                <h3 className="mt-1 text-xl font-semibold leading-tight text-[#1f2430]">Cancel Order</h3>
              </div>
              <button
                type="button"
                onClick={() => setCancelTargetOrderId(null)}
                aria-label="Close cancel confirmation"
                className="rounded-full p-2 transition hover:bg-[#f7f8fc]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="mb-4 text-sm text-[#6b7280]">
              You can cancel this order because it is within the {ORDER_CANCELLATION_WINDOW_DAYS}-day cancellation window.
            </p>

            <label className="mb-3 block">
              <span className="mb-1 block text-xs uppercase tracking-[0.12em] text-[#9ca3af]">Reason</span>
              <select
                value={cancelReason}
                onChange={(event) => setCancelReason(event.target.value as (typeof CANCEL_REASONS)[number])}
                className="w-full rounded-lg border border-[#ff3f6c]/30 bg-white px-3 py-2.5 text-sm text-[#1f2430] outline-none transition focus:border-[#ff3f6c]"
              >
                {CANCEL_REASONS.map((reason) => (
                  <option key={reason} value={reason}>
                    {reason}
                  </option>
                ))}
              </select>
            </label>

            {cancelReason === "Other" ? (
              <label className="mb-4 block">
                <span className="mb-1 block text-xs uppercase tracking-[0.12em] text-[#9ca3af]">Details (optional)</span>
                <textarea
                  value={cancelReasonDetail}
                  onChange={(event) => setCancelReasonDetail(event.target.value)}
                  rows={3}
                  maxLength={120}
                  className="w-full resize-none rounded-lg border border-[#ff3f6c]/30 bg-white px-3 py-2.5 text-sm text-[#1f2430] outline-none transition focus:border-[#ff3f6c]"
                />
              </label>
            ) : null}

            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setCancelTargetOrderId(null)}
                className="rounded-full border border-[#e6e8f0] px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#6b7280] transition hover:bg-[#f7f8fc]"
              >
                Keep Order
              </button>
              <button
                type="button"
                onClick={() => {
                  void handleCancelConfirmation();
                }}
                disabled={cancellingOrderId === cancelTargetOrderId}
                className="rounded-full bg-[#c44f59] px-4 py-2 text-xs uppercase tracking-[0.12em] text-white transition hover:bg-[#dc6670] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {cancellingOrderId === cancelTargetOrderId ? "Cancelling..." : "Confirm Cancel"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
