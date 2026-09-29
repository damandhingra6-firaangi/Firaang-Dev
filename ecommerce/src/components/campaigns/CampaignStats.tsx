"use client";

import type { CampaignStats as CampaignStatsRecord } from "@/lib/campaigns";

export default function CampaignStats({ stats }: { stats: CampaignStatsRecord }) {
  const cards = [
    ["Fan Requests", stats.totalRequests],
    ["Pending", stats.pendingRequests],
    ["Verified", stats.verifiedRequests],
    ["Rejected", stats.rejectedRequests],
    ["Participants", stats.totalParticipants],
    ["Referral Participants", stats.referralParticipants],
    ["Coupons Generated", stats.couponsGenerated],
    ["Active Coupons", stats.activeCoupons],
    ["Redeemed Coupons", stats.redeemedCoupons],
    ["Expired Coupons", stats.expiredCoupons],
    ["Total Orders", stats.totalOrders],
    ["Total Discount Given", `₹${stats.totalDiscountGiven}`],
  ] as const;

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {cards.map(([label, value]) => (
        <div key={label} className="rounded-2xl border border-[#eaded3] bg-white p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8b7d75]">{label}</p>
          <p className="mt-2 text-2xl font-semibold text-[var(--page-fg)]">{value}</p>
        </div>
      ))}
    </div>
  );
}