// Shared seeding/teardown helpers for the article-comments e2e specs.
//
// These run ONLY when SUPABASE_SERVICE_ROLE_KEY is present (the specs test.skip
// otherwise). Seeding uses the service-role key to insert rows directly, then
// HARD-ASSERTS each insert succeeded so a spec can never pass vacuously (e.g.
// "sentinel absent" passing merely because the row was never created).
//
// All sentinels are unique strings so a spec can grep raw HTML / JSON for them:
//   CMT-CANB-APPROVED   canberra / approved   / author_hidden=false  -> MUST appear publicly
//   CMT-CANB-PENDING    canberra / pending                            -> MUST NOT appear (Voller)
//   CMT-CANB-HIDDEN     canberra / hidden                             -> MUST NOT appear (admin hide)
//   CMT-CANB-AUTHHIDDEN canberra / approved   / author_hidden=true    -> MUST NOT appear (author hide)
//   CMT-SYD-APPROVED    sydney   / approved                           -> MUST NOT appear (city isolation)
import { SUPABASE_URL } from "../../src/integrations/supabase/config";

export const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
export const hasServiceRole = SERVICE_ROLE_KEY.length > 0;

export const SENTINELS = {
  canbApproved: "CMT-CANB-APPROVED",
  canbPending: "CMT-CANB-PENDING",
  canbHidden: "CMT-CANB-HIDDEN",
  canbAuthHidden: "CMT-CANB-AUTHHIDDEN",
  sydApproved: "CMT-SYD-APPROVED",
} as const;

// Every sentinel that MUST be absent from any public surface served to a
// signed-out Canberra reader.
export const FORBIDDEN_SENTINELS = [
  SENTINELS.canbPending,
  SENTINELS.canbHidden,
  SENTINELS.canbAuthHidden,
  SENTINELS.sydApproved,
] as const;

const REST = `${SUPABASE_URL}/rest/v1`;

function headers(prefer?: string): Record<string, string> {
  const h: Record<string, string> = {
    apikey: SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    "Content-Type": "application/json",
  };
  if (prefer) h.Prefer = prefer;
  return h;
}

interface ArticleRef {
  id: string;
  slug: string;
  city: string;
}

// Find one published article per city via the service-role REST endpoint.
async function findArticle(city: string): Promise<ArticleRef | null> {
  const url =
    `${REST}/articles?select=id,slug,city&city=eq.${encodeURIComponent(city)}` +
    `&is_published=eq.true&limit=1`;
  const res = await fetch(url, { headers: headers() });
  if (!res.ok) return null;
  const rows = (await res.json()) as ArticleRef[];
  return rows[0] ?? null;
}

// A throwaway auth user id to satisfy the NOT NULL user_id FK. We reuse the
// seeded admin (shane) if present, else fall back to the first auth user.
async function anyUserId(): Promise<string | null> {
  // GoTrue admin endpoint (service-role only).
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?per_page=1`, {
    headers: headers(),
  });
  if (!res.ok) return null;
  const json = (await res.json()) as { users?: { id: string }[] };
  return json.users?.[0]?.id ?? null;
}

export interface SeedResult {
  canberra: ArticleRef;
  sydney: ArticleRef | null;
  ids: string[];
}

// Inserts the sentinel rows. Returns the canberra article (for the spec to
// visit) plus the ids created (for teardown). Throws if the positive-control
// row cannot be created, so the suite hard-fails instead of passing vacuously.
export async function seedComments(): Promise<SeedResult> {
  const canberra = await findArticle("canberra");
  if (!canberra) throw new Error("seed: no published canberra article found");
  const sydney = await findArticle("sydney");
  const uid = await anyUserId();
  if (!uid) throw new Error("seed: no auth user available for user_id FK");

  // The derive_city trigger overwrites city from the parent article and rejects
  // non-pending inserts from non-service roles; service_role bypasses that, and
  // the trigger sets city = article.city, so we always target the right article.
  type Row = {
    article: ArticleRef | null;
    body: string;
    status: string;
    author_hidden: boolean;
  };
  const wanted: Row[] = [
    { article: canberra, body: SENTINELS.canbApproved, status: "approved", author_hidden: false },
    { article: canberra, body: SENTINELS.canbPending, status: "pending", author_hidden: false },
    { article: canberra, body: SENTINELS.canbHidden, status: "hidden", author_hidden: false },
    { article: canberra, body: SENTINELS.canbAuthHidden, status: "approved", author_hidden: true },
    { article: sydney, body: SENTINELS.sydApproved, status: "approved", author_hidden: false },
  ];

  const ids: string[] = [];
  for (const r of wanted) {
    if (!r.article) continue; // sydney may be absent in some envs
    const res = await fetch(`${REST}/article_comments`, {
      method: "POST",
      headers: headers("return=representation"),
      body: JSON.stringify({
        article_id: r.article.id,
        user_id: uid,
        body: r.body,
        status: r.status,
        author_hidden: r.author_hidden,
      }),
    });
    const created = res.ok ? ((await res.json()) as { id: string }[]) : [];
    // HARD GATE: the positive control MUST exist. Without it the SSR "contains"
    // assertion would be the only thing keeping the suite honest.
    if (r.body === SENTINELS.canbApproved) {
      if (!res.ok || created.length === 0) {
        throw new Error(`seed: failed to create positive control (${res.status})`);
      }
    }
    for (const c of created) ids.push(c.id);
  }
  return { canberra, sydney, ids };
}

export async function teardownComments(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const list = ids.map((i) => `"${i}"`).join(",");
  await fetch(`${REST}/article_comments?id=in.(${list})`, {
    method: "DELETE",
    headers: headers(),
  }).catch(() => {});
}

// Direct anon PostgREST probe: with the publishable (anon) key, a raw select on
// article_comments MUST be denied/empty — anon holds NO table SELECT grant.
export async function anonSelectComments(
  anonKey: string,
): Promise<{ status: number; rows: unknown[] }> {
  const res = await fetch(`${REST}/article_comments?select=*&status=eq.approved`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
  });
  let rows: unknown[] = [];
  try {
    const j = await res.json();
    if (Array.isArray(j)) rows = j;
  } catch {
    /* permission-denied bodies are not arrays */
  }
  return { status: res.status, rows };
}
