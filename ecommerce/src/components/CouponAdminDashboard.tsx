"use client";

import { useState, useEffect } from "react";
import { AlertCircle, Loader2, Percent, Plus, Tag, ToggleLeft, ToggleRight, Trash2 } from "lucide-react";

type CouponRecord = {
  id: string;
  code: string;
  label: string;
  description: string;
  type: "percentage" | "fixed";
  value: number;
  minSubtotal: number;
  maxDiscountAmount?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(value));
}

export default function CouponAdminDashboard() {
  const [coupons, setCoupons] = useState<CouponRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // New coupon form state
  const [formCode, setFormCode] = useState("");
  const [formLabel, setFormLabel] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formType, setFormType] = useState<"percentage" | "fixed">("percentage");
  const [formValue, setFormValue] = useState("");
  const [formMinSubtotal, setFormMinSubtotal] = useState("");
  const [formMaxDiscount, setFormMaxDiscount] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const fetchCoupons = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/coupons");
      const data = (await response.json()) as { coupons?: CouponRecord[]; error?: string };
      if (!response.ok) throw new Error(data.error ?? "Failed to load coupons");
      setCoupons(data.coupons ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load coupons");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { void fetchCoupons(); }, []);

  const handleCreate = async () => {
    setFormError(null);
    const code = formCode.trim().toUpperCase();
    const value = parseFloat(formValue);
    const minSubtotal = parseFloat(formMinSubtotal) || 0;
    const maxDiscount = formMaxDiscount.trim() ? parseFloat(formMaxDiscount) : undefined;

    if (!code || !formLabel.trim() || !formDescription.trim()) {
      setFormError("Code, label, and description are required");
      return;
    }
    if (isNaN(value) || value <= 0) {
      setFormError("Enter a valid value");
      return;
    }
    if (formType === "percentage" && value > 100) {
      setFormError("Percentage cannot exceed 100");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          label: formLabel.trim(),
          description: formDescription.trim(),
          type: formType,
          value,
          minSubtotal,
          maxDiscountAmount: maxDiscount && !isNaN(maxDiscount) && maxDiscount > 0 ? maxDiscount : undefined,
        }),
      });
      const data = (await response.json()) as { coupon?: CouponRecord; error?: string };
      if (!response.ok) { setFormError(data.error ?? "Failed to create coupon"); return; }

      setCoupons((prev) => [data.coupon!, ...prev]);
      setShowForm(false);
      setFormCode(""); setFormLabel(""); setFormDescription(""); setFormValue(""); setFormMinSubtotal(""); setFormMaxDiscount("");
    } catch {
      setFormError("Failed to create coupon");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (coupon: CouponRecord) => {
    setTogglingId(coupon.id);
    try {
      const response = await fetch(`/api/coupons/${coupon.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !coupon.isActive }),
      });
      const data = (await response.json()) as { coupon?: CouponRecord; error?: string };
      if (response.ok && data.coupon) {
        setCoupons((prev) => prev.map((c) => (c.id === coupon.id ? data.coupon! : c)));
      }
    } catch {
      // silent
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this coupon? This cannot be undone.")) return;
    setDeletingId(id);
    try {
      const response = await fetch(`/api/coupons/${id}`, { method: "DELETE" });
      if (response.ok) setCoupons((prev) => prev.filter((c) => c.id !== id));
    } catch {
      // silent
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--gold)]">Coupon Management</h1>
          <p className="mt-1 text-sm text-[var(--popup-muted)]">Create and manage discount coupons for checkout</p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-2 rounded-xl bg-[var(--gold)] px-4 py-2.5 text-sm font-semibold text-[#3b0810] transition hover:bg-[#f0c654]"
        >
          <Plus className="h-4 w-4" />
          {showForm ? "Cancel" : "New Coupon"}
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="mb-8 rounded-2xl border border-[var(--gold)]/30 bg-[var(--popup-footer-bg)] p-6">
          <h2 className="mb-5 text-base font-semibold text-[var(--gold)]">Create New Coupon</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-[11px] uppercase tracking-[0.12em] text-[var(--popup-muted)]">Coupon Code *</label>
              <input
                type="text"
                value={formCode}
                onChange={(e) => setFormCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ""))}
                placeholder="e.g. WELCOME10"
                maxLength={30}
                className="w-full rounded-xl border border-[var(--gold)]/35 bg-[var(--popup-bg)] px-4 py-3 text-sm font-mono text-[var(--popup-footer-text)] outline-none placeholder:text-[var(--popup-muted)] focus:border-[var(--gold)] transition"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] uppercase tracking-[0.12em] text-[var(--popup-muted)]">Label *</label>
              <input
                type="text"
                value={formLabel}
                onChange={(e) => setFormLabel(e.target.value)}
                placeholder="e.g. Welcome 10% Off"
                className="w-full rounded-xl border border-[var(--gold)]/35 bg-[var(--popup-bg)] px-4 py-3 text-sm text-[var(--popup-footer-text)] outline-none placeholder:text-[var(--popup-muted)] focus:border-[var(--gold)] transition"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-[11px] uppercase tracking-[0.12em] text-[var(--popup-muted)]">Description *</label>
              <input
                type="text"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="e.g. 10% off on orders above ₹999"
                className="w-full rounded-xl border border-[var(--gold)]/35 bg-[var(--popup-bg)] px-4 py-3 text-sm text-[var(--popup-footer-text)] outline-none placeholder:text-[var(--popup-muted)] focus:border-[var(--gold)] transition"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] uppercase tracking-[0.12em] text-[var(--popup-muted)]">Discount Type *</label>
              <select
                value={formType}
                onChange={(e) => setFormType(e.target.value as "percentage" | "fixed")}
                className="w-full rounded-xl border border-[var(--gold)]/35 bg-[var(--popup-bg)] px-4 py-3 text-sm text-[var(--popup-footer-text)] outline-none focus:border-[var(--gold)] transition"
              >
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed Amount (₹)</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] uppercase tracking-[0.12em] text-[var(--popup-muted)]">
                Value * {formType === "percentage" ? "(e.g. 10 for 10%)" : "(₹ amount)"}
              </label>
              <input
                type="number"
                min={1}
                max={formType === "percentage" ? 100 : undefined}
                value={formValue}
                onChange={(e) => setFormValue(e.target.value)}
                placeholder={formType === "percentage" ? "10" : "200"}
                className="w-full rounded-xl border border-[var(--gold)]/35 bg-[var(--popup-bg)] px-4 py-3 text-sm text-[var(--popup-footer-text)] outline-none placeholder:text-[var(--popup-muted)] focus:border-[var(--gold)] transition"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] uppercase tracking-[0.12em] text-[var(--popup-muted)]">Min Order Subtotal (₹)</label>
              <input
                type="number"
                min={0}
                value={formMinSubtotal}
                onChange={(e) => setFormMinSubtotal(e.target.value)}
                placeholder="0"
                className="w-full rounded-xl border border-[var(--gold)]/35 bg-[var(--popup-bg)] px-4 py-3 text-sm text-[var(--popup-footer-text)] outline-none placeholder:text-[var(--popup-muted)] focus:border-[var(--gold)] transition"
              />
            </div>
            {formType === "percentage" && (
              <div>
                <label className="mb-1.5 block text-[11px] uppercase tracking-[0.12em] text-[var(--popup-muted)]">Max Discount Cap (₹) — optional</label>
                <input
                  type="number"
                  min={1}
                  value={formMaxDiscount}
                  onChange={(e) => setFormMaxDiscount(e.target.value)}
                  placeholder="e.g. 250"
                  className="w-full rounded-xl border border-[var(--gold)]/35 bg-[var(--popup-bg)] px-4 py-3 text-sm text-[var(--popup-footer-text)] outline-none placeholder:text-[var(--popup-muted)] focus:border-[var(--gold)] transition"
                />
              </div>
            )}
          </div>
          {formError && (
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-red-400/30 bg-red-900/20 px-4 py-3 text-sm text-red-300">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {formError}
            </div>
          )}
          <div className="mt-5 flex gap-3">
            <button
              type="button"
              onClick={() => void handleCreate()}
              disabled={isSubmitting}
              className="flex items-center gap-2 rounded-xl bg-[var(--gold)] px-5 py-2.5 text-sm font-semibold text-[#3b0810] transition hover:bg-[#f0c654] disabled:opacity-60"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Create Coupon
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setFormError(null); }}
              className="rounded-xl border border-[var(--gold)]/30 px-5 py-2.5 text-sm transition hover:bg-[var(--popup-hover)]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Loading / error states */}
      {isLoading && (
        <div className="flex items-center justify-center gap-3 py-16 text-[var(--popup-muted)]">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading coupons…</span>
        </div>
      )}

      {!isLoading && error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-400/30 bg-red-900/20 px-4 py-3 text-sm text-red-300">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
          <button type="button" onClick={() => void fetchCoupons()} className="ml-auto underline">Retry</button>
        </div>
      )}

      {/* Coupon list */}
      {!isLoading && !error && (
        <div className="space-y-3">
          {coupons.length === 0 && (
            <div className="rounded-2xl border border-[var(--gold)]/20 py-16 text-center text-[var(--popup-muted)]">
              <Tag className="mx-auto mb-3 h-8 w-8" />
              <p>No coupons yet. Create one above.</p>
            </div>
          )}
          {coupons.map((coupon) => (
            <div
              key={coupon.id}
              className={`rounded-2xl border p-5 transition ${
                coupon.isActive ? "border-[var(--gold)]/30 bg-[var(--popup-footer-bg)]" : "border-[var(--gold)]/15 bg-[var(--popup-footer-bg)]/50 opacity-60"
              }`}
            >
              <div className="flex flex-wrap items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-lg border border-[var(--gold)]/40 px-2.5 py-0.5 font-mono text-sm font-bold text-[var(--gold)]">
                      {coupon.code}
                    </span>
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${coupon.isActive ? "bg-emerald-900/40 text-emerald-300" : "bg-zinc-800 text-zinc-400"}`}>
                      {coupon.isActive ? "Active" : "Inactive"}
                    </span>
                    <span className="flex items-center gap-1 rounded-full bg-[var(--popup-hover)] px-2.5 py-0.5 text-[11px] text-[var(--popup-muted)]">
                      {coupon.type === "percentage" ? <Percent className="h-3 w-3" /> : <span>₹</span>}
                      {coupon.type === "percentage" ? `${coupon.value}% off` : `₹${coupon.value} off`}
                      {coupon.maxDiscountAmount ? ` (max ₹${coupon.maxDiscountAmount})` : ""}
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm font-medium text-[var(--popup-footer-text)]">{coupon.label}</p>
                  <p className="mt-0.5 text-xs text-[var(--popup-muted)]">{coupon.description}</p>
                  <p className="mt-1.5 text-[11px] text-[var(--popup-muted)]">
                    Min. order: ₹{coupon.minSubtotal} · Created {formatDate(coupon.createdAt)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void handleToggleActive(coupon)}
                    disabled={togglingId === coupon.id}
                    title={coupon.isActive ? "Deactivate" : "Activate"}
                    className="rounded-xl border border-[var(--gold)]/25 p-2 transition hover:bg-[var(--popup-hover)] disabled:opacity-50"
                  >
                    {togglingId === coupon.id ? (
                      <Loader2 className="h-5 w-5 animate-spin text-[var(--popup-muted)]" />
                    ) : coupon.isActive ? (
                      <ToggleRight className="h-5 w-5 text-emerald-400" />
                    ) : (
                      <ToggleLeft className="h-5 w-5 text-[var(--popup-muted)]" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDelete(coupon.id)}
                    disabled={deletingId === coupon.id}
                    title="Delete coupon"
                    className="rounded-xl border border-[var(--gold)]/25 p-2 text-[var(--gold)]/60 transition hover:bg-red-900/30 hover:text-red-400 disabled:opacity-50"
                  >
                    {deletingId === coupon.id ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Trash2 className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
