// "Today in [City] history" — one date-specific historical fact per day,
// cycling through a pre-seeded list keyed by month/day. Falls back to a
// civic fact when no exact match exists. Slim card, homepage-only.
import { cityName, citySlug, isCityAustralian } from "@/lib/city";

type Fact = { date: string; text: string };

const CANBERRA: Fact[] = [
  { date: "01-01", text: "1901: The Commonwealth of Australia was proclaimed, setting the path for a federal capital." },
  { date: "11-02", text: "1913: Canberra was officially named Australia's capital at a ceremony on Capital Hill." },
  { date: "12-03", text: "1913: The official naming ceremony for Canberra was held by Lady Denman." },
  { date: "09-05", text: "1927: Old Parliament House opened, and Parliament met in Canberra for the first time." },
  { date: "06-06", text: "1927: Australia's first session of federal Parliament in Canberra concluded its opening sittings." },
  { date: "12-08", text: "1989: The Australian Capital Territory achieved self-government." },
  { date: "18-08", text: "1981: Construction of the new Parliament House began on Capital Hill." },
  { date: "09-05", text: "1988: New Parliament House was opened by Queen Elizabeth II in Canberra." },
  { date: "21-10", text: "1980: The High Court of Australia building was opened in Canberra." },
  { date: "07-12", text: "1939: The Australian War Memorial design was finalised for Anzac Parade." },
  { date: "11-11", text: "1941: The Australian War Memorial was officially opened on Remembrance Day." },
  { date: "18-01", text: "2003: The Canberra bushfires devastated the city's western suburbs." },
];

const GENERIC: Fact[] = [
  { date: "01-01", text: "1901: The Commonwealth of Australia came into being." },
  { date: "26-01", text: "1788: The First Fleet arrived at Sydney Cove." },
  { date: "25-04", text: "1915: Australian and New Zealand troops landed at Gallipoli." },
  { date: "09-07", text: "1900: The Commonwealth of Australia Constitution Act received royal assent." },
  { date: "11-11", text: "1918: The Armistice ended the First World War." },
];

function pickFact(): { text: string; isCanberra: boolean } {
  const slug = citySlug();
  const now = new Date();
  const key = `${String(now.getDate()).padStart(2, "0")}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const pool = slug === "canberra" ? CANBERRA : GENERIC;
  const exact = pool.find((f) => f.date === key);
  if (exact) return { text: exact.text, isCanberra: slug === "canberra" };
  // Deterministic fallback so the card stays stable for the day rather than
  // re-rolling on every render.
  const idx =
    (now.getMonth() * 31 + now.getDate()) % (pool.length || 1);
  return { text: pool[idx]?.text ?? "A day in local history.", isCanberra: slug === "canberra" };
}

export function TodayInHistory() {
  if (!isCityAustralian()) return null;
  const fact = pickFact();
  return (
    <aside
      aria-label={`Today in ${cityName()} history`}
      className="border-l-4 border-[var(--accent,#A32D2D)] bg-[var(--surface,#e8e4dd)]/60 px-4 py-3"
    >
      <p className="kicker text-[var(--accent,#A32D2D)]">
        Today in {fact.isCanberra ? cityName() : "Australian"} history
      </p>
      <p className="serif mt-1 text-[15px] leading-snug">{fact.text}</p>
    </aside>
  );
}
