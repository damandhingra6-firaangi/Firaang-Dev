"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { newsletterSchema } from "@/lib/newsletter";
import { useUiStore } from "@/store/useUiStore";

export default function Newsletter() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const pushToast = useUiStore((state) => state.pushToast);
  const isMountedRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const handleSubscribe = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const parsed = newsletterSchema.safeParse({ email });
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? "Please enter a valid email";
      pushToast(firstError, { variant: "warning" });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/newsletter", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(parsed.data),
      });

      const payload = (await response.json().catch(() => ({}))) as { duplicate?: boolean; error?: string };

      if (!response.ok) {
        pushToast(payload.error ?? "Could not subscribe right now", { variant: "error" });
        return;
      }

      if (payload.duplicate) {
        pushToast("You are already subscribed.", { variant: "info" });
      } else {
        pushToast("Subscribed successfully. Welcome to the club!", { variant: "success" });
      }

      if (isMountedRef.current) {
        setEmail("");
      }
    } catch (error) {
      console.error("Newsletter subscription failed", error);
      pushToast("Could not subscribe right now", { variant: "error" });
    } finally {
      if (isMountedRef.current) {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <>
      {/* Instagram Section */}
      {/* <section className="bg-[var(--secondary)] py-12">
        <div className="section-shell">
          <div className="flex items-center justify-center gap-2 text-[var(--gold)]">
            <h2 className="text-2xl font-bold">@Firaangi_boutique</h2>
          </div>
          <p className="mt-2 text-center text-[11px] uppercase tracking-[0.28em] text-[var(--gold)]">
            Follow Us On Instagram
          </p>

          <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-6">
            {["/cat1.jpg", "/cat2.jpg", "/cat3.jpg", "/cat4.jpg", "/hero.jpg", "/cat1.jpg"].map((img, i) => (
              <img key={i} src={img} alt="Instagram post" className="aspect-square w-full object-cover rounded" />
            ))}
          </div>
        </div>
      </section> */}

      {/* Newsletter Section */}
      <section data-newsletter-section className="bg-[var(--primary)] py-16">
        <div className="section-shell max-w-2xl text-center">
          <p className="text-xs uppercase tracking-[0.28em] text-[var(--gold)]">Stay Connected</p>
          <h2 className="mt-2 text-4xl md:text-5xl">Join The Firaangi Club</h2>
          <p className="mt-4 text-sm text-[#efd6cd]">
            Be the first to know about new collections, exclusive offers, and luxury style tips.
          </p>

          <form className="mt-6 flex flex-col gap-3 sm:flex-row" onSubmit={handleSubscribe}>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Your email address"
              className="flex-1 bg-[#4a0b12] px-4 py-3 text-sm text-white placeholder-[#999] outline-none"
              aria-label="Email address"
              required
            />
            <button
              type="submit"
              data-newsletter-subscribe
              className="gold-button inline-flex items-center justify-center gap-2 px-6 py-3"
              disabled={isSubmitting}
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {isSubmitting ? "Subscribing..." : "Subscribe"}
            </button>
          </form>
        </div>
      </section>
    </>
  );
}
