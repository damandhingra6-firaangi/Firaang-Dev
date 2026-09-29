"use client";

import { useEffect, useState } from "react";
import type { CampaignRecord } from "@/lib/campaigns";

type CampaignFormValues = {
  name: string;
  slug: string;
  partnerName: string;
  editionName: string;
  campaignKeyword: string;
  couponPrefix: string;
  baseDiscountPercent: string;
  referralBonusPercent: string;
  referralEnabled: boolean;
  friendVerificationMode: CampaignRecord["friendVerificationMode"];
  startDate: string;
  endDate: string;
  couponExpiresAt: string;
  minimumOrderValue: string;
  maxRedemptions: string;
  redemptionRequiresActiveCampaign: boolean;
  status: CampaignRecord["status"];
  termsAndConditions: string;
  messageTemplate: string;
};

function toFormValues(initial?: CampaignRecord | null): CampaignFormValues {
  return {
    name: initial?.name ?? "",
    slug: initial?.slug ?? "",
    partnerName: initial?.partnerName ?? "",
    editionName: initial?.editionName ?? "",
    campaignKeyword: initial?.campaignKeyword ?? "",
    couponPrefix: initial?.couponPrefix ?? "",
    baseDiscountPercent: String(initial?.baseDiscountPercent ?? 25),
    referralBonusPercent: String(initial?.referralBonusPercent ?? 5),
    referralEnabled: initial?.referralEnabled ?? true,
    friendVerificationMode: initial?.friendVerificationMode ?? "fallback_to_base",
    startDate: initial?.startDate?.slice(0, 10) ?? "",
    endDate: initial?.endDate?.slice(0, 10) ?? "",
    couponExpiresAt: initial?.couponExpiresAt?.slice(0, 10) ?? "",
    minimumOrderValue: initial?.minimumOrderValue ? String(initial.minimumOrderValue) : "",
    maxRedemptions: initial?.maxRedemptions ? String(initial.maxRedemptions) : "",
    redemptionRequiresActiveCampaign: initial?.redemptionRequiresActiveCampaign ?? true,
    status: initial?.status ?? "draft",
    termsAndConditions: initial?.termsAndConditions ?? "",
    messageTemplate: initial?.messageTemplate ?? "",
  };
}

