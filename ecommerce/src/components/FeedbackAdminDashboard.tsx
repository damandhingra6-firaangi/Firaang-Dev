"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Copy, Database, Loader2, ShieldCheck } from "lucide-react";

type HealthResponse = {
  ok: boolean;
  storage: string;
  database?: string;
  collection?: string;
  checkedAt?: string;
  index?: {
    name: string;
    exists: boolean;
  };
  error?: string;
};

type FeedbackItem = {
  id: string;
  name?: string;
  email?: string;
  message: string;
  submittedAt: string;
};

type FeedbackListResponse = {
  items: FeedbackItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  error?: string;
};

const emptyHealthState: HealthResponse | null = null;
const emptyFeedbackState: FeedbackListResponse | null = null;

function formatTimestamp(value?: string) {
  if (!value) {
    return "Not checked yet";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default function FeedbackAdminDashboard() {
  const [adminKey, setAdminKey] = useState("");
  const [health, setHealth] = useState<HealthResponse | null>(emptyHealthState);
  const [feedbackList, setFeedbackList] = useState<FeedbackListResponse | null>(emptyFeedbackState);
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);
  const [isLoadingFeedback, setIsLoadingFeedback] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedCommand, setCopiedCommand] = useState<string | null>(null);
  const [feedbackPage, setFeedbackPage] = useState(1);
  const [feedbackPageSize, setFeedbackPageSize] = useState(5);
  const isMountedRef = useRef(false);
  const copiedResetTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      if (copiedResetTimeoutRef.current !== null) {
        window.clearTimeout(copiedResetTimeoutRef.current);
      }
    };
  }, []);

  const canSubmit = adminKey.trim().length > 0;
  const origin = typeof window === "undefined" ? "http://localhost:3000" : window.location.origin;
  const normalizedAdminKey = adminKey.trim() || "<FEEDBACK_ADMIN_KEY>";
  const healthCurlCommand = `curl.exe -H "x-admin-key: ${normalizedAdminKey}" "${origin}/api/feedback/health"`;
  const feedbackQuery = `/api/feedback?page=${feedbackPage}&pageSize=${feedbackPageSize}`;
  const feedbackCurlCommand = `curl.exe -H "x-admin-key: ${normalizedAdminKey}" "${origin}${feedbackQuery}"`;

  const fetchJson = async <T,>(url: string) => {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "x-admin-key": adminKey.trim(),
      },
      cache: "no-store",
    });

    const payload = (await response.json().catch(() => ({}))) as T & { error?: string };

    if (!response.ok) {
      throw new Error(payload.error ?? "Request failed");
    }

    return payload;
  };

  const handleHealthCheck = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    if (!canSubmit) {
      setErrorMessage("Enter the admin key to continue.");
      return;
    }

    setIsCheckingHealth(true);
    setErrorMessage(null);

    try {
      const payload = await fetchJson<HealthResponse>("/api/feedback/health");
      if (!isMountedRef.current) {
        return;
      }
      setHealth(payload);
    } catch (error) {
      if (!isMountedRef.current) {
        return;
      }
      setHealth(null);
      setErrorMessage(error instanceof Error ? error.message : "Health check failed");
    } finally {
      if (isMountedRef.current) {
        setIsCheckingHealth(false);
      }
    }
  };

  const handleLoadFeedback = async () => {
    if (!canSubmit) {
      setErrorMessage("Enter the admin key to continue.");
      return;
    }

    setIsLoadingFeedback(true);
    setErrorMessage(null);

    try {
      const payload = await fetchJson<FeedbackListResponse>(feedbackQuery);
      if (!isMountedRef.current) {
        return;
      }
      setFeedbackList(payload);
    } catch (error) {
      if (!isMountedRef.current) {
        return;
      }
      setFeedbackList(null);
      setErrorMessage(error instanceof Error ? error.message : "Could not load feedback");
    } finally {
      if (isMountedRef.current) {
        setIsLoadingFeedback(false);
      }
    }
  };

  const handleCopyCommand = async (label: string, command: string) => {
    try {
      await navigator.clipboard.writeText(command);
      if (!isMountedRef.current) {
        return;
      }

      if (copiedResetTimeoutRef.current !== null) {
        window.clearTimeout(copiedResetTimeoutRef.current);
      }

      setCopiedCommand(label);
      setErrorMessage(null);
      copiedResetTimeoutRef.current = window.setTimeout(() => {
        setCopiedCommand((current) => (current === label ? null : current));
        copiedResetTimeoutRef.current = null;
      }, 1600);
    } catch {
      if (isMountedRef.current) {
        setErrorMessage("Could not copy command. Clipboard permissions may be blocked.");
      }
    }
  };

  const canGoToPreviousPage = feedbackPage > 1;
  const canGoToNextPage = feedbackList ? feedbackPage < feedbackList.totalPages : true;

  return (
    <section className="section-shell py-10 md:py-14">
      <div className="mb-8 grid gap-6 rounded-[28px] border border-[var(--gold)]/25 bg-[rgba(43,6,11,0.82)] p-6 shadow-2xl backdrop-blur md:grid-cols-[1.2fr_0.8fr] md:p-8">
        <div>
          <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-[var(--gold)]/35 px-3 py-1 text-xs uppercase tracking-[0.24em] text-[var(--gold)]">
            <ShieldCheck className="h-3.5 w-3.5" />
            Internal Dashboard
          </p>
          <h1 className="text-4xl md:text-5xl">Feedback Admin</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#e9c9c3] md:text-base">
            Verify MongoDB connectivity, confirm the submittedAt index is present, and preview the latest feedback entries using the protected admin APIs.
          </p>
        </div>

        <form className="rounded-2xl border border-white/10 bg-white/5 p-4" onSubmit={handleHealthCheck}>
          <label className="block text-sm text-[#f3ddd7]">
            Admin key
            <input
              type="password"
              value={adminKey}
              onChange={(event) => setAdminKey(event.target.value)}
              placeholder="Enter FEEDBACK_ADMIN_KEY"
              className="mt-2 w-full rounded-xl border border-[var(--gold)]/30 bg-[#3b0d14] px-4 py-3 text-sm text-white outline-none transition focus:border-[var(--gold)]"
            />
          </label>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={isCheckingHealth}
              className="inline-flex items-center gap-2 rounded-full bg-[var(--gold)] px-4 py-2 text-sm font-semibold text-[#2b060b] transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isCheckingHealth ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
              Check Health
            </button>
            <button
              type="button"
              disabled={isLoadingFeedback}
              onClick={handleLoadFeedback}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--gold)]/50 px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#4b121a] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isLoadingFeedback ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertCircle className="h-4 w-4" />}
              Load Recent Feedback
            </button>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <label className="text-sm text-[#f3ddd7]">
              Page
              <input
                type="number"
                min={1}
                value={feedbackPage}
                onChange={(event) => setFeedbackPage(Math.max(1, Number.parseInt(event.target.value || "1", 10) || 1))}
                className="mt-2 w-full rounded-xl border border-[var(--gold)]/30 bg-[#3b0d14] px-4 py-3 text-sm text-white outline-none transition focus:border-[var(--gold)]"
              />
            </label>
            <label className="text-sm text-[#f3ddd7]">
              Page size
              <input
                type="number"
                min={1}
                max={100}
                value={feedbackPageSize}
                onChange={(event) => setFeedbackPageSize(Math.min(100, Math.max(1, Number.parseInt(event.target.value || "5", 10) || 5)))}
                className="mt-2 w-full rounded-xl border border-[var(--gold)]/30 bg-[#3b0d14] px-4 py-3 text-sm text-white outline-none transition focus:border-[var(--gold)]"
              />
            </label>
          </div>

          {errorMessage ? (
            <p className="mt-4 rounded-xl border border-rose-400/40 bg-rose-950/50 px-4 py-3 text-sm text-rose-100">
              {errorMessage}
            </p>
          ) : null}

          <div className="mt-4 rounded-2xl border border-white/10 bg-[#2b060b]/70 p-4">
            <p className="text-xs uppercase tracking-[0.22em] text-[var(--gold)]">API Commands</p>
            <div className="mt-3 space-y-3">
              <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-white">Health check</p>
                  <button
                    type="button"
                    onClick={() => handleCopyCommand("health", healthCurlCommand)}
                    className="inline-flex items-center gap-2 rounded-full border border-[var(--gold)]/40 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-white transition hover:bg-[#4b121a]"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    {copiedCommand === "health" ? "Copied" : "Copy"}
                  </button>
                </div>
                <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-all text-xs leading-5 text-[#e8d5cf]">
                  {healthCurlCommand}
                </pre>
              </div>

              <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-white">Paginated feedback</p>
                  <button
                    type="button"
                    onClick={() => handleCopyCommand("feedback", feedbackCurlCommand)}
                    className="inline-flex items-center gap-2 rounded-full border border-[var(--gold)]/40 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-white transition hover:bg-[#4b121a]"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    {copiedCommand === "feedback" ? "Copied" : "Copy"}
                  </button>
                </div>
                <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-all text-xs leading-5 text-[#e8d5cf]">
                  {feedbackCurlCommand}
                </pre>
              </div>
            </div>
          </div>
        </form>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        <article className="rounded-[24px] border border-white/10 bg-white/5 p-5 backdrop-blur">
          <p className="text-xs uppercase tracking-[0.22em] text-[var(--gold)]">Storage</p>
          <div className="mt-4 flex items-center gap-3">
            {health?.ok ? (
              <CheckCircle2 className="h-7 w-7 text-emerald-400" />
            ) : (
              <AlertCircle className="h-7 w-7 text-rose-300" />
            )}
            <div>
              <p className="text-lg font-semibold">{health?.storage ?? "Unknown"}</p>
              <p className="text-sm text-[#d7bbb5]">{health?.ok ? "Connected" : "Awaiting check"}</p>
            </div>
          </div>
        </article>

        <article className="rounded-[24px] border border-white/10 bg-white/5 p-5 backdrop-blur">
          <p className="text-xs uppercase tracking-[0.22em] text-[var(--gold)]">Index</p>
          <div className="mt-4 flex items-center gap-3">
            {health?.index?.exists ? (
              <CheckCircle2 className="h-7 w-7 text-emerald-400" />
            ) : (
              <AlertCircle className="h-7 w-7 text-amber-300" />
            )}
            <div>
              <p className="text-lg font-semibold">{health?.index?.name ?? "feedback_submittedAt_desc"}</p>
              <p className="text-sm text-[#d7bbb5]">{health?.index?.exists ? "Ready for pagination" : "Not confirmed yet"}</p>
            </div>
          </div>
        </article>

        <article className="rounded-[24px] border border-white/10 bg-white/5 p-5 backdrop-blur">
          <p className="text-xs uppercase tracking-[0.22em] text-[var(--gold)]">Last Check</p>
          <div className="mt-4">
            <p className="text-lg font-semibold">{formatTimestamp(health?.checkedAt)}</p>
            <p className="mt-1 text-sm text-[#d7bbb5]">
              {health?.database ? `${health.database} / ${health.collection}` : "Run a health check to populate this card."}
            </p>
          </div>
        </article>
      </div>

      <div className="mt-8 rounded-[28px] border border-[var(--gold)]/20 bg-[rgba(30,4,8,0.78)] p-6 shadow-xl backdrop-blur md:p-8">
        <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-[var(--gold)]">Recent Entries</p>
            <h2 className="mt-2 text-2xl">Latest Feedback</h2>
          </div>
          <p className="text-sm text-[#d7bbb5]">
            {feedbackList
              ? `${feedbackList.total} total submissions, page ${feedbackList.page} of ${feedbackList.totalPages}`
              : "Load recent feedback to inspect saved entries."}
          </p>
        </div>

        <div className="mb-5 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={!canGoToPreviousPage || isLoadingFeedback}
            onClick={() => setFeedbackPage((current) => Math.max(1, current - 1))}
            className="rounded-full border border-[var(--gold)]/40 px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#4b121a] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Previous Page
          </button>
          <button
            type="button"
            disabled={!canGoToNextPage || isLoadingFeedback}
            onClick={() => setFeedbackPage((current) => current + 1)}
            className="rounded-full border border-[var(--gold)]/40 px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#4b121a] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next Page
          </button>
          <button
            type="button"
            disabled={isLoadingFeedback}
            onClick={handleLoadFeedback}
            className="rounded-full bg-[var(--gold)] px-4 py-2 text-sm font-semibold text-[#2b060b] transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-70"
          >
            Refresh Current Page
          </button>
        </div>

        {!feedbackList || feedbackList.items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/15 px-5 py-10 text-center text-sm text-[#d7bbb5]">
            No feedback loaded yet.
          </div>
        ) : (
          <div className="space-y-4">
            {feedbackList.items.map((item) => (
              <article key={item.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="font-semibold text-white">{item.name?.trim() || "Anonymous"}</p>
                    <p className="text-sm text-[#d7bbb5]">{item.email?.trim() || "No email provided"}</p>
                  </div>
                  <p className="text-sm text-[var(--gold)]">{formatTimestamp(item.submittedAt)}</p>
                </div>
                <p className="mt-3 text-sm leading-6 text-[#f2dfdb]">{item.message}</p>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
