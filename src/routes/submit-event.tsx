import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import { submitEnquiry } from "@/lib/forms.functions";
import { SiteHeader } from "@/components/SiteHeader";
import { buildMeta, canonicalLinks } from "@/lib/seo";
import { cityName, siteName } from "@/lib/city";

export const Route = createFileRoute("/submit-event")({
  head: () => ({
    meta: buildMeta({
      title: `Submit an event | ${siteName()}`,
      description: `Got a ${cityName()} event? Tell our newsroom. We review and publish source-backed events.`,
      path: "/submit-event",
    }),
    links: canonicalLinks("/submit-event"),
  }),
  component: SubmitEventPage,
});

function SubmitEventPage() {
  const submit = useServerFn(submitEnquiry);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const form = e.currentTarget;
    const payload: Record<string, string> = {};
    new FormData(form).forEach((v, k) => {
      payload[k] = String(v);
    });
    try {
      const res = await submit({
        data: {
          type: "tip",
          payload: { ...payload, kind: "event_submission" },
          startedAt: Date.now() - 3000,
        },
      });
      if (res.ok) setDone(true);
      else setErr(res.error ?? "Could not submit");
    } catch {
      setErr("Could not submit");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <SiteHeader activePath="/submit-event" />
      <main className="container-news py-10 max-w-2xl">
        <nav className="meta mb-4">
          <a href="/">Home</a> / Submit an event
        </nav>
        <p className="kicker">Submit an event</p>
        <h1 className="h1-news mt-2">Tell {cityName()} about your event — free</h1>
        <p className="dek mt-3">
          Events are moderated before publishing. We publish community events
          free of charge — usually within 24 hours.
        </p>

        {done ? (
          <div className="mt-8 border border-[var(--hairline)] p-6 bg-[var(--surface)]">
            <p className="serif text-lg">
              Thanks! We&apos;ll review your event and publish it within 24 hours.
            </p>
            <p className="meta mt-2">
              Repeat submissions are not necessary — we&apos;ll email you if we
              need anything else.
            </p>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-8 grid gap-4">
            {err ? <p className="text-sm text-red-700">{err}</p> : null}

            <label className="block">
              <span className="label">Event name *</span>
              <input name="title" required maxLength={200} className="field mt-1 w-full" />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="label">Date & start time *</span>
                <input
                  name="start_at"
                  type="datetime-local"
                  required
                  className="field mt-1 w-full"
                />
              </label>
              <label className="block">
                <span className="label">End time</span>
                <input
                  name="end_at"
                  type="datetime-local"
                  className="field mt-1 w-full"
                />
              </label>
            </div>

            <label className="block">
              <span className="label">Venue / location *</span>
              <input
                name="venue"
                required
                maxLength={250}
                className="field mt-1 w-full"
              />
            </label>

            <label className="block">
              <span className="label">Short description * (max 300 chars)</span>
              <textarea
                name="description"
                required
                rows={3}
                maxLength={300}
                className="field mt-1 w-full"
              />
            </label>

            <label className="block">
              <span className="label">What to expect (optional)</span>
              <textarea
                name="long_description"
                rows={5}
                maxLength={2000}
                className="field mt-1 w-full"
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="label">Event URL / tickets link</span>
                <input
                  name="source_url"
                  type="url"
                  placeholder="https://"
                  className="field mt-1 w-full"
                />
              </label>
              <label className="block">
                <span className="label">Image URL</span>
                <input
                  name="image_url"
                  type="url"
                  placeholder="https://"
                  className="field mt-1 w-full"
                />
              </label>
            </div>

            <label className="block">
              <span className="label">Category *</span>
              <select
                name="category"
                required
                className="field mt-1 w-full"
                defaultValue=""
              >
                <option value="" disabled>Select a category</option>
                <option value="music">Music</option>
                <option value="art">Art</option>
                <option value="food">Food &amp; Drink</option>
                <option value="community">Community</option>
                <option value="sport">Sport</option>
                <option value="business">Business</option>
                <option value="family">Family</option>
                <option value="other">Other</option>
              </select>
            </label>

            <fieldset className="grid gap-4 sm:grid-cols-2 border border-[var(--hairline)] p-4">
              <legend className="label px-2">Ticket pricing</legend>
              <label className="flex items-center gap-2">
                <input type="checkbox" name="is_free" value="yes" defaultChecked />
                <span className="serif">This event is free</span>
              </label>
              <label className="block">
                <span className="label">Price if paid</span>
                <input
                  name="price"
                  placeholder="e.g. $25"
                  maxLength={60}
                  className="field mt-1 w-full"
                />
              </label>
            </fieldset>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="label">Organiser name *</span>
                <input
                  name="organiser"
                  required
                  maxLength={150}
                  className="field mt-1 w-full"
                />
              </label>
              <label className="block">
                <span className="label">Contact email * (not published)</span>
                <input
                  name="email"
                  type="email"
                  required
                  maxLength={320}
                  className="field mt-1 w-full"
                />
              </label>
            </div>

            <div className="honeypot" aria-hidden="true">
              <label>
                Do not fill in <input name="company" tabIndex={-1} autoComplete="off" />
              </label>
            </div>

            <div className="flex items-center gap-3 mt-2">
              <button type="submit" disabled={busy} className="btn-primary">
                {busy ? "Submitting" : "Submit event"}
              </button>
              <p className="meta">Reviewed within 24 hours.</p>
            </div>
          </form>
        )}
      </main>
    </>
  );
}
