"use client";

import { useEffect } from "react";
import { useAccountStore } from "@/store/useAccountStore";

export default function AccountSessionBootstrap() {
  const setLoading = useAccountStore((state) => state.setLoading);
  const setSession = useAccountStore((state) => state.setSession);
  const clearSession = useAccountStore((state) => state.clearSession);

  useEffect(() => {
    let cancelled = false;

    const syncSession = async () => {
      setLoading(true);

      try {
        const response = await fetch("/api/account/session", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });

        if (!response.ok) {
          // Treat unavailable session endpoint as signed-out to avoid noisy bootstrap errors.
          if (!cancelled) {
            clearSession();
          }
          return;
        }

        const payload = (await response.json().catch(() => null)) as {
          authenticated?: boolean;
          profile?: Parameters<typeof setSession>[0]["profile"];
          orders?: Parameters<typeof setSession>[0]["orders"];
        } | null;

        if (cancelled) {
          return;
        }

        if (payload?.authenticated && payload.profile && payload.orders) {
          setSession({
            profile: payload.profile,
            orders: payload.orders,
          });
          return;
        }

        clearSession();
      } catch (error) {
        console.error("Failed to bootstrap account session", error);
        if (!cancelled) {
          clearSession();
        }
      }
    };

    void syncSession();

    return () => {
      cancelled = true;
    };
  }, [clearSession, setLoading, setSession]);

  return null;
}