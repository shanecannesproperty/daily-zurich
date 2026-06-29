// Public jobs feed for cross-consumption (e.g. What's On Canberra's "Canberra
// jobs" strip). Returns Canberra's published jobs as JSON, link-out only.
// CORS-open and short-cached. No auth required: this is public, non-PII data.
import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "@/integrations/supabase/config";
import { citySlug } from "@/lib/city";

const sb = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "content-type",
  "Cache-Control": "public, max-age=900",
  "Content-Type": "application/json; charset=utf-8",
};

export const Route = createFileRoute("/api/jobs/canberra.json")({
  server: {
    handlers: {
      OPTIONS: () => new Response(null, { status: 204, headers: CORS_HEADERS }),
      GET: async () => {
        const { data, error } = await sb
          .from("jobs")
          .select("title, employer, location, salary, url, source, posted_date")
          .eq("city", citySlug())
          .eq("is_published", true)
          .order("posted_date", { ascending: false, nullsFirst: false })
          .limit(60);
        if (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: CORS_HEADERS,
          });
        }
        return new Response(JSON.stringify(data ?? []), { status: 200, headers: CORS_HEADERS });
      },
    },
  },
});
