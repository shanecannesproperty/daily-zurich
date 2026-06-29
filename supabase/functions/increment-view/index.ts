// Increments article_views.view_count for (city, slug) via the existing
// SECURITY DEFINER RPC and returns the new total. Public, idempotent —
// safe to call from the browser on every article mount.
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ ok: false, error: "method-not-allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = (await req.json().catch(() => ({}))) as {
      slug?: unknown;
      city?: unknown;
    };
    const slug = typeof body.slug === "string" ? body.slug.trim() : "";
    const city = typeof body.city === "string" ? body.city.trim() : "";
    if (!slug || !city || slug.length > 200 || city.length > 64) {
      return new Response(JSON.stringify({ ok: false, error: "bad-input" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const rpc = await admin.rpc("increment_article_view", {
      p_slug: slug,
      p_city: city,
    });
    if (rpc.error) {
      console.error("[increment-view] rpc", rpc.error.message);
      return new Response(JSON.stringify({ ok: false, error: "rpc-failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data, error } = await admin
      .from("article_views")
      .select("view_count")
      .eq("city", city)
      .eq("slug", slug)
      .maybeSingle();
    if (error) {
      console.error("[increment-view] select", error.message);
    }
    const view_count = (data?.view_count as number | undefined) ?? 0;

    return new Response(JSON.stringify({ ok: true, view_count }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[increment-view]", e);
    return new Response(JSON.stringify({ ok: false, error: "server-error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
