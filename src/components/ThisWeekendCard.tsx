import { CalendarHeart } from "lucide-react";
import { cityName } from "@/lib/city";
import { formatShortDate } from "@/lib/date";
import type { EventRow } from "@/lib/schema";

// Compact homepage card: next 2-3 events (from the events table) happening
// in the coming 7 days. Falls back gracefully — returns nothing if no events
// match so we never render an empty box.
export function ThisWeekendCard({ events }: { events: EventRow[] }) {
  const now = Date.now();
  const horizon = now + 7 * 24 * 60 * 60 * 1000;
  const upcoming = (events ?? [])
    .filter((e) => {
      if (!e.start_at) return false;
      const t = new Date(e.start_at).getTime();
      return Number.isFinite(t) && t >= now && t <= horizon;
    })
    .sort(
      (a, b) =>
        new Date(a.start_at as string).getTime() -
        new Date(b.start_at as string).getTime(),
    )
    .slice(0, 3);

  if (upcoming.length === 0) return null;

  return (
    <aside
      className="border border-[var(--ink,#2d2d2d)] bg-[var(--surface,#e8e4dd)] p-5"
      aria-labelledby="this-weekend-heading"
    >
      <div className="flex items-center gap-2">
        <CalendarHeart className="h-4 w-4 text-[var(--ink-red,#A32D2D)]" aria-hidden />
        <p className="kicker">This week</p>
      </div>
      <h2 id="this-weekend-heading" className="h3-card mt-1">
        This weekend in {cityName()}
      </h2>

      <ul className="mt-4 space-y-3">
        {upcoming.map((ev) => {
          const date = ev.start_at ? formatShortDate(ev.start_at) : null;
          return (
            <li
              key={ev.id}
              className="border-t border-[var(--hairline,rgba(0,0,0,0.12))] pt-3 first:border-t-0 first:pt-0"
            >
              <a href={`/events/${ev.slug}`} className="block no-underline group">
                {date && <p className="meta">{date}</p>}
                <p className="serif text-base leading-snug group-hover:underline">
                  {ev.title}
                </p>
                {ev.venue && (
                  <p className="meta mt-0.5 line-clamp-1">{ev.venue}</p>
                )}
              </a>
            </li>
          );
        })}
      </ul>

      <a
        href="/events"
        className="meta mt-4 inline-block underline"
      >
        All events →
      </a>
    </aside>
  );
}
