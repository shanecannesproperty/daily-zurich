// Reader email preferences. Reads ?token=&email= from the link in the
// newsletter footer and calls the SECURITY DEFINER RPC get_subscriber_by_token
// to fetch current status from the shared network backend.
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { useEffect, useState } from "react";
import { Mail } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { supabase } from "@/integrations/supabase/client";
import { buildMeta, canonicalLinks } from "@/lib/seo";
import { siteName, citySlug } from "@/lib/city";

const searchSchema = z.object({
  token: z.string().trim().min(1).max(128).optional(),
  email: z.string().trim().toLowerCase().email().optional(),
});

type SubscriberInfo = {
  email: string;
  city: string;
  status: string;
  created_at: string | null;
};

export const Route = createFileRoute("/email-preferences")({
  validateSearch: (s) => searchSchema.parse(s),
  head: () => ({
    meta: [
      ...buildMeta({
        title: `Email preferences — ${siteName()}`,
        description: `Manage your ${siteName()} email subscription.`,
        path: "/email-preferences",
      }),
      { name: "robots", content: "noindex,nofollow" },
    ],
    links: canonicalLinks("/email-preferences"),
  }),
  component: EmailPreferencesPage,
});

function EmailPreferencesPage() {
  const { token, email } = Route.useSearch();
  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState<SubscriberInfo | null>(null);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [resubBusy, setResubBusy] = useState(false);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase.rpc as any)(
          "get_subscriber_by_token",
          { p_token: token },
        );
        if (cancelled) return;
        if (error) throw error;
        const row = Array.isArray(data) ? data[0] : data;
        setInfo(row ?? null);
        if (!row) setErrMsg("We couldn't find a subscription for that link.");
      } catch (err) {
        console.error("[email-preferences] rpc failed", err);
        if (!cancelled) setErrMsg("Couldn't load your preferences. Try again later.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function onResubscribe() {
    if (!info?.email) return;
    setResubBusy(true);
    setErrMsg(null);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).from("subscribers").insert({
        city: info.city ?? citySlug(),
        email: info.email,
        source: "resubscribe",
        status: "active",
        confirm_token: crypto.randomUUID().replace(/-/g, ""),
        unsubscribe_token: crypto.randomUUID().replace(/-/g, ""),
      });
      if (error && error.code !== "23505") throw error;
      setInfo({ ...info, status: "active" });
    } catch (err) {
      console.error("[email-preferences] resubscribe failed", err);
      setErrMsg("Couldn't resubscribe right now. Please try again later.");
    } finally {
      setResubBusy(false);
    }
  }

  if (!token) {
    return (
      <>
        <SiteHeader />
        <main className="container-read py-16 text-center">
          <span
            aria-hidden="true"
            className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full border border-[var(--hairline,#d6d2c9)] bg-[var(--surface,#e8e4dd)] text-[var(--accent,#A32D2D)]"
          >
            <Mail size={26} aria-hidden="true" />
          </span>
          <h1 className="h1-news mt-6">Email preferences</h1>
          <p className="dek mt-3 mx-auto max-w-[52ch]">
            Check your email for the preferences link, or contact us at{" "}
            <a href="mailto:hello@dailycanberra.com.au">
              hello@dailycanberra.com.au
            </a>
            .
          </p>
          <div className="mt-8">
            <a href="/" className="btn-ghost">Back to homepage</a>
          </div>
        </main>
      </>
    );
  }

  const status = info?.status ?? "unknown";
  const isActive = status === "active";
  const isUnsubscribed = status === "unsubscribed";

  return (
    <>
      <SiteHeader />
      <main className="container-read py-16">
        <p className="kicker text-center">Your subscription</p>
        <h1 className="h1-news mt-2 text-center">Email preferences</h1>

        {loading ? (
          <p className="meta mt-10 text-center">Loading your preferences…</p>
        ) : !info ? (
          <p className="meta mt-10 text-center">
            {errMsg ?? "We couldn't find a subscription for that link."}
          </p>
        ) : (
          <div className="mt-10 mx-auto max-w-xl border border-[var(--hairline,#d6d2c9)] p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="meta">Email</p>
                <p className="serif text-lg font-semibold">{info.email}</p>
              </div>
              <span
                className={
                  "inline-flex items-center text-[11px] uppercase tracking-[0.14em] px-2 py-1 border " +
                  (isActive
                    ? "border-[#1f7a3b] text-[#1f7a3b] bg-[#e7f4ec]"
                    : "border-[var(--hairline,#d6d2c9)] text-[var(--ink-muted,#6b6b6b)]")
                }
              >
                {isActive ? "Active" : isUnsubscribed ? "Unsubscribed" : status}
              </span>
            </div>

            {errMsg && (
              <p className="mt-4 text-sm text-[var(--accent,#A32D2D)]" role="alert">
                {errMsg}
              </p>
            )}

            <div className="mt-6 border-t border-[var(--hairline,#d6d2c9)] pt-5">
              {isActive ? (
                <>
                  <p className="meta">
                    You&apos;re receiving the daily morning briefing at this
                    address.
                  </p>
                  <p className="mt-4">
                    <a
                      href={`/unsubscribe?token=${encodeURIComponent(token)}&email=${encodeURIComponent(info.email)}`}
                      className="underline text-[var(--accent,#A32D2D)]"
                    >
                      Unsubscribe from {siteName()}
                    </a>
                  </p>
                </>
              ) : (
                <>
                  <p className="meta">
                    You&apos;re currently unsubscribed. Want to come back?
                  </p>
                  <button
                    type="button"
                    onClick={onResubscribe}
                    disabled={resubBusy}
                    className="btn-primary mt-4"
                  >
                    {resubBusy ? "Resubscribing…" : "Resubscribe"}
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        <div className="mt-10 text-center">
          <a href="/" className="btn-ghost">Back to homepage</a>
        </div>
      </main>
    </>
  );
}
