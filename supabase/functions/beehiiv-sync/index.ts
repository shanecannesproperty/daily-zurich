// Beehiiv subscriber sync. Invoked fire-and-forget from subscribeNewsletter.
// Gracefully no-ops when BEEHIIV_API_KEY / BEEHIIV_PUBLICATION_ID are missing
// so growth-phase signups never break while ESP keys are being set up.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SyncPayload {
  action?: string;
  email?: string;
  city?: string;
  send_welcome_email?: boolean;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  let payload: SyncPayload;
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ ok: false, error: "Invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const email = (payload.email ?? "").trim().toLowerCase();
  const city = (payload.city ?? "").trim();
  if (!email) {
    return new Response(JSON.stringify({ ok: false, error: "Missing email" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const apiKey = Deno.env.get("BEEHIIV_API_KEY");
  const publicationId = Deno.env.get("BEEHIIV_PUBLICATION_ID");

  if (!apiKey || !publicationId) {
    console.log("beehiiv-sync: not configured, skipping", { email, city });
    console.log(
      "Welcome email not sent — add BEEHIIV_API_KEY and BEEHIIV_PUBLICATION_ID to send welcome emails",
    );
    return new Response(JSON.stringify({ ok: true, skipped: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const res = await fetch(
      `https://api.beehiiv.com/v2/publications/${publicationId}/subscriptions`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          reactivate_existing: false,
          send_welcome_email: payload.send_welcome_email ?? true,
          custom_fields: city ? [{ name: "city", value: city }] : [],
        }),
      },
    );
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("beehiiv-sync: API error", { status: res.status, body: text.slice(0, 500) });
    } else {
      console.log("beehiiv-sync: subscribed", { email, city });
    }
  } catch (err) {
    console.error("beehiiv-sync: request failed", err);
  }

  // Never break the user's signup, even if Beehiiv is down.
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
