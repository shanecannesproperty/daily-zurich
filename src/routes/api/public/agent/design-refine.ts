// Hourly design refinement agent.
// 1. Captures our pages + 2 rotating benchmark screenshots via Firecrawl.
// 2. Asks Gemini vision to compare and produce structured findings.
// 3. Persists findings as design_proposals. Safe token-only patches auto-apply
//    (max 3 per run, daily cap enforced in DB). Risky/high go to dashboard.
import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { generateText, Output } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { siteName } from "@/lib/city";

const PAGES_TO_AUDIT = ["/", "/news", "/events", "/directory"];
const BENCHMARKS = [
  "https://www.nytimes.com",
  "https://www.theguardian.com/au",
  "https://www.theatlantic.com",
  "https://www.bloomberg.com",
  "https://www.ft.com",
  "https://www.semafor.com",
  "https://www.theinformation.com",
  "https://www.cnn.com",
  "https://www.abc.net.au/news",
  "https://www.afr.com",
  "https://6amcity.com",
  "https://www.monocle.com",
];

const FindingSchema = z.object({
  findings: z.array(
    z.object({
      area: z
        .string()
        .describe("Page area, e.g. 'homepage hero', 'lead headline', 'newsletter band'"),
      page_path: z.string().describe("Path audited, e.g. '/' or '/events'"),
      severity: z.enum(["low", "med", "high"]),
      risk: z
        .enum(["safe", "risky"])
        .describe("'safe' only if fix is purely a token in the whitelist; otherwise 'risky'"),
      issue: z.string().describe("One-line problem statement vs benchmark"),
      benchmark_ref: z.string().nullable().describe("Which benchmark inspired the fix, if any"),
      proposed_fix: z.string().describe("Concrete change"),
      token_name: z
        .string()
        .nullable()
        .describe("If risk='safe', the design_tokens whitelist entry to mutate; otherwise null"),
      new_value: z
        .string()
        .nullable()
        .describe("Proposed new value with unit, e.g. '24px' or '1.55'; null when risky"),
    }),
  ),
});

const ALLOWED_TOKENS = new Set([
  "--dc-container-max",
  "--dc-container-pad",
  "--dc-section-gap",
  "--dc-h1-size-min",
  "--dc-h1-size-max",
  "--dc-h2-size-min",
  "--dc-h2-size-max",
  "--dc-h3-size",
  "--dc-dek-size",
  "--dc-body-size",
  "--dc-body-line",
  "--dc-headline-line",
  "--dc-kicker-track",
  "--dc-hairline-weight",
  "--dc-rule-weight",
  "--dc-card-pad",
]);

function siteBase() {
  return process.env.PUBLIC_SITE_URL || "https://daily-canberra-site.lovable.app";
}

function pickBenchmarks(): string[] {
  // Rotate by hour-of-day so we cover everything across a day.
  const h = new Date().getUTCHours();
  return [BENCHMARKS[h % BENCHMARKS.length], BENCHMARKS[(h + 5) % BENCHMARKS.length]];
}

async function firecrawlScreenshot(url: string, key: string): Promise<string | null> {
  try {
    const res = await fetch("https://api.firecrawl.dev/v2/scrape", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ url, formats: ["screenshot"], onlyMainContent: false, waitFor: 1500 }),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { data?: { screenshot?: string }; screenshot?: string };
    return json.data?.screenshot ?? json.screenshot ?? null;
  } catch {
    return null;
  }
}

function valueWithinBounds(
  token: { min_value: string | null; max_value: string | null; unit: string | null; kind: string },
  value: string,
): boolean {
  const numMatch = value.match(/^(-?\d+(?:\.\d+)?)/);
  if (!numMatch) return false;
  const v = parseFloat(numMatch[1]);
  const min = token.min_value ? parseFloat(token.min_value) : -Infinity;
  const max = token.max_value ? parseFloat(token.max_value) : Infinity;
  if (Number.isNaN(v) || v < min || v > max) return false;
  if (token.kind === "length" && token.unit && !value.endsWith(token.unit)) return false;
  return true;
}

