// "Suggest a correction" — small subdued link at the foot of every article.
// Opens the reader's mail client with a prefilled subject and body. We use a
// mailto: handoff so the correction text never touches our servers.
import { siteEmail, siteDomain } from "@/lib/city";

export function CorrectionLink({ title, slug }: { title: string; slug: string }) {
  function build(): string {
    const url =
      typeof window !== "undefined"
        ? window.location.href
        : `${siteDomain()}/article/${slug}`;
    const subject = encodeURIComponent(`Correction — ${title}`);
    const body = encodeURIComponent(`Article URL: ${url}\n\nCorrection:\n`);
    return `mailto:${siteEmail("corrections")}?subject=${subject}&body=${body}`;
  }

  return (
    <p className="meta mt-6 text-[var(--ink-grey,#6b6b6b)] print:hidden">
      See something wrong?{" "}
      <a
        href={build()}
        className="underline hover:text-[var(--ink,#2d2d2d)]"
      >
        Suggest a correction
      </a>
      .
    </p>
  );
}
