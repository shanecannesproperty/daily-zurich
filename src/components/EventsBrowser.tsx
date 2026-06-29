// Client-side events browser used on the homepage (events-led mode) and the
// /events page. Server renders the full unfiltered list; this component then
// applies category and weekend filters in the browser without a round trip.
import { useMemo, useState } from "react";
import type { EventRow } from "@/lib/schema";
import { EventImage, isRealCover } from "@/components/EventImage";
import { dateBucketLabel, formatShortDate, formatTime, withinNextWeekend } from "@/lib/date";

// Display label -> matchers against event.category (case-insensitive substring).
const CATEGORIES: Array<{ label: string; matches: string[] }> = [
  { label: "Music", matches: ["music", "gig", "concert", "live"] },
  { label: "Arts", matches: ["art", "theatre", "theater", "exhibition", "gallery"] },
  { label: "Food & Drink", matches: ["food", "drink", "dining", "wine", "beer"] },
  { label: "Markets", matches: ["market"] },
  { label: "Family", matches: ["family", "kids", "children"] },
  { label: "Sport", matches: ["sport"] },
  { label: "Community", matches: ["community", "talk", "workshop"] },
  { label: "Festivals", matches: ["festival"] },
];

function matchesCategory(cat: string | null, label: string) {
  if (!cat) return false;
  const c = cat.toLowerCase();
  const entry = CATEGORIES.find((x) => x.label === label);
  if (!entry) return false;
  return entry.matches.some((m) => c.includes(m));
}

interface Props {
  events: EventRow[];
  // When true, group items under date headings (used on /events).
  grouped?: boolean;
  // When true, show the compact filter chip row.
  showFilters?: boolean;
  // Max items to render after filtering. Default unlimited.
  limit?: number;
  // Style: editorial list (default) or two-column grid for the homepage lead.
  variant?: "list" | "grid";
}

export function EventsBrowser({
  events,
  grouped = false,
  showFilters = true,
  limit,
  variant = "list",
}: Props) {
  const [category, setCategory] = useState<string | null>(null);
  const [weekendOnly, setWeekendOnly] = useState(false);

  const filtered = useMemo(() => {
    const now = new Date();
    // Defensive: never render an event without a verified source_url.
    let out = events.filter(
      (e) => typeof e.source_url === "string" && e.source_url.trim().length > 0,
    );
    if (category) out = out.filter((e) => matchesCategory(e.category, category));
    if (weekendOnly) {
      out = out.filter((e) => (e.start_at ? withinNextWeekend(new Date(e.start_at), now) : false));
    }
    return limit ? out.slice(0, limit) : out;
  }, [events, category, weekendOnly, limit]);

  return (
    <div>
      {showFilters && (
        <div className="mt-4 flex flex-wrap items-center gap-2 border-y border-[var(--hairline)] py-3">
          <button
            type="button"
            onClick={() => {
              setCategory(null);
              setWeekendOnly(false);
            }}
            aria-pressed={!category && !weekendOnly}
            className={chipClass(!category && !weekendOnly)}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setWeekendOnly((v) => !v)}
            aria-pressed={weekendOnly}
            className={chipClass(weekendOnly)}
          >
            This weekend
          </button>
          <span className="mx-1 h-4 w-px bg-[var(--hairline)]" aria-hidden />
          {CATEGORIES.map((c) => (
            <button
              key={c.label}
              type="button"
              onClick={() => setCategory((cur) => (cur === c.label ? null : c.label))}
              aria-pressed={category === c.label}
              className={chipClass(category === c.label)}
            >
              {c.label}
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="meta mt-8">No events match these filters. Try another category.</p>
      ) : grouped ? (
        <GroupedList events={filtered} />
      ) : variant === "grid" ? (
        <EventGrid events={filtered} />
      ) : (
        <EventList events={filtered} />
      )}
    </div>
  );
}

function chipClass(active: boolean) {
  return [
    "meta uppercase tracking-widest border border-[var(--hairline)] px-3 py-1",
    "transition-colors hover:bg-[var(--surface)]",
    active ? "bg-[var(--ink)] text-[var(--paper)] border-[var(--ink)]" : "",
  ].join(" ");
}

function EventGrid({ events }: { events: EventRow[] }) {
  return (
    <ul className="mt-6 grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
      {events.map((e) => (
        <li key={e.id} className="border-t border-[var(--ink)] pt-4">
          {isRealCover(e.image_url) ? (
            <a
              href={`/event/${e.slug}`}
              aria-label={`${e.title} — view event details`}
              className="block no-underline mb-3"
            >
              <EventImage src={e.image_url} alt={`Photo from ${e.title}`} />
            </a>
          ) : null}
          <p className="meta uppercase tracking-widest">
            {formatShortDate(e.start_at)}
            {e.start_at ? ` · ${formatTime(e.start_at)}` : ""}
            {e.category ? ` · ${e.category}` : ""}
          </p>
          <h3 className="serif text-xl font-semibold leading-snug mt-2">
            <a href={`/event/${e.slug}`} className="no-underline hover:underline">
              {e.title}
            </a>
          </h3>
          {(e.venue || e.suburb) && (
            <p className="meta mt-2">{[e.venue, e.suburb].filter(Boolean).join(", ")}</p>
          )}
          {e.price && <p className="meta mt-1">{e.price}</p>}
          <div className="meta mt-3 flex flex-wrap gap-4">
            <a href={`/event/${e.slug}`}>See details</a>
            {e.booking_url && (
              <a
                href={e.booking_url}
                target="_blank"
                rel="noopener nofollow"
                className="text-[var(--accent)] font-semibold"
              >
                Book
              </a>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

function EventList({ events }: { events: EventRow[] }) {
  return (
    <ul className="mt-6 divide-y divide-[var(--hairline)] border-t border-[var(--ink)]">
      {events.map((e) => (
        <EventListItem key={e.id} e={e} />
      ))}
    </ul>
  );
}

function GroupedList({ events }: { events: EventRow[] }) {
  const now = new Date();
  const groups: Array<{ label: string; items: EventRow[] }> = [];
  for (const e of events) {
    const label = dateBucketLabel(e.start_at, now);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(e);
    else groups.push({ label, items: [e] });
  }
  return (
    <div className="mt-6 space-y-10">
      {groups.map((g) => (
        <section key={g.label}>
          <h2 className="kicker">{g.label}</h2>
          <ul className="mt-3 divide-y divide-[var(--hairline)] border-t border-[var(--ink)]">
            {g.items.map((e) => (
              <EventListItem key={e.id} e={e} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function EventListItem({ e }: { e: EventRow }) {
  const hasImage = isRealCover(e.image_url);
  if (hasImage) {
    return (
      <li className="py-6 grid gap-4 md:grid-cols-12">
        <a
          href={`/event/${e.slug}`}
          aria-label={`${e.title} — view event details`}
          className="md:col-span-4 block no-underline"
        >
          <EventImage src={e.image_url} alt={`Photo from ${e.title}`} />
        </a>
        <div className="md:col-span-8">
          <p className="meta uppercase tracking-widest">
            {formatShortDate(e.start_at)}
            {e.start_at ? ` · ${formatTime(e.start_at)}` : ""}
            {e.category ? ` · ${e.category}` : ""}
          </p>
          <a
            href={`/event/${e.slug}`}
            className="serif text-lg no-underline hover:underline block mt-1"
          >
            {e.title}
          </a>
          <p className="meta mt-1">{[e.venue, e.suburb].filter(Boolean).join(", ")}</p>
          <div className="meta mt-2 flex gap-4">
            {e.price && <span>{e.price}</span>}
            {e.booking_url && (
              <a
                href={e.booking_url}
                target="_blank"
                rel="noopener nofollow"
                className="text-[var(--accent)] font-semibold"
              >
                Book
              </a>
            )}
          </div>
        </div>
      </li>
    );
  }
  return (
    <li className="py-5 grid gap-2 md:grid-cols-12 md:items-baseline">
      <span className="meta md:col-span-3">
        {formatShortDate(e.start_at)}
        {e.start_at ? ` · ${formatTime(e.start_at)}` : ""}
      </span>
      <div className="md:col-span-7">
        <a href={`/event/${e.slug}`} className="serif text-lg no-underline hover:underline">
          {e.title}
        </a>
        <p className="meta mt-1">
          {[e.venue, e.suburb].filter(Boolean).join(", ")}
          {e.category ? ` · ${e.category}` : ""}
        </p>
      </div>
      <div className="md:col-span-2 md:text-right meta flex gap-4 md:justify-end">
        {e.price && <span>{e.price}</span>}
        {e.booking_url && (
          <a
            href={e.booking_url}
            target="_blank"
            rel="noopener nofollow"
            className="text-[var(--accent)] font-semibold"
          >
            Book
          </a>
        )}
      </div>
    </li>
  );
}
