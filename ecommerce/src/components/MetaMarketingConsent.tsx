"use client";

import Script from "next/script";
import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import {
  META_MARKETING_CONSENT_COOKIE,
  META_MARKETING_CONSENT_EVENT,
  META_PIXEL_READY_EVENT,
  hasMetaMarketingConsent,
  readMetaMarketingConsent,
  type MetaMarketingConsent as ConsentValue,
} from "@/lib/meta-consent";

const DEFAULT_META_PIXEL_ID = "1144832497900793";

function subscribeToConsentChange(onChange: () => void) {
  window.addEventListener(META_MARKETING_CONSENT_EVENT, onChange);
  return () => window.removeEventListener(META_MARKETING_CONSENT_EVENT, onChange);
}

function getConsentSnapshot() {
  return readMetaMarketingConsent(document.cookie);
}

function getServerConsentSnapshot() {
  return null;
}

export default function MetaMarketingConsent() {
  const consent = useSyncExternalStore(
    subscribeToConsentChange,
    getConsentSnapshot,
    getServerConsentSnapshot,
  );
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [pixelReady, setPixelReady] = useState(false);
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID?.replace(/\D/g, "") || DEFAULT_META_PIXEL_ID;
  const trackingAllowed = consent === "granted" && hasMetaMarketingConsent();

  useEffect(() => {
    if (!trackingAllowed) {
      window.fbq?.("consent", "revoke");
      return;
    }

    if (pixelReady) {
      window.fbq?.("consent", "grant");
      window.fbq?.("track", "PageView");
      window.dispatchEvent(new Event(META_PIXEL_READY_EVENT));
    }
  }, [trackingAllowed, pixelReady]);

  function chooseConsent(value: ConsentValue) {
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${META_MARKETING_CONSENT_COOKIE}=${value}; Path=/; Max-Age=15552000; SameSite=Lax${secure}`;
    setSettingsOpen(false);
    window.dispatchEvent(new Event(META_MARKETING_CONSENT_EVENT));
  }

  return (
    <>
      {trackingAllowed ? (
        <Script
          id="meta-pixel-consented"
          strategy="afterInteractive"
          onReady={() => setPixelReady(true)}
        >
          {`
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window,document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${pixelId}');
          `}
        </Script>
      ) : null}

      {consent === null || settingsOpen ? (
        <aside
          aria-label="Marketing cookie preferences"
          className="fixed inset-x-4 bottom-4 z-[100] mx-auto max-w-3xl rounded-2xl border border-[#e8d7ce] bg-white p-5 shadow-[0_16px_50px_rgba(27,31,42,0.2)]"
        >
          <p className="text-sm font-semibold text-[#1f2430]">Your privacy choices</p>
          <p className="mt-2 text-sm leading-6 text-[#596172]">
            With your permission, Firaang uses Meta Pixel and server-side conversion measurement for advertising.
            You can change this choice at any time. See our{" "}
            <Link href="/privacy-policy" className="font-medium text-[#d8345f] underline">
              Privacy Policy
            </Link>
            .
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => chooseConsent("granted")}
              className="rounded-full bg-[#ff3f6c] px-4 py-2 text-sm font-semibold text-white hover:bg-[#e63762]"
            >
              Accept marketing
            </button>
            <button
              type="button"
              onClick={() => chooseConsent("denied")}
              className="rounded-full border border-[#d9c9c4] px-4 py-2 text-sm font-semibold text-[#1f2430] hover:bg-[#fff7f5]"
            >
              Reject optional tracking
            </button>
          </div>
        </aside>
      ) : (
        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          className="fixed bottom-4 right-4 z-[90] rounded-full border border-[#e8d7ce] bg-white px-4 py-2 text-xs font-semibold text-[#596172] shadow-md hover:text-[#1f2430]"
        >
          Privacy settings
        </button>
      )}
    </>
  );
}
