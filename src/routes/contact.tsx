import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { buildMeta, canonicalLinks } from "@/lib/seo";
import { siteName , siteEmail } from "@/lib/city";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { submitEnquiry } from "@/lib/forms.functions";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: buildMeta({
      title: `Contact | ${siteName()}`,
      description: `Get in touch with the ${siteName()} newsroom. News tips, corrections and general enquiries.`,
      path: "/contact",
    }),
    links: canonicalLinks("/contact"),
  }),
  component: ContactPage,
});

function ContactPage() {
  const submit = useServerFn(submitEnquiry);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [type, setType] = useState<"tip" | "general">("general");
  const started = useRef(0);
  useEffect(() => {
    started.current = Date.now();
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    const fd = new FormData(e.currentTarget);
    const payload = {
      name: String(fd.get("name") ?? ""),
      email: String(fd.get("email") ?? ""),
      message: String(fd.get("message") ?? ""),
      subject: String(fd.get("subject") ?? ""),
    };
    try {
      await submit({
        data: {
          type,
          payload,
          company: String(fd.get("company") ?? ""),
          startedAt: started.current,
        },
      });
      setDone(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <SiteHeader />
      <main className="container-read py-12">
        <h1 className="h1-news">Contact the newsroom</h1>
        <p className="dek mt-3">News tips go to editorial. We treat sources confidentially.</p>
        <p className="meta mt-2">
          Or email us directly:{" "}
          <a href={`mailto:${siteEmail("hello")}`} className="underline">
            {siteEmail("hello")}
          </a>
        </p>
        {done ? (
          <p className="serif mt-8 text-lg" role="status">
            Thanks. We&apos;ve received your message.
          </p>
        ) : (
          <form onSubmit={onSubmit} className="mt-8 grid gap-4">
            <label className="block">
              <span className="label">Type</span>
              <select
                className="field"
                value={type}
                onChange={(e) => setType(e.target.value as "tip" | "general")}
              >
                <option value="general">General enquiry</option>
                <option value="tip">News tip</option>
              </select>
            </label>
            <label className="block">
              <span className="label">Name</span>
              <input name="name" required className="field" />
            </label>
            <label className="block">
              <span className="label">Email</span>
              <input type="email" name="email" required className="field" />
            </label>
            <label className="block">
              <span className="label">Subject</span>
              <input name="subject" className="field" />
            </label>
            <label className="block">
              <span className="label">Message</span>
              <textarea name="message" rows={6} required className="field" />
            </label>
            <div className="honeypot" aria-hidden="true">
              <label>
                Do not fill in
                <input type="text" name="company" tabIndex={-1} autoComplete="off" />
              </label>
            </div>
            <div>
              <button type="submit" className="btn-primary" disabled={busy}>
                {busy ? "Sending" : "Send"}
              </button>
            </div>
          </form>
        )}
      </main>
    </>
  );
}
