"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, BarChart3, Loader2, RefreshCw, Users } from "lucide-react";

type CountRow = { key: string; count: number };
type SalesRow = { key: string; orders: number; revenue: number };
type TimelineRow = { day: string; visitors?: number; pageViews?: number };

type AnalyticsSummaryPayload = {
  summary: {
    totals: {
      totalVisitors: number;
      uniqueVisitors: number;
      pageViews: number;
      activeUsers: number;
      todayVisitors: number;
      weekVisitors: number;
      monthVisitors: number;
      avgSessionDurationSec: number;
      bounceRate: number;
      conversionRate: number;
    };
    newVsReturning: {
      newVisitors: number;
      returningVisitors: number;
    };
    topPages: CountRow[];
    topProducts: CountRow[];
    trafficSources: CountRow[];
    locations: Array<{ country: string; region: string; city: string; count: number }>;
    deviceBreakdown: CountRow[];
    browserBreakdown: CountRow[];
    osBreakdown: CountRow[];
    searchedKeywords: CountRow[];
    funnel: {
      home: number;
      product: number;
      cart: number;
      checkout: number;
      payment: number;
    };
    salesBySource: SalesRow[];
    visitorTimeline: Array<{ day: string; visitors: number }>;
    pageViewTimeline: Array<{ day: string; pageViews: number }>;
  };
  range: {
    from: string;
    to: string;
  };
  preset: string;
};

const PRESETS = [
  { label: "7 Days", value: "7d" },
  { label: "30 Days", value: "30d" },
  { label: "90 Days", value: "90d" },
] as const;

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-IN").format(value);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);
}

function formatDuration(seconds: number) {
  if (seconds <= 0) {
    return "0s";
  }

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;

  if (mins === 0) {
    return `${secs}s`;
  }

  return `${mins}m ${secs}s`;
}

function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div>
      <h2 className="text-xl font-semibold text-[#1f1b18]">{title}</h2>
      {subtitle ? <p className="mt-1 text-sm text-[#6a5c52]">{subtitle}</p> : null}
    </div>
  );
}

