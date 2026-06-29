// Public + admin server functions for the Design Agent.
// Public: read token overrides for SSR injection.
// Admin: list proposals, approve/reject, revert applied token changes.
import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "@/integrations/supabase/config";

function publicClient() {
  return createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
  });
}

export type DesignToken = {
  token_name: string;
  default_value: string;
  current_value: string;
  selector: string;
  locked: boolean;
  unit: string | null;
  min_value: string | null;
  max_value: string | null;
  kind: string;
  description: string | null;
};

// Public: returns an inline CSS string of token overrides that differ from
// defaults. SSR-safe; degrades to empty string on error (the static design
// system already covers defaults).
export const getDesignTokenCss = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const sb = publicClient();
    const { data, error } = await sb
      .from("design_tokens")
      .select("token_name,current_value,default_value,selector,locked")
      .eq("locked", false);
    if (error || !data || data.length === 0) return { css: "" };

    const bySelector = new Map<string, string[]>();
    for (const row of data) {
      if (row.current_value === row.default_value) continue;
      const sel = row.selector || ":root";
      const arr = bySelector.get(sel) ?? [];
      arr.push(`${row.token_name}: ${row.current_value};`);
      bySelector.set(sel, arr);
    }
    if (bySelector.size === 0) return { css: "" };

    const css = Array.from(bySelector.entries())
      .map(([sel, decls]) => `${sel}{${decls.join("")}}`)
      .join("");
    return { css };
  } catch {
    return { css: "" };
  }
});
