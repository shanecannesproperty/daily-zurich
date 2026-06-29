import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AdminShell } from "@/components/AdminShell";
import { useAdminSession } from "@/hooks/useAdminSession";
import { adminSupabase } from "@/integrations/supabase/admin-client";
import { citySlug } from "@/lib/city";

export const Route = createFileRoute("/admin/")({
  ssr: false,
  component: AdminDashboard,
});

interface Counts {
  articles: number;
  drafts: number;
  guides: number;
  listings: number;
  events: number;
  subscribers: number;
  enquiriesNew: number;
  commentsPending: number;
}

function AdminDashboard() {
  const { email } = useAdminSession();
  const [counts, setCounts] = useState<Counts | null>(null);

  useEffect(() => {
    if (!email) return;
    (async () => {
      const count = (table: string) =>
        adminSupabase.from(table).select("id", { count: "exact", head: true }).eq("city", citySlug());
      const [a, d, g, l, e, s, n, cp] = await Promise.all([
        count("articles"),
        adminSupabase
          .from("articles")
          .select("id", { count: "exact", head: true })
          .eq("city", citySlug())
          .eq("is_published", false),
        count("guides"),
        count("listings"),
        count("events"),
        count("subscribers"),
        adminSupabase
          .from("enquiries")
          .select("id", { count: "exact", head: true })
          .eq("city", citySlug())
          .eq("status", "new"),
        adminSupabase
          .from("article_comments")
          .select("id", { count: "exact", head: true })
          .eq("city", citySlug())
          .eq("status", "pending"),
      ]);
      setCounts({
        articles: a.count ?? 0,
        drafts: d.count ?? 0,
        guides: g.count ?? 0,
        listings: l.count ?? 0,
        events: e.count ?? 0,
        subscribers: s.count ?? 0,
        enquiriesNew: n.count ?? 0,
        commentsPending: cp.count ?? 0,
      });
    })();
  }, [email]);

  const cards: Array<{ label: string; value: number | string; href: string }> = counts
    ? [
        { label: "Articles", value: counts.articles, href: "/admin/articles" },
        { label: "Drafts", value: counts.drafts, href: "/admin/articles" },
        { label: "Guides", value: counts.guides, href: "/admin/guides" },
        { label: "Listings", value: counts.listings, href: "/admin/listings" },
        { label: "Events", value: counts.events, href: "/admin/events" },
        { label: "Subscribers", value: counts.subscribers, href: "/admin/analytics" },
        { label: "New enquiries", value: counts.enquiriesNew, href: "/admin/inbox" },
        { label: "Comments pending", value: counts.commentsPending, href: "/admin/comments" },
      ]
    : [];

  return (
    <AdminShell title="Newsroom" email={email} activePath="/admin">
      {!counts ? (
        <p className="meta">Loading counts</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-px bg-[var(--hairline)] border border-[var(--hairline)]">
          {cards.map((c) => (
            <a
              key={c.label}
              href={c.href}
              className="bg-background p-6 no-underline hover:bg-[var(--surface)]"
            >
              <p className="meta uppercase tracking-widest">{c.label}</p>
              <p className="serif text-4xl mt-2">{c.value}</p>
            </a>
          ))}
        </div>
      )}
    </AdminShell>
  );
}
