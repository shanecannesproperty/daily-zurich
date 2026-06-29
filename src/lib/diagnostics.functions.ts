// Returns booleans about which server-side Supabase env vars are configured.
// Never returns the values themselves.
import { createServerFn } from "@tanstack/react-start";

export type EnvStatus = {
  serverSupabaseUrl: boolean;
  serverPublishableKey: boolean;
  serverServiceRoleKey: boolean;
  agentsTriggerSecret: boolean;
};

export const getSupabaseEnvStatus = createServerFn({ method: "GET" }).handler(
  async (): Promise<EnvStatus> => {
    const has = (k: string) => {
      const v = process.env[k];
      return typeof v === "string" && v.length > 0;
    };
    return {
      serverSupabaseUrl: has("SUPABASE_URL") || has("VITE_SUPABASE_URL"),
      serverPublishableKey: has("SUPABASE_PUBLISHABLE_KEY") || has("VITE_SUPABASE_PUBLISHABLE_KEY"),
      serverServiceRoleKey: has("SUPABASE_SERVICE_ROLE_KEY"),
      agentsTriggerSecret: has("AGENTS_TRIGGER_SECRET"),
    };
  },
);
