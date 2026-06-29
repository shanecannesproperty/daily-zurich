import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { AdminShell } from "@/components/AdminShell";
import { useAdminSession } from "@/hooks/useAdminSession";
import { Field, TextInput, TextArea, Select, slugify } from "@/components/admin/AdminFields";
import { adminGet, adminInsert, adminUpdate, adminDelete } from "@/lib/admin-db";
import type { GuideCategory } from "@/lib/schema";

const GUIDE_CATEGORIES: Array<{ value: GuideCategory; label: string }> = [
  { value: "food-dining", label: "Food and dining" },
  { value: "wellness", label: "Wellness" },
  { value: "services", label: "Services" },
  { value: "real-estate", label: "Real estate" },
  { value: "tourism", label: "Tourism" },
  { value: "things-to-do", label: "Things to do" },
];

const GUIDE_CATEGORY_VALUES = GUIDE_CATEGORIES.map((c) => c.value) as [
  GuideCategory,
  ...GuideCategory[],
];

// Coerce unknown DB rows into a typed form state. Missing/wrong-typed fields
// fall back to safe defaults so the UI never renders `undefined`/`{}`.
const str = z
  .unknown()
  .transform((v) => (typeof v === "string" ? v : ""))
  .pipe(z.string());

const guideFormSchema = z.object({
  slug: str,
  title: str,
  target_keyword: str,
  category: z
    .unknown()
    .transform((v) =>
      typeof v === "string" && (GUIDE_CATEGORY_VALUES as string[]).includes(v)
        ? (v as GuideCategory)
        : ("food-dining" as GuideCategory),
    ),
  intro_html: str,
  seo_title: str,
  meta_description: str,
  is_published: z.unknown().transform((v) => Boolean(v)),
});

type FormState = z.infer<typeof guideFormSchema>;

const blank: FormState = guideFormSchema.parse({});

export function GuideEditor({ id }: { id?: string }) {
  const router = useRouter();
  const { email } = useAdminSession();
  const [form, setForm] = useState<FormState>(blank);
  const [loaded, setLoaded] = useState<boolean>(!id);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id || !email) return;
    adminGet("guides", id).then(({ data }) => {
      if (data) {
        setForm(guideFormSchema.parse(data));
      }
      setLoaded(true);
    });
  }, [id, email]);

  function patch<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function save(publishNow: boolean | null) {
    setBusy(true);
    setError(null);
    const wantPublished = publishNow === null ? form.is_published : publishNow;
    if (!form.title.trim() || !form.slug.trim()) {
      setError("Title and slug are required.");
      setBusy(false);
      return;
    }
    const payload = {
      slug: form.slug.trim(),
      title: form.title.trim(),
      target_keyword: form.target_keyword.trim() || null,
      category: form.category,
      intro_html: form.intro_html,
      seo_title: form.seo_title.trim() || null,
      meta_description: form.meta_description.trim() || null,
      is_published: wantPublished,
    };
    const res = id
      ? await adminUpdate("guides", id, payload)
      : await adminInsert("guides", payload);
    setBusy(false);
    if (res.error) {
      setError(res.error.message);
      return;
    }
    if (!id && res.data?.id)
      router.navigate({ to: "/admin/guides/$id", params: { id: res.data.id } });
    else if (res.data) setForm((f) => ({ ...f, is_published: !!res.data.is_published }));
  }

  async function remove() {
    if (!id || !confirm("Delete this guide and all its entries?")) return;
    setBusy(true);
    const { error } = await adminDelete("guides", id);
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.navigate({ to: "/admin/guides" });
  }

  if (!loaded) {
    return (
      <AdminShell title="Guide" email={email} activePath="/admin/guides">
        <p className="meta">Loading</p>
      </AdminShell>
    );
  }

  return (
    <AdminShell title={id ? "Edit guide" : "New guide"} email={email} activePath="/admin/guides">
      <div className="max-w-3xl space-y-4">
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
        <div className="grid grid-cols-2 gap-4">
          <Field label="Slug" hint="URL: /best/{slug}">
            <TextInput value={form.slug} onChange={(v) => patch("slug", slugify(v))} required />
          </Field>
          <Field label="Category">
            <Select
              value={form.category}
              onChange={(v) => patch("category", v as GuideCategory)}
              options={GUIDE_CATEGORIES}
            />
          </Field>
        </div>
        <Field label="Target keyword">
          <TextInput value={form.target_keyword} onChange={(v) => patch("target_keyword", v)} />
        </Field>
        <Field label="Intro (HTML)">
          <TextArea value={form.intro_html} onChange={(v) => patch("intro_html", v)} rows={6} />
        </Field>
        <Field label="SEO title">
          <TextInput value={form.seo_title} onChange={(v) => patch("seo_title", v)} />
        </Field>
        <Field label="Meta description">
          <TextArea
            value={form.meta_description}
            onChange={(v) => patch("meta_description", v)}
            rows={2}
          />
        </Field>
        <p className="text-sm">Status: {form.is_published ? "Published" : "Draft"}</p>
        {error ? <p className="text-sm text-[var(--ink-red)]">{error}</p> : null}
        <div className="flex flex-wrap gap-2">
          <button onClick={() => save(null)} disabled={busy} className="btn-ghost">
            Save
          </button>
          {form.is_published ? (
            <button onClick={() => save(false)} disabled={busy} className="btn-ghost">
              Unpublish
            </button>
          ) : (
            <button onClick={() => save(true)} disabled={busy} className="btn-primary">
              Publish
            </button>
          )}
          {id ? (
            <button onClick={remove} disabled={busy} className="btn-ghost text-[var(--ink-red)]">
              Delete
            </button>
          ) : null}
        </div>
      </div>
      {id ? <GuideEntries guideId={id} /> : null}
    </AdminShell>
  );
}

