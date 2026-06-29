import { Link, useRouter } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { adminSupabase } from "@/integrations/supabase/admin-client";
import { Wordmark } from "./Wordmark";
import { AgentsStatusPanel } from "./AgentsStatusPanel";

const NAV: Array<{ to: string; label: string }> = [
  { to: "/admin", label: "Dashboard" },
  { to: "/admin/syndicated", label: "Syndicated queue" },
  { to: "/admin/review", label: "Editorial review" },
  { to: "/admin/articles", label: "Articles" },
  { to: "/admin/guides", label: "Guides" },
  { to: "/admin/listings", label: "Listings" },
  { to: "/admin/events", label: "Events" },
  { to: "/admin/images", label: "Images" },
  { to: "/admin/article-images", label: "Hero audit" },


  { to: "/admin/comments", label: "Comments" },
  { to: "/admin/inbox", label: "Inbox" },
  { to: "/admin/analytics", label: "Analytics" },
  { to: "/admin/network", label: "Network" },
  { to: "/admin/agents", label: "AI Agents" },
  { to: "/admin/design-agent", label: "Design Agent" },
  { to: "/admin/domain-health", label: "Domain health" },
];

export function AdminShell({
  title,
  children,
  email,
  activePath,
}: {
  title: string;
  children: ReactNode;
  email?: string | null;
  activePath?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function signOut() {
    setBusy(true);
    await adminSupabase.auth.signOut();
    router.navigate({ to: "/admin/login" });
  }
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-[var(--ink)] bg-background">
        <div className="container-news flex items-center justify-between gap-4 py-4">
          <Link to="/admin" className="flex items-center gap-3 no-underline">
            <Wordmark className="h-7 w-auto" />
            <span className="meta uppercase tracking-widest">Admin</span>
          </Link>
          <div className="flex items-center gap-3">
            {email ? (
              <span className="meta hidden sm:inline">{email}</span>
            ) : (
              <Link to="/admin/login" className="btn-primary text-xs">
                Admin login
              </Link>
            )}
            {email ? (
              <button onClick={signOut} disabled={busy} className="btn-ghost">
                {busy ? "Signing out" : "Sign out"}
              </button>
            ) : null}
          </div>
        </div>
        <nav aria-label="Admin sections" className="border-t border-[var(--hairline)]">
          <div className="container-news">
            <ul className="flex flex-wrap gap-x-6">
              {NAV.map((n) => (
                <li key={n.to}>
                  <a
                    href={n.to}
                    data-active={
                      activePath === n.to || (n.to !== "/admin" && activePath?.startsWith(n.to))
                    }
                    className="nav-link"
                  >
                    {n.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </nav>
      </header>
      {email ? <AgentsStatusPanel /> : null}
      <main className="container-news py-8">
        <h1 className="h1-news mb-6">{title}</h1>
        {children}
      </main>
    </div>
  );
}

export function PublishChecklist() {
  return (
    <aside className="mt-4 border border-[var(--hairline)] p-4 bg-[var(--surface)]">
      <p className="meta uppercase tracking-widest mb-2">Publish checklist</p>
      <ul className="text-sm space-y-1 list-disc pl-5">
        <li>Sourcing verified and at least one source URL attached.</li>
        <li>Every claim attributed in the copy.</li>
        <li>Right of reply offered where applicable.</li>
        <li>Fact and opinion clearly separated.</li>
        <li>Named human byline (no &quot;Admin&quot; or &quot;The Team&quot;).</li>
      </ul>
    </aside>
  );
}