async function runAgent(triggerSource: string) {
  const lovableKey = process.env.LOVABLE_API_KEY;
  const firecrawlKey = process.env.FIRECRAWL_API_KEY;
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!lovableKey || !firecrawlKey || !supabaseUrl || !serviceKey) {
    return { ok: false, error: "missing_env" };
  }

  const sb = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Open the run row first so the dashboard sees it immediately.
  const benchmarks = pickBenchmarks();
  const runIns = await sb
    .from("design_runs")
    .insert({
      benchmark_targets: benchmarks,
      pages_audited: PAGES_TO_AUDIT,
      notes: `trigger=${triggerSource}`,
    })
    .select("id")
    .single();
  if (runIns.error || !runIns.data) {
    return { ok: false, error: `run_insert: ${runIns.error?.message}` };
  }
  const runId = runIns.data.id as string;

  try {
    const base = siteBase();

    // Capture ours + benchmarks in parallel.
    const [ourShots, benchShots] = await Promise.all([
      Promise.all(
        PAGES_TO_AUDIT.map((p) =>
          firecrawlScreenshot(base + p, firecrawlKey).then((s) => ({ p, s })),
        ),
      ),
      Promise.all(
        benchmarks.map((u) => firecrawlScreenshot(u, firecrawlKey).then((s) => ({ u, s }))),
      ),
    ]);

    const ourShotsOk = ourShots.filter((x) => !!x.s);
    const benchShotsOk = benchShots.filter((x) => !!x.s);
    if (ourShotsOk.length === 0 || benchShotsOk.length === 0) {
      await sb
        .from("design_runs")
        .update({
          finished_at: new Date().toISOString(),
          status: "error",
          error: "screenshot_capture_failed",
        })
        .eq("id", runId);
      return { ok: false, error: "screenshot_capture_failed" };
    }

    // Pull current tokens so the model knows what is mutable + within what bounds.
    const tokensRes = await sb
      .from("design_tokens")
      .select(
        "token_name,current_value,default_value,unit,min_value,max_value,kind,description,locked",
      );
    const tokens = (tokensRes.data ?? []) as Array<{
      token_name: string;
      current_value: string;
      default_value: string;
      unit: string | null;
      min_value: string | null;
      max_value: string | null;
      kind: string;
      description: string | null;
      locked: boolean;
    }>;
    const tokenMap = new Map(tokens.map((t) => [t.token_name, t]));
    const mutableTokens = tokens.filter((t) => !t.locked && ALLOWED_TOKENS.has(t.token_name));

    const gateway = createLovableAiGatewayProvider(lovableKey);
    const model = gateway("google/gemini-3-flash-preview");

    const systemPrompt = `You are the Design Director for ${siteName()}, an editorial newspaper website.
House style is LOCKED: Paper & Ink palette, DM Serif Display + Georgia + Fira Sans, hairline dividers, red used only for masthead rule/kicker/CTA/active nav/breaking badge. Never propose palette, font family, or accent rule changes.

Compare our screenshots to the benchmark screenshots and identify the top 1-4 highest-leverage refinements. Bias toward composition, density, typographic hierarchy, rhythm, whitespace.

For each finding set risk='safe' ONLY when the fix is a single value change to one of these whitelisted CSS custom properties:
${mutableTokens.map((t) => `  ${t.token_name} (current ${t.current_value}, range ${t.min_value}..${t.max_value} ${t.unit ?? ""}): ${t.description ?? ""}`).join("\n")}

If the fix needs new components, new layout structure, copy changes, or color/font changes, set risk='risky' and leave token_name and new_value as null. Never propose a value outside the listed range.`;

    const userContent: Array<{ type: "text"; text: string } | { type: "image"; image: string }> = [
      { type: "text", text: `OUR SITE (${base}) audited pages:` },
    ];
    for (const { p, s } of ourShotsOk) {
      userContent.push({ type: "text", text: `Ours: ${p}` });
      userContent.push({ type: "image", image: s as string });
    }
    userContent.push({ type: "text", text: "BENCHMARKS for inspiration:" });
    for (const { u, s } of benchShotsOk) {
      userContent.push({ type: "text", text: `Benchmark: ${u}` });
      userContent.push({ type: "image", image: s as string });
    }

    const { output } = await generateText({
      model,
      system: systemPrompt,
      messages: [{ role: "user", content: userContent }],
      experimental_output: Output.object({ schema: FindingSchema }),
    });

    const findings = output?.findings ?? [];

    // Persist proposals, auto-apply up to 3 safe ones.
    let appliedThisRun = 0;
    let pending = 0;
    for (const f of findings) {
      const isSafe =
        f.risk === "safe" &&
        f.token_name &&
        f.new_value &&
        ALLOWED_TOKENS.has(f.token_name) &&
        tokenMap.has(f.token_name) &&
        valueWithinBounds(tokenMap.get(f.token_name)!, f.new_value) &&
        appliedThisRun < 3;

      const cssPatch = isSafe ? { token_name: f.token_name, new_value: f.new_value } : null;

      const propIns = await sb
        .from("design_proposals")
        .insert({
          run_id: runId,
          area: f.area,
          page_path: f.page_path,
          severity: f.severity,
          risk: f.risk,
          issue: f.issue,
          proposed_fix: f.proposed_fix,
          benchmark_ref: f.benchmark_ref,
          css_patch: cssPatch,
          status: isSafe ? "auto_applied" : "pending_review",
        })
        .select("id")
        .single();

      if (isSafe && propIns.data) {
        const rpc = await sb.rpc("apply_design_token", {
          _token_name: f.token_name!,
          _new_value: f.new_value!,
          _run_id: runId,
          _proposal_id: propIns.data.id,
          _actor: "agent",
        });
        if (rpc.error) {
          await sb
            .from("design_proposals")
            .update({
              status: "pending_review",
              css_patch: null,
            })
            .eq("id", propIns.data.id);
          pending += 1;
        } else {
          appliedThisRun += 1;
          await sb
            .from("design_proposals")
            .update({ applied_at: new Date().toISOString() })
            .eq("id", propIns.data.id);
        }
      } else {
        pending += 1;
      }
    }

    await sb
      .from("design_runs")
      .update({
        finished_at: new Date().toISOString(),
        status: "ok",
        findings_count: findings.length,
        applied_count: appliedThisRun,
        pending_count: pending,
      })
      .eq("id", runId);

    return { ok: true, run_id: runId, findings: findings.length, applied: appliedThisRun, pending };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await sb
      .from("design_runs")
      .update({
        finished_at: new Date().toISOString(),
        status: "error",
        error: msg.slice(0, 500),
      })
      .eq("id", runId);
    return { ok: false, error: msg };
  }
}

function unauthorized() {
  return new Response(JSON.stringify({ ok: false, error: "unauthorized" }), {
    status: 401,
    headers: { "content-type": "application/json" },
  });
}

export const Route = createFileRoute("/api/public/agent/design-refine")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expected = process.env.DESIGN_AGENT_SECRET;
        const auth = request.headers.get("authorization") ?? "";
        const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
        if (!expected || !token || token !== expected) return unauthorized();
        let trigger = "manual";
        try {
          const body = (await request.json().catch(() => null)) as { source?: string } | null;
          if (body?.source) trigger = body.source;
        } catch {
          /* ignore */
        }
        const result = await runAgent(trigger);
        return new Response(JSON.stringify(result), {
          status: result.ok ? 200 : 500,
          headers: { "content-type": "application/json" },
        });
      },
      GET: async () =>
        new Response("Method Not Allowed", { status: 405, headers: { allow: "POST" } }),
    },
  },
});
