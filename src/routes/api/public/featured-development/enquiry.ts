// Thin server proxy for The Lawson's network enquiry webhook.
//
// Why this exists: the shared NETWORK_WEBHOOK_SHARED_TOKEN must never be
// shipped to the browser. The client posts a sanitised payload here; this
// handler attaches the token + site-specific lowercase UTM tags + honeypot
// check, then forwards to the Lawson webhook. The webhook is the system of
// record — the site never stores leads locally.
//
// /api/public/* bypasses Lovable auth on the published site, so this handler
// validates input and rejects bots itself (honeypot + minimal Zod-style
// shape checks).
import { createFileRoute } from "@tanstack/react-router";
import { citySlug } from "@/lib/city";

const NETWORK_WEBHOOK_URL =
  "https://zrsrvnxbcxjzrzxifodn.supabase.co/functions/v1/network-enquiry-webhook";

type ClientPayload = {
  name?: unknown;
  email?: unknown;
  phone?: unknown;
  message?: unknown;
  project_id?: unknown;
  slot_type?: unknown;
  // honeypot — must be empty
  company_website?: unknown;
};

function str(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  if (!t || t.length > max) return null;
  return t;
}

function isEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) && s.length <= 254;
}

function isSlot(s: string | null): s is "house_display" | "newsletter_sponsor" {
  return s === "house_display" || s === "newsletter_sponsor";
}

export const Route = createFileRoute("/api/public/featured-development/enquiry")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = process.env.NETWORK_WEBHOOK_SHARED_TOKEN;
        if (!token) {
          return new Response(JSON.stringify({ ok: false, error: "server_misconfigured" }), {
            status: 500,
            headers: { "content-type": "application/json" },
          });
        }

        let body: ClientPayload;
        try {
          body = (await request.json()) as ClientPayload;
        } catch {
          return new Response(JSON.stringify({ ok: false, error: "invalid_json" }), {
            status: 400,
            headers: { "content-type": "application/json" },
          });
        }

        // Honeypot: silent success so bots don't learn it's a trap.
        const honeypot = typeof body.company_website === "string" ? body.company_website : "";
        if (honeypot.trim().length > 0) {
          return new Response(JSON.stringify({ ok: true }), {
            status: 200,
            headers: { "content-type": "application/json" },
          });
        }

        const name = str(body.name, 120);
        const emailRaw = str(body.email, 254);
        const message = str(body.message, 2000);
        const phone = str(body.phone, 40); // optional
        const projectId = str(body.project_id, 200);
        const slotType = str(body.slot_type, 40);

        if (!name || !emailRaw || !isEmail(emailRaw) || !message || !projectId || !isSlot(slotType)) {
          return new Response(JSON.stringify({ ok: false, error: "invalid_input" }), {
            status: 400,
            headers: { "content-type": "application/json" },
          });
        }

        const forward = {
          name,
          email: emailRaw,
          phone: phone ?? null,
          message,
          project_id: projectId,
          slot_type: slotType,
          utm_source: `daily${citySlug()}`,
          utm_medium: "referral",
          utm_campaign: "the-lawson",
          utm_content: slotType,
          source_site: `daily${citySlug()}`,
        };

        try {
          const upstream = await fetch(NETWORK_WEBHOOK_URL, {
            method: "POST",
            headers: {
              "content-type": "application/json",
              authorization: `Bearer ${token}`,
              "x-network-token": token,
            },
            body: JSON.stringify(forward),
          });
          if (!upstream.ok) {
            return new Response(
              JSON.stringify({ ok: false, error: "upstream_error", status: upstream.status }),
              { status: 502, headers: { "content-type": "application/json" } },
            );
          }
          return new Response(JSON.stringify({ ok: true }), {
            status: 200,
            headers: { "content-type": "application/json" },
          });
        } catch {
          return new Response(JSON.stringify({ ok: false, error: "network_error" }), {
            status: 502,
            headers: { "content-type": "application/json" },
          });
        }
      },
    },
  },
});
