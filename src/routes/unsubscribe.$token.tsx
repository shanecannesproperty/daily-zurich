import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "@/integrations/supabase/config";
import { SiteHeader } from "@/components/SiteHeader";
import { buildMeta } from "@/lib/seo";
import { siteName } from "@/lib/city";

export const Route = createFileRoute("/unsubscribe/$token")({
  ssr: false,
  head: () => ({
    meta: buildMeta({
      title: `Unsubscribe | ${siteName()}`,
      description: `Manage your subscription to ${siteName()}.`,
      path: "/unsubscribe",
    }),
  }),
  component: Unsubscribe,
});

function Unsubscribe() {
  const { token } = Route.useParams();
  const [state, setState] = useState<"ready" | "done" | "invalid" | "already" | "busy">("ready");
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const supa = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    });
    (async () => {
      const { data: row, error } = await supa
        .from("subscribers")
        .select("email,status,unsubscribed_at")
        .eq("unsubscribe_token", token)
        .maybeSingle();
      if (error || !row) {
        setState("invalid");
        return;
      }
      setEmail(row.email as string);
      if (row.unsubscribed_at || row.status === "unsubscribed") {
        setState("already");
      }
    })();
  }, [token]);

  async function confirm() {
    setState("busy");
    const supa = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    });
    const { error } = await supa
      .from("subscribers")
      .update({ status: "unsubscribed", unsubscribed_at: new Date().toISOString() })
      .eq("unsubscribe_token", token);
    setState(error ? "invalid" : "done");
  }

  return (
    <>
      <SiteHeader />
      <main className="container-news py-16 max-w-xl text-center">
        <p className="kicker">Newsletter</p>
        <h1 className="h1-news mt-2">
          {state === "ready" && "Unsubscribe?"}
          {state === "busy" && "Working"}
          {state === "done" && "Unsubscribed"}
          {state === "already" && "Already unsubscribed"}
          {state === "invalid" && "Link not valid"}
        </h1>
        <p className="dek mt-4">
          {state === "ready" &&
            `${email ?? "This address"} will stop receiving ${siteName()} brief.`}
          {state === "done" && `Done. ${email ?? "You"} won't hear from us again.`}
          {state === "already" && `${email ?? "This address"} is no longer subscribed.`}
          {state === "invalid" && "This unsubscribe link is invalid or has expired."}
        </p>
        {state === "ready" ? (
          <div className="mt-8 flex justify-center gap-3">
            <button onClick={confirm} className="btn-primary">
              Yes, unsubscribe
            </button>
            <a href="/" className="btn-ghost">
              Keep my subscription
            </a>
          </div>
        ) : (
          <div className="mt-8">
            <a href="/" className="btn-primary">
              Back to the front page
            </a>
          </div>
        )}
      </main>
    </>
  );
}
