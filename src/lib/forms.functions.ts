// Form submissions: newsletter signup + enquiries.
// Anon INSERT only. NEVER SELECT from these tables on the client.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { citySlug } from "@/lib/city";

const EMAIL = z.string().trim().toLowerCase().min(3).max(320).email();

// Honeypot field name must match the rendered <input name="company"> in forms.
const honeypot = z.string().max(0).optional().or(z.literal(""));

export const getSubscriberCount = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { count, error } = await (supabaseAdmin as any)
      .from("subscribers")
      .select("*", { count: "exact", head: true })
      .eq("city", citySlug())
      .eq("status", "active");

    if (error) {
      console.error("[subscriber-count] failed", error.message);
      return { count: 0 };
    }
    return { count: count ?? 0 };
  } catch (err) {
    console.error("[subscriber-count] exception", err);
    return { count: 0 };
  }
});


export const subscribeNewsletter = createServerFn({ method: "POST" })
  .inputValidator(
    (d: {
      email: string;
      source: string;
      company?: string;
      startedAt?: number;
      wantsWeatherAlerts?: boolean;
    }) =>
      z
        .object({
          email: EMAIL,
          source: z.string().trim().min(1).max(120),
          company: honeypot,
          startedAt: z.number().optional(),
          wantsWeatherAlerts: z.boolean().optional(),
        })
        .parse(d),
  )
  .handler(async ({ data }) => {
    if (data.company) return { ok: true };
    if (data.startedAt && Date.now() - data.startedAt < 2000) return { ok: true };
    // Read referral code from cookie set by /r/:code visits.
    let refCode: string | null = null;
    try {
      const { getRequestHeader } = await import("@tanstack/react-start/server");
      const cookieHeader = getRequestHeader("cookie") ?? "";
      const match = cookieHeader.match(/(?:^|;\s*)daily_ref=([^;]+)/);
      if (match) {
        const decoded = decodeURIComponent(match[1]).trim();
        if (decoded) refCode = decoded.slice(0, 64);
      }
    } catch {
      /* ignore */
    }
    const { dbInsertClient } = await import("@/lib/db.server");
    const supabase = dbInsertClient();
    // Single opt-in (growth phase): insert as 'active' immediately. The
    // welcome email is sent by Beehiiv via the beehiiv-sync edge function.
    // Tokens are still generated so unsubscribe links keep working; the
    // confirm_token is reserved for a future double opt-in switch.
    const confirmToken = crypto.randomUUID().replace(/-/g, "");
    const unsubscribeToken = crypto.randomUUID().replace(/-/g, "");
    const insertRow: Record<string, unknown> = {
      city: citySlug(),
      email: data.email,
      source: data.source,
      status: "active",
      confirm_token: confirmToken,
      unsubscribe_token: unsubscribeToken,
    };
    if (refCode) insertRow.referred_by_code = refCode;
    // Weather-page opt-in: tag the subscriber for severe-weather alerts. The
    // column is added by a manual migration (20260628_weather_alerts_optin.sql);
    // if it isn't present yet we retry the insert without it (see below) so a
    // signup never breaks before the migration runs.
    if (data.wantsWeatherAlerts) insertRow.wants_weather_alerts = true;
    // Plain INSERT (not upsert): anon has INSERT but no SELECT on subscribers,
    // and PostgREST upsert needs SELECT to resolve onConflict — it 401s under
    // RLS. Duplicates are tolerated via the unique-violation code so a repeat
    // signup is a silent no-op.
    let { error } = await supabase.from("subscribers").insert(insertRow);

    // Graceful fallback if the optional weather-alerts column is missing in this
    // environment (undefined_column / schema-cache miss / column not granted).
    if (error && error.code !== "23505" && "wants_weather_alerts" in insertRow) {
      delete insertRow.wants_weather_alerts;
      ({ error } = await supabase.from("subscribers").insert(insertRow));
    }

    if (error && error.code !== "23505") {
      console.error("[subscribe] insert failed", {
        code: error.code,
        message: error.message,
        source: data.source,
      });
      // Surface real DB failures so the client can show an error message.
      // Duplicate emails (23505) still return ok:true — silent no-op.
      return { ok: false as const, error: "Database error" };
    }
    // Fire-and-forget to Beehiiv. Never block the UX on third-party sync.
    supabase.functions
      .invoke("beehiiv-sync", {
        body: {
          action: "subscribe",
          email: data.email,
          city: citySlug(),
          send_welcome_email: true,
        },
      })
      .catch((e: unknown) => console.error("[subscribe] beehiiv-sync error", e));

    // Fire-and-forget welcome email via the send-welcome-email edge function.
    // Independent of beehiiv-sync (which exits early without BEEHIIV_API_KEY).
    // The function itself no-ops gracefully if RESEND_API_KEY is missing.
    try {
      const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
      const supabaseAnonKey =
        process.env.SUPABASE_PUBLISHABLE_KEY ??
        process.env.SUPABASE_ANON_KEY ??
        process.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
        process.env.VITE_SUPABASE_ANON_KEY;
      if (supabaseUrl && supabaseAnonKey) {
        void fetch(`${supabaseUrl}/functions/v1/send-welcome-email`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${supabaseAnonKey}`,
          },
          body: JSON.stringify({ email: data.email, city: citySlug() }),
        }).catch((e: unknown) =>
          console.error("[subscribe] send-welcome-email error", e),
        );
      }
    } catch (e) {
      console.error("[subscribe] send-welcome-email dispatch failed", e);
    }


    // Fetch the newly created subscriber's referral code so the form can show
    // a share link straight after signup. Non-blocking on failure.
    let referralCode: string | null = null;
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: subRow } = await (supabaseAdmin as any)
        .from("subscribers")
        .select("referral_code")
        .eq("city", citySlug())
        .eq("email", data.email)
        .maybeSingle();
      referralCode = subRow?.referral_code ?? null;
    } catch {
      /* non-blocking */
    }

    return { ok: true as const, referralCode };

  });


const ENQUIRY_TYPES = ["listing", "property", "sponsor", "tip", "general"] as const;

function routedFor(type: (typeof ENQUIRY_TYPES)[number]) {
  if (type === "property") return "real-estate";
  if (type === "sponsor" || type === "listing") return "sales";
  return "editorial";
}

export const submitEnquiry = createServerFn({ method: "POST" })
  .inputValidator(
    (d: { type: string; payload: Record<string, unknown>; company?: string; startedAt?: number }) =>
      z
        .object({
          type: z.enum(ENQUIRY_TYPES),
          payload: z.record(z.string(), z.unknown()),
          company: honeypot,
          startedAt: z.number().optional(),
        })
        .parse(d),
  )
  .handler(async ({ data }) => {
    if (data.company) return { ok: true };
    if (data.startedAt && Date.now() - data.startedAt < 2000) return { ok: true };
    const email = typeof data.payload.email === "string" ? data.payload.email : "";
    if (email && !EMAIL.safeParse(email).success) {
      return { ok: false, error: "Invalid email" };
    }
    const { dbInsertClient } = await import("@/lib/db.server");
    const supabase = dbInsertClient();
    const { error } = await supabase.from("enquiries").insert({
      city: citySlug(),
      type: data.type,
      payload: data.payload,
      routed_to: routedFor(data.type),
      status: "new",
    });
    if (error) return { ok: false, error: "Could not submit" };
    return { ok: true };
  });

// Referral leaderboard: top referrers by referral_count. Returns referral_code
// + count (no PII). Falls back gracefully if the column doesn't exist.
export type LeaderboardEntry = {
  referral_code: string;
  referral_count: number;
};

export const getReferralLeaderboard = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const direct = await (supabaseAdmin as any)
      .from("subscribers")
      .select("referral_code, referral_count")
      .eq("city", citySlug())
      .eq("status", "active")
      .gt("referral_count", 0)
      .order("referral_count", { ascending: false })
      .limit(10);
    if (!direct.error && Array.isArray(direct.data)) {
      const rows = (direct.data as Array<{ referral_code: string | null; referral_count: number | null }>)
        .filter((r) => r.referral_code && (r.referral_count ?? 0) > 0)
        .map((r) => ({ referral_code: r.referral_code as string, referral_count: Number(r.referral_count) }));
      return { entries: rows as LeaderboardEntry[] };
    }
    // Fallback: aggregate from referred_by_code if referral_count column is absent.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const refs = await (supabaseAdmin as any)
      .from("subscribers")
      .select("referred_by_code")
      .eq("city", citySlug())
      .eq("status", "active")
      .not("referred_by_code", "is", null)
      .limit(5000);
    if (refs.error || !Array.isArray(refs.data)) return { entries: [] as LeaderboardEntry[] };
    const tally = new Map<string, number>();
    for (const row of refs.data as Array<{ referred_by_code: string | null }>) {
      const code = row.referred_by_code;
      if (!code) continue;
      tally.set(code, (tally.get(code) ?? 0) + 1);
    }
    const entries = [...tally.entries()]
      .map(([referral_code, referral_count]) => ({ referral_code, referral_count }))
      .sort((a, b) => b.referral_count - a.referral_count)
      .slice(0, 10);
    return { entries };
  } catch (err) {
    console.error("[leaderboard] exception", err);
    return { entries: [] as LeaderboardEntry[] };
  }
});