function HorizontalBarList({ rows }: { rows: CountRow[] }) {
  const max = Math.max(...rows.map((row) => row.count), 1);

  return (
    <div className="space-y-3">
      {rows.length === 0 ? <p className="text-sm text-[#7a6d64]">No data available yet.</p> : null}
      {rows.map((row) => (
        <div key={row.key}>
          <div className="mb-1 flex items-center justify-between gap-2 text-sm">
            <p className="truncate text-[#352d28]">{row.key}</p>
            <span className="shrink-0 font-semibold text-[#1f1b18]">{formatNumber(row.count)}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[#eadfd7]">
            <div className="h-full rounded-full bg-[#6f4d37]" style={{ width: `${Math.max(8, (row.count / max) * 100)}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function MiniTimeline({ rows, valueKey, color }: { rows: TimelineRow[]; valueKey: "visitors" | "pageViews"; color: string }) {
  const max = Math.max(...rows.map((row) => row[valueKey] ?? 0), 1);

  return (
    <div className="grid grid-cols-12 gap-1">
      {rows.map((row) => {
        const value = row[valueKey] ?? 0;
        return (
          <div key={`${valueKey}-${row.day}`} className="flex h-28 items-end">
            <div
              className="w-full rounded-t-sm"
              style={{
                height: `${Math.max(6, (value / max) * 100)}%`,
                backgroundColor: color,
              }}
              title={`${row.day}: ${value}`}
            />
          </div>
        );
      })}
    </div>
  );
}

export default function AnalyticsAdminDashboard() {
  const [preset, setPreset] = useState<(typeof PRESETS)[number]["value"]>("30d");
  const [payload, setPayload] = useState<AnalyticsSummaryPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSummary = async (nextPreset: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/analytics?preset=${encodeURIComponent(nextPreset)}`, {
        cache: "no-store",
      });

      const json = (await response.json().catch(() => ({}))) as AnalyticsSummaryPayload & { error?: string };

      if (!response.ok) {
        throw new Error(json.error ?? "Unable to load analytics");
      }

      setPayload(json);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load analytics");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadSummary(preset);
  }, [preset]);

  const cards = useMemo(() => {
    if (!payload) return [];

    const totals = payload.summary.totals;

    return [
      { label: "Total Events", value: formatNumber(totals.totalVisitors) },
      { label: "Unique Visitors", value: formatNumber(totals.uniqueVisitors) },
      { label: "Page Views", value: formatNumber(totals.pageViews) },
      { label: "Active Users", value: formatNumber(totals.activeUsers) },
      { label: "Today", value: formatNumber(totals.todayVisitors) },
      { label: "This Week", value: formatNumber(totals.weekVisitors) },
      { label: "This Month", value: formatNumber(totals.monthVisitors) },
      { label: "Avg Session", value: formatDuration(totals.avgSessionDurationSec) },
      { label: "Bounce Rate", value: `${totals.bounceRate}%` },
      { label: "Conversion Rate", value: `${totals.conversionRate}%` },
    ];
  }, [payload]);

  return (
    <section className="mx-auto max-w-[1280px] px-4 pb-16 pt-6 md:px-8">
      <div className="rounded-[28px] border border-[#eadfd7] bg-[#fdf9f6] p-6 shadow-[0_12px_36px_rgba(54,32,17,0.08)] md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8d7767]">Private Dashboard</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-[-0.02em] text-[#1f1b18] md:text-4xl">Website Analytics</h1>
            <p className="mt-2 text-sm text-[#695b51]">
              Visitor behavior, funnel progress, campaign attribution, and conversion metrics in one place.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {PRESETS.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setPreset(item.value)}
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                  preset === item.value ? "border-[#5b3f2d] bg-[#5b3f2d] text-white" : "border-[#d8c8bb] bg-white text-[#3f342d] hover:border-[#5b3f2d]"
                }`}
              >
                {item.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => void loadSummary(preset)}
              className="inline-flex items-center gap-2 rounded-full border border-[#d8c8bb] bg-white px-4 py-2 text-sm font-semibold text-[#3f342d] transition hover:border-[#5b3f2d]"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>
        </div>

        {payload ? (
          <p className="mt-4 text-xs text-[#7a6d64]">
            Range: {new Date(payload.range.from).toLocaleString("en-IN")} to {new Date(payload.range.to).toLocaleString("en-IN")}
          </p>
        ) : null}

        {isLoading ? (
          <div className="mt-10 flex items-center justify-center gap-3 rounded-2xl border border-[#efe4db] bg-white p-10 text-[#53463c]">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading analytics...
          </div>
        ) : null}

        {error ? (
          <div className="mt-8 flex items-center gap-3 rounded-2xl border border-rose-300 bg-rose-50 p-4 text-rose-700">
            <AlertCircle className="h-5 w-5" />
            {error}
          </div>
        ) : null}

        {!isLoading && !error && payload ? (
          <div className="mt-8 space-y-8">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              {cards.map((card) => (
                <div key={card.label} className="rounded-2xl border border-[#eadfd7] bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8d7767]">{card.label}</p>
                  <p className="mt-2 text-2xl font-semibold text-[#1f1b18]">{card.value}</p>
                </div>
              ))}
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <div className="rounded-2xl border border-[#eadfd7] bg-white p-5">
                <SectionTitle title="Traffic Sources" subtitle="Where visitors are coming from" />
                <div className="mt-4">
                  <HorizontalBarList rows={payload.summary.trafficSources} />
                </div>
              </div>

              <div className="rounded-2xl border border-[#eadfd7] bg-white p-5">
                <SectionTitle title="Sales By Source" subtitle="Orders and revenue by acquisition channel" />
                <div className="mt-4 space-y-3">
                  {payload.summary.salesBySource.length === 0 ? <p className="text-sm text-[#7a6d64]">No paid orders yet.</p> : null}
                  {payload.summary.salesBySource.map((row) => (
                    <div key={row.key} className="rounded-xl border border-[#efe5dd] p-3">
                      <p className="text-sm font-semibold text-[#2f2722]">{row.key}</p>
                      <p className="mt-1 text-sm text-[#695b51]">Orders: {formatNumber(row.orders)}</p>
                      <p className="text-sm font-semibold text-[#2f2722]">Revenue: {formatCurrency(row.revenue)}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-3">
              <div className="rounded-2xl border border-[#eadfd7] bg-white p-5">
                <SectionTitle title="Top Pages" />
                <div className="mt-4">
                  <HorizontalBarList rows={payload.summary.topPages} />
                </div>
              </div>

              <div className="rounded-2xl border border-[#eadfd7] bg-white p-5">
                <SectionTitle title="Top Products" />
                <div className="mt-4">
                  <HorizontalBarList rows={payload.summary.topProducts} />
                </div>
              </div>

              <div className="rounded-2xl border border-[#eadfd7] bg-white p-5">
                <SectionTitle title="Most Searched" />
                <div className="mt-4">
                  <HorizontalBarList rows={payload.summary.searchedKeywords} />
                </div>
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-3">
              <div className="rounded-2xl border border-[#eadfd7] bg-white p-5">
                <SectionTitle title="Device Breakdown" />
                <div className="mt-4">
                  <HorizontalBarList rows={payload.summary.deviceBreakdown} />
                </div>
              </div>

              <div className="rounded-2xl border border-[#eadfd7] bg-white p-5">
                <SectionTitle title="Browser Breakdown" />
                <div className="mt-4">
                  <HorizontalBarList rows={payload.summary.browserBreakdown} />
                </div>
              </div>

              <div className="rounded-2xl border border-[#eadfd7] bg-white p-5">
                <SectionTitle title="OS Breakdown" />
                <div className="mt-4">
                  <HorizontalBarList rows={payload.summary.osBreakdown} />
                </div>
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <div className="rounded-2xl border border-[#eadfd7] bg-white p-5">
                <SectionTitle title="Visitor Timeline" subtitle="Distinct visitors per day" />
                <div className="mt-5">
                  <MiniTimeline rows={payload.summary.visitorTimeline} valueKey="visitors" color="#8a5a3b" />
                </div>
              </div>

              <div className="rounded-2xl border border-[#eadfd7] bg-white p-5">
                <SectionTitle title="Page Views Timeline" subtitle="Daily page-view trend" />
                <div className="mt-5">
                  <MiniTimeline rows={payload.summary.pageViewTimeline} valueKey="pageViews" color="#c07a49" />
                </div>
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <div className="rounded-2xl border border-[#eadfd7] bg-white p-5">
                <SectionTitle title="Conversion Funnel" subtitle="Home to paid order progression" />
                <div className="mt-4 grid gap-2 text-sm text-[#3e342d]">
                  <div className="flex items-center justify-between rounded-lg bg-[#f8f3ef] px-3 py-2"><span>Home</span><strong>{formatNumber(payload.summary.funnel.home)}</strong></div>
                  <div className="flex items-center justify-between rounded-lg bg-[#f8f3ef] px-3 py-2"><span>Product</span><strong>{formatNumber(payload.summary.funnel.product)}</strong></div>
                  <div className="flex items-center justify-between rounded-lg bg-[#f8f3ef] px-3 py-2"><span>Cart</span><strong>{formatNumber(payload.summary.funnel.cart)}</strong></div>
                  <div className="flex items-center justify-between rounded-lg bg-[#f8f3ef] px-3 py-2"><span>Checkout</span><strong>{formatNumber(payload.summary.funnel.checkout)}</strong></div>
                  <div className="flex items-center justify-between rounded-lg bg-[#f1e2d6] px-3 py-2"><span>Payment</span><strong>{formatNumber(payload.summary.funnel.payment)}</strong></div>
                </div>
              </div>

              <div className="rounded-2xl border border-[#eadfd7] bg-white p-5">
                <SectionTitle title="Location Snapshot" subtitle="Country, state, and city (approximate)" />
                <div className="mt-4 space-y-2 text-sm">
                  {payload.summary.locations.length === 0 ? <p className="text-[#7a6d64]">No location data yet.</p> : null}
                  {payload.summary.locations.slice(0, 10).map((row) => (
                    <div key={`${row.country}-${row.region}-${row.city}`} className="flex items-center justify-between rounded-lg bg-[#f8f3ef] px-3 py-2">
                      <span className="truncate text-[#3a312b]">{row.city}, {row.region}, {row.country}</span>
                      <strong className="ml-3 shrink-0 text-[#1f1b18]">{formatNumber(row.count)}</strong>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-[#eadfd7] bg-white p-5">
              <SectionTitle title="Visitor Cohorts" subtitle="New vs returning visitors" />
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl bg-[#f8f3ef] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8d7767]">New Visitors</p>
                  <p className="mt-2 text-3xl font-semibold text-[#1f1b18]">{formatNumber(payload.summary.newVsReturning.newVisitors)}</p>
                </div>
                <div className="rounded-xl bg-[#f8f3ef] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8d7767]">Returning Visitors</p>
                  <p className="mt-2 text-3xl font-semibold text-[#1f1b18]">{formatNumber(payload.summary.newVsReturning.returningVisitors)}</p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 rounded-2xl border border-[#eadfd7] bg-white p-5 md:grid-cols-2">
              <div className="flex items-start gap-3">
                <Users className="mt-0.5 h-5 w-5 text-[#5b3f2d]" />
                <div>
                  <p className="font-semibold text-[#2f2722]">Real-time Active Users</p>
                  <p className="text-sm text-[#695b51]">Computed from sessions with activity in the last 5 minutes.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <BarChart3 className="mt-0.5 h-5 w-5 text-[#5b3f2d]" />
                <div>
                  <p className="font-semibold text-[#2f2722]">Privacy-aware Tracking</p>
                  <p className="text-sm text-[#695b51]">No personally identifiable visitor identity is inferred for anonymous users.</p>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
