"use client";

import { useEffect, useState } from "react";
import type { CampaignRecord, CampaignRedemptionRecord } from "@/lib/campaigns";

export default function RedemptionTable({ campaignId }: { campaignId: string }) {
  const [campaign, setCampaign] = useState<CampaignRecord | null>(null);
  const [redemptions, setRedemptions] = useState<CampaignRedemptionRecord[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const [campaignResponse, redemptionResponse] = await Promise.all([
        fetch(`/api/admin/campaigns/${campaignId}`, { cache: "no-store" }),
        fetch(`/api/admin/campaigns/${campaignId}/redemptions`, { cache: "no-store" }),
      ]);
      const campaignData = await campaignResponse.json();
      const redemptionData = await redemptionResponse.json();
      if (!campaignResponse.ok) {
        setError(campaignData.error ?? "Failed to load campaign");
        return;
      }
      if (!redemptionResponse.ok) {
        setError(redemptionData.error ?? "Failed to load redemptions");
        return;
      }
      setCampaign(campaignData.campaign);
      setRedemptions(redemptionData.redemptions ?? []);
    })();
  }, [campaignId]);

  return (
    <div className="mx-auto max-w-7xl px-4 pb-16">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-[var(--page-fg)]">Campaign Redemptions</h1>
        <p className="mt-2 text-sm text-[#675b55]">Audit trail of single-use redemptions for {campaign?.name ?? "this campaign"}.</p>
      </div>

      {error ? <div className="mb-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

      <div className="space-y-4">
        {redemptions.map((redemption) => (
          <div key={redemption.id} className="rounded-3xl border border-[#eaded3] bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="font-semibold text-[var(--page-fg)]">{redemption.participant?.name ?? "Participant"} · {redemption.couponCode ?? "Coupon"}</p>
                <p className="mt-1 text-sm text-[#675b55]">Order {redemption.orderId} · Discount ₹{redemption.discountAmount} on order total ₹{redemption.orderTotal}</p>
              </div>
              <p className="text-sm text-[#675b55]">Redeemed {new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(redemption.redeemedAt))}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}