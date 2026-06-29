// submit-obituary: accepts form submissions from the public obituaries page.
// Saves to obituary_submissions (PII held server-side) for human review.
// NEVER auto-publishes. Returns a simple success/error JSON response.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
  "Content-Type": "application/json",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method not allowed" }), { status: 405, headers: CORS });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid JSON" }), { status: 400, headers: CORS });
  }

  // Validate required fields
  const full_name = typeof body.full_name === "string" ? body.full_name.trim() : "";
  const submitter_name = typeof body.submitter_name === "string" ? body.submitter_name.trim() : "";
  const submitter_email = typeof body.submitter_email === "string" ? body.submitter_email.trim() : "";

  if (!full_name) {
    return new Response(JSON.stringify({ error: "full_name is required" }), { status: 422, headers: CORS });
  }
  if (!submitter_name || !submitter_email) {
    return new Response(JSON.stringify({ error: "submitter_name and submitter_email are required" }), { status: 422, headers: CORS });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(submitter_email)) {
    return new Response(JSON.stringify({ error: "invalid submitter_email" }), { status: 422, headers: CORS });
  }

  const city = typeof body.city === "string" ? body.city : "canberra";
  const notice_type = typeof body.notice_type === "string" ? body.notice_type : "death_notice";
  const allowed_types = ["death_notice", "obituary", "funeral_notice", "tribute"];
  if (!allowed_types.includes(notice_type)) {
    return new Response(JSON.stringify({ error: "invalid notice_type" }), { status: 422, headers: CORS });
  }

  const row = {
    city,
    full_name,
    preferred_name: typeof body.preferred_name === "string" ? body.preferred_name.trim() || null : null,
    date_of_death: typeof body.date_of_death === "string" && body.date_of_death ? body.date_of_death : null,
    age: typeof body.age === "number" && body.age > 0 ? Math.round(body.age) : null,
    suburb: typeof body.suburb === "string" ? body.suburb.trim() || null : null,
    notice_type,
    body_text: typeof body.body_text === "string" ? body.body_text.trim() || null : null,
    service_details: typeof body.service_details === "string" ? body.service_details.trim() || null : null,
    funeral_director: typeof body.funeral_director === "string" ? body.funeral_director.trim() || null : null,
    funeral_director_url: typeof body.funeral_director_url === "string" ? body.funeral_director_url.trim() || null : null,
    submitter_name,
    submitter_email,
    submitter_phone: typeof body.submitter_phone === "string" ? body.submitter_phone.trim() || null : null,
    submitter_relationship: typeof body.submitter_relationship === "string" ? body.submitter_relationship.trim() || null : null,
    status: "pending",
  };

  const { error } = await supabase.from("obituary_submissions").insert(row);
  if (error) {
    console.error("[submit-obituary] insert error:", error.message);
    return new Response(JSON.stringify({ error: "Could not save submission. Please try again." }), { status: 500, headers: CORS });
  }

  console.log(`[submit-obituary] new submission: ${full_name} / ${city}`);
  return new Response(JSON.stringify({ ok: true }), { headers: CORS });
});
