import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { CategoryNav } from "@/components/CategoryNav";
import { buildMeta, canonicalLinks } from "@/lib/seo";
import { cityName, siteName, siteEmail } from "@/lib/city";

// Confidential tips submission. We deliberately use a mailto: handoff (no
// server processing of the message body) so the tipster's words never touch
// our servers — they go straight from their email client to the newsroom.
const TIPS_EMAIL = siteEmail("tips");

export const Route = createFileRoute("/tips")({
  head: () => ({
    meta: buildMeta({
      title: `Send us a tip | ${siteName()}`,
      description: `Got a story? Tell ${siteName()}. Confidential tips, story leads and documents from across ${cityName()}.`,
      path: "/tips",
    }),
    links: canonicalLinks("/tips"),
  }),
  component: TipsPage,
});

function TipsPage() {
  const [what, setWhat] = useState("");
  const [email, setEmail] = useState("");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const subject = encodeURIComponent(`News tip via ${siteName()}`);
    const body = encodeURIComponent(
      `What's happening:\n${what}\n\nContact: ${email || "(anonymous)"}\n`,
    );
    window.location.href = `mailto:${TIPS_EMAIL}?subject=${subject}&body=${body}`;
  }

  return (
    <>
      <SiteHeader />
      <CategoryNav />
      <main className="container-read py-12">
        <p className="kicker">Newsroom</p>
        <h1 className="h1-news mt-1">Got a story? Tell us.</h1>
        <p className="dek mt-3">
          Send confidential tips, story leads and documents to the {siteName()}{" "}
          newsroom. We read every tip — promising leads get a follow-up from a
          reporter.
        </p>

        <div className="hairline mt-6" />

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div>
            <label htmlFor="tip-what" className="label">
              What&apos;s happening?
            </label>
            <textarea
              id="tip-what"
              required
              rows={6}
              value={what}
              onChange={(e) => setWhat(e.target.value)}
              placeholder="Tell us what you saw, who's involved, and when it happened. Include links if relevant."
              className="mt-2 w-full border border-[var(--ink,#2d2d2d)] bg-white p-3 font-serif text-base"
            />
          </div>

          <div>
            <label htmlFor="tip-email" className="label">
              Your contact email <span className="text-[var(--ink-grey,#6b6b6b)] normal-case">(optional)</span>
            </label>
            <input
              id="tip-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com — leave blank to stay anonymous"
              className="mt-2 w-full border border-[var(--ink,#2d2d2d)] bg-white p-3 font-serif text-base"
            />
          </div>

          <div>
            <label htmlFor="tip-file" className="label">
              Attach a file <span className="text-[var(--ink-grey,#6b6b6b)] normal-case">(optional)</span>
            </label>
            <input
              id="tip-file"
              type="file"
              className="mt-2 block w-full text-sm"
            />
            <p className="meta mt-1 text-[var(--ink-grey,#6b6b6b)]">
              Note: due to the way email works, attachments need to be added
              to the draft your email client opens — we&apos;ll prefill the
              message body for you.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <button type="submit" className="btn-primary">
              Send tip via email
            </button>
            <a
              href={`mailto:${TIPS_EMAIL}`}
              className="meta underline"
            >
              Or email {TIPS_EMAIL} directly
            </a>
          </div>
        </form>

        <section className="mt-12 border-t border-[var(--hairline)] pt-6">
          <h2 className="kicker">How we handle tips</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-[15px]">
            <li>We protect sources. We never publish identifying details without permission.</li>
            <li>For highly sensitive material, use a personal (not work) email and don&apos;t send via a corporate device.</li>
            <li>We verify everything before publication. Promising leads get a reporter follow-up.</li>
          </ul>
        </section>
      </main>
    </>
  );
}
