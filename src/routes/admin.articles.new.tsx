import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AdminShell, PublishChecklist } from "@/components/AdminShell";
import { useAdminSession } from "@/hooks/useAdminSession";
import {
  Field,
  TextInput,
  TextArea,
  Select,
  Checkbox,
  slugify,
} from "@/components/admin/AdminFields";
import { adminGet, adminInsert, adminUpdate, adminDelete, isValidByline } from "@/lib/admin-db";
import { ARTICLE_CATEGORIES, CATEGORY_LABELS, type ArticleCategory } from "@/lib/schema";

interface FormState {
  slug: string;
  title: string;
  dek: string;
  body_html: string;
  author: string;
  category: ArticleCategory;
  hero_image: string;
  source_urls: string; // newline separated
  is_published: boolean;
  published_at: string | null;
}

function blank(): FormState {
  return {
    slug: "",
    title: "",
    dek: "",
    body_html: "",
    author: "",
    category: "news",
    hero_image: "",
    source_urls: "",
    is_published: false,
    published_at: null,
  };
}

export function ArticleEditor({ id }: { id?: string }) {
  const router = useRouter();
  const { email } = useAdminSession();
  const [form, setForm] = useState<FormState>(blank());
  const [loaded, setLoaded] = useState<boolean>(!id);
  // The hero_image value as last persisted. Used to detect when an editor
  // swaps the hero so we can clear the agent's stale source/credit (below).
  const [savedHero, setSavedHero] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"write" | "preview">("write");

  useEffect(() => {
    if (!id || !email) return;
    adminGet("articles", id).then(({ data }) => {
      if (!data) {
        setError("Not found");
        setLoaded(true);
        return;
      }
      setForm({
        slug: data.slug ?? "",
        title: data.title ?? "",
        dek: data.dek ?? "",
        body_html: data.body_html ?? "",
        author: data.author ?? "",
        category: (data.category as ArticleCategory) ?? "news",
        hero_image: data.hero_image ?? "",
        source_urls: (data.source_urls ?? []).join("\n"),
        is_published: !!data.is_published,
        published_at: data.published_at ?? null,
      });
      setSavedHero(data.hero_image ?? "");
      setLoaded(true);
    });
  }, [id, email]);

  function patch<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  const bylineOk = useMemo(() => isValidByline(form.author), [form.author]);

  async function save(publishNow: boolean | null) {
    setBusy(true);
    setError(null);
    const wantPublished = publishNow === null ? form.is_published : publishNow;
    if (wantPublished && !bylineOk) {
      setError(
        "A real human byline (first and last name) is required before publishing. 'Admin' and 'The Team' are not allowed.",
      );
      setBusy(false);
      return;
    }
    if (!form.title.trim() || !form.slug.trim()) {
      setError("Title and slug are required.");
      setBusy(false);
      return;
    }
    const heroValue = form.hero_image.trim() || null;
    const payload: Record<string, unknown> = {
      slug: form.slug.trim(),
      title: form.title.trim(),
      dek: form.dek.trim() || null,
      body_html: form.body_html,
      author: form.author.trim() || null,
      category: form.category,
      hero_image: heroValue,
      source_urls: form.source_urls
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
      is_published: wantPublished,
    };
    // When the editor changes the hero by hand, drop any stale agent-supplied
    // source/credit so the image is treated as an editorial choice. The image
    // agents only auto-manage heroes whose source is non-null, so a NULL source
    // is what protects this photo from being pruned or swapped after publish.
    if ((heroValue ?? "") !== savedHero) {
      payload.hero_image_source = null;
      payload.hero_image_credit = null;
    }
    if (wantPublished && !form.published_at) {
      payload.published_at = new Date().toISOString();
    }
    const res = id
      ? await adminUpdate("articles", id, payload)
      : await adminInsert("articles", payload);
    setBusy(false);
    if (res.error) {
      setError(res.error.message);
      return;
    }
    if (!id && res.data?.id) {
      router.navigate({ to: "/admin/articles/$id", params: { id: res.data.id } });
    } else {
      // Refresh local state from server response
      if (res.data) {
        setForm((f) => ({
          ...f,
          is_published: !!res.data.is_published,
          published_at: res.data.published_at,
        }));
        setSavedHero(res.data.hero_image ?? "");
      }
    }
  }

  async function remove() {
    if (!id) return;
    if (!confirm("Delete this article? This cannot be undone.")) return;
    setBusy(true);
    const { error } = await adminDelete("articles", id);
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.navigate({ to: "/admin/articles" });
  }

  if (!loaded) {
    return (
      <AdminShell title="Article" email={email} activePath="/admin/articles">
        <p className="meta">Loading</p>
      </AdminShell>
    );
  }

  return (
    <AdminShell
      title={id ? "Edit article" : "New article"}
      email={email}
      activePath="/admin/articles"
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <Field label="Title">
            <TextInput
              value={form.title}
              onChange={(v) => {
                patch("title", v);
                if (!id && !form.slug) patch("slug", slugify(v));
              }}
              required
            />
          </Field>
          <Field label="Slug" hint="URL: /article/{slug}">
            <TextInput value={form.slug} onChange={(v) => patch("slug", slugify(v))} required />
          </Field>
          <Field label="Dek (standfirst)">
            <TextArea value={form.dek} onChange={(v) => patch("dek", v)} rows={2} />
          </Field>
          <Field label="Body (HTML)">
            <div className="border border-[var(--hairline)]">
              <div className="flex border-b border-[var(--hairline)]">
                <button
                  type="button"
                  className={`px-4 py-2 text-sm ${tab === "write" ? "bg-[var(--surface)]" : ""}`}
                  onClick={() => setTab("write")}
                >
                  Write
                </button>
                <button
                  type="button"
                  className={`px-4 py-2 text-sm ${tab === "preview" ? "bg-[var(--surface)]" : ""}`}
                  onClick={() => setTab("preview")}
                >
                  Preview
                </button>
              </div>
              {tab === "write" ? (
                <TextArea
                  value={form.body_html}
                  onChange={(v) => patch("body_html", v)}
                  rows={18}
                  placeholder="<p>Write paragraphs as <p>...</p>. Use <h2>, <h3>, <a href>, <blockquote>, <img src>.</p>"
                />
              ) : (
                <div
                  className="prose-news p-4 max-w-none"
                  dangerouslySetInnerHTML={{
                    __html: form.body_html || "<p class='meta'>Nothing to preview</p>",
                  }}
                />
              )}
            </div>
          </Field>
          <Field label="Source URLs" hint="One URL per line. Required for credibility.">
            <TextArea value={form.source_urls} onChange={(v) => patch("source_urls", v)} rows={4} />
          </Field>
        </div>
        <aside className="space-y-4">
          <Field label="Author (named byline)">
            <TextInput value={form.author} onChange={(v) => patch("author", v)} />
            {!bylineOk && form.author ? (
              <span className="meta block mt-1 text-[var(--ink-red)]">
                Use a real first and last name.
              </span>
            ) : null}
          </Field>
          <Field label="Section">
            <Select
              value={form.category}
              onChange={(v) => patch("category", v as ArticleCategory)}
              options={ARTICLE_CATEGORIES.map((c) => ({ value: c, label: CATEGORY_LABELS[c] }))}
            />
          </Field>
          <Field label="Hero image URL">
            <TextInput value={form.hero_image} onChange={(v) => patch("hero_image", v)} />
          </Field>
          <div className="border border-[var(--hairline)] p-4">
            <p className="meta uppercase tracking-widest mb-2">Status</p>
            <p className="text-sm mb-3">
              {form.is_published ? "Published" : "Draft"}
              {form.published_at
                ? ` (since ${new Date(form.published_at).toLocaleString("en-AU")})`
                : ""}
            </p>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => save(null)} disabled={busy} className="btn-ghost">
                Save
              </button>
              {form.is_published ? (
                <button onClick={() => save(false)} disabled={busy} className="btn-ghost">
                  Unpublish
                </button>
              ) : (
                <button
                  onClick={() => save(true)}
                  disabled={busy || !bylineOk}
                  className="btn-primary"
                >
                  Publish
                </button>
              )}
            </div>
          </div>
          <PublishChecklist />
          {error ? <p className="text-sm text-[var(--ink-red)]">{error}</p> : null}
          {id ? (
            <button onClick={remove} disabled={busy} className="btn-ghost text-[var(--ink-red)]">
              Delete article
            </button>
          ) : null}
        </aside>
      </div>
    </AdminShell>
  );
}

export const Route = createFileRoute("/admin/articles/new")({
  ssr: false,
  component: () => <ArticleEditor />,
});
