"use client";

import { FormEvent, useState } from "react";
import { AlertCircle, Loader2, Mail, ShieldCheck } from "lucide-react";

type SubscriberItem = {
  email: string;
  subscribedAt: string;
};

type NewsletterListResponse = {
  items: SubscriberItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  error?: string;
};

function formatTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default function NewsletterAdminDashboard() {
  const [adminKey, setAdminKey] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [list, setList] = useState<NewsletterListResponse | null>(null);

  const createQueryString = (withCsvFormat: boolean) => {
    const params = new URLSearchParams();

    if (withCsvFormat) {
      params.set("format", "csv");
      params.set("limit", "5000");
    } else {
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));
    }

    if (fromDate) {
      params.set("from", fromDate);
    }

    if (toDate) {
      params.set("to", toDate);
    }

    return params.toString();
  };

  const loadSubscribers = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();

    if (!adminKey.trim()) {
      setErrorMessage("Enter the admin key to continue.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const queryString = createQueryString(false);
      const response = await fetch(`/api/newsletter?${queryString}`, {
        method: "GET",
        headers: {
          "x-admin-key": adminKey.trim(),
        },
        cache: "no-store",
      });

      const payload = (await response.json().catch(() => ({}))) as NewsletterListResponse;

      if (!response.ok) {
        setErrorMessage(payload.error ?? "Could not load subscribers");
        setList(null);
        return;
      }

      setList(payload);
    } catch (error) {
      console.error("Failed to load subscribers", error);
      setErrorMessage("Could not load subscribers");
      setList(null);
    } finally {
      setIsLoading(false);
    }
  };

  const canGoPrevious = page > 1;
  const canGoNext = list ? page < list.totalPages : true;

  const exportSubscribersCsv = async () => {
    if (!adminKey.trim()) {
      setErrorMessage("Enter the admin key to continue.");
      return;
    }

    setIsExporting(true);
    setErrorMessage(null);

    try {
      const queryString = createQueryString(true);
      const response = await fetch(`/api/newsletter?${queryString}`, {
        method: "GET",
        headers: {
          "x-admin-key": adminKey.trim(),
        },
        cache: "no-store",
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        setErrorMessage(payload.error ?? "Could not export subscribers");
        return;
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `newsletter-subscribers-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to export subscribers", error);
      setErrorMessage("Could not export subscribers");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <section className="section-shell py-10 md:py-14">
      <div className="rounded-[28px] border border-[var(--gold)]/25 bg-[rgba(43,6,11,0.82)] p-6 shadow-2xl backdrop-blur md:p-8">
        <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-[var(--gold)]/35 px-3 py-1 text-xs uppercase tracking-[0.24em] text-[var(--gold)]">
          <ShieldCheck className="h-3.5 w-3.5" />
          Newsletter Admin
        </p>
        <h1 className="text-4xl md:text-5xl">Subscribers</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[#e9c9c3] md:text-base">
          Browse newsletter subscriptions from MongoDB with authenticated pagination.
        </p>

        <form className="mt-6 grid gap-3 md:grid-cols-[1.2fr_0.4fr_0.4fr_0.5fr_0.5fr_auto]" onSubmit={loadSubscribers}>
          <input
            type="password"
            value={adminKey}
            onChange={(event) => setAdminKey(event.target.value)}
            placeholder="Enter FEEDBACK_ADMIN_KEY"
            className="rounded-xl border border-[var(--gold)]/30 bg-[#3b0d14] px-4 py-3 text-sm text-white outline-none transition focus:border-[var(--gold)]"
          />
          <input
            type="number"
            min={1}
            value={page}
            onChange={(event) => setPage(Math.max(1, Number.parseInt(event.target.value || "1", 10) || 1))}
            className="rounded-xl border border-[var(--gold)]/30 bg-[#3b0d14] px-4 py-3 text-sm text-white outline-none transition focus:border-[var(--gold)]"
            aria-label="Page"
          />
          <input
            type="number"
            min={1}
            max={100}
            value={pageSize}
            onChange={(event) => setPageSize(Math.min(100, Math.max(1, Number.parseInt(event.target.value || "20", 10) || 20)))}
            className="rounded-xl border border-[var(--gold)]/30 bg-[#3b0d14] px-4 py-3 text-sm text-white outline-none transition focus:border-[var(--gold)]"
            aria-label="Page size"
          />
          <input
            type="date"
            value={fromDate}
            onChange={(event) => setFromDate(event.target.value)}
            className="rounded-xl border border-[var(--gold)]/30 bg-[#3b0d14] px-4 py-3 text-sm text-white outline-none transition focus:border-[var(--gold)]"
            aria-label="From date"
          />
          <input
            type="date"
            value={toDate}
            onChange={(event) => setToDate(event.target.value)}
            className="rounded-xl border border-[var(--gold)]/30 bg-[#3b0d14] px-4 py-3 text-sm text-white outline-none transition focus:border-[var(--gold)]"
            aria-label="To date"
          />
          <button
            type="submit"
            disabled={isLoading}
            className="gold-button inline-flex items-center justify-center gap-2 px-6 py-3 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
            Load
          </button>
        </form>

        {errorMessage ? (
          <p className="mt-4 rounded-xl border border-rose-400/40 bg-rose-950/50 px-4 py-3 text-sm text-rose-100">{errorMessage}</p>
        ) : null}

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={!canGoPrevious || isLoading}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            className="rounded-full border border-[var(--gold)]/40 px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#4b121a] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Previous
          </button>
          <button
            type="button"
            disabled={!canGoNext || isLoading}
            onClick={() => setPage((current) => current + 1)}
            className="rounded-full border border-[var(--gold)]/40 px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#4b121a] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
          </button>
          <button
            type="button"
            disabled={isLoading}
            onClick={() => {
              void loadSubscribers();
            }}
            className="rounded-full bg-[var(--gold)] px-4 py-2 text-sm font-semibold text-[#2b060b] transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-70"
          >
            Refresh
          </button>
          <button
            type="button"
            disabled={isExporting}
            onClick={() => {
              void exportSubscribersCsv();
            }}
            className="rounded-full border border-[var(--gold)]/40 px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#4b121a] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isExporting ? "Exporting CSV..." : "Export CSV"}
          </button>
          <p className="self-center text-sm text-[#d7bbb5]">
            {list ? `${list.total} total, page ${list.page} of ${list.totalPages}` : "No data loaded yet."}
          </p>
        </div>

        <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
          {!list || list.items.length === 0 ? (
            <p className="text-sm text-[#d7bbb5]">No subscribers loaded yet.</p>
          ) : (
            <div className="space-y-3">
              {list.items.map((item) => (
                <article key={`${item.email}-${item.subscribedAt}`} className="rounded-xl border border-white/10 bg-black/20 px-4 py-3">
                  <p className="font-semibold text-white">{item.email}</p>
                  <p className="text-sm text-[#d7bbb5]">{formatTimestamp(item.subscribedAt)}</p>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
