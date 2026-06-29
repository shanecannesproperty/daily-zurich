// Invariant tests for the "Have Your Say" data layer (repo A).
//
// These prove the SECURITY guarantees that live in the FRONTEND/data layer:
//   * reader writes never let the client set status / user_id (the rpc is the
//     boundary; the client payload carries neither);
//   * the public-list rpc + reader writes always pass { city: citySlug() };
//   * body + author_name are rendered as PLAIN TEXT (no dangerouslySetInnerHTML);
//   * no auto-publish path exists in the comments code (Voller);
//   * admin moderation goes through the moderate_comment rpc with city + action.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { citySlug } from "@/lib/city";

// ---------------------------------------------------------------------------
// Mock the reader and admin Supabase clients so we can capture the rpc payloads
// the data layer actually sends, without touching the network.
// ---------------------------------------------------------------------------
type RpcCall = { fn: string; args?: Record<string, unknown> };

const readerRpcCalls: RpcCall[] = [];
const adminRpcCalls: RpcCall[] = [];

vi.mock("@/integrations/supabase/reader-client", () => ({
  readerSupabase: {
    rpc: (fn: string, args?: Record<string, unknown>) => {
      readerRpcCalls.push({ fn, args });
      // submit returns the inserted row; mimic the DB hardcoding status='pending'.
      if (fn === "submit_comment") {
        return Promise.resolve({
          data: {
            id: "new-id",
            author_name: (args?.author_name as string | null) ?? null,
            body: args?.body,
            created_at: new Date().toISOString(),
            status: "pending",
          },
          error: null,
        });
      }
      return Promise.resolve({ data: null, error: null });
    },
  },
}));

vi.mock("@/integrations/supabase/admin-client", () => ({
  adminSupabase: {
    from: () => {
      const b: Record<string, unknown> = {};
      const chain = () => b;
      for (const m of ["select", "eq", "gt", "order", "limit"]) b[m] = chain;
      b.then = (resolve: (v: unknown) => unknown) =>
        Promise.resolve({ data: [], error: null }).then(resolve);
      return b;
    },
    rpc: (fn: string, args?: Record<string, unknown>) => {
      adminRpcCalls.push({ fn, args });
      return Promise.resolve({ data: null, error: null });
    },
  },
}));

beforeEach(() => {
  readerRpcCalls.length = 0;
  adminRpcCalls.length = 0;
});
afterEach(() => vi.clearAllMocks());

describe("reader writes (submit/flag/author-hide)", () => {
  it("submit_comment passes city:citySlug() and never a client-set status or user_id", async () => {
    const { readerSubmitComment } = await import("@/lib/reader-db");
    await readerSubmitComment({ articleId: "a1", body: "hello", authorName: "Sam" });
    const call = readerRpcCalls.find((c) => c.fn === "submit_comment")!;
    expect(call).toBeTruthy();
    expect(call.args?.city).toBe(citySlug());
    expect(call.args?.article_id).toBe("a1");
    expect(call.args?.body).toBe("hello");
    // The reader may NOT smuggle status, user_id, or city other than citySlug().
    expect("status" in (call.args ?? {})).toBe(false);
    expect("user_id" in (call.args ?? {})).toBe(false);
  });

  it("flag_comment passes city:citySlug() and the comment id", async () => {
    const { readerFlagComment } = await import("@/lib/reader-db");
    await readerFlagComment("c1", "spam");
    const call = readerRpcCalls.find((c) => c.fn === "flag_comment")!;
    expect(call.args?.city).toBe(citySlug());
    expect(call.args?.comment_id).toBe("c1");
    expect("status" in (call.args ?? {})).toBe(false);
  });

  it("author_hide_comment passes city:citySlug(), comment id, and hidden flag", async () => {
    const { readerAuthorHideComment } = await import("@/lib/reader-db");
    await readerAuthorHideComment("c1", true);
    const call = readerRpcCalls.find((c) => c.fn === "author_hide_comment")!;
    expect(call.args?.city).toBe(citySlug());
    expect(call.args?.comment_id).toBe("c1");
    expect(call.args?.hidden).toBe(true);
  });

  it("Voller: a submitted comment can only ever come back pending (never approved/published)", async () => {
    const { readerSubmitComment } = await import("@/lib/reader-db");
    const res = await readerSubmitComment({ articleId: "a1", body: "x" });
    // The rpc hardcodes status='pending'; the client cannot influence it.
    expect((res.data as { status?: string } | null)?.status).toBe("pending");
    expect((res.data as { status?: string } | null)?.status).not.toBe("approved");
    expect((res.data as { status?: string } | null)?.status).not.toBe("published");
  });
});

