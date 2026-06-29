// Chat endpoint for Ask Canberra. RAG style: search articles + events + listings,
// then stream an answer grounded in those results via Lovable AI Gateway.
import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { cityName, citySlug, siteName } from "@/lib/city";

type ChatBody = { messages?: unknown };

function lastUserText(messages: UIMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role !== "user") continue;
    return m.parts
      .map((p) => (p.type === "text" ? p.text : ""))
      .join(" ")
      .trim();
  }
  return "";
}

async function retrieveContext(query: string): Promise<string> {
  if (!query) return "";
  const { createClient } = await import("@supabase/supabase-js");
  const { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } = await import("@/integrations/supabase/config");
  const supa = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
  });

  const tokens = query
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2)
    .slice(0, 6);

  const orFilter = (cols: string[]) =>
    tokens.length === 0
      ? ""
      : tokens.flatMap((t) => cols.map((c) => `${c}.ilike.%${t}%`)).join(",");

  const city = citySlug();
  const [articles, events, listings] = await Promise.all([
    supa
      .from("articles")
      .select("title,dek,category,slug,published_at")
      .eq("city", city)
      .eq("is_published", true)
      .or(orFilter(["title", "dek"]) || `title.ilike.%${city}%`)
      .order("published_at", { ascending: false })
      .limit(6),
    supa
      .from("events")
      .select("title,venue,suburb,start_at,category,slug")
      .eq("city", city)
      .eq("is_published", true)
      .or(orFilter(["title", "venue", "suburb", "category"]) || `title.ilike.%${city}%`)
      .gte("start_at", new Date().toISOString())
      .order("start_at", { ascending: true })
      .limit(8),
    supa
      .from("listings")
      .select("business_name,category,suburb,website_url")
      .eq("city", city)
      .or(orFilter(["business_name", "category", "suburb"]) || "business_name.ilike.%a%")
      .limit(8),
  ]);

  const parts: string[] = [];
  if (articles.data && articles.data.length) {
    parts.push(
      "ARTICLES:\n" +
        articles.data
          .map(
            (a) => `- ${a.title} [${a.category}] (/article/${a.slug}) ${a.dek ? "— " + a.dek : ""}`,
          )
          .join("\n"),
    );
  }
  if (events.data && events.data.length) {
    parts.push(
      "EVENTS:\n" +
        events.data
          .map(
            (e) =>
              `- ${e.title} @ ${e.venue ?? e.suburb ?? "TBA"} on ${e.start_at ? new Date(e.start_at).toLocaleString("en-AU", { dateStyle: "medium", timeStyle: "short", timeZone: "Australia/Sydney" }) : "TBA"} (/event/${e.slug})`,
          )
          .join("\n"),
    );
  }
  if (listings.data && listings.data.length) {
    parts.push(
      "LISTINGS:\n" +
        listings.data
          .map((l) => `- ${l.business_name} [${l.category ?? "—"}] in ${l.suburb ?? cityName()}`)
          .join("\n"),
    );
  }
  return parts.join("\n\n");
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { messages } = (await request.json()) as ChatBody;
        if (!Array.isArray(messages)) {
          return new Response("messages required", { status: 400 });
        }
        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const uiMessages = messages as UIMessage[];
        const query = lastUserText(uiMessages);
        const context = await retrieveContext(query);

        const system = [
          `You are Ask ${cityName()}, the AI assistant for ${siteName()} newspaper.`,
          `Help readers with ${cityName()} news, events, places to eat and things to do.`,
          "Use the CONTEXT block below as your primary source. Cite article and event links inline using markdown like [title](/article/slug).",
          "If the context doesn't cover the question, say so briefly and suggest where to look on the site.",
          "Tone: concise, friendly, Australian English. No em dashes.",
          "",
          "CONTEXT:",
          context || "(no relevant matches found)",
        ].join("\n");

        const gateway = createLovableAiGatewayProvider(key);
        const result = streamText({
          model: gateway("google/gemini-3-flash-preview"),
          system,
          messages: await convertToModelMessages(uiMessages),
        });

        return result.toUIMessageStreamResponse({ originalMessages: uiMessages });
      },
    },
  },
});