function GuideEntries({ guideId }: { guideId: string }) {
  type EntryRow = {
    id: string;
    rank: number | null;
    business_name: string;
    source_url: string;
    is_featured: boolean;
    is_sponsored: boolean;
  };
  const [rows, setRows] = useState<EntryRow[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState({
    business_name: "",
    rank: "",
    source_url: "",
    website_url: "",
    booking_url: "",
    phone: "",
    image_url: "",
    suburb: "",
    blurb: "",
  });

  async function refresh() {
    const { adminListEntries } = await import("@/lib/admin-db");
    const { data } = await adminListEntries(guideId);
    setRows((data ?? []) as unknown as EntryRow[]);
  }

  useEffect(() => {
    refresh();
  }, [guideId]);

  async function addEntry() {
    setBusy(true);
    setError(null);
    const { isValidUrl, adminInsertEntry } = await import("@/lib/admin-db");
    if (!draft.business_name.trim()) {
      setError("Business name required.");
      setBusy(false);
      return;
    }
    if (!isValidUrl(draft.source_url)) {
      setError("Valid source URL required.");
      setBusy(false);
      return;
    }
    const { error } = await adminInsertEntry({
      guide_id: guideId,
      business_name: draft.business_name.trim(),
      rank: draft.rank ? Number(draft.rank) : null,
      source_url: draft.source_url.trim(),
      website_url: draft.website_url.trim() || null,
      booking_url: draft.booking_url.trim() || null,
      phone: draft.phone.trim() || null,
      image_url: draft.image_url.trim() || null,
      suburb: draft.suburb.trim() || null,
      blurb: draft.blurb.trim() || null,
      is_sponsored: false,
      is_featured: false,
    });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    setDraft({
      business_name: "",
      rank: "",
      source_url: "",
      website_url: "",
      booking_url: "",
      phone: "",
      image_url: "",
      suburb: "",
      blurb: "",
    });
    refresh();
  }

  async function patchEntry(id: string, p: Record<string, unknown>) {
    const { adminUpdateEntry } = await import("@/lib/admin-db");
    await adminUpdateEntry(id, p);
    refresh();
  }

  async function removeEntry(id: string) {
    if (!confirm("Remove this entry?")) return;
    const { adminDeleteEntry } = await import("@/lib/admin-db");
    await adminDeleteEntry(id);
    refresh();
  }

  return (
    <section className="mt-10">
      <h2 className="h-display text-2xl mb-4 pb-2 border-b border-[var(--ink)]">Ranked entries</h2>
      <div className="border border-[var(--hairline)] mb-6">
        <table className="w-full text-sm">
          <thead className="bg-[var(--surface)] border-b border-[var(--hairline)]">
            <tr>
              <th className="text-left p-2 w-16">Rank</th>
              <th className="text-left p-2">Business</th>
              <th className="text-left p-2">Source</th>
              <th className="text-left p-2 w-28">Flags</th>
              <th className="p-2 w-20"></th>
            </tr>
          </thead>
          <tbody>
            {(rows ?? []).map((r) => (
              <tr key={r.id} className="border-b border-[var(--hairline)]">
                <td className="p-2">
                  <input
                    type="number"
                    className="field w-16"
                    defaultValue={r.rank ?? ""}
                    onBlur={(e) =>
                      patchEntry(r.id, { rank: e.target.value ? Number(e.target.value) : null })
                    }
                  />
                </td>
                <td className="p-2 serif">{r.business_name}</td>
                <td className="p-2 truncate max-w-xs">
                  <a href={r.source_url} target="_blank" rel="noreferrer" className="underline">
                    {r.source_url}
                  </a>
                </td>
                <td className="p-2">
                  <label className="block text-xs">
                    <input
                      type="checkbox"
                      defaultChecked={r.is_featured}
                      onChange={(e) => patchEntry(r.id, { is_featured: e.target.checked })}
                    />{" "}
                    Featured
                  </label>
                  <label className="block text-xs">
                    <input
                      type="checkbox"
                      defaultChecked={r.is_sponsored}
                      onChange={(e) => patchEntry(r.id, { is_sponsored: e.target.checked })}
                    />{" "}
                    Sponsored
                  </label>
                </td>
                <td className="p-2 text-right">
                  <button
                    onClick={() => removeEntry(r.id)}
                    className="text-[var(--ink-red)] underline text-xs"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
            {rows && rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-4 text-center meta">
                  No entries yet
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <div className="border border-[var(--hairline)] p-4">
        <p className="meta uppercase tracking-widest mb-3">Add entry</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Business name">
            <TextInput
              value={draft.business_name}
              onChange={(v) => setDraft({ ...draft, business_name: v })}
              required
            />
          </Field>
          <Field label="Rank">
            <TextInput
              type="number"
              value={draft.rank}
              onChange={(v) => setDraft({ ...draft, rank: v })}
            />
          </Field>
          <Field label="Source URL (required)">
            <TextInput
              value={draft.source_url}
              onChange={(v) => setDraft({ ...draft, source_url: v })}
              required
            />
          </Field>
          <Field label="Website URL">
            <TextInput
              value={draft.website_url}
              onChange={(v) => setDraft({ ...draft, website_url: v })}
            />
          </Field>
          <Field label="Booking URL">
            <TextInput
              value={draft.booking_url}
              onChange={(v) => setDraft({ ...draft, booking_url: v })}
            />
          </Field>
          <Field label="Phone">
            <TextInput value={draft.phone} onChange={(v) => setDraft({ ...draft, phone: v })} />
          </Field>
          <Field label="Suburb">
            <TextInput value={draft.suburb} onChange={(v) => setDraft({ ...draft, suburb: v })} />
          </Field>
          <Field label="Image URL">
            <TextInput
              value={draft.image_url}
              onChange={(v) => setDraft({ ...draft, image_url: v })}
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Blurb">
              <TextArea
                value={draft.blurb}
                onChange={(v) => setDraft({ ...draft, blurb: v })}
                rows={2}
              />
            </Field>
          </div>
        </div>
        {error ? <p className="text-sm text-[var(--ink-red)] mt-2">{error}</p> : null}
        <button onClick={addEntry} disabled={busy} className="btn-primary mt-3">
          Add entry
        </button>
      </div>
    </section>
  );
}

export const Route = createFileRoute("/admin/guides/new")({
  ssr: false,
  component: () => <GuideEditor />,
});
