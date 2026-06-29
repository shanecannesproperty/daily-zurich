// Server-only vision-model gateway for judging whether a photo is appropriate
// for an article/event. It returns the model's raw text reply; callers build
// the prompt and parse the answer.
//
// Provider preference:
//   1. Anthropic Messages API (Claude vision) when ANTHROPIC_API_KEY is set.
//      Claude reliably reads ON-IMAGE signage (business names, street/suburb
//      signs) and reasons about Australian geography, which is what catches a
//      "named landmark from the wrong city" mismatch (e.g. a Sydney pub on a
//      Canberra article).
//   2. Lovable AI gateway (Gemini) as a fallback so deployments without an
//      Anthropic key keep working.
//
// Returns the reply text, or null on any error/timeout. Callers MUST treat
// null as "no opinion — keep the existing photo" so a transient model outage
// never churns good images.

const ANTHROPIC_MODEL = "claude-haiku-4-5-20251001";
const GATEWAY_MODEL = "google/gemini-2.5-flash";

export interface VisionJudgeOpts {
  maxTokens?: number;
  jsonObject?: boolean;
  timeoutMs?: number;
}

export async function visionJudge(
  system: string,
  userText: string,
  imageUrl: string,
  opts: VisionJudgeOpts = {},
): Promise<string | null> {
  const maxTokens = opts.maxTokens ?? 64;
  const timeoutMs = opts.timeoutMs ?? 15000;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const anthropicKey = process.env.ANTHROPIC_API_KEY ?? "";
    if (anthropicKey) {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        signal: ctrl.signal,
        headers: {
          "content-type": "application/json",
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: ANTHROPIC_MODEL,
          max_tokens: maxTokens,
          system,
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: userText },
                { type: "image", source: { type: "url", url: imageUrl } },
              ],
            },
            // Assistant prefill forces JSON output when caller requests it.
            // Claude stops generating at maxTokens so the { must come first.
            ...(opts.jsonObject ? [{ role: "assistant", content: "{" }] : []),
          ],
        }),
      });
      if (!res.ok) return null;
      const j = (await res.json().catch(() => null)) as {
        content?: Array<{ type?: string; text?: string }>;
      } | null;
      const rawText = (j?.content ?? [])
        .filter((b) => b.type === "text")
        .map((b) => b.text ?? "")
        .join("")
        .trim();
      // Re-prepend the prefill character so callers get valid JSON.
      const text = opts.jsonObject && rawText ? "{" + rawText : rawText;
      return text || null;
    }

    const key = process.env.LOVABLE_API_KEY ?? "";
    if (!key) return null;
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      signal: ctrl.signal,
      headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
      body: JSON.stringify({
        model: GATEWAY_MODEL,
        temperature: 0,
        max_tokens: maxTokens,
        ...(opts.jsonObject ? { response_format: { type: "json_object" } } : {}),
        messages: [
          { role: "system", content: system },
          {
            role: "user",
            content: [
              { type: "text", text: userText },
              { type: "image_url", image_url: { url: imageUrl } },
            ],
          },
        ],
      }),
    });
    if (!res.ok) return null;
    const j = (await res.json().catch(() => null)) as {
      choices?: Array<{ message?: { content?: string } }>;
    } | null;
    return (j?.choices?.[0]?.message?.content ?? "").trim() || null;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}
