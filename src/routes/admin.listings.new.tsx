import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AdminShell } from "@/components/AdminShell";
import { useAdminSession } from "@/hooks/useAdminSession";
import { Field, TextInput, Checkbox } from "@/components/admin/AdminFields";
import { adminGet, adminInsert, adminUpdate, adminDelete, isValidUrl } from "@/lib/admin-db";

interface FormState {
  business_name: string;
  category: string;
  suburb: string;
  source_url: string;
  website_url: string;
  booking_url: string;
  phone: string;
  image_url: string;
  is_sponsored: boolean;
  is_featured: boolean;
}

const blank: FormState = {
  business_name: "",
  category: "",
  suburb: "",
  source_url: "",
  website_url: "",
  booking_url: "",
  phone: "",
  image_url: "",
  is_sponsored: false,
  is_featured: false,
};

export function ListingEditor({ id }: { id?: string }) {
  const router = useRouter();
  const { email } = useAdminSession();
  const [form, setForm] = useState<FormState>(blank);
  const [loaded, setLoaded] = useState<boolean>(!id);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id || !email) return;
    adminGet("listings", id).then(({ data }) => {
      if (data) {
        setForm({
          business_name: data.business_name ?? "",
          category: data.category ?? "",
          suburb: data.suburb ?? "",
          source_url: data.source_url ?? "",
          website_url: data.website_url ?? "",
          booking_url: data.booking_url ?? "",
          phone: data.phone ?? "",
          image_url: data.image_url ?? "",
          is_sponsored: !!data.is_sponsored,
          is_featured: !!data.is_featured,
        });
      }
      setLoaded(true);
    });
  }, [id, email]);

  function patch<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function save() {
    setBusy(true);
    setError(null);
    if (!form.business_name.trim()) {
      setError("Business name is required.");
      setBusy(false);
      return;
    }
    if (!isValidUrl(form.source_url)) {
      setError("A valid source URL is required.");
      setBusy(false);
      return;
    }
    const payload = {
      business_name: form.business_name.trim(),
      category: form.category.trim() || null,
      suburb: form.suburb.trim() || null,
      source_url: form.source_url.trim(),
      website_url: form.website_url.trim() || null,
      booking_url: form.booking_url.trim() || null,
      phone: form.phone.trim() || null,
      image_url: form.image_url.trim() || null,
      is_sponsored: form.is_sponsored,
      is_featured: form.is_featured,
    };
    const res = id
      ? await adminUpdate("listings", id, payload)
      : await adminInsert("listings", payload);
    setBusy(false);
    if (res.error) {
      setError(res.error.message);
      return;
    }
    if (!id && res.data?.id) router.navigate({ to: "/admin/listings" });
  }

  async function remove() {
    if (!id) return;
    if (!confirm("Delete this listing?")) return;
    setBusy(true);
    const { error } = await adminDelete("listings", id);
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.navigate({ to: "/admin/listings" });
  }

  if (!loaded) {
    return (
      <AdminShell title="Listing" email={email} activePath="/admin/listings">
        <p className="meta">Loading</p>
      </AdminShell>
    );
  }

  return (
    <AdminShell
      title={id ? "Edit listing" : "New listing"}
      email={email}
      activePath="/admin/listings"
    >
      <div className="max-w-2xl space-y-4">
        <Field label="Business name">
          <TextInput
            value={form.business_name}
            onChange={(v) => patch("business_name", v)}
            required
          />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Category">
            <TextInput value={form.category} onChange={(v) => patch("category", v)} />
          </Field>
          <Field label="Suburb">
            <TextInput value={form.suburb} onChange={(v) => patch("suburb", v)} />
          </Field>
        </div>
        <Field label="Source URL" hint="Required: where this listing was verified from.">
          <TextInput value={form.source_url} onChange={(v) => patch("source_url", v)} required />
        </Field>
        <Field label="Website URL">
          <TextInput value={form.website_url} onChange={(v) => patch("website_url", v)} />
        </Field>
        <Field label="Booking URL">
          <TextInput value={form.booking_url} onChange={(v) => patch("booking_url", v)} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Phone">
            <TextInput value={form.phone} onChange={(v) => patch("phone", v)} />
          </Field>
          <Field label="Image URL">
            <TextInput value={form.image_url} onChange={(v) => patch("image_url", v)} />
          </Field>
        </div>
        <div className="flex flex-wrap gap-4">
          <Checkbox
            checked={form.is_featured}
            onChange={(b) => patch("is_featured", b)}
            label="Featured"
          />
          <Checkbox
            checked={form.is_sponsored}
            onChange={(b) => patch("is_sponsored", b)}
            label="Sponsored"
          />
        </div>
        {error ? <p className="text-sm text-[var(--ink-red)]">{error}</p> : null}
        <div className="flex gap-2 pt-2">
          <button onClick={save} disabled={busy} className="btn-primary">
            {id ? "Save" : "Create"}
          </button>
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

export const Route = createFileRoute("/admin/listings/new")({
  ssr: false,
  component: () => <ListingEditor />,
});
