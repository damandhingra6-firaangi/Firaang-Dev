"use client";

import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import { useUiStore } from "@/store/useUiStore";

const variantStyles = {
  success: "border-emerald-400/60 bg-emerald-950/70 text-emerald-100",
  info: "border-[var(--gold)]/60 bg-[#2b060b]/95 text-[#f5e1db]",
  warning: "border-amber-400/60 bg-amber-950/70 text-amber-100",
  error: "border-rose-400/60 bg-rose-950/70 text-rose-100",
} as const;

const variantIcon = {
  success: CheckCircle2,
  info: Info,
  warning: AlertTriangle,
  error: AlertCircle,
} as const;

export default function ToastViewport() {
  const toasts = useUiStore((state) => state.toasts);
  const dismissToast = useUiStore((state) => state.dismissToast);

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[120] flex w-full max-w-sm flex-col gap-2">
      {toasts.map((toast) => {
        const Icon = variantIcon[toast.variant];

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center justify-between rounded-xl border px-4 py-3 shadow-lg backdrop-blur ${variantStyles[toast.variant]}`}
          >
            <div className="flex items-center gap-2">
              <Icon className="h-4 w-4" />
              <p className="text-sm">{toast.message}</p>
            </div>
            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              aria-label="Dismiss notification"
              className="ml-3 rounded-full p-1 transition hover:bg-white/10"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