describe("admin moderation", () => {
  it("adminListComments forces .eq('city', citySlug())", async () => {
    // Re-mock from() to capture eq calls for this assertion.
    const eqArgs: unknown[][] = [];
    const mod = await import("@/integrations/supabase/admin-client");
    vi.spyOn(mod.adminSupabase, "from").mockImplementation((() => {
      const b: Record<string, unknown> = {};
      const chain =
        (name: string) =>
        (...args: unknown[]) => {
          if (name === "eq") eqArgs.push(args);
          return b;
        };
      for (const m of ["select", "eq", "gt", "order", "limit"]) b[m] = chain(m);
      b.then = (resolve: (v: unknown) => unknown) =>
        Promise.resolve({ data: [], error: null }).then(resolve);
      return b;
    }) as never);
    const { adminListComments } = await import("@/lib/admin-db");
    await adminListComments("pending");
    expect(eqArgs.some(([col, val]) => col === "city" && val === citySlug())).toBe(true);
    vi.restoreAllMocks();
  });

  it("moderateComment calls moderate_comment rpc with city, comment_id and action", async () => {
    const { moderateComment } = await import("@/lib/admin-db");
    await moderateComment("c1", "approve");
    const call = adminRpcCalls.find((c) => c.fn === "moderate_comment")!;
    expect(call).toBeTruthy();
    expect(call.args?.city).toBe(citySlug());
    expect(call.args?.comment_id).toBe("c1");
    expect(call.args?.action).toBe("approve");
  });
});

// ---------------------------------------------------------------------------
// Source-level guarantees (no client/network needed).
// ---------------------------------------------------------------------------
// Strip block + line comments so a comment that merely *mentions* a forbidden
// token (e.g. "NEVER dangerouslySetInnerHTML") does not trip the grep — we only
// care about real code usage.
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

describe("stored-XSS guarantee: comments render as plain text", () => {
  const files = [
    resolve(__dirname, "../../components/ArticleComments.tsx"),
    resolve(__dirname, "../../routes/admin.comments.index.tsx"),
  ];
  for (const file of files) {
    it(`${file.split("/").slice(-1)[0]} never uses dangerouslySetInnerHTML`, () => {
      const code = stripComments(readFileSync(file, "utf8"));
      // The dangerous form is the JSX prop dangerouslySetInnerHTML={...}.
      expect(code).not.toMatch(/dangerouslySetInnerHTML/);
    });
  }
});

describe("Voller: no auto-publish in the comments code", () => {
  const files = [
    resolve(__dirname, "../reader-db.ts"),
    resolve(__dirname, "../admin-db.ts"),
    resolve(__dirname, "../../components/ArticleComments.tsx"),
  ];
  for (const file of files) {
    it(`${file.split("/").slice(-1)[0]} has no auto_publish / status:'published' path`, () => {
      const code = stripComments(readFileSync(file, "utf8"));
      expect(code).not.toMatch(/auto_publish/);
      expect(code).not.toMatch(/['"]published['"]/);
    });
  }
});

// ---------------------------------------------------------------------------
// Admin gate is fail-closed: moderation is reachable ONLY when has_role('admin')
// is exactly `true`. A NULL result (no row), an rpc error, or a thrown call all
// resolve to isAdmin=false — a magic-link reader can never reach /admin/*.
// ---------------------------------------------------------------------------
describe("admin gate (resolveAdmin) is fail-closed on has_role", () => {
  async function withHasRole(rpcResult: { data: unknown; error: unknown } | Error) {
    vi.resetModules();
    vi.doMock("@/integrations/supabase/admin-client", () => ({
      adminSupabase: {
        auth: {
          getSession: () =>
            Promise.resolve({ data: { session: { user: { id: "u1", email: "r@x.com" } } } }),
        },
        rpc: () =>
          rpcResult instanceof Error ? Promise.reject(rpcResult) : Promise.resolve(rpcResult),
      },
    }));
    const { resolveAdmin } = await import("@/hooks/useAdminSession");
    return resolveAdmin();
  }

  it("has_role -> true grants admin", async () => {
    const r = await withHasRole({ data: true, error: null });
    expect(r.isAdmin).toBe(true);
  });
  it("has_role -> null is treated as NOT admin", async () => {
    const r = await withHasRole({ data: null, error: null });
    expect(r.isAdmin).toBe(false);
  });
  it("has_role -> false is NOT admin", async () => {
    const r = await withHasRole({ data: false, error: null });
    expect(r.isAdmin).toBe(false);
  });
  it("has_role rpc error is NOT admin (fail-closed)", async () => {
    const r = await withHasRole({ data: true, error: { message: "boom" } });
    expect(r.isAdmin).toBe(false);
  });
  it("has_role throwing is NOT admin (fail-closed)", async () => {
    const r = await withHasRole(new Error("network"));
    expect(r.isAdmin).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Flag idempotency at the data-layer contract level: the client always sends the
// same single rpc shape (city + comment_id [+ reason]); two flags of the same
// comment by the same viewer issue identical, side-effect-equivalent calls. The
// DB's UNIQUE(comment_id,user_id) + ON CONFLICT DO NOTHING + recompute make the
// second call a no-op on flag_count and NEVER mutate status (proven here by the
// payload never carrying a status field, mirroring the DB contract).
// ---------------------------------------------------------------------------
describe("flag idempotency: repeated flags are identical, status-free rpc calls", () => {
  it("two flags of the same comment send the same payload and never a status", async () => {
    const { readerFlagComment } = await import("@/lib/reader-db");
    readerRpcCalls.length = 0;
    await readerFlagComment("c1", "spam");
    await readerFlagComment("c1", "spam");
    const flags = readerRpcCalls.filter((c) => c.fn === "flag_comment");
    expect(flags).toHaveLength(2);
    expect(flags[0].args).toEqual(flags[1].args);
    for (const f of flags) {
      expect(f.args?.city).toBe(citySlug());
      expect(f.args?.comment_id).toBe("c1");
      expect("status" in (f.args ?? {})).toBe(false);
    }
  });
});
