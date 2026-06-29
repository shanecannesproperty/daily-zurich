import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AdminShell } from "@/components/AdminShell";
import { useAdminSession } from "@/hooks/useAdminSession";
import { Field, TextInput, TextArea, Checkbox, slugify } from "@/components/admin/AdminFields";
import { adminGet, adminInsert, adminUpdate, adminDelete, isValidUrl } from "@/lib/admin-db";

interface FormState {
  slug: string;
  title: string;
  venue: string;
  suburb: string;
  start_at: string;
  end_at: string;
  price: string;
  category: string;
  source_url: string;
  booking_url: string;
  image_url: string;
  is_published: boolean;
}

const blank: FormState = {
  slug: "",
  title: "",
  venue: "",
  suburb: "",
  start_at: "",
  end_at: "",
  price: "",
  category: "",
  source_url: "",
  booking_url: "",
  image_url: "",
  is_published: false,
};

// Convert ISO -> value usable by <input type="datetime-local"> (local).
function toLocal(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function fromLocal(v: string): string | null {
  if (!v) return null;
  return new Date(v).toISOString();
}

export function EventEditor({ id }: { id?: string }) {
  const router = useRouter();
  const { email } = useAdminSession();
  const [form, setForm] = useState<FormState>(blank);
  const [loaded, setLoaded] = useState<boolean>(!id);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id || !email) return;
    adminGet("events", id).then(({ data }) => {
      if (data) {
        setForm({
          slug: data.slug ?? "",
          title: data.title ?? "",
          venue: data.venue ?? "",
          suburb: data.suburb ?? "",
          start_at: toLocal(data.start_at ?? ""),
          end_at: toLocal(data.end_at ?? ""),
          price: data.price ?? "",
          category: data.category ?? "",
          source_url: data.source_url ?? "",
          booking_url: data.booking_url ?? "",
          image_url: data.image_url ?? "",
          is_published: !!data.is_published,
        });
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
    if (wantPublished && !isValidUrl(form.source_url)) {
      setError("A valid source URL is required before publishing an event.");
      setBusy(false);
      return;
    }
    const payload = {
      slug: form.slug.trim(),
      title: form.title.trim(),
      venue: form.venue.trim() || null,
      suburb: form.suburb.trim() || null,
      start_at: fromLocal(form.start_at),
      end_at: fromLocal(form.end_at),
      price: form.price.trim() || null,
      category: form.category.trim() || null,
      source_url: form.source_url.trim() || null,
      booking_url: form.booking_url.trim() || null,
      image_url: form.image_url.trim() || null,
      is_published: wantPublished,
    };
    const res = id
      ? await adminUpdate("events", id, payload)
      : await adminInsert("events", payload);
    setBusy(false);
    if (res.error) {
      setError(res.error.message);
      return;
    }
    if (!id && res.data?.id)
      router.navigate({ to: "/admin/events/$id", params: { id: res.data.id } });
    else if (res.data) setForm((f) => ({ ...f, is_published: !!res.data.is_published }));
  }

  async function remove() {
    if (!id || !confirm("Delete this event?")) return;
    setBusy(true);
    const { error } = await adminDelete("events", id);
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.navigate({ to: "/admin/events" });
  }

  if (!loaded) {
    return (
      <AdminShell title="Event" email={email} activePath="/admin/events">
        <p className="meta">Loading</p>
      </AdminShell>
    );
  }

  return (
    <AdminShell title={id ? "Edit event" : "New event"} email={email} activePath="/admin/events">
      <div className="max-w-2xl space-y-4">
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
        <Field label="Slug">
          <TextInput value={form.slug} onChange={(v) => patch("slug", slugify(v))} required />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Venue">
            <TextInput value={form.venue} onChange={(v) => patch("venue", v)} />
          </Field>
          <Field label="Suburb">
            <TextInput value={form.suburb} onChange={(v) => patch("suburb", v)} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Start">
            <TextInput
              type="datetime-local"
              value={form.start_at}
              onChange={(v) => patch("start_at", v)}
            />
          </Field>
          <Field label="End">
            <TextInput
              type="datetime-local"
              value={form.end_at}
              onChange={(v) => patch("end_at", v)}
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Price">
            <TextInput
              value={form.price}
              onChange={(v) => patch("price", v)}
              placeholder="Free or $25"
            />
          </Field>
          <Field label="Category">
            <TextInput value={form.category} onChange={(v) => patch("category", v)} />
          </Field>
        </div>
        <Field label="Source URL" hint="Required before publishing.">
          <TextInput value={form.source_url} onChange={(v) => patch("source_url", v)} />
        </Field>
        <Field label="Booking URL">
          <TextInput value={form.booking_url} onChange={(v) => patch("booking_url", v)} />
        </Field>
        <Field label="Image URL">
          <TextInput value={form.image_url} onChange={(v) => patch("image_url", v)} />
        </Field>
        <p className="text-sm">Status: {form.is_published ? "Published" : "Draft"}</p>
        {error ? <p className="text-sm text-[var(--ink-red)]">{error}</p> : null}
        <div className="flex flex-wrap gap-2 pt-2">
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
    </AdminShell>
  );
}

export const Route = createFileRoute("/admin/events/new")({
  ssr: false,
  component: () => <EventEditor />,
});