export default function CampaignForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial?: CampaignRecord | null;
  submitLabel: string;
  onSubmit: (payload: Record<string, unknown>) => Promise<void>;
  onCancel?: () => void;
}) {
  const [form, setForm] = useState<CampaignFormValues>(() => toFormValues(initial));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setForm(toFormValues(initial));
  }, [initial]);

  async function handleSubmit() {
    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        ...form,
        baseDiscountPercent: Number(form.baseDiscountPercent),
        referralBonusPercent: Number(form.referralBonusPercent),
        minimumOrderValue: form.minimumOrderValue ? Number(form.minimumOrderValue) : undefined,
        maxRedemptions: form.maxRedemptions ? Number(form.maxRedemptions) : undefined,
      });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to save campaign");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="rounded-3xl border border-[#eaded3] bg-[#fffaf7] p-5 md:p-6">
      <div className="grid gap-4 md:grid-cols-2">
        {[
          ["Campaign Name", "name"],
          ["Slug", "slug"],
          ["Partner Name", "partnerName"],
          ["Edition Name", "editionName"],
          ["Campaign Keyword", "campaignKeyword"],
          ["Coupon Prefix", "couponPrefix"],
        ].map(([label, key]) => (
          <label key={key} className="text-sm text-[#5b4f49]">
            {label}
            <input
              value={form[key as keyof CampaignFormValues] as string}
              onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))}
              className="mt-2 w-full rounded-2xl border border-[#e1d5ca] bg-white px-4 py-3 outline-none transition focus:border-[var(--secondary)]"
            />
          </label>
        ))}

        <label className="text-sm text-[#5b4f49]">
          Base Discount %
          <input value={form.baseDiscountPercent} onChange={(event) => setForm((current) => ({ ...current, baseDiscountPercent: event.target.value }))} type="number" className="mt-2 w-full rounded-2xl border border-[#e1d5ca] bg-white px-4 py-3 outline-none transition focus:border-[var(--secondary)]" />
        </label>
        <label className="text-sm text-[#5b4f49]">
          Referral Bonus %
          <input value={form.referralBonusPercent} onChange={(event) => setForm((current) => ({ ...current, referralBonusPercent: event.target.value }))} type="number" className="mt-2 w-full rounded-2xl border border-[#e1d5ca] bg-white px-4 py-3 outline-none transition focus:border-[var(--secondary)]" />
        </label>
        <label className="text-sm text-[#5b4f49]">
          Start Date
          <input value={form.startDate} onChange={(event) => setForm((current) => ({ ...current, startDate: event.target.value }))} type="date" className="mt-2 w-full rounded-2xl border border-[#e1d5ca] bg-white px-4 py-3 outline-none transition focus:border-[var(--secondary)]" />
        </label>
        <label className="text-sm text-[#5b4f49]">
          End Date
          <input value={form.endDate} onChange={(event) => setForm((current) => ({ ...current, endDate: event.target.value }))} type="date" className="mt-2 w-full rounded-2xl border border-[#e1d5ca] bg-white px-4 py-3 outline-none transition focus:border-[var(--secondary)]" />
        </label>
        <label className="text-sm text-[#5b4f49]">
          Coupon Expiry
          <input value={form.couponExpiresAt} onChange={(event) => setForm((current) => ({ ...current, couponExpiresAt: event.target.value }))} type="date" className="mt-2 w-full rounded-2xl border border-[#e1d5ca] bg-white px-4 py-3 outline-none transition focus:border-[var(--secondary)]" />
        </label>
        <label className="text-sm text-[#5b4f49]">
          Minimum Order Value
          <input value={form.minimumOrderValue} onChange={(event) => setForm((current) => ({ ...current, minimumOrderValue: event.target.value }))} type="number" className="mt-2 w-full rounded-2xl border border-[#e1d5ca] bg-white px-4 py-3 outline-none transition focus:border-[var(--secondary)]" />
        </label>
        <label className="text-sm text-[#5b4f49]">
          Max Redemptions
          <input value={form.maxRedemptions} onChange={(event) => setForm((current) => ({ ...current, maxRedemptions: event.target.value }))} type="number" className="mt-2 w-full rounded-2xl border border-[#e1d5ca] bg-white px-4 py-3 outline-none transition focus:border-[var(--secondary)]" />
        </label>
        <label className="text-sm text-[#5b4f49]">
          Campaign Status
          <select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as CampaignRecord["status"] }))} className="mt-2 w-full rounded-2xl border border-[#e1d5ca] bg-white px-4 py-3 outline-none transition focus:border-[var(--secondary)]">
            {(["draft", "active", "paused", "archived", "expired"] as const).map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
        </label>
        <label className="text-sm text-[#5b4f49]">
          Friend Verification Mode
          <select value={form.friendVerificationMode} onChange={(event) => setForm((current) => ({ ...current, friendVerificationMode: event.target.value as CampaignRecord["friendVerificationMode"] }))} className="mt-2 w-full rounded-2xl border border-[#e1d5ca] bg-white px-4 py-3 outline-none transition focus:border-[var(--secondary)]">
            <option value="fallback_to_base">Fallback to base discount</option>
            <option value="require_both_for_approval">Require both customer and friend</option>
          </select>
        </label>
        <label className="flex items-center gap-3 rounded-2xl border border-[#eaded3] bg-white px-4 py-3 text-sm text-[#5b4f49]">
          <input type="checkbox" checked={form.referralEnabled} onChange={(event) => setForm((current) => ({ ...current, referralEnabled: event.target.checked }))} />
          Referral enabled
        </label>
        <label className="flex items-center gap-3 rounded-2xl border border-[#eaded3] bg-white px-4 py-3 text-sm text-[#5b4f49]">
          <input type="checkbox" checked={form.redemptionRequiresActiveCampaign} onChange={(event) => setForm((current) => ({ ...current, redemptionRequiresActiveCampaign: event.target.checked }))} />
          Require active campaign during redemption
        </label>
        <label className="md:col-span-2 text-sm text-[#5b4f49]">
          Terms & Conditions
          <textarea value={form.termsAndConditions} onChange={(event) => setForm((current) => ({ ...current, termsAndConditions: event.target.value }))} rows={4} className="mt-2 w-full rounded-2xl border border-[#e1d5ca] bg-white px-4 py-3 outline-none transition focus:border-[var(--secondary)]" />
        </label>
        <label className="md:col-span-2 text-sm text-[#5b4f49]">
          Message Template
          <textarea value={form.messageTemplate} onChange={(event) => setForm((current) => ({ ...current, messageTemplate: event.target.value }))} rows={8} className="mt-2 w-full rounded-2xl border border-[#e1d5ca] bg-white px-4 py-3 font-mono text-sm outline-none transition focus:border-[var(--secondary)]" />
        </label>
      </div>

      {error ? <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}

      <div className="mt-5 flex flex-wrap gap-3">
        <button type="button" onClick={() => void handleSubmit()} disabled={isSubmitting} className="rounded-full bg-[var(--secondary)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#9f3940] disabled:opacity-70">{isSubmitting ? "Saving…" : submitLabel}</button>
        {onCancel ? <button type="button" onClick={onCancel} className="rounded-full border border-[#d9cbbf] px-5 py-3 text-sm font-semibold text-[#4f433d] transition hover:border-[var(--secondary)] hover:text-[var(--secondary)]">Cancel</button> : null}
      </div>
    </div>
  );
}