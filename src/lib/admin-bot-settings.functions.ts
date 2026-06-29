// Server functions for reading and caching bot UA patterns from app_settings.
// Writing is done directly via adminSupabase from the browser (RLS enforces admin-only).
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { FALLBACK_PATTERNS, type BotPatterns } from "@/lib/bot-classify";

// 60-second in-memory cache. Avoids a DB round-trip on every tracked event.
let _cached: BotPatterns | null = null;
let _expiry = 0;

export const getBotPatterns = createServerFn({ method: "GET" }).handler(
  async (): Promise<BotPatterns> => {
    const now = Date.now();
    if (_cached && now < _expiry) return _cached;
    try {
      const { rawSupabase } = await import("@/lib/db.server");
      const { data } = await rawSupabase
        .from("app_settings")
        .select("value")
        .eq("key", "bot_ua_patterns")
        .maybeSingle();
      _cached = (data?.value as BotPatterns | undefined) ?? FALLBACK_PATTERNS;
    } catch {
      _cached = FALLBACK_PATTERNS;
    }
    _expiry = Date.now() + 60_000;
    return _cached;
  },
);

// Validates and returns patterns; throws on invalid shape.
export const PatternsSchema = z.record(z.array(z.string()));

export function invalidateBotPatternCache() {
  _cached = null;
  _expiry = 0;
}
