"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { ClipboardList, Loader2, LogOut, Mail, ShieldCheck, Sparkles, UserCircle2, X } from "lucide-react";
import { useAccountStore } from "@/store/useAccountStore";
import { useUiStore } from "@/store/useUiStore";

type AccountView = "signin" | "profile" | "orders";

type AccountModalProps = {
  isOpen: boolean;
  initialView: AccountView;
  onClose: () => void;
};

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

export default function AccountModal({ isOpen, initialView, onClose }: AccountModalProps) {
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";
  const isGoogleConfigured = isConfiguredGoogleClientId(googleClientId);
  const isLoading = useAccountStore((state) => state.isLoading);
  const isSignedIn = useAccountStore((state) => state.isSignedIn);
  const profile = useAccountStore((state) => state.profile);
  const orders = useAccountStore((state) => state.orders);
  const setSession = useAccountStore((state) => state.setSession);
  const clearSession = useAccountStore((state) => state.clearSession);
  const updateProfile = useAccountStore((state) => state.updateProfile);
  const pushToast = useUiStore((state) => state.pushToast);

  const [activeView, setActiveView] = useState<AccountView>(initialView);
  const [profileDraft, setProfileDraft] = useState(profile);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [googleState, setGoogleState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const googleButtonRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setActiveView(initialView);
  }, [initialView, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setProfileDraft(profile);
  }, [isOpen, profile]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", onEscape);
    return () => document.removeEventListener("keydown", onEscape);
  }, [isOpen, onClose]);

  const totalSpend = useMemo(() => orders.reduce((sum, order) => sum + order.totalAmount, 0), [orders]);

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

  useEffect(() => {
    if (!isOpen || activeView !== "signin" || isSignedIn || !isGoogleConfigured || !googleButtonRef.current) {
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
  }, [activeView, googleClientId, isGoogleConfigured, isOpen, isSignedIn]);

  const handleProfileSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!profileDraft.fullName.trim()) {
      pushToast("Please add your full name", { variant: "warning" });
      return;
    }

    setIsSavingProfile(true);

    try {
      const response = await fetch("/api/account/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fullName: profileDraft.fullName.trim(),
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

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[120] bg-black/65 px-4 py-10" onClick={onClose}>
      <section
        className="mx-auto mt-8 w-full max-w-5xl overflow-hidden rounded-[30px] border border-[var(--gold)]/45 bg-[linear-gradient(180deg,#3a0710_0%,#2a040a_100%)] shadow-[0_30px_80px_rgba(0,0,0,0.45)] md:mt-14"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-start justify-between border-b border-[var(--gold)]/20 px-5 py-5 md:px-7">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--gold)]">Account</p>
            <h2 className="mt-2 text-2xl md:text-4xl">Your Space</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close account panel"
            className="rounded-full p-2 transition hover:bg-[#4a1118]"
          >
            <X className="h-6 w-6" />
          </button>
        </header>

        <div className="border-b border-[var(--gold)]/15 px-5 py-4 md:px-7">
          <div className="flex flex-wrap gap-2">
            {(["signin", "profile", "orders"] as const).map((view) => (
              <button
                key={view}
                type="button"
                onClick={() => setActiveView(view)}
                className={`rounded-full px-4 py-2 text-xs uppercase tracking-[0.14em] transition ${
                  activeView === view
                    ? "bg-[var(--gold)] text-[#3b0810]"
                    : "border border-[var(--gold)]/40 text-[var(--gold)] hover:border-[var(--gold)]/70"
                }`}
              >
                {view === "signin" ? "Sign In" : view === "profile" ? "My Profile" : "Orders"}
              </button>
            ))}
          </div>
        </div>

        <div className="max-h-[72vh] overflow-y-auto px-5 py-5 md:px-7 md:py-6">
          {activeView === "signin" ? (
            <div className="grid gap-5 md:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-[28px] border border-[var(--gold)]/20 bg-[rgba(74,12,20,0.58)] p-5 shadow-xl backdrop-blur md:p-6">
                <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-[var(--gold)]/30 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-[var(--gold)]">
                  <Sparkles className="h-3.5 w-3.5" />
                  Secure Account Access
                </p>
                <h3 className="text-2xl md:text-3xl">Continue with Google</h3>
                <p className="mt-3 max-w-xl text-sm leading-6 text-[#e9d3cc]">
                  Sign in once to sync profile details and keep your paid orders available across devices.
                </p>

                {isSignedIn ? (
                  <div className="mt-6 rounded-2xl border border-emerald-300/25 bg-emerald-500/10 p-4 text-sm text-emerald-50">
                    <p className="font-semibold">You are signed in as {profile.email}</p>
                    <p className="mt-1 text-emerald-100/90">Open your profile or orders tab to manage your account.</p>
                  </div>
                ) : isGoogleConfigured ? (
                  <>
                    <div className="mt-6 min-h-12" ref={googleButtonRef} />
                    {googleState === "loading" || isAuthenticating ? (
                      <p className="mt-3 inline-flex items-center gap-2 text-sm text-[#e7d0c6]">
                        <Loader2 className="h-4 w-4 animate-spin text-[var(--gold)]" />
                        Preparing secure Google sign-in...
                      </p>
                    ) : null}
                    {googleState === "error" ? (
                      <p className="mt-3 rounded-xl border border-rose-400/30 bg-rose-950/45 px-4 py-3 text-sm text-rose-100">
                        Google sign-in could not be loaded. Check your Google client configuration and try again.
                      </p>
                    ) : null}
                  </>
                ) : (
                  <div className="mt-6 rounded-2xl border border-amber-300/25 bg-amber-500/10 p-4 text-sm text-amber-50">
                    Google sign-in is not configured yet. Add NEXT_PUBLIC_GOOGLE_CLIENT_ID and GOOGLE_CLIENT_ID to enable it.
                  </div>
                )}
              </div>

              <div className="space-y-4 rounded-[28px] border border-[var(--gold)]/20 bg-[rgba(45,8,14,0.76)] p-5 shadow-xl md:p-6">
                <div className="rounded-2xl border border-[var(--gold)]/20 bg-[#3a0d14]/70 p-4">
                  <p className="mb-2 flex items-center gap-2 text-sm text-[#f1d8ce]">
                    <ShieldCheck className="h-4 w-4 text-[var(--gold)]" />
                    Session-backed account security
                  </p>
                  <p className="text-sm leading-6 text-[#dcbfb7]">Authenticated sessions are stored on the server, and your profile + order history are read from MongoDB instead of browser-only local state.</p>
                </div>
                <div className="rounded-2xl border border-[var(--gold)]/20 bg-[#3a0d14]/70 p-4">
                  <p className="mb-2 flex items-center gap-2 text-sm text-[#f1d8ce]">
                    <ClipboardList className="h-4 w-4 text-[var(--gold)]" />
                    Order sync after checkout
                  </p>
                  <p className="text-sm leading-6 text-[#dcbfb7]">Paid orders are linked to your signed-in account so they appear automatically in the Orders tab after payment verification.</p>
                </div>
                <div className="rounded-2xl border border-[var(--gold)]/20 bg-[#3a0d14]/70 p-4">
                  <p className="mb-2 flex items-center gap-2 text-sm text-[#f1d8ce]">
                    <Mail className="h-4 w-4 text-[var(--gold)]" />
                    Profile completion ready
                  </p>
                  <p className="text-sm leading-6 text-[#dcbfb7]">After sign-in, you can complete phone, address, city, state, and PIN details inside your profile.</p>
                </div>
              </div>
            </div>
          ) : null}

          {activeView === "profile" ? (
            isLoading ? (
              <div className="rounded-2xl border border-[var(--gold)]/20 bg-[#3a0d14]/60 p-5 text-sm text-[#e3c8c1]">Loading your profile...</div>
            ) : isSignedIn ? (
              <form className="grid gap-4 md:grid-cols-2" onSubmit={handleProfileSave}>
                <div className="md:col-span-2 flex flex-wrap items-center justify-between gap-4 rounded-[24px] border border-[var(--gold)]/20 bg-[#3a0d14]/70 p-5">
                  <div className="flex items-center gap-4">
                    {profile.avatarUrl ? (
                      <img src={profile.avatarUrl} alt={profile.fullName || profile.email} className="h-14 w-14 rounded-full border border-[var(--gold)]/35 object-cover" />
                    ) : (
                      <div className="flex h-14 w-14 items-center justify-center rounded-full border border-[var(--gold)]/35 bg-[#4b121a]">
                        <UserCircle2 className="h-7 w-7 text-[var(--gold)]" />
                      </div>
                    )}
                    <div>
                      <p className="text-lg font-semibold text-white">{profile.fullName || "Firaangi Shopper"}</p>
                      <p className="text-sm text-[#e3c6bf]">{profile.email}</p>
                      <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-[var(--gold)]">Signed in with {profile.authProvider}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="inline-flex items-center gap-2 rounded-full border border-[var(--gold)]/35 px-4 py-2 text-xs uppercase tracking-[0.12em] text-[var(--gold)] transition hover:bg-[#4a1118]"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </button>
                </div>

                <label>
                  <span className="mb-1 block text-xs uppercase tracking-[0.12em] text-[#f2d7c3]">Full Name</span>
                  <input
                    type="text"
                    value={profileDraft.fullName}
                    onChange={(event) => setProfileDraft((prev) => ({ ...prev, fullName: event.target.value }))}
                    className="w-full rounded-xl border border-[var(--gold)]/30 bg-[#3a0d14] px-4 py-3 text-sm text-white outline-none transition focus:border-[var(--gold)]"
                  />
                </label>

                <label>
                  <span className="mb-1 block text-xs uppercase tracking-[0.12em] text-[#f2d7c3]">Email</span>
                  <input type="email" value={profile.email} disabled className="w-full rounded-xl border border-[var(--gold)]/20 bg-[#2d0a10] px-4 py-3 text-sm text-[#d7bbb5] outline-none" />
                </label>

                <label>
                  <span className="mb-1 block text-xs uppercase tracking-[0.12em] text-[#f2d7c3]">Phone</span>
                  <input
                    type="tel"
                    value={profileDraft.phone}
                    onChange={(event) => setProfileDraft((prev) => ({ ...prev, phone: event.target.value }))}
                    className="w-full rounded-xl border border-[var(--gold)]/30 bg-[#3a0d14] px-4 py-3 text-sm text-white outline-none transition focus:border-[var(--gold)]"
                  />
                </label>

                <label>
                  <span className="mb-1 block text-xs uppercase tracking-[0.12em] text-[#f2d7c3]">City</span>
                  <input
                    type="text"
                    value={profileDraft.city}
                    onChange={(event) => setProfileDraft((prev) => ({ ...prev, city: event.target.value }))}
                    className="w-full rounded-xl border border-[var(--gold)]/30 bg-[#3a0d14] px-4 py-3 text-sm text-white outline-none transition focus:border-[var(--gold)]"
                  />
                </label>

                <label>
                  <span className="mb-1 block text-xs uppercase tracking-[0.12em] text-[#f2d7c3]">State</span>
                  <input
                    type="text"
                    value={profileDraft.state}
                    onChange={(event) => setProfileDraft((prev) => ({ ...prev, state: event.target.value }))}
                    className="w-full rounded-xl border border-[var(--gold)]/30 bg-[#3a0d14] px-4 py-3 text-sm text-white outline-none transition focus:border-[var(--gold)]"
                  />
                </label>

                <label>
                  <span className="mb-1 block text-xs uppercase tracking-[0.12em] text-[#f2d7c3]">PIN Code</span>
                  <input
                    type="text"
                    value={profileDraft.pinCode}
                    onChange={(event) => setProfileDraft((prev) => ({ ...prev, pinCode: event.target.value }))}
                    className="w-full rounded-xl border border-[var(--gold)]/30 bg-[#3a0d14] px-4 py-3 text-sm text-white outline-none transition focus:border-[var(--gold)]"
                  />
                </label>

                <label className="md:col-span-2">
                  <span className="mb-1 block text-xs uppercase tracking-[0.12em] text-[#f2d7c3]">Address</span>
                  <textarea
                    value={profileDraft.address}
                    onChange={(event) => setProfileDraft((prev) => ({ ...prev, address: event.target.value }))}
                    rows={4}
                    className="w-full resize-none rounded-xl border border-[var(--gold)]/30 bg-[#3a0d14] px-4 py-3 text-sm text-white outline-none transition focus:border-[var(--gold)]"
                  />
                </label>

                <div className="md:col-span-2 flex justify-end">
                  <button type="submit" className="gold-button min-w-[180px]" disabled={isSavingProfile}>
                    {isSavingProfile ? "Saving..." : "Save Profile"}
                  </button>
                </div>
              </form>
            ) : (
              <div className="rounded-[24px] border border-[var(--gold)]/20 bg-[#3a0d14]/65 p-5 text-center">
                <p className="text-sm text-[#f1d8ce]">Sign in with Google to unlock your profile and synced order history.</p>
                <button type="button" onClick={() => setActiveView("signin")} className="gold-button mt-4">
                  Go To Sign In
                </button>
              </div>
            )
          ) : null}

          {activeView === "orders" ? (
            isLoading ? (
              <div className="rounded-2xl border border-[var(--gold)]/20 bg-[#3a0d14]/60 p-5 text-sm text-[#e3c8c1]">Loading your orders...</div>
            ) : isSignedIn ? (
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-[24px] border border-[var(--gold)]/20 bg-[#3a0d14]/70 p-5">
                    <p className="mb-2 flex items-center gap-2 text-sm text-[#f1d8ce]">
                      <ClipboardList className="h-4 w-4 text-[var(--gold)]" />
                      Total orders synced
                    </p>
                    <p className="text-3xl font-semibold text-white">{orders.length}</p>
                  </div>
                  <div className="rounded-[24px] border border-[var(--gold)]/20 bg-[#3a0d14]/70 p-5">
                    <p className="mb-2 flex items-center gap-2 text-sm text-[#f1d8ce]">
                      <Sparkles className="h-4 w-4 text-[var(--gold)]" />
                      Lifetime spend
                    </p>
                    <p className="text-3xl font-semibold text-white">{formatCurrency(totalSpend, "INR")}</p>
                  </div>
                </div>

                {orders.length === 0 ? (
                  <div className="rounded-[24px] border border-[var(--gold)]/20 bg-[#3a0d14]/65 p-5 text-sm text-[#f1d8ce]">
                    No synced orders yet. Sign in before checkout and paid orders will appear here automatically.
                  </div>
                ) : (
                  orders.map((order) => (
                    <article key={order.id} className="rounded-[24px] border border-[var(--gold)]/25 bg-[#3a0d14]/65 p-5 shadow-xl">
                      <div className="mb-4 flex flex-wrap items-start justify-between gap-4 border-b border-[var(--gold)]/15 pb-3">
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--gold)]">Order #{order.id.slice(-8)}</p>
                          <p className="mt-1 text-sm text-[#d7bbb5]">{formatDate(order.createdAt)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg text-white">{formatCurrency(order.totalAmount, order.currencyCode)}</p>
                          <p className={`text-xs uppercase tracking-[0.12em] ${order.status === "paid" ? "text-emerald-300" : order.status === "pending" ? "text-amber-300" : "text-rose-300"}`}>
                            {order.status}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {order.items.map((item) => (
                          <div key={`${order.id}-${item.productId}`} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/15 p-3">
                            <img src={item.image} alt={item.name} className="h-14 w-14 rounded-xl object-cover" />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm text-white">{item.name}</p>
                              <p className="text-xs text-[#d7bbb5]">Qty {item.quantity}</p>
                            </div>
                            <p className="text-sm text-[#eac26a]">{formatCurrency(item.lineTotal, order.currencyCode)}</p>
                          </div>
                        ))}
                      </div>
                    </article>
                  ))
                )}
              </div>
            ) : (
              <div className="rounded-[24px] border border-[var(--gold)]/20 bg-[#3a0d14]/65 p-5 text-center">
                <p className="text-sm text-[#f1d8ce]">Sign in with Google to keep your paid orders synced to this account.</p>
                <button type="button" onClick={() => setActiveView("signin")} className="gold-button mt-4">
                  Go To Sign In
                </button>
              </div>
            )
          ) : null}
        </div>
      </section>
    </div>
  );
}