import { useEffect, useState } from "react";
import { useRouter, useRouterState } from "@tanstack/react-router";
import { adminSupabase } from "@/integrations/supabase/admin-client";

export interface AdminSessionState {
  loading: boolean;
  email: string | null;
  // True ONLY when the signed-in user holds the 'admin' role in user_roles
  // (verified via the has_role SECURITY DEFINER rpc), NOT merely authenticated.
  // The /admin gate keys off this, so a magic-link reader (who has no role row)
  // can never reach /admin/* even though they have a Supabase session.
  isAdmin: boolean;
}

// Resolve whether the current admin-client session belongs to an admin. RLS +
// the moderate_comment rpc enforce the role server-side regardless of this
// client check; this hook only drives the UI gate/redirect. A null/failed
// has_role result is treated as NOT admin (fail-closed).
export async function resolveAdmin(): Promise<{ email: string | null; isAdmin: boolean }> {
  const { data } = await adminSupabase.auth.getSession();
  const session = data.session;
  if (!session?.user) return { email: null, isAdmin: false };
  const email = session.user.email ?? null;
  try {
    const res = await adminSupabase.rpc("has_role", {
      _user_id: session.user.id,
      _role: "admin",
    });
    return { email, isAdmin: res.error ? false : res.data === true };
  } catch {
    return { email, isAdmin: false };
  }
}

export function useAdminSession(): AdminSessionState {
  const router = useRouter();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [state, setState] = useState<AdminSessionState>({
    loading: true,
    email: null,
    isAdmin: false,
  });

  useEffect(() => {
    let active = true;

    function applyAndGate(next: { email: string | null; isAdmin: boolean }) {
      if (!active) return;
      setState({ loading: false, email: next.email, isAdmin: next.isAdmin });
      // Redirect anyone who is not a verified admin (signed-out OR a non-admin
      // authenticated reader) away from the admin area.
      if (!next.isAdmin && pathname !== "/admin/login") {
        router.navigate({ to: "/admin/login" });
      }
    }

    resolveAdmin().then(applyAndGate);
    const { data: sub } = adminSupabase.auth.onAuthStateChange(() => {
      resolveAdmin().then(applyAndGate);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [router, pathname]);

  return state;
}
