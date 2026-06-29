// Reader unsubscribe flow. Reads ?token=&email= from the link in the
// newsletter footer and calls the SECURITY DEFINER RPC unsubscribe_by_token
// on the shared network backend.
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { useState } from "react";
import { Mail, X } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { supabase } from "@/integrations/supabase/client";
import { buildMeta, canonicalLinks } from "@/lib/seo";
import { siteName } from "@/lib/city";

const searchSchema = z.object({
  token: z.string().trim().min(1).max(128).optional(),
  email: z.string().trim().toLowerCase().email().optional(),
});

export const Route = createFileRoute("/unsubscribe")({
  validateSearch: (s) => searchSchema.parse(s),
  head: () => ({
    meta: [
      ...buildMeta({
        title: `Unsubscribe — ${siteName()}`,
        description: `Manage your ${siteName()} email subscription.`,
        path: "/unsubscribe",
      }),
      { name: "robots", content: "noindex,nofollow" },
    ],
    links: canonicalLinks("/unsubscribe"),
  }),
  component: UnsubscribePage,
});

function UnsubscribePage() {
  const { token, email } = Route.useSearch();
  const [state, setState] = useState<"confirm" | "busy" | "done" | "error">(
    "confirm",
  );
  const [errMsg, setErrMsg] = useState<string | null>(null);

  async function onConfirm() {
    if (!token || !email) return;
    setState("busy");
    setErrMsg(null);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.rpc as any)("unsubscribe_by_token", {
        p_token: token,
        p_email: email,
      });
      if (error) throw error;
      setState("done");
    } catch (err) {
      console.error("[unsubscribe] rpc failed", err);
      setErrMsg("Something went wrong. Please contact hello@dailycanberra.com.au.");
      setState("error");
    }
  }

  if (!token || !email) {
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
          <h1 className="h1-news mt-6">Manage your subscription</h1>
          <p className="dek mt-3 mx-auto max-w-[52ch]">
            Check the footer of any {siteName()} email for your personal
            unsubscribe link, or contact us at{" "}
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

  if (state === "done") {
    return (
      <>
        <SiteHeader />
        <main className="container-read py-16 text-center">
          <span
            aria-hidden="true"
            className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full border border-[var(--hairline,#d6d2c9)] bg-[var(--surface,#e8e4dd)] text-[var(--ink-muted,#6b6b6b)]"
          >
            <X size={26} aria-hidden="true" />
          </span>
          <h1 className="h1-news mt-6">You&apos;ve been unsubscribed</h1>
          <p className="dek mt-3 mx-auto max-w-[52ch]">
            Sorry to see you go, <strong>{email}</strong>. You won&apos;t receive
            any more emails from {siteName()}.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <a href="/subscribe" className="btn-primary">Resubscribe</a>
            <a href="/" className="btn-ghost">Back to homepage</a>
          </div>
        </main>
      </>
    );
  }

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
        <h1 className="h1-news mt-6">
          Unsubscribe {email} from {siteName()}?
        </h1>
        <p className="dek mt-3 mx-auto max-w-[52ch]">
          You can resubscribe at any time. We&apos;ll be sorry to see you go.
        </p>
        {errMsg && (
          <p className="mt-4 text-sm text-[var(--accent,#A32D2D)]" role="alert">
            {errMsg}
          </p>
        )}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={onConfirm}
            disabled={state === "busy"}
            className="btn-primary"
            style={{ background: "#A32D2D", borderColor: "#A32D2D" }}
          >
            {state === "busy" ? "Unsubscribing…" : "Yes, unsubscribe"}
          </button>
          <a href="/" className="meta underline">
            Actually, keep me subscribed
          </a>
        </div>
      </main>
    </>
  );
}
