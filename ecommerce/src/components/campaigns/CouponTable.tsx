"use client";

import { startTransition, useCallback, useEffect, useState } from "react";
import type { CampaignCouponRecord, CampaignRecord } from "@/lib/campaigns";
import CopyButton from "@/components/campaigns/CopyButton";
import CopyMessageButton from "@/components/campaigns/CopyMessageButton";
import StatusBadge from "@/components/campaigns/StatusBadge";

function buildMessage(campaign: CampaignRecord, coupon: CampaignCouponRecord) {
  const expiry = coupon.expiresAt ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(coupon.expiresAt)) : "as per campaign terms";
  return (campaign.messageTemplate || "Hi {{customerName}}!\n\nYour {{campaignName}} coupon is approved.\n\n{{couponCode}}\n\nUse it once for {{discountPercent}}% OFF.\n\nValid until {{expiryDate}}")
    .replaceAll("{{customerName}}", coupon.participant?.name ?? "Customer")
    .replaceAll("{{campaignName}}", `${campaign.name} ${campaign.editionName}`.trim())
    .replaceAll("{{couponCode}}", coupon.code)
    .replaceAll("{{discountPercent}}", String(coupon.discountValue))
    .replaceAll("{{expiryDate}}", expiry);
}

export default function CouponTable({ campaignId }: { campaignId: string }) {
  const [campaign, setCampaign] = useState<CampaignRecord | null>(null);
  const [coupons, setCoupons] = useState<CampaignCouponRecord[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const [campaignResponse, couponsResponse] = await Promise.all([
      fetch(`/api/admin/campaigns/${campaignId}`, { cache: "no-store" }),
      fetch(`/api/admin/campaigns/${campaignId}/coupons?${new URLSearchParams({ q, status })}`, { cache: "no-store" }),
    ]);
    const campaignData = await campaignResponse.json();
    const couponsData = await couponsResponse.json();
    return { campaignResponse, couponsResponse, campaignData, couponsData } as const;
  }, [campaignId, q, status]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const payload = await loadData();
      if (cancelled) {
        return;
      }

      startTransition(() => {
        if (!payload.campaignResponse.ok) {
          setError(payload.campaignData.error ?? "Failed to load campaign");
          return;
        }
        if (!payload.couponsResponse.ok) {
          setError(payload.couponsData.error ?? "Failed to load coupons");
          return;
        }
        setError(null);
        setCampaign(payload.campaignData.campaign);
        setCoupons(payload.couponsData.coupons ?? []);
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [campaignId, loadData, q, status]);

  return (
    <div className="mx-auto max-w-7xl px-4 pb-16">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-[var(--page-fg)]">Campaign Coupons</h1>
          <p className="mt-2 text-sm text-[#675b55]">Active, used, expired, and cancelled one-time coupons for {campaign?.name ?? "this campaign"}.</p>
        </div>
      </div>

      <div className="mb-6 grid gap-3 md:grid-cols-2">
        <input value={q} onChange={(event) => setQ(event.target.value)} placeholder="Search coupon, customer, Instagram…" className="rounded-2xl border border-[#e1d5ca] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--secondary)]" />
        <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-2xl border border-[#e1d5ca] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--secondary)]">
          <option value="all">All statuses</option>
          {(["ACTIVE", "USED", "EXPIRED", "CANCELLED"] as const).map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
      </div>

      {error ? <div className="mb-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

      <div className="space-y-4">
        {coupons.map((coupon) => (
          <div key={coupon.id} className="rounded-3xl border border-[#eaded3] bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <code className="rounded-lg border border-[#dccfc2] bg-[#fffaf7] px-3 py-1.5 font-mono text-sm font-semibold">{coupon.code}</code>
                  <StatusBadge status={coupon.status} />
                </div>
                <p className="mt-3 text-sm text-[#4f443e]">{coupon.participant?.name} · {coupon.participant?.instagramUsername}</p>
                <p className="text-sm text-[#675b55]">{coupon.discountValue}% OFF · {coupon.usedCount}/{coupon.maxUses} used · Order {coupon.orderId ?? "—"}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <CopyButton text={coupon.code} label="Copy Code" />
                {campaign ? <CopyMessageButton message={buildMessage(campaign, coupon)} /> : null}
                {coupon.status !== "USED" && coupon.status !== "CANCELLED" ? <button type="button" onClick={async () => {
                  const response = await fetch(`/api/admin/campaigns/coupons/${coupon.id}/cancel`, { method: "POST" });
                  const data = await response.json();
                  if (!response.ok) {
                    setError(data.error ?? "Failed to cancel coupon");
                    return;
                  }
                  const payload = await loadData();
                  if (!payload.campaignResponse.ok || !payload.couponsResponse.ok) {
                    setError(payload.campaignData.error ?? payload.couponsData.error ?? "Failed to refresh coupons");
                    return;
                  }
                  setError(null);
                  setCampaign(payload.campaignData.campaign);
                  setCoupons(payload.couponsData.coupons ?? []);
                }} className="rounded-xl border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-50">Cancel</button> : null}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}