"use client";

import { useEffect, useMemo, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { ensureSessionStartTracked, trackClientEvent } from "@/lib/analytics-client";

function inferPageType(pathname: string) {
  if (pathname === "/") return "home";
  if (pathname.startsWith("/product/")) return "product";
  if (pathname.startsWith("/shop")) return "collection";
  if (pathname.startsWith("/checkout")) return "checkout";
  if (pathname.startsWith("/account")) return "account";
  if (pathname.startsWith("/admin")) return "admin";
  return "page";
}

export default function AnalyticsTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const sessionStartedAtRef = useRef<number | null>(null);
  const routeKey = useMemo(() => {
    const query = searchParams?.toString();
    return query ? `${pathname}?${query}` : pathname;
  }, [pathname, searchParams]);

  useEffect(() => {
    if (sessionStartedAtRef.current === null) {
      sessionStartedAtRef.current = Date.now();
    }

    ensureSessionStartTracked();

    const heartbeatInterval = window.setInterval(() => {
      void trackClientEvent({
        eventName: "heartbeat",
        pagePath: routeKey,
        pageType: inferPageType(pathname),
      });
    }, 30000);

    const onUnload = () => {
      const startedAt = sessionStartedAtRef.current ?? Date.now();
      const durationSec = Math.round((Date.now() - startedAt) / 1000);

      void trackClientEvent(
        {
          eventName: "session_end",
          pagePath: routeKey,
          pageType: inferPageType(pathname),
          durationSec,
        },
        { useBeacon: true },
      );
    };

    window.addEventListener("beforeunload", onUnload);

    return () => {
      window.clearInterval(heartbeatInterval);
      window.removeEventListener("beforeunload", onUnload);
    };
  }, [pathname, routeKey]);

  useEffect(() => {
    void trackClientEvent({
      eventName: "page_view",
      pagePath: routeKey,
      pageType: inferPageType(pathname),
    });
  }, [pathname, routeKey]);

  return null;
}
