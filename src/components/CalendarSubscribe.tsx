import { CalendarPlus, Download } from "lucide-react";
import { cityName, siteDomain } from "@/lib/city";

/** Subscribe to the live city events feed (webcal://) or download a snapshot. */
export function CalendarSubscribe() {
  const httpUrl = `${siteDomain()}/events.ics`;
  const webcalUrl = httpUrl.replace(/^https?:/, "webcal:");
  return (
    <div className="flex flex-col gap-3 border border-[var(--ink)] bg-[var(--paper-warm)] p-5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="kicker">Subscribe</p>
        <p className="mt-1 text-sm font-medium text-[var(--ink)]">
          Add every {cityName()} event to your calendar. Updates automatically.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <a href={webcalUrl} className="btn-primary inline-flex items-center gap-2">
          <CalendarPlus className="h-4 w-4" />
          Subscribe in calendar
        </a>
        <a href={httpUrl} className="btn-ghost inline-flex items-center gap-2" download>
          <Download className="h-4 w-4" />
          Download .ics
        </a>
      </div>
    </div>
  );
}
