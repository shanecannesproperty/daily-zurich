import { useEffect, useState } from "react";
import { useDebugState } from "@/lib/debug-store";
import { adminSupabase } from "@/integrations/supabase/admin-client";
import { citySlug } from "@/lib/city";

type Conn = {
  email: string | null;
  expiresAt: string | null;
  hasSession: boolean;
};

export function AdminDebugOverlay() {
  const debug = useDebugState();
  const [open, setOpen] = useState(true);
  const [conn, setConn] = useState<Conn>({ email: null, expiresAt: null, hasSession: false });

  useEffect(() => {
    let active = true;
    adminSupabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      const s = data.session;
      setConn({
        hasSession: !!s,
        email: s?.user?.email ?? null,
        expiresAt: s?.expires_at ? new Date(s.expires_at * 1000).toISOString() : null,
      });
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div
      className="fixed bottom-3 right-3 z-50 max-w-sm border border-[var(--hairline)] bg-[var(--surface)] text-[var(--ink)] shadow-sm"
      style={{ fontFamily: "ui-monospace, 'Fira Mono', monospace", fontSize: 11 }}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-3 py-1.5 border-b border-[var(--hairline)]"
        aria-expanded={open}
        aria-controls="admin-debug-body"
      >
        <span className="kicker">Debug</span>
        <span>{open ? "hide" : "show"}</span>
      </button>
      {open ? (
        <div id="admin-debug-body" className="p-3 space-y-2">
          <div>
            <div className="opacity-60">Connection</div>
            <div>session: {conn.hasSession ? "yes" : "no"}</div>
            {conn.email ? <div>email: {conn.email}</div> : null}
            {conn.expiresAt ? <div>expires: {conn.expiresAt}</div> : null}
          </div>
          <div>
            <div className="opacity-60">City filter</div>
            <div>city = {citySlug()}</div>
          </div>
          <div>
            <div className="opacity-60">Last query</div>
            {debug.lastQuery ? (
              <div>
                <div>table: {debug.lastQuery.table}</div>
                <div>filter: {debug.lastQuery.filter}</div>
                <div>
                  rows: {debug.lastQuery.count} · {debug.lastQuery.durationMs}ms ·{" "}
                  {debug.lastQuery.ok ? "ok" : "ERR"}
                </div>
                {debug.lastQuery.error ? (
                  <div style={{ color: "var(--ink-red)" }}>err: {debug.lastQuery.error}</div>
                ) : null}
              </div>
            ) : (
              <div className="opacity-60">none yet</div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
