import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { buildMeta, canonicalLinks } from "@/lib/seo";
import { siteName, cityName } from "@/lib/city";

export const Route = createFileRoute("/contribute")({
  head: () => ({
    meta: buildMeta({
      title: `Contribute | ${siteName()}`,
      description: `Pitch a story or submit an article to ${siteName()}. We amplify local voices in ${cityName()}.`,
      path: "/contribute",
    }),
    links: canonicalLinks("/contribute"),
  }),
  component: ContributePage,
});

function ContributePage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pitch, setPitch] = useState("");
  const [links, setLinks] = useState("");
  const [sent, setSent] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !pitch.trim()) return;
    const subject = `Contributor pitch from ${name.trim()}`;
    const body = `Name: ${name}\nEmail: ${email}\n\nPitch:\n${pitch}\n\nLinks:\n${links}`;
    // mailto fallback so submission always has a destination
    window.location.href = `mailto:tips@dailycanberra.com.au?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setSent(true);
  }

  return (
    <>
      <SiteHeader activePath="/contribute" />
      <main className="container-news py-10 max-w-3xl">
        <nav className="meta mb-4"><a href="/">Home</a> / Contribute</nav>
        <p className="kicker">Get involved</p>
        <h1 className="h1-news mt-1">Contribute to {siteName()}</h1>
        <p className="dek mt-3">
          {cityName()} is full of stories that don't make the national wires. If you've got one, we'd love to read it.
        </p>

        <section className="mt-10">
          <h2 className="h2-news">Why contribute</h2>
          <ul className="mt-3 space-y-2 list-disc pl-5">
            <li>We amplify local voices — residents, students, small business owners, community organisers.</li>
            <li>Accepted pieces run under your byline on {siteName()} and across The Daily Network.</li>
            <li>Pitches get a human reply from an editor — not an auto-responder.</li>
          </ul>
        </section>

        <section className="mt-10">
          <h2 className="h2-news">Contributor guidelines</h2>
          <ul className="mt-3 space-y-2 list-disc pl-5">
            <li><strong>Accuracy:</strong> every claim should be verifiable. Link sources where possible.</li>
            <li><strong>No conflicts of interest:</strong> disclose any commercial, political or personal interest in the subject.</li>
            <li><strong>Original work only:</strong> we don't republish material you've already placed elsewhere.</li>
            <li><strong>Local relevance:</strong> the story must matter to {cityName()} readers.</li>
            <li><strong>Tone:</strong> plain English, no jargon, no marketing copy.</li>
          </ul>
        </section>

        <section className="mt-10 border-t border-[var(--ink)] pt-8">
          <h2 className="h2-news">Submit a pitch or draft</h2>
          {sent ? (
            <p className="mt-4 text-[var(--ink-red)] serif text-lg">
              Thanks! Our editorial team reviews all pitches within 48 hours.
            </p>
          ) : (
            <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
              <label className="block">
                <span className="label">Your name</span>
                <input required maxLength={100} value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full border border-[var(--hairline)] bg-transparent p-2" />
              </label>
              <label className="block">
                <span className="label">Email</span>
                <input required type="email" maxLength={255} value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full border border-[var(--hairline)] bg-transparent p-2" />
              </label>
              <label className="block">
                <span className="label">Story pitch or full draft</span>
                <textarea required maxLength={5000} rows={10} value={pitch} onChange={(e) => setPitch(e.target.value)} placeholder="Tell us what the story is, why it matters now, and who it affects. Or paste the full draft." className="mt-1 w-full border border-[var(--hairline)] bg-transparent p-2" />
              </label>
              <label className="block">
                <span className="label">Supporting links (optional)</span>
                <textarea maxLength={1000} rows={3} value={links} onChange={(e) => setLinks(e.target.value)} placeholder="One URL per line." className="mt-1 w-full border border-[var(--hairline)] bg-transparent p-2" />
              </label>
              <button type="submit" className="btn-primary">Send to the editor</button>
              <p className="meta">Submissions go to tips@dailycanberra.com.au. By submitting you confirm the work is your own.</p>
            </form>
          )}
        </section>
      </main>
    </>
  );
}
