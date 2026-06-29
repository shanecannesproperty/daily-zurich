import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getSupabaseEnvStatus, type EnvStatus } from "@/lib/diagnostics.functions";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "@/integrations/supabase/config";

const DISMISS_KEY = "env-preflight-dismissed";

export function EnvPreflightBanner() {
  const fetchStatus = useServerFn(getSupabaseEnvStatus);
  const [status, setStatus] = useState<EnvStatus | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(DISMISS_KEY) === "1") setDismissed(true);
    } catch {
      // ignore
    }
    fetchStatus()
      .then(setStatus)
      .catch(() => setStatus(null));
  }, [fetchStatus]);

  if (dismissed || !status) return null;

  const missing: string[] = [];
  if (!status.serverSupabaseUrl) missing.push("SUPABASE_URL");
  if (!status.serverPublishableKey) missing.push("SUPABASE_PUBLISHABLE_KEY");
  if (!SUPABASE_URL) missing.push("client SUPABASE_URL constant");
  if (!SUPABASE_PUBLISHABLE_KEY) missing.push("client SUPABASE_PUBLISHABLE_KEY constant");

  if (missing.length === 0) return null;

  return (
    <div
      role="status"
      className="border-b border-[var(--hairline)] bg-[var(--surface)] text-[var(--ink)]"
    >
      <div className="container-news py-2 flex items-start justify-between gap-4 text-sm">
        <div>
          <span className="kicker mr-2">Preflight</span>
          Missing Supabase config: <code className="font-mono text-xs">{missing.join(", ")}</code>
        </div>
        <button
          type="button"
          onClick={() => {
            try {
              sessionStorage.setItem(DISMISS_KEY, "1");
            } catch {
              // ignore
            }
            setDismissed(true);
          }}
          className="text-xs underline underline-offset-2"
          aria-label="Dismiss preflight warning"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
