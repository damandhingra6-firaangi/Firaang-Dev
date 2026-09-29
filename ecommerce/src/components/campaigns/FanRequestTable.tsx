"use client";

import { startTransition, useCallback, useEffect, useState } from "react";
import CopyMessageButton from "@/components/campaigns/CopyMessageButton";
import type { CampaignFanRequestRecord, CampaignRecord } from "@/lib/campaigns";
import { renderCampaignMessageTemplate } from "@/lib/campaign-message";
import CopyButton from "@/components/campaigns/CopyButton";
import StatusBadge from "@/components/campaigns/StatusBadge";

type RequestFilters = {
  q: string;
  status: string;
  referral: string;
  couponStatus: string;
};

function couponNeedsGeneration(input: {
  code?: string;
  status?: string;
  discountPercent?: number;
  approvedDiscountPercent?: number;
}) {
  if (!input.approvedDiscountPercent || input.approvedDiscountPercent <= 0) {
    return false;
  }

  if (!input.code) {
    return true;
  }

  if (input.status === "USED") {
    return false;
  }

  if (input.status === "ACTIVE" && input.discountPercent === input.approvedDiscountPercent) {
    return false;
  }

  return true;
}

function canGenerateCoupon(record: CampaignFanRequestRecord, campaign: CampaignRecord | null) {
  if (!record.customerFollowVerified) {
    return false;
  }

  const approvedDiscountPercent = record.approvedDiscountPercent ?? 0;
  const customerNeedsCoupon = couponNeedsGeneration({
    code: record.customerCouponCode,
    status: record.customerCouponStatus,
    discountPercent: record.customerCouponDiscountPercent,
    approvedDiscountPercent,
  });

  const friendEligible = Boolean(campaign?.referralEnabled && record.hasFriend && record.friendFollowVerified);

  if (!friendEligible) {
    return customerNeedsCoupon;
  }

  const friendNeedsCoupon = couponNeedsGeneration({
    code: record.friendCouponCode,
    status: record.friendCouponStatus,
    discountPercent: record.friendCouponDiscountPercent,
    approvedDiscountPercent,
  });

  return customerNeedsCoupon || friendNeedsCoupon;
}

function buildParticipantMessage(campaign: CampaignRecord, request: CampaignFanRequestRecord, participant: "customer" | "friend") {
  const couponCode = participant === "customer" ? request.customerCouponCode : request.friendCouponCode;
  const discountPercent = participant === "customer" ? request.customerCouponDiscountPercent : request.friendCouponDiscountPercent;
  const customerName = participant === "customer" ? request.customerName : request.friendName ?? "Friend";

  if (!couponCode || !discountPercent) {
    return null;
  }

  return renderCampaignMessageTemplate({
    template: campaign.messageTemplate,
    customerName,
    campaignName: campaign.editionName ? `${campaign.name} ${campaign.editionName}` : campaign.name,
    couponCode,
    discountPercent,
    expiryDate: campaign.couponExpiresAt,
    hasReferral: request.hasFriend,
  });
}

