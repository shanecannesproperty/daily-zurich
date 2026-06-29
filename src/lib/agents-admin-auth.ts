// Shared auth helpers for /api/admin/* agent control endpoints.
import { createClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "@/integrations/supabase/config";
import { citySlug } from "@/lib/city";

export const ADMIN_EMAIL = "shane@spexperts.com.au";

// Re-exported so /api/admin/* routes can import a single CITY constant
// without each calling citySlug() at module scope.
export const CITY = citySlug();


export function sha256Hex(input: string) {
  return createHash("sha256").update(input).digest("hex");
}

export function getIp(request: Request) {
  return (
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    null
  );
}

export function readEnv(name: string) {
  return typeof process !== "undefined" ? (process.env[name] ?? "") : "";
}

export type AuthorisedActor = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  writeClient: any;
  source: "ui-bearer" | "api-secret";
  actorUserId: string | null;
  actorEmail: string | null;
  secretHash: string | null;
};

export async function authoriseAgentRequest(
  request: Request,
): Promise<{ ok: true; actor: AuthorisedActor } | { ok: false; status: number; error: string; step: string }> {
  const headerSecret = request.headers.get("x-agents-trigger-secret") ?? "";
  const auth = request.headers.get("authorization") ?? "";
  const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7) : "";

  const url = readEnv("SUPABASE_URL") || readEnv("VITE_SUPABASE_URL") || SUPABASE_URL;
  const publishable =
    readEnv("SUPABASE_PUBLISHABLE_KEY") ||
    readEnv("VITE_SUPABASE_PUBLISHABLE_KEY") ||
    SUPABASE_PUBLISHABLE_KEY;
  const serviceKey = readEnv("SUPABASE_SERVICE_ROLE_KEY");
  const triggerSecret = readEnv("AGENTS_TRIGGER_SECRET");
  if (!url || !publishable) {
    return { ok: false, status: 400, error: "Missing server configuration", step: "preflight" };
  }

  let authorized = false;
  let source: "ui-bearer" | "api-secret" = "api-secret";
  let actorUserId: string | null = null;
  let actorEmail: string | null = null;
  let secretHash: string | null = null;
  let userToken: string | null = null;

  if (triggerSecret && headerSecret && headerSecret === triggerSecret) {
    authorized = true;
    source = "api-secret";
    secretHash = sha256Hex(headerSecret);
  } else if (token) {
    const userClient = createClient(url, publishable, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    });
    const { data, error } = await userClient.auth.getUser(token);
    if (!error && data.user) {
      let hasAdminRole = data.user.email === ADMIN_EMAIL;
      if (!hasAdminRole) {
        const { data: roleOk } = await userClient.rpc("has_role", {
          _user_id: data.user.id,
          _role: "admin",
        });
        hasAdminRole = roleOk === true;
      }
      if (hasAdminRole) {
        authorized = true;
        source = "ui-bearer";
        actorUserId = data.user.id;
        actorEmail = data.user.email ?? null;
        userToken = token;
      }
    }
  }

  if (!authorized) return { ok: false, status: 401, error: "Unauthorized", step: "authorise" };

  const writeClient = serviceKey
    ? createClient(url, serviceKey, {
        auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
      })
    : userToken
      ? createClient(url, publishable, {
          global: { headers: { Authorization: `Bearer ${userToken}` } },
          auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
        })
      : null;

  if (!writeClient) {
    return {
      ok: false,
      status: 400,
      error: "No write client available. Sign in as admin or configure SUPABASE_SERVICE_ROLE_KEY.",
      step: "create-write-client",
    };
  }

  return {
    ok: true,
    actor: { writeClient, source, actorUserId, actorEmail, secretHash },
  };
}

export async function writeAudit(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  writeClient: any,
  payload: {
    source: string;
    actor_user_id: string | null;
    actor_email: string | null;
    secret_hash: string | null;
    ip: string | null;
    user_agent: string | null;
    agents_queued: number;
    ok: boolean;
    error?: string | null;
  },
) {
  try {
    await writeClient.from("agent_trigger_audit").insert({ city: citySlug(), ...payload });
  } catch {
    /* best-effort */
  }
}
