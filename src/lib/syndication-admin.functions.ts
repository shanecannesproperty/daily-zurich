// Admin-only RSS ingest trigger used by the syndication admin UI. Verifies the
// caller holds the 'admin' role before running the ingestion job. Public cron
// runs the same code via the shared-secret-gated /api/public/hooks/rss-ingest.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const adminRunRssIngest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin, error: roleErr } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (roleErr || isAdmin !== true) {
      throw new Error("Forbidden");
    }
    const { runRssIngest } = await import("@/lib/rss-ingest.server");
    return await runRssIngest();
  });
