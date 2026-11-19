"use client";

import { useEffect, useRef } from "react";
import { trackGoogleAdsConversion } from "@/lib/analytics-vendors";
import {
  GOOGLE_ADS_CONVERSION_HANDOFF_KEY,
  parseGoogleAdsConversionHandoff,
} from "@/lib/google-ads-conversion-handoff";

export default function GoogleAdsConversionRedirect() {
  const hasStarted = useRef(false);

  useEffect(() => {
    if (hasStarted.current) {
      return;
    }
    hasStarted.current = true;

    if (window.location.search || window.location.hash) {
      window.history.replaceState(window.history.state, "", "/google-ads-conversion");
    }

    let rawHandoff: string | null;
    try {
      rawHandoff = window.sessionStorage.getItem(GOOGLE_ADS_CONVERSION_HANDOFF_KEY);
      window.sessionStorage.removeItem(GOOGLE_ADS_CONVERSION_HANDOFF_KEY);
    } catch {
      window.location.replace("/");
      return;
    }

    const handoff = parseGoogleAdsConversionHandoff(rawHandoff, window.location.origin);
    if (!handoff) {
      window.location.replace("/");
      return;
    }

    trackGoogleAdsConversion({
      transactionId: handoff.transactionId,
      currencyCode: handoff.currencyCode,
      value: handoff.value,
    });

    window.setTimeout(() => {
      window.location.replace(handoff.redirectTarget);
    }, 1_000);
  }, []);

  return null;
}
