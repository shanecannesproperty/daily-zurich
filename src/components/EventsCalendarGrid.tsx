// Month-grid calendar view for /events. Highlights dates with events using a
// red dot; clicking a date opens a side panel listing events for that day.
import { useMemo, useState } from "react";
import type { EventRow } from "@/lib/schema";
import { formatTime } from "@/lib/date";

function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function addMonths(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

export function EventsCalendarGrid({ events }: { events: EventRow[] }) {
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));
  const [selected, setSelected] = useState<string | null>(ymd(new Date()));

  const byDay = useMemo(() => {
    const m = new Map<string, EventRow[]>();
    for (const e of events) {
      if (!e.start_at) continue;
      const k = ymd(new Date(e.start_at));
      const arr = m.get(k) ?? [];
      arr.push(e);
      m.set(k, arr);
    }
    return m;
  }, [events]);

  const monthLabel = cursor.toLocaleDateString("en-AU", { month: "long", year: "numeric" });
  const firstDay = cursor;
  const lead = (firstDay.getDay() + 6) % 7; // start Mon
  const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < lead; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(cursor.getFullYear(), cursor.getMonth(), d));
  while (cells.length % 7 !== 0) cells.push(null);

  const selectedEvents = selected ? (byDay.get(selected) ?? []) : [];
  const todayKey = ymd(new Date());

  return (
    <div className="mt-4 grid gap-8 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => setCursor((c) => addMonths(c, -1))} className="meta uppercase tracking-widest">← Prev</button>
          <h3 className="serif text-xl font-semibold">{monthLabel}</h3>
          <button onClick={() => setCursor((c) => addMonths(c, 1))} className="meta uppercase tracking-widest">Next →</button>
        </div>
        <div className="grid grid-cols-7 text-[10px] uppercase tracking-widest meta border-b border-[var(--hairline)] pb-2">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
            <div key={d} className="text-center">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((d, i) => {
            if (!d) return <div key={i} className="aspect-square border-b border-r border-[var(--hairline)]" />;
            const k = ymd(d);
            const has = byDay.has(k);
            const isSel = selected === k;
            const isToday = todayKey === k;
            return (
              <button
                key={i}
                onClick={() => setSelected(k)}
                className={`aspect-square border-b border-r border-[var(--hairline)] flex flex-col items-center justify-center text-sm relative ${
                  isSel ? "bg-[var(--ink)] text-[var(--surface)]" : ""
                }`}
              >
                <span className={isToday && !isSel ? "font-bold underline" : ""}>{d.getDate()}</span>
                {has && (
                  <span
                    className={`mt-1 inline-block h-1.5 w-1.5 rounded-full ${
                      isSel ? "bg-white" : "bg-[var(--ink-red)]"
                    }`}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <aside className="border-l border-[var(--hairline)] lg:pl-6">
        <p className="kicker">
          {selected
            ? new Date(selected).toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long" })
            : "Select a date"}
        </p>
        {selectedEvents.length === 0 ? (
          <p className="meta mt-3">No events listed for this day.</p>
        ) : (
          <ul className="mt-4 space-y-4">
            {selectedEvents.map((e) => (
              <li key={e.id} className="border-t border-[var(--hairline)] pt-3">
                <h4 className="serif font-semibold">
                  <a href={`/event/${e.slug}`} className="no-underline hover:underline">{e.title}</a>
                </h4>
                {e.start_at && <p className="meta mt-1">{formatTime(e.start_at)}{e.venue ? ` · ${e.venue}` : ""}</p>}
              </li>
            ))}
          </ul>
        )}
      </aside>
    </div>
  );
}
