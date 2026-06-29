// Bootstrap server function for the first admin claim.
// Locked-down replacement for the old public.claim_first_admin RPC which is no
// longer reachable via PostgREST. The caller must already be signed in; only
// the first such caller (when no admin row exists yet) succeeds.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const claimFirstAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: existing, error: existingErr } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin")
      .limit(1);
    if (existingErr) throw new Error(existingErr.message);
    if ((existing ?? []).length > 0) return { claimed: false };

    const { error: insertErr } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: context.userId, role: "admin" });
    if (insertErr) throw new Error(insertErr.message);
    return { claimed: true };
  });
