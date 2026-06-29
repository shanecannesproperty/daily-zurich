import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { adminSupabase } from "@/integrations/supabase/admin-client";
import { Wordmark } from "@/components/Wordmark";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  component: ResetPassword,
});

function ResetPassword() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    const { error } = await adminSupabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    setInfo("Password updated. Redirecting.");
    setTimeout(() => router.navigate({ to: "/admin" }), 800);
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm border border-[var(--ink)] p-8 bg-background">
        <div className="flex flex-col items-center mb-6">
          <Wordmark className="h-8 w-auto" />
          <p className="meta uppercase tracking-widest mt-3">Set new password</p>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label htmlFor="password" className="meta block mb-1">
              New password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              className="field w-full"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="confirm" className="meta block mb-1">
              Confirm password
            </label>
            <input
              id="confirm"
              type="password"
              autoComplete="new-password"
              required
              className="field w-full"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>
          {error ? <p className="text-sm text-[var(--ink-red)]">{error}</p> : null}
          {info ? <p className="text-sm">{info}</p> : null}
          <button type="submit" disabled={busy} className="btn-primary w-full">
            {busy ? "Updating" : "Update password"}
          </button>
        </form>
      </div>
    </div>
  );
}
