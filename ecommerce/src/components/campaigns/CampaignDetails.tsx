"use client";

import { startTransition, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { CampaignRecord, CampaignStats as CampaignStatsRecord } from "@/lib/campaigns";
import CampaignForm from "@/components/campaigns/CampaignForm";
import CampaignStats from "@/components/campaigns/CampaignStats";
import StatusBadge from "@/components/campaigns/StatusBadge";

export default function CampaignDetails({ campaignId }: { campaignId: string }) {
  const [campaign, setCampaign] = useState<CampaignRecord | null>(null);
  const [stats, setStats] = useState<CampaignStatsRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showEdit, setShowEdit] = useState(false);

  const loadCampaign = useCallback(async () => {
    const response = await fetch(`/api/admin/campaigns/${campaignId}`, { cache: "no-store" });
    const data = await response.json();
    return { response, data } as const;
  }, [campaignId]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const { response, data } = await loadCampaign();
      if (cancelled) {
        return;
      }

      startTransition(() => {
        if (!response.ok) {
          setError(data.error ?? "Failed to load campaign");
          return;
        }
        setError(null);
        setCampaign(data.campaign);
        setStats(data.stats);
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [campaignId, loadCampaign]);

  return (
    <div className="mx-auto max-w-7xl px-4 pb-16">
      {campaign ? (
        <>
          <div className="mb-8 flex flex-wrap items-start justify-between gap-4 rounded-3xl border border-[#eaded3] bg-white p-5 md:p-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8b7d75]">Campaign Details</p>
              <h1 className="mt-2 text-3xl font-semibold text-[var(--page-fg)]">{campaign.name}</h1>
              <p className="mt-2 text-sm text-[#675b55]">{campaign.partnerName} · {campaign.editionName} · Keyword {campaign.campaignKeyword}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <StatusBadge status={campaign.status} />
                <span className="rounded-full bg-[#f4e8df] px-3 py-1 text-xs font-semibold text-[#7a5d4d]">{campaign.baseDiscountPercent}% base</span>
                <span className="rounded-full bg-[#f4e8df] px-3 py-1 text-xs font-semibold text-[#7a5d4d]">+{campaign.referralBonusPercent}% referral</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setShowEdit((current) => !current)} className="rounded-full border border-[#d9cbbf] px-4 py-2.5 text-sm font-semibold transition hover:border-[var(--secondary)] hover:text-[var(--secondary)]">{showEdit ? "Close" : "Edit Campaign"}</button>
              <Link href={`/admin/campaigns/${campaignId}/requests`} className="rounded-full border border-[#d9cbbf] px-4 py-2.5 text-sm font-semibold transition hover:border-[var(--secondary)] hover:text-[var(--secondary)]">Requests</Link>
              <Link href={`/admin/campaigns/${campaignId}/coupons`} className="rounded-full border border-[#d9cbbf] px-4 py-2.5 text-sm font-semibold transition hover:border-[var(--secondary)] hover:text-[var(--secondary)]">Coupons</Link>
              <Link href={`/admin/campaigns/${campaignId}/redemptions`} className="rounded-full border border-[#d9cbbf] px-4 py-2.5 text-sm font-semibold transition hover:border-[var(--secondary)] hover:text-[var(--secondary)]">Redemptions</Link>
            </div>
          </div>

          {showEdit ? (
            <div className="mb-8">
              <CampaignForm
                initial={campaign}
                submitLabel="Save Campaign"
                onSubmit={async (payload) => {
                  const response = await fetch(`/api/admin/campaigns/${campaignId}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                  });
                  const data = await response.json();
                  if (!response.ok) {
                    throw new Error(data.message ?? data.error ?? "Failed to save campaign");
                  }
                  setCampaign(data.campaign);
                  setShowEdit(false);
                  const refreshed = await loadCampaign();
                  if (!refreshed.response.ok) {
                    throw new Error(refreshed.data.error ?? "Failed to refresh campaign");
                  }
                  setCampaign(refreshed.data.campaign);
                  setStats(refreshed.data.stats);
                }}
                onCancel={() => setShowEdit(false)}
              />
            </div>
          ) : null}

          {stats ? <CampaignStats stats={stats} /> : null}

          <div className="mt-8 rounded-3xl border border-[#eaded3] bg-white p-5 md:p-6">
            <h2 className="text-xl font-semibold text-[var(--page-fg)]">Terms & Template</h2>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[#5f544e]">{campaign.termsAndConditions || "No terms added yet."}</p>
            <div className="mt-6 rounded-2xl border border-[#efe4da] bg-[#fffaf7] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8b7d75]">Message Template</p>
              <pre className="mt-3 overflow-x-auto whitespace-pre-wrap text-xs leading-6 text-[#5f544e]">{campaign.messageTemplate}</pre>
            </div>
          </div>
        </>
      ) : error ? <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : <div className="text-sm text-[#675b55]">Loading campaign…</div>}
    </div>
  );
}