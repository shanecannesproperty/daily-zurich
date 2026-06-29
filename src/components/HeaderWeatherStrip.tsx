// Compact current-conditions strip in the masthead top bar. Keeps to the
// editorial type system (small caps meta) and links through to /weather.
// Renders nothing until the data arrives so it never causes layout shift.
import { useQuery } from "@tanstack/react-query";
import { getCityWeather, describeWeather } from "@/lib/weather.functions";
import { cityName, citySlug } from "@/lib/city";

export function HeaderWeatherStrip() {
  const { data } = useQuery({
    queryKey: ["weather-strip", citySlug()],
    queryFn: () => getCityWeather(),
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
  const c = data?.current;
  if (!c) return <span className="hidden sm:inline opacity-0">—</span>;
  const { label, icon } = describeWeather(c.weatherCode);
  const today = data?.daily?.[0];
  return (
    <a
      href="/weather"
      className="hidden sm:inline-flex items-center gap-1.5 no-underline text-[var(--ink)] hover:text-[var(--ink-red)]"
      aria-label={`${cityName()} weather: ${label}, ${Math.round(c.temperature)} degrees${
        today ? `, high ${Math.round(today.max)} low ${Math.round(today.min)}` : ""
      }`}
    >
      <span aria-hidden>{icon}</span>
      <span className="font-semibold">{Math.round(c.temperature)}°</span>
      <span className="opacity-70">{label}</span>
      {today && (
        <span className="hidden md:inline opacity-50">
          {Math.round(today.max)}° / {Math.round(today.min)}°
        </span>
      )}
    </a>
  );
}
