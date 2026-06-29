import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { listObituaries, submitObituaryNotice } from "@/lib/data.functions";
import { SiteHeader } from "@/components/SiteHeader";
import { buildMeta, canonicalLinks } from "@/lib/seo";
import { siteName, cityName, citySlug } from "@/lib/city";
import { OBITUARY_NOTICE_LABELS } from "@/lib/schema";
import type { ObituaryRow } from "@/lib/schema";
import { sanitizeHtml } from "@/lib/sanitize-html";
import { formatDate } from "@/lib/date";

const obituariesQuery = queryOptions({
  queryKey: ["obituaries"],
  queryFn: () => listObituaries(),
});

export const Route = createFileRoute("/obituaries")({
  loader: ({ context }) => context.queryClient.ensureQueryData(obituariesQuery),
  head: () => ({
    meta: buildMeta({
      title: `Death notices, obituaries & funeral notices | ${siteName()}`,
      description: `${cityName()} death notices, obituaries and funeral notices. Submitted by families and funeral directors, published after review. A community record of those we have lost.`,
      path: "/obituaries",
    }),
    links: canonicalLinks("/obituaries"),
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: `Death notices & obituaries — ${cityName()}`,
          description: `Obituaries, death notices and funeral notices for the ${cityName()} region.`,
          publisher: {
            "@type": "NewsMediaOrganization",
            name: siteName(),
          },
        }),
      },
    ],
  }),
  component: ObituariesPage,
});

function NoticeCard({ notice }: { notice: ObituaryRow }) {
  const label = OBITUARY_NOTICE_LABELS[notice.notice_type] ?? "Notice";
  const displayName = notice.preferred_name
    ? `${notice.full_name} (${notice.preferred_name})`
    : notice.full_name;
  const died = formatDate(notice.date_of_death);
  const body = sanitizeHtml(notice.body_html);
  const href = notice.slug ? `/obituaries/${notice.slug}` : null;

  const heading = href ? (
    <Link to="/obituaries/$slug" params={{ slug: notice.slug! }} className="hover:underline">
      {displayName}
    </Link>
  ) : (
    displayName
  );

  return (
    <article className="py-8 first:pt-0">
      <div className="flex flex-col gap-5 sm:flex-row">
        {notice.photo_url && (
          <img
            src={notice.photo_url}
            alt={`Photograph of ${notice.full_name}`}
            className="h-32 w-32 flex-none rounded-sm object-cover"
            loading="lazy"
            decoding="async"
            width={128}
            height={128}
          />
        )}
        <div className="min-w-0">
          <p className="kicker">{label}</p>
          <h2 className="serif mt-1 text-2xl leading-snug">{heading}</h2>
          <p className="meta mt-2">
            {notice.age != null && <>Aged {notice.age}</>}
            {notice.age != null && (notice.suburb || died) && <> &middot; </>}
            {notice.suburb && <>{notice.suburb}</>}
            {notice.suburb && died && <> &middot; </>}
            {died && <>Died {died}</>}
          </p>

          {body && (
            <div
              className="prose-news mt-4 line-clamp-4"
              dangerouslySetInnerHTML={{ __html: body }}
            />
          )}

          {notice.service_details && (
            <div className="mt-4">
              <p className="kicker">Service details</p>
              <p className="serif mt-1 whitespace-pre-line">{notice.service_details}</p>
            </div>
          )}

          {notice.funeral_director && (
            <p className="meta mt-4">
              Arranged by{" "}
              {notice.funeral_director_url ? (
                <a href={notice.funeral_director_url} target="_blank" rel="noopener nofollow ugc">
                  {notice.funeral_director}
                </a>
              ) : (
                notice.funeral_director
              )}
            </p>
          )}

          {href && (
            <p className="mt-3">
              <Link
                to="/obituaries/$slug"
                params={{ slug: notice.slug! }}
                className="meta underline"
              >
                Read full notice →
              </Link>
            </p>
          )}
        </div>
      </div>
    </article>
  );
}

function EmptyState() {
  return (
    <div className="mt-10 border-t border-[var(--hairline)] pt-8">
      <p className="serif text-lg">There are no notices to show at the moment.</p>
      <p className="dek mt-3 max-w-2xl">
        Obituaries, death notices and funeral notices submitted by families and funeral directors
        will appear on this page once they have been reviewed and published.
      </p>
    </div>
  );
}

type FormState = "idle" | "submitting" | "success" | "error";

function SubmissionForm() {
  const [state, setState] = useState<FormState>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [form, setForm] = useState({
    full_name: "",
    preferred_name: "",
    date_of_death: "",
    age: "",
    suburb: "",
    notice_type: "death_notice",
    body_text: "",
    service_details: "",
    funeral_director: "",
    submitter_name: "",
    submitter_email: "",
    submitter_phone: "",
    submitter_relationship: "",
  });

  function set(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState("submitting");
    setErrorMsg(null);
    try {
      await submitObituaryNotice({
        data: {
          city: citySlug(),
          full_name: form.full_name.trim(),
          preferred_name: form.preferred_name.trim() || undefined,
          date_of_death: form.date_of_death || undefined,
          age: form.age ? parseInt(form.age, 10) : undefined,
          suburb: form.suburb.trim() || undefined,
          notice_type: form.notice_type,
          body_text: form.body_text.trim() || undefined,
          service_details: form.service_details.trim() || undefined,
          funeral_director: form.funeral_director.trim() || undefined,
          submitter_name: form.submitter_name.trim(),
          submitter_email: form.submitter_email.trim(),
          submitter_phone: form.submitter_phone.trim() || undefined,
          submitter_relationship: form.submitter_relationship.trim() || undefined,
        },
      });
      setState("success");
    } catch (err) {
      setState("error");
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    }
  }

  if (state === "success") {
    return (
      <div className="rounded border border-[var(--hairline)] bg-[var(--surface)] p-6">
        <p className="serif text-lg font-medium">Thank you — your notice has been received.</p>
        <p className="dek mt-2">
          We will review it and be in touch if we need to confirm any details. Notices are typically
          published within one business day.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="kicker block mb-1" htmlFor="obit-type">
            Type of notice <span aria-hidden="true">*</span>
          </label>
          <select
            id="obit-type"
            className="input w-full"
            value={form.notice_type}
            onChange={set("notice_type")}
            required
          >
            <option value="death_notice">Death notice</option>
            <option value="obituary">Obituary</option>
            <option value="funeral_notice">Funeral notice</option>
            <option value="tribute">Tribute</option>
          </select>
        </div>
      </div>

      <fieldset className="space-y-4">
        <legend className="kicker text-[var(--ink-red)] uppercase tracking-wider text-xs mb-2">
          About the person
        </legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="kicker block mb-1" htmlFor="obit-fullname">
              Full name <span aria-hidden="true">*</span>
            </label>
            <input
              id="obit-fullname"
              className="input w-full"
              type="text"
              value={form.full_name}
              onChange={set("full_name")}
              placeholder="e.g. Margaret Rose Williams"
              required
            />
          </div>
          <div>
            <label className="kicker block mb-1" htmlFor="obit-preferred">
              Known as (optional)
            </label>
            <input
              id="obit-preferred"
              className="input w-full"
              type="text"
              value={form.preferred_name}
              onChange={set("preferred_name")}
              placeholder="e.g. Marg"
            />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="kicker block mb-1" htmlFor="obit-dod">
              Date of death
            </label>
            <input
              id="obit-dod"
              className="input w-full"
              type="date"
              value={form.date_of_death}
              onChange={set("date_of_death")}
            />
          </div>
          <div>
            <label className="kicker block mb-1" htmlFor="obit-age">
              Age
            </label>
            <input
              id="obit-age"
              className="input w-full"
              type="number"
              min={0}
              max={130}
              value={form.age}
              onChange={set("age")}
              placeholder="e.g. 84"
            />
          </div>
          <div>
            <label className="kicker block mb-1" htmlFor="obit-suburb">
              Suburb
            </label>
            <input
              id="obit-suburb"
              className="input w-full"
              type="text"
              value={form.suburb}
              onChange={set("suburb")}
              placeholder="e.g. Deakin"
            />
          </div>
        </div>
        <div>
          <label className="kicker block mb-1" htmlFor="obit-body">
            Notice text
          </label>
          <textarea
            id="obit-body"
            className="input w-full min-h-[140px]"
            value={form.body_text}
            onChange={set("body_text")}
            placeholder="Write the notice here — family, life story, loved ones left behind..."
          />
        </div>
        <div>
          <label className="kicker block mb-1" htmlFor="obit-service">
            Service details (optional)
          </label>
          <textarea
            id="obit-service"
            className="input w-full min-h-[80px]"
            value={form.service_details}
            onChange={set("service_details")}
            placeholder="Date, time and location of the funeral or memorial service"
          />
        </div>
        <div>
          <label className="kicker block mb-1" htmlFor="obit-fd">
            Funeral director (optional)
          </label>
          <input
            id="obit-fd"
            className="input w-full"
            type="text"
            value={form.funeral_director}
            onChange={set("funeral_director")}
            placeholder="e.g. Tobin Brothers Funerals"
          />
        </div>
      </fieldset>

      <fieldset className="space-y-4 border-t border-[var(--hairline)] pt-5">
        <legend className="kicker text-[var(--ink-red)] uppercase tracking-wider text-xs mb-2">
          Your contact details (not published)
        </legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="kicker block mb-1" htmlFor="obit-sname">
              Your name <span aria-hidden="true">*</span>
            </label>
            <input
              id="obit-sname"
              className="input w-full"
              type="text"
              value={form.submitter_name}
              onChange={set("submitter_name")}
              required
              placeholder="Your full name"
            />
          </div>
          <div>
            <label className="kicker block mb-1" htmlFor="obit-semail">
              Your email <span aria-hidden="true">*</span>
            </label>
            <input
              id="obit-semail"
              className="input w-full"
              type="email"
              value={form.submitter_email}
              onChange={set("submitter_email")}
              required
              placeholder="so we can confirm the notice"
            />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="kicker block mb-1" htmlFor="obit-sphone">
              Phone (optional)
            </label>
            <input
              id="obit-sphone"
              className="input w-full"
              type="tel"
              value={form.submitter_phone}
              onChange={set("submitter_phone")}
              placeholder="In case we need to reach you"
            />
          </div>
          <div>
            <label className="kicker block mb-1" htmlFor="obit-srel">
              Your relationship to the person
            </label>
            <input
              id="obit-srel"
              className="input w-full"
              type="text"
              value={form.submitter_relationship}
              onChange={set("submitter_relationship")}
              placeholder="e.g. daughter, funeral director"
            />
          </div>
        </div>
      </fieldset>

      {state === "error" && errorMsg && (
        <p className="text-sm text-[var(--ink-red)]" role="alert">
          {errorMsg}
        </p>
      )}

      <p className="meta max-w-2xl">
        Each notice is read by our team before it is published. We will contact you if we need to
        confirm any details. Notices are typically published within one business day. Submission is
        free of charge.
      </p>

      <button type="submit" className="btn-primary" disabled={state === "submitting"}>
        {state === "submitting" ? "Submitting…" : "Submit notice"}
      </button>
    </form>
  );
}

function ObituariesPage() {
  const { data: notices } = useSuspenseQuery(obituariesQuery);

  return (
    <>
      <SiteHeader activePath="/obituaries" />
      <main>
        <section className="container-read pt-8 pb-10">
          <p className="kicker">Death notices &amp; obituaries</p>
          <h1 className="h1-news mt-1">
            {cityName()} death notices, obituaries &amp; funeral notices
          </h1>
          <p className="dek mt-3 max-w-2xl">
            A community record of people who have passed away in {cityName()} and the surrounding
            region. Notices are submitted by family members or funeral directors and are published
            after review.
          </p>

          {notices.length > 0 ? (
            <div className="mt-8 divide-y divide-[var(--hairline)]">
              {notices.map((notice) => (
                <NoticeCard key={notice.id} notice={notice} />
              ))}
            </div>
          ) : (
            <EmptyState />
          )}

          <section className="mt-12 border-t border-[var(--ink)] pt-6" id="submit">
            <p className="kicker">Place a notice</p>
            <h2 className="serif mt-2 text-2xl">Submit a death notice or obituary</h2>
            <p className="dek mt-3 mb-6 max-w-2xl">
              A notice can be submitted by a family member or by a funeral director acting for the
              family. Submission is free. Each notice is read before it is published.
            </p>
            <SubmissionForm />
          </section>
        </section>
      </main>
    </>
  );
}
