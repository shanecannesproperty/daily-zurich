// Homepage weather card. Reuses the existing getCityWeather server fn
// (which proxies Open-Meteo) and the shared describeWeather helper for the
// WMO code → label/emoji mapping. Renders a compact editorial card with
// temp, conditions, feels-like and wind speed.
import { useQuery } from "@tanstack/react-query";
import { getCityWeather, describeWeather } from "@/lib/weather.functions";
import { cityName, citySlug } from "@/lib/city";
import { WeatherScene } from "@/components/WeatherScene";

export function HomeWeatherCard() {
  const { data } = useQuery({
    queryKey: ["home-weather", citySlug()],
    queryFn: () => getCityWeather(),
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
  const c = data?.current;
  if (!c) return null;
  const { label, icon } = describeWeather(c.weatherCode);
  const today = data?.daily?.[0];

  return (
    <aside
      className="border border-[var(--hairline,#d6d2c9)] bg-[var(--surface,#e8e4dd)] p-5"
      aria-label={`${cityName()} weather`}
    >
      <div className="flex items-center justify-between">
        <p className="kicker">{cityName()} weather</p>
        <a href="/weather" className="text-xs no-underline hover:underline">
          Full forecast →
        </a>
      </div>
      <WeatherScene code={c.weatherCode} isDay={c.isDay} className="mt-3 h-24" />
      <div className="mt-3 flex items-start gap-4">
        <div className="text-5xl leading-none" aria-hidden>
          {icon}
        </div>
        <div>
          <p className="serif text-4xl leading-none">
            {Math.round(c.temperature)}°<span className="text-xl align-top">C</span>
          </p>
          <p className="meta mt-1">{label}</p>
        </div>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-y-1 text-sm">
        <dt className="text-[var(--ink-muted,#6b6b6b)]">Feels like</dt>
        <dd className="text-right">{Math.round(c.apparent)}°C</dd>
        <dt className="text-[var(--ink-muted,#6b6b6b)]">Wind</dt>
        <dd className="text-right">{Math.round(c.windSpeed)} km/h</dd>
        {today && (
          <>
            <dt className="text-[var(--ink-muted,#6b6b6b)]">Today</dt>
            <dd className="text-right">
              {Math.round(today.max)}° / {Math.round(today.min)}°
            </dd>
          </>
        )}
      </dl>

      {data?.daily && data.daily.length >= 2 && (
        <div className="mt-4 border-t border-[var(--hairline,#d6d2c9)] pt-3">
          <p className="kicker mb-2">3-day outlook</p>
          <div className="grid grid-cols-3 gap-2 text-center">
            {data.daily.slice(0, 3).map((d, i) => {
              const w = describeWeather(d.weatherCode);
              const labelDay =
                i === 0
                  ? "Today"
                  : i === 1
                    ? "Tomorrow"
                    : new Date(d.date).toLocaleDateString("en-AU", { weekday: "short" });
              return (
                <div
                  key={d.date}
                  className="border border-[var(--hairline,#d6d2c9)] bg-[var(--bg,#f5f3ee)] py-2"
                >
                  <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--ink-muted,#6b6b6b)]">
                    {labelDay}
                  </p>
                  <div className="text-2xl my-1" aria-hidden>
                    {w.icon}
                  </div>
                  <p className="text-xs font-semibold">
                    {Math.round(d.max)}°{" "}
                    <span className="text-[var(--ink-muted,#6b6b6b)] font-normal">
                      {Math.round(d.min)}°
                    </span>
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </aside>
  );
}
