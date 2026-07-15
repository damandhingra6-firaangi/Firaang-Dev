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
  const sessionStartedAtRef = useRef<number>(Date.now());
  const routeKey = useMemo(() => {
    const query = searchParams?.toString();
    return query ? `${pathname}?${query}` : pathname;
  }, [pathname, searchParams]);

  useEffect(() => {
    ensureSessionStartTracked();

    const heartbeatInterval = window.setInterval(() => {
      void trackClientEvent({
        eventName: "heartbeat",
        pagePath: routeKey,
        pageType: inferPageType(pathname),
      });
    }, 30000);

    const onUnload = () => {
      const durationSec = Math.round((Date.now() - sessionStartedAtRef.current) / 1000);

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
    const pageType = inferPageType(pathname);

    void trackClientEvent({
      eventName: "page_view",
      pagePath: routeKey,
      pageType,
    });

    if (pathname.startsWith("/product/")) {
      const productHandle = pathname.replace("/product/", "").trim();

      if (productHandle.length > 0) {
        void trackClientEvent({
          eventName: "product_view",
          pagePath: routeKey,
          pageType: "product",
          productHandle,
        });
      }
    }

    if (pathname.startsWith("/checkout")) {
      void trackClientEvent({
        eventName: "checkout_started",
        pagePath: routeKey,
        pageType: "checkout",
      });
    }
  }, [pathname, routeKey]);

  return null;
}
