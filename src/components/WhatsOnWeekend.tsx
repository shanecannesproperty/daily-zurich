import { CalendarDays } from "lucide-react";
import { cityName } from "@/lib/city";
import type { WhatsOnEvent } from "@/lib/whatson.functions";
import { formatShortDate } from "@/lib/date";

// "What's on in Canberra this weekend": a compact, curated set of OUTBOUND
// links to What's On Canberra event pages. This is a traffic/link hook, not
// re-hosted content. We render the fetched list with links out and nothing
// else; we do not store or re-publish any of it.
//
// Renders NOTHING when the list is empty (feed absent, failed, non-200, or no
// events). No empty box, no error, no loading flash. The events are fetched
// server-side in the homepage loader, so the page never waits on this.
const WHATSON_HOME = "https://whatsoncanberra.com.au";

function hostLabel(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

export function WhatsOnWeekend({ events }: { events: WhatsOnEvent[] }) {
  if (!events || events.length === 0) return null;

  return (
    <section
      className="container-news py-10 border-t border-[var(--ink)]"
      aria-labelledby="whatson-weekend-heading"
    >
      <div className="flex items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-[var(--ink-red)]" aria-hidden />
            <p className="kicker">What&apos;s on</p>
          </div>
          <h2 id="whatson-weekend-heading" className="h2-news mt-1">
            What&apos;s on in {cityName()} this weekend
          </h2>
        </div>
        <a
          href={WHATSON_HOME}
          target="_blank"
          rel="noopener nofollow"
          className="meta underline shrink-0 whitespace-nowrap"
        >
          See all events on What&apos;s On Canberra
        </a>
      </div>

      <ul className="mt-6 grid gap-x-10 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
        {events.map((ev) => {
          const dateLabel = formatShortDate(ev.date);
          const host = hostLabel(ev.url);
          return (
            <li key={ev.id} className="border-t border-[var(--hairline)] pt-4">
              <a
                href={ev.url}
                target="_blank"
                rel="noopener nofollow"
                className="group block no-underline"
              >
                <div className="flex gap-4">
                  {ev.thumbnail && (
                    <img
                      src={ev.thumbnail}
                      alt=""
                      width={96}
                      height={96}
                      loading="lazy"
                      decoding="async"
                      className="h-16 w-16 shrink-0 object-cover bg-[var(--surface)]"
                    />
                  )}
                  <div className="min-w-0">
                    {dateLabel && <p className="meta">{dateLabel}</p>}
                    <h3 className="h3-card mt-1 group-hover:underline">{ev.title}</h3>
                    {ev.venue && <p className="meta mt-1 line-clamp-1">{ev.venue}</p>}
                  </div>
                </div>
              </a>
            </li>
          );
        })}
      </ul>

      <p className="meta mt-6 text-[var(--ink-grey)]">
        Listings via{" "}
        <a href={WHATSON_HOME} target="_blank" rel="noopener nofollow" className="underline">
          What&apos;s On Canberra
        </a>
        . Every event links out to its source.
      </p>
    </section>
  );
}
