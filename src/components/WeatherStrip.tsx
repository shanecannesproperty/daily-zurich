import { useQuery } from "@tanstack/react-query";
import { getCityWeather, describeWeather } from "@/lib/weather.functions";
import { cityName, citySlug } from "@/lib/city";

export function WeatherStrip() {
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
    <section className="border-y border-[var(--hairline)] bg-[var(--surface)]">
      <div className="container-news">
        <a
          href="/weather"
          className="flex flex-wrap items-center gap-x-5 gap-y-2 py-3 no-underline hover:no-underline group"
          aria-label={`${cityName()} weather — view full forecast`}
        >
          {/* Label */}
          <span className="kicker shrink-0 text-[var(--ink-muted)] group-hover:text-[var(--ink)] transition-colors">
            Weather
          </span>

          {/* Current conditions */}
          <span className="flex items-center gap-2 shrink-0">
            <span className="text-2xl leading-none" aria-hidden>{icon}</span>
            <span className="serif text-2xl leading-none text-[var(--ink)]">
              {Math.round(c.temperature)}°C
            </span>
            <span className="meta text-[var(--ink-muted)] hidden sm:inline">{label}</span>
          </span>

          {/* Today high/low */}
          {today && (
            <span className="meta text-[var(--ink-muted)] shrink-0 hidden sm:inline">
              {Math.round(today.max)}° / {Math.round(today.min)}°
            </span>
          )}

          {/* Divider */}
          <span className="hidden md:inline text-[var(--hairline)]">|</span>

          {/* 3-day outlook */}
          {data?.daily && data.daily.length >= 3 && (
            <span className="hidden md:flex items-center gap-4">
              {data.daily.slice(1, 4).map((d, i) => {
                const w = describeWeather(d.weatherCode);
                const dayLabel = i === 0
                  ? "Tomorrow"
                  : new Date(d.date).toLocaleDateString("en-AU", { weekday: "short" });
                return (
                  <span key={d.date} className="flex items-center gap-1.5">
                    <span className="meta text-[var(--ink-muted)]">{dayLabel}</span>
                    <span aria-hidden>{w.icon}</span>
                    <span className="meta text-[var(--ink)]">{Math.round(d.max)}°</span>
                  </span>
                );
              })}
            </span>
          )}

          {/* CTA */}
          <span className="ml-auto meta text-[var(--ink-red)] group-hover:underline shrink-0 hidden sm:inline">
            Full forecast →
          </span>
        </a>
      </div>
    </section>
  );
}
