"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { CampaignRecord } from "@/lib/campaigns";
import CampaignForm from "@/components/campaigns/CampaignForm";
import StatusBadge from "@/components/campaigns/StatusBadge";

export default function CampaignList() {
  const [campaigns, setCampaigns] = useState<CampaignRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  async function fetchCampaigns() {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/campaigns", { cache: "no-store" });
      const data = (await response.json()) as { campaigns?: CampaignRecord[]; error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Failed to load campaigns");
      }
      setCampaigns(data.campaigns ?? []);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Failed to load campaigns");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void fetchCampaigns();
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-4 pb-16">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-[var(--page-fg)]">Campaigns</h1>
          <p className="mt-2 text-sm text-[#675b55]">Create reusable collaboration campaigns, fan requests, single-use coupons, and redemption reporting.</p>
        </div>
        <button type="button" onClick={() => setShowCreate((current) => !current)} className="rounded-full bg-[var(--secondary)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#9f3940]">
          {showCreate ? "Close" : "Create Campaign"}
        </button>
      </div>

      {showCreate ? (
        <div className="mb-8">
          <CampaignForm
            submitLabel="Create Campaign"
            onSubmit={async (payload) => {
              const response = await fetch("/api/admin/campaigns", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
              });
              const data = await response.json();
              if (!response.ok) {
                throw new Error(data.message ?? data.error ?? "Failed to create campaign");
              }
              setShowCreate(false);
              await fetchCampaigns();
            }}
            onCancel={() => setShowCreate(false)}
          />
        </div>
      ) : null}

      {error ? <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

      <div className="overflow-hidden rounded-3xl border border-[#eaded3] bg-white">
        <div className="grid grid-cols-[minmax(220px,1.4fr)_0.9fr_0.9fr_0.7fr_1.4fr] gap-4 border-b border-[#f0e5dc] px-5 py-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8b7d75]">
          <span>Campaign</span>
          <span>Keyword</span>
          <span>Discount</span>
          <span>Status</span>
          <span>Actions</span>
        </div>

        {isLoading ? <div className="px-5 py-10 text-sm text-[#6f625b]">Loading campaigns…</div> : null}

        {!isLoading && campaigns.length === 0 ? <div className="px-5 py-10 text-sm text-[#6f625b]">No campaigns created yet.</div> : null}

        {!isLoading
          ? campaigns.map((campaign) => (
              <div key={campaign.id} className="grid grid-cols-[minmax(220px,1.4fr)_0.9fr_0.9fr_0.7fr_1.4fr] gap-4 border-b border-[#f7efe8] px-5 py-5 text-sm text-[#4f443e] last:border-b-0">
                <div>
                  <p className="font-semibold text-[var(--page-fg)]">{campaign.name}</p>
                  <p className="mt-1 text-xs text-[#8b7d75]">{campaign.editionName} · {campaign.partnerName}</p>
                </div>
                <div className="font-mono text-xs">{campaign.campaignKeyword}</div>
                <div>
                  <p>{campaign.baseDiscountPercent}% base</p>
                  <p className="text-xs text-[#8b7d75]">+{campaign.referralBonusPercent}% referral</p>
                </div>
                <div><StatusBadge status={campaign.status} /></div>
                <div className="flex flex-wrap gap-2">
                  <Link href={`/admin/campaigns/${campaign.id}`} className="rounded-full border border-[#d9cbbf] px-3 py-2 text-xs font-semibold transition hover:border-[var(--secondary)] hover:text-[var(--secondary)]">View</Link>
                  <Link href={`/admin/campaigns/${campaign.id}/requests`} className="rounded-full border border-[#d9cbbf] px-3 py-2 text-xs font-semibold transition hover:border-[var(--secondary)] hover:text-[var(--secondary)]">View Requests</Link>
                  <Link href={`/admin/campaigns/${campaign.id}/coupons`} className="rounded-full border border-[#d9cbbf] px-3 py-2 text-xs font-semibold transition hover:border-[var(--secondary)] hover:text-[var(--secondary)]">View Coupons</Link>
                  <Link href={`/admin/campaigns/${campaign.id}/redemptions`} className="rounded-full border border-[#d9cbbf] px-3 py-2 text-xs font-semibold transition hover:border-[var(--secondary)] hover:text-[var(--secondary)]">View Redemptions</Link>
                </div>
              </div>
            ))
          : null}
      </div>
    </div>
  );
}