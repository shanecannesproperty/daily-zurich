// Social proof banner. By product decision the events-this-week and
// articles-published counters are permanently removed — they were noisy,
// inflated by ingestion runs, and not a meaningful trust signal. Do NOT
// re-add an events or articles count to this banner. The regression test
// `social-proof-banner.test.tsx` will fail if either reappears.
import { useQuery } from "@tanstack/react-query";
import { getPublicStats } from "@/lib/data.functions";

export function SocialProofBanner() {
  const { data: stats } = useQuery({
    queryKey: ["public-stats"],
    queryFn: () => getPublicStats(),
    staleTime: 5 * 60_000,
  });

  if (!stats || !stats.subscriberCount || stats.subscriberCount <= 0) return null;

  return (
    <section
      data-component="social-proof-banner"
      className="border-b border-[var(--hairline)] bg-[var(--surface)]"
    >
      <div className="container-news py-3">
        <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10">
          <Stat value={formatCount(stats.subscriberCount)} label="subscribers" />
        </div>
      </div>
    </section>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <span className="meta inline-flex items-center gap-1.5">
      <span className="font-semibold" style={{ color: "var(--ink)" }}>
        {value}
      </span>
      <span>{label}</span>
    </span>
  );
}

function formatCount(n: number): string {
  if (n >= 10000) return `${(n / 1000).toFixed(0)}k+`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k+`;
  if (n >= 100) return `${Math.floor(n / 100) * 100}+`;
  return String(n);
}
