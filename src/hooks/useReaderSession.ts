import { useEffect, useState } from "react";
import { readerSupabase } from "@/integrations/supabase/reader-client";

export interface ReaderSessionState {
  loading: boolean;
  userId: string | null;
  email: string | null;
}

// Reader (public commenter) session. Unlike useAdminSession this NEVER redirects:
// a signed-out reader simply sees the sign-in card inside ArticleComments, and
// the approved comment list renders for everyone regardless. A reader holds no
// user_roles row, so this session can never reach /admin/* (which is gated on
// has_role('admin')).
export function useReaderSession(): ReaderSessionState {
  const [state, setState] = useState<ReaderSessionState>({
    loading: true,
    userId: null,
    email: null,
  });

  useEffect(() => {
    let active = true;
    readerSupabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setState({
        loading: false,
        userId: data.session?.user?.id ?? null,
        email: data.session?.user?.email ?? null,
      });
    });
    const { data: sub } = readerSupabase.auth.onAuthStateChange((_event, session) => {
      setState({
        loading: false,
        userId: session?.user?.id ?? null,
        email: session?.user?.email ?? null,
      });
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return state;
}
