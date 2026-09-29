"use client";

export default function StatusBadge({ status }: { status?: string }) {
  const normalized = (status ?? "unknown").toLowerCase();
  const className =
    normalized === "active" || normalized === "verified" || normalized === "used"
      ? "bg-emerald-100 text-emerald-700"
      : normalized === "pending" || normalized === "under_review"
        ? "bg-amber-100 text-amber-700"
        : normalized === "rejected" || normalized === "cancelled" || normalized === "expired"
          ? "bg-rose-100 text-rose-700"
          : "bg-[#efe6de] text-[#6d5d53]";

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${className}`}>
      {status ?? "Unknown"}
    </span>
  );
}