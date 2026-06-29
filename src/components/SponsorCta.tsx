import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { cityName } from "@/lib/city";
import { submitEnquiry } from "@/lib/forms.functions";

export function SponsorCta({ page }: { page: string }) {
  const submit = useServerFn(submitEnquiry);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const startedAt = useRef(0);
  useEffect(() => {
    startedAt.current = Date.now();
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    const fd = new FormData(e.currentTarget);
    const payload = {
      business_name: String(fd.get("business_name") ?? ""),
      contact: String(fd.get("contact") ?? ""),
      email: String(fd.get("email") ?? ""),
      phone: String(fd.get("phone") ?? ""),
      page,
      message: String(fd.get("message") ?? ""),
    };
    try {
      await submit({
        data: {
          type: "sponsor",
          payload,
          company: String(fd.get("company") ?? ""),
          startedAt: startedAt.current,
        },
      });
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).dataLayer?.push({ event: "feature_business_click", page });
      } catch {
        /* ignore */
      }
      setDone(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="border border-[var(--ink)] p-6 md:p-8">
      <p className="kicker">Sponsored placements</p>
      <h2 className="h2-news mt-1">Feature your business</h2>
      <p className="meta mt-2">
        Reach {cityName()} readers from the top of this page. Featured placements are always
        labelled.
      </p>
      {done ? (
        <p className="serif mt-4 text-lg" role="status">
          Thanks. Our sales team will be in touch.
        </p>
      ) : (
        <form onSubmit={onSubmit} className="mt-5 grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="label">Business name</span>
            <input name="business_name" required className="field" />
          </label>
          <label className="block">
            <span className="label">Contact name</span>
            <input name="contact" required className="field" />
          </label>
          <label className="block">
            <span className="label">Email</span>
            <input type="email" name="email" required className="field" />
          </label>
          <label className="block">
            <span className="label">Phone</span>
            <input name="phone" className="field" />
          </label>
          <label className="block sm:col-span-2">
            <span className="label">Message</span>
            <textarea name="message" rows={3} className="field" />
          </label>
          <div className="honeypot" aria-hidden="true">
            <label>
              Do not fill in
              <input type="text" name="company" tabIndex={-1} autoComplete="off" />
            </label>
          </div>
          <div className="sm:col-span-2">
            <button type="submit" className="btn-primary" disabled={busy}>
              {busy ? "Sending" : "Enquire about featuring"}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
