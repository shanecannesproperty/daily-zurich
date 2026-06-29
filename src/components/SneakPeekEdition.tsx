// Sample morning briefing shown above the subscribe form to anchor the value
// proposition with concrete content. Hardcoded sample (not a real edition).
import { cityName } from "@/lib/city";

function todayLong(): string {
  const d = new Date();
  return d.toLocaleDateString("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function SneakPeekEdition() {
  const city = cityName();
  return (
    <figure
      className="border border-[var(--ink,#2d2d2d)] bg-[var(--bg,#f5f3ee)] p-6 sm:p-8"
      aria-label="Sample edition preview"
    >
      <figcaption className="kicker">This is what you&apos;d get this morning</figcaption>
      <div className="mt-4 border-t-2 border-[var(--accent,#A32D2D)] pt-4">
        <p className="meta">{todayLong()}</p>
        <p className="serif text-2xl mt-1 font-semibold">The Daily {city}</p>
        <p className="meta italic">Your five-minute morning briefing</p>
      </div>

      <div className="mt-5">
        <p className="kicker">Top stories</p>
        <ul className="mt-2 space-y-3 serif">
          <li>
            <span className="font-semibold">Light rail Stage 2A funding locked in.</span>{" "}
            Construction crews mobilise to Commonwealth Park this week, with first track due to be laid before spring.
          </li>
          <li>
            <span className="font-semibold">{city} rental vacancy ticks up to 1.4%.</span>{" "}
            Inner-north suburbs lead the easing, but agents say competition for family homes remains fierce.
          </li>
          <li>
            <span className="font-semibold">Brumbies sign Wallabies hooker on two-year deal.</span>{" "}
            Coach says the move shores up the front row ahead of the Super Rugby finals push.
          </li>
        </ul>
      </div>

      <div className="mt-5 border-t border-[var(--hairline,#d6d2c9)] pt-4">
        <p className="kicker">Weather</p>
        <p className="serif mt-1">
          ⛅ Partly cloudy. High 19°C, low 6°C. Light winds easing this afternoon.
        </p>
      </div>

      <p className="meta mt-5 text-center italic">
        [ End of preview ]
      </p>
    </figure>
  );
}
