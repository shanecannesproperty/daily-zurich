import { CalendarPlus } from "lucide-react";
import { buildIcsDataUri, icsFilename, type IcsEvent } from "@/lib/ics";

export function AddToCalendar({ event }: { event: IcsEvent }) {
  const href = buildIcsDataUri(event);
  if (!href) return null;

  return (
    <a
      href={href}
      download={icsFilename(event.title)}
      className="btn-ghost inline-flex items-center gap-2"
    >
      <CalendarPlus className="h-4 w-4" />
      Add to calendar
    </a>
  );
}
