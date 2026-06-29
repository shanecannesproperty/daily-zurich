import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { adminSupabase } from "@/integrations/supabase/admin-client";
import { resolveAdmin } from "@/hooks/useAdminSession";
import { claimFirstAdmin } from "@/lib/admin-bootstrap.functions";
import { Wordmark } from "@/components/Wordmark";

export const Route = createFileRoute("/admin/login")({
  ssr: false,
  component: AdminLogin,
});

function AdminLogin() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resetting, setResetting] = useState(false);

  async function onForgot() {
    setError(null);
    setInfo(null);
    const target = email.trim();
    if (!target) {
      setError("Enter your email first.");
      return;
    }
    setResetting(true);
    const { error } = await adminSupabase.auth.resetPasswordForEmail(target, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setResetting(false);
    if (error) {
      setError(error.message);
      return;
    }
    setInfo(`Password reset email sent to ${target}.`);
  }

  useEffect(() => {
    resolveAdmin().then(({ isAdmin }) => {
      if (isAdmin) router.navigate({ to: "/admin" });
    });
  }, [router]);

  async function tryClaimFirstAdmin(): Promise<boolean> {
    // First signed-in user can claim admin once. Subsequent calls return false.
    try {
      const res = await claimFirstAdmin();
      return res.claimed === true;
    } catch {
      return false;
    }
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setInfo(null);

    if (mode === "signup") {
      const { error } = await adminSupabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/admin/login` },
      });
      if (error) {
        setBusy(false);
        setError(error.message);
        return;
      }
      // Try to claim the first-admin slot immediately (works only if session
      // is active, i.e. email confirmation is off).
      const claimed = await tryClaimFirstAdmin();
      setBusy(false);
      if (claimed) {
        router.navigate({ to: "/admin" });
        return;
      }
      setInfo(
        "Account created. If email confirmation is on, confirm via the link in your inbox, then sign in.",
      );
      setMode("signin");
      return;
    }

    const { error } = await adminSupabase.auth.signInWithPassword({ email, password });
    if (error) {
      setBusy(false);
      setError(error.message);
      return;
    }
    let { isAdmin } = await resolveAdmin();
    if (!isAdmin) {
      // Self-serve bootstrap: grants admin only while no admin exists yet.
      const claimed = await tryClaimFirstAdmin();
      if (claimed) isAdmin = true;
    }
    setBusy(false);
    if (!isAdmin) {
      await adminSupabase.auth.signOut();
      setError("This account is not an admin.");
      return;
    }
    router.navigate({ to: "/admin" });
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm border border-[var(--ink)] p-8 bg-background">
        <div className="flex flex-col items-center mb-6">
          <Wordmark className="h-8 w-auto" />
          <p className="meta uppercase tracking-widest mt-3">Admin {mode === "signup" ? "sign up" : "sign in"}</p>
        </div>
        <div className="flex justify-center gap-4 mb-4 text-sm">
          <button
            type="button"
            onClick={() => { setMode("signin"); setError(null); setInfo(null); }}
            className={mode === "signin" ? "underline" : "opacity-60"}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => { setMode("signup"); setError(null); setInfo(null); }}
            className={mode === "signup" ? "underline" : "opacity-60"}
          >
            Sign up
          </button>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="meta block mb-1">Email</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              className="field w-full"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="password" className="meta block mb-1">Password</label>
            <input
              id="password"
              type="password"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              required
              minLength={8}
              className="field w-full"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error ? <p className="text-sm text-[var(--ink-red)]">{error}</p> : null}
          {info ? <p className="text-sm">{info}</p> : null}
          <button type="submit" disabled={busy} className="btn-primary w-full">
            {busy ? "Working" : mode === "signup" ? "Create account" : "Sign in"}
          </button>
          {mode === "signin" && (
            <button
              type="button"
              onClick={onForgot}
              disabled={resetting}
              className="meta uppercase tracking-widest underline opacity-70 hover:opacity-100 w-full text-center"
            >
              {resetting ? "Sending reset email" : "Forgot password?"}
            </button>
          )}
        </form>
        <p className="meta mt-4 text-center">
          The first account to sign in becomes the admin automatically.
        </p>
      </div>
    </div>
  );
}
