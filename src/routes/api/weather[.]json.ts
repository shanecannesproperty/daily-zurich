// Public read-only JSON API: current weather for this city.
// Wraps the existing Open-Meteo proxy server fn so we expose a stable,
// CORS-enabled JSON endpoint with no API key requirement for consumers.
import { createFileRoute } from "@tanstack/react-router";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
  "Cache-Control": "public, max-age=600, s-maxage=900",
} as const;

export const Route = createFileRoute("/api/weather.json")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async () => {
        try {
          const { getCityWeather, describeWeather } = await import("@/lib/weather.functions");
          const { cityName, citySlug } = await import("@/lib/city");
          const w = await getCityWeather();
          const c = w.current;
          const today = w.daily?.[0];
          const body = {
            city: { slug: citySlug(), name: cityName() },
            current: c
              ? {
                  temperature_c: c.temperature,
                  apparent_c: c.apparent,
                  humidity: c.humidity,
                  wind_speed_kmh: c.windSpeed,
                  wind_direction_deg: c.windDirection,
                  weather_code: c.weatherCode,
                  conditions: describeWeather(c.weatherCode).label,
                  is_day: c.isDay,
                  observed_at: c.time,
                }
              : null,
            today: today
              ? {
                  date: today.date,
                  max_c: today.max,
                  min_c: today.min,
                  precip_prob: today.precipProb,
                  uv_max: today.uvMax,
                  sunrise: today.sunrise,
                  sunset: today.sunset,
                }
              : null,
            source: "Open-Meteo (https://open-meteo.com)",
          };
          return new Response(JSON.stringify(body, null, 2), {
            status: 200,
            headers: { "Content-Type": "application/json; charset=utf-8", ...CORS },
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : "Unknown error";
          return new Response(JSON.stringify({ error: message }), {
            status: 500,
            headers: { "Content-Type": "application/json; charset=utf-8", ...CORS },
          });
        }
      },
    },
  },
});