export default function FanRequestTable({ campaignId }: { campaignId: string }) {
  const [campaign, setCampaign] = useState<CampaignRecord | null>(null);
  const [requests, setRequests] = useState<CampaignFanRequestRecord[]>([]);
  const [filters, setFilters] = useState<RequestFilters>({ q: "", status: "", referral: "all", couponStatus: "all" });
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [form, setForm] = useState({ customerName: "", customerEmail: "", customerPhone: "", instagramUsername: "", friendName: "", friendInstagramUsername: "", friendEmail: "", friendPhone: "", notes: "" });

  const loadRequests = useCallback(async () => {
    const [campaignResponse, requestResponse] = await Promise.all([
      fetch(`/api/admin/campaigns/${campaignId}`, { cache: "no-store" }),
      fetch(`/api/admin/campaigns/${campaignId}/requests?${new URLSearchParams({ q: filters.q, status: filters.status, referral: filters.referral, couponStatus: filters.couponStatus })}`, { cache: "no-store" }),
    ]);

    const campaignData = await campaignResponse.json();
    const requestData = await requestResponse.json();

    return { campaignResponse, requestResponse, campaignData, requestData } as const;
  }, [campaignId, filters.couponStatus, filters.q, filters.referral, filters.status]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const payload = await loadRequests();
      if (cancelled) {
        return;
      }

      startTransition(() => {
        if (!payload.campaignResponse.ok) {
          setError(payload.campaignData.error ?? "Failed to load campaign");
          return;
        }

        if (!payload.requestResponse.ok) {
          setError(payload.requestData.error ?? "Failed to load requests");
          return;
        }

        setError(null);
        setCampaign(payload.campaignData.campaign);
        setRequests(payload.requestData.requests ?? []);
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [campaignId, filters.couponStatus, filters.q, filters.referral, filters.status, loadRequests]);

  return (
    <div className="mx-auto max-w-7xl px-4 pb-16">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-[var(--page-fg)]">Fan Requests</h1>
          <p className="mt-2 text-sm text-[#675b55]">Review followers, verify referrals, and generate unique single-use coupons for {campaign?.name ?? "this campaign"}.</p>
        </div>
        <button type="button" onClick={() => setIsCreating((current) => !current)} className="rounded-full bg-[var(--secondary)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#9f3940]">{isCreating ? "Close" : "Add Fan Request"}</button>
      </div>

      {isCreating ? (
        <div className="mb-8 rounded-3xl border border-[#eaded3] bg-white p-5 md:p-6">
          <div className="grid gap-4 md:grid-cols-2">
            {Object.entries(form).map(([key, value]) => (
              <label key={key} className={`text-sm text-[#5b4f49] ${key === "notes" ? "md:col-span-2" : ""}`}>
                {key}
                {key === "notes" ? (
                  <textarea value={value} rows={4} onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))} className="mt-2 w-full rounded-2xl border border-[#e1d5ca] bg-white px-4 py-3 outline-none transition focus:border-[var(--secondary)]" />
                ) : (
                  <input value={value} onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))} className="mt-2 w-full rounded-2xl border border-[#e1d5ca] bg-white px-4 py-3 outline-none transition focus:border-[var(--secondary)]" />
                )}
              </label>
            ))}
          </div>
          <div className="mt-5 flex gap-3">
            <button type="button" onClick={async () => {
              const response = await fetch(`/api/admin/campaigns/${campaignId}/requests`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
              });
              const data = await response.json();
              if (!response.ok) {
                setError(data.error ?? "Failed to create request");
                return;
              }
              setIsCreating(false);
              setForm({ customerName: "", customerEmail: "", customerPhone: "", instagramUsername: "", friendName: "", friendInstagramUsername: "", friendEmail: "", friendPhone: "", notes: "" });
              const payload = await loadRequests();
              if (!payload.campaignResponse.ok || !payload.requestResponse.ok) {
                setError(payload.campaignData.error ?? payload.requestData.error ?? "Failed to refresh requests");
                return;
              }
              setError(null);
              setCampaign(payload.campaignData.campaign);
              setRequests(payload.requestData.requests ?? []);
            }} className="rounded-full bg-[var(--secondary)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#9f3940]">Create Request</button>
            <button type="button" onClick={() => setIsCreating(false)} className="rounded-full border border-[#d9cbbf] px-5 py-3 text-sm font-semibold text-[#4f433d] transition hover:border-[var(--secondary)] hover:text-[var(--secondary)]">Cancel</button>
          </div>
        </div>
      ) : null}

      <div className="mb-6 grid gap-3 md:grid-cols-4">
        <input value={filters.q} onChange={(event) => setFilters((current) => ({ ...current, q: event.target.value }))} placeholder="Search name, Instagram, coupon…" className="rounded-2xl border border-[#e1d5ca] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--secondary)]" />
        <select value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))} className="rounded-2xl border border-[#e1d5ca] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--secondary)]">
          <option value="">All statuses</option>
          {(["PENDING", "UNDER_REVIEW", "VERIFIED", "REJECTED", "EXPIRED", "COUPON_GENERATED"] as const).map((status) => <option key={status} value={status}>{status}</option>)}
        </select>
        <select value={filters.referral} onChange={(event) => setFilters((current) => ({ ...current, referral: event.target.value }))} className="rounded-2xl border border-[#e1d5ca] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--secondary)]">
          <option value="all">All requests</option>
          <option value="referral">Referral</option>
          <option value="non-referral">Non-referral</option>
        </select>
        <select value={filters.couponStatus} onChange={(event) => setFilters((current) => ({ ...current, couponStatus: event.target.value }))} className="rounded-2xl border border-[#e1d5ca] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--secondary)]">
          <option value="all">All coupon states</option>
          <option value="generated">Coupon Generated</option>
          <option value="used">Coupon Used</option>
        </select>
      </div>

      {error ? <div className="mb-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

      <div className="space-y-4">
        {requests.map((request) => (
          <div key={request.id} className="rounded-3xl border border-[#eaded3] bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="grid gap-3 md:grid-cols-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8b7d75]">Customer</p>
                  <p className="mt-1 font-semibold text-[var(--page-fg)]">{request.customerName}</p>
                  <p className="text-sm text-[#675b55]">{request.instagramUsername}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8b7d75]">Friend</p>
                  <p className="mt-1 font-semibold text-[var(--page-fg)]">{request.friendName ?? "—"}</p>
                  <p className="text-sm text-[#675b55]">{request.friendInstagramUsername ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8b7d75]">Discount</p>
                  <p className="mt-1 text-sm text-[#4f443e]">Requested {request.requestedDiscountPercent}%</p>
                  <p className="text-sm text-[#4f443e]">Approved {request.approvedDiscountPercent ?? 0}%</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8b7d75]">Status</p>
                  <div className="mt-1 flex flex-wrap gap-2">
                    <StatusBadge status={request.verificationStatus} />
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${request.customerFollowVerified ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                      Customer {request.customerFollowVerified ? "Verified" : "Pending"}
                    </span>
                    {request.hasFriend ? <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${request.friendFollowVerified ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>Friend {request.friendFollowVerified ? "Verified" : "Pending"}</span> : null}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {!request.customerFollowVerified ? <button type="button" onClick={async () => {
                  await fetch(`/api/admin/campaigns/requests/${request.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ customerFollowVerified: true }) });
                  const payload = await loadRequests();
                  if (!payload.campaignResponse.ok || !payload.requestResponse.ok) {
                    setError(payload.campaignData.error ?? payload.requestData.error ?? "Failed to refresh requests");
                    return;
                  }
                  setError(null);
                  setCampaign(payload.campaignData.campaign);
                  setRequests(payload.requestData.requests ?? []);
                }} className="rounded-full border border-[#d9cbbf] px-3 py-2 text-xs font-semibold transition hover:border-[var(--secondary)] hover:text-[var(--secondary)]">Verify Customer</button> : null}

                {request.hasFriend && !request.friendFollowVerified ? <button type="button" onClick={async () => {
                  await fetch(`/api/admin/campaigns/requests/${request.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ friendFollowVerified: true }) });
                  const payload = await loadRequests();
                  if (!payload.campaignResponse.ok || !payload.requestResponse.ok) {
                    setError(payload.campaignData.error ?? payload.requestData.error ?? "Failed to refresh requests");
                    return;
                  }
                  setError(null);
                  setCampaign(payload.campaignData.campaign);
                  setRequests(payload.requestData.requests ?? []);
                }} className="rounded-full border border-[#d9cbbf] px-3 py-2 text-xs font-semibold transition hover:border-[var(--secondary)] hover:text-[var(--secondary)]">Verify Friend</button> : null}

                {canGenerateCoupon(request, campaign) ? <button type="button" onClick={async () => {
                  const response = await fetch(`/api/admin/campaigns/requests/${request.id}/generate-coupons`, { method: "POST" });
                  const data = await response.json();
                  if (!response.ok) {
                    setError(data.error ?? "Failed to generate coupons");
                    return;
                  }
                  const payload = await loadRequests();
                  if (!payload.campaignResponse.ok || !payload.requestResponse.ok) {
                    setError(payload.campaignData.error ?? payload.requestData.error ?? "Failed to refresh requests");
                    return;
                  }
                  setError(null);
                  setCampaign(payload.campaignData.campaign);
                  setRequests(payload.requestData.requests ?? []);
                }} className="rounded-full bg-[var(--secondary)] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#9f3940]">{request.customerCouponCode || request.friendCouponCode ? "Refresh Coupons" : "Generate Coupon"}</button> : null}

                {request.verificationStatus !== "REJECTED" ? <button type="button" onClick={async () => {
                  await fetch(`/api/admin/campaigns/requests/${request.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ verificationStatus: "REJECTED" }) });
                  const payload = await loadRequests();
                  if (!payload.campaignResponse.ok || !payload.requestResponse.ok) {
                    setError(payload.campaignData.error ?? payload.requestData.error ?? "Failed to refresh requests");
                    return;
                  }
                  setError(null);
                  setCampaign(payload.campaignData.campaign);
                  setRequests(payload.requestData.requests ?? []);
                }} className="rounded-full border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-50">Reject</button> : null}
              </div>
            </div>

            {request.duplicateWarnings.length > 0 ? (
              <div className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
                {request.duplicateWarnings.join(" ")}
              </div>
            ) : null}

            <div className="mt-4 flex flex-wrap gap-3">
              {request.customerCouponCode ? (
                <div className="rounded-2xl border border-[#eaded3] bg-[#fffaf7] px-4 py-3 text-sm text-[#4f443e]">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8b7d75]">Customer Coupon</p>
                  <p className="mt-1 text-xs text-[#675b55]">{request.customerCouponDiscountPercent ?? 0}% OFF · {request.customerCouponStatus ?? "ACTIVE"}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2"><code className="font-mono font-semibold">{request.customerCouponCode}</code><CopyButton text={request.customerCouponCode} label="Copy" />{campaign && buildParticipantMessage(campaign, request, "customer") ? <CopyMessageButton message={buildParticipantMessage(campaign, request, "customer") ?? ""} /> : null}</div>
                </div>
              ) : null}
              {request.friendCouponCode ? (
                <div className="rounded-2xl border border-[#eaded3] bg-[#fffaf7] px-4 py-3 text-sm text-[#4f443e]">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8b7d75]">Friend Coupon</p>
                  <p className="mt-1 text-xs text-[#675b55]">{request.friendCouponDiscountPercent ?? 0}% OFF · {request.friendCouponStatus ?? "ACTIVE"}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2"><code className="font-mono font-semibold">{request.friendCouponCode}</code><CopyButton text={request.friendCouponCode} label="Copy" />{campaign && buildParticipantMessage(campaign, request, "friend") ? <CopyMessageButton message={buildParticipantMessage(campaign, request, "friend") ?? ""} /> : null}</div>
                </div>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}