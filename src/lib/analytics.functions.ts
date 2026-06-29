// First-party event tracking. Anon INSERT only, no PII, never SELECT.
// One row per tracked interaction, city-scoped via the city-guard.
// Privacy: the only identifier stored is an anonymous, client-generated
// session id; we never store an IP, email, or account id here.
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { citySlug } from "@/lib/city";
import { SITE_EVENT_NAMES } from "@/lib/schema";
import { classifyUa, FALLBACK_PATTERNS, type BotPatterns } from "@/lib/bot-classify";

const EVENT_NAME = z.enum(SITE_EVENT_NAMES as [string, ...string[]]);

// Keep stored strings short and free of anything that could carry PII. Paths
// and refs are truncated; the anon session id is a bounded opaque token.
const trackInput = z.object({
  eventName: EVENT_NAME,
  path: z.string().trim().max(512).optional(),
  anonSessionId: z.string().trim().max(64).optional(),
  ref: z.string().trim().max(256).optional(),
  referrer: z.string().trim().max(512).optional(),
  utm: z.string().trim().max(256).optional(),
});

export const trackEvent = createServerFn({ method: "POST" })
  .inputValidator((d: { eventName: string; path?: string; anonSessionId?: string; ref?: string; referrer?: string; utm?: string }) =>
    trackInput.parse(d),
  )
  .handler(async ({ data }) => {
    let ua = "";
    try {
      const req = typeof getRequest === "function" ? getRequest() : undefined;
      ua = req?.headers.get("user-agent") ?? "";
    } catch {
      /* no request context (e.g. tests) */
    }

    // Load patterns from DB (60s cached); fall back to built-in list on error.
    let patterns: BotPatterns = FALLBACK_PATTERNS;
    try {
      const { getBotPatterns } = await import("@/lib/admin-bot-settings.functions");
      patterns = await getBotPatterns();
    } catch {
      /* use fallback */
    }
    const { isBot, category } = classifyUa(ua, patterns);

    const { dbInsertClient } = await import("@/lib/db.server");
    const supabase = dbInsertClient();
    await supabase.from("site_events").insert({
      city: citySlug(),
      event_name: data.eventName,
      path: data.path ?? null,
      anon_session_id: data.anonSessionId ?? null,
      ref: data.ref ?? null,
      referrer: data.referrer ?? null,
      utm: data.utm ?? null,
      is_bot: isBot,
      ua_category: category !== "human" ? category : null,
    });
    // Never surface DB errors or row data to the client.
    return { ok: true };
  });
