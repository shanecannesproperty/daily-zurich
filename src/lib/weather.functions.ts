// Server functions for the per-city weather page. Hits the free Open-Meteo API
// (no API key) and caches the response briefly so server renders are fast and
// we don't hammer the upstream. Render is server-side so the forecast ships
// in the initial HTML for SEO.
//
// The latitude/longitude/timezone come from the active city (cityCoords /
// cityTimezone), so the same code serves any Daily Network city from its
// VITE_SITE_CITY pin alone. We pull current conditions, a next-24-hour hourly
// timeline and a 7-day outlook in one request. Pure helpers (describeWeather,
// windCompass, uvCategory, computeWeatherAlerts, pickHourStartIndex) carry no
// server-only imports so they can be unit tested and reused on the client.
import { createServerFn } from "@tanstack/react-start";
import { cityCoords, cityName, citySlug, cityTimezone } from "@/lib/city";

function openMeteoUrl(): string {
  const [lat, lon] = cityCoords();
  const tz = encodeURIComponent(cityTimezone());
  return (
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    "&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,wind_direction_10m,weather_code,uv_index,is_day" +
    "&hourly=temperature_2m,precipitation_probability,weather_code" +
    "&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,uv_index_max,sunrise,sunset" +
    `&timezone=${tz}`
  );
}

function airQualityUrl(): string {
  const [lat, lon] = cityCoords();
  const tz = encodeURIComponent(cityTimezone());
  return (
    `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}` +
    `&current=pm2_5,pm10,ozone,nitrogen_dioxide,us_aqi&timezone=${tz}`
  );
}

const CACHE_MS = 15 * 60 * 1000; // 15 minutes
const HOURLY_WINDOW = 24; // hours shown on the page

export interface WeatherCurrent {
  temperature: number;
  apparent: number;
  humidity: number;
  windSpeed: number;
  windDirection: number;
  weatherCode: number;
  uvIndex: number;
  isDay: boolean;
  time: string;
}

export interface WeatherHour {
  time: string; // ISO local, e.g. "2026-06-25T14:00"
  temperature: number;
  precipProb: number;
  weatherCode: number;
}

export interface WeatherDay {
  date: string;
  weatherCode: number;
  max: number;
  min: number;
  precipProb: number;
  uvMax: number;
  sunrise: string;
  sunset: string;
}

export interface WeatherAirQuality {
  pm2_5: number | null;
  pm10: number | null;
  ozone: number | null;
  no2: number | null;
  usAqi: number | null;
}

export interface CityWeather {
  current: WeatherCurrent | null;
  hourly: WeatherHour[]; // next ~24h from the current hour
  daily: WeatherDay[];
  airQuality: WeatherAirQuality | null;
  fetchedAt: string;
  source: "open-meteo";
  error?: string;
  briefing?: string;
}

// Cache keyed by city slug so one deploy can serve different cities correctly.
const cache = new Map<string, { at: number; data: CityWeather }>();

// Find where the upcoming hours begin. Both the hourly timestamps and the
// "current" time come back in the requested timezone as "YYYY-MM-DDTHH:MM",
// so a lexicographic compare on the hour prefix avoids any server-vs-local
// timezone maths. Returns 0 when nothing matches (e.g. missing current time).
export function pickHourStartIndex(times: string[], currentTime: string | undefined): number {
  if (!currentTime) return 0;
  const key = currentTime.slice(0, 13); // "YYYY-MM-DDTHH"
  const idx = times.findIndex((t) => t.slice(0, 13) >= key);
  return idx < 0 ? 0 : idx;
}

async function fetchWeather(): Promise<CityWeather> {
  try {
    const res = await fetch(openMeteoUrl(), {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`Open-Meteo ${res.status}`);
    const json = (await res.json()) as {
      current?: {
        time: string;
        temperature_2m: number;
        apparent_temperature: number;
        relative_humidity_2m: number;
        wind_speed_10m: number;
        wind_direction_10m: number;
        weather_code: number;
        uv_index: number;
        is_day: number;
      };
      hourly?: {
        time: string[];
        temperature_2m: number[];
        precipitation_probability: (number | null)[];
        weather_code: number[];
      };
      daily?: {
        time: string[];
        weather_code: number[];
        temperature_2m_max: number[];
        temperature_2m_min: number[];
        precipitation_probability_max: (number | null)[];
        uv_index_max: (number | null)[];
        sunrise: string[];
        sunset: string[];
      };
    };

    const current: WeatherCurrent | null = json.current
      ? {
          time: json.current.time,
          temperature: json.current.temperature_2m,
          apparent: json.current.apparent_temperature,
          humidity: json.current.relative_humidity_2m,
          windSpeed: json.current.wind_speed_10m,
          windDirection: json.current.wind_direction_10m,
          weatherCode: json.current.weather_code,
          uvIndex: json.current.uv_index,
          isDay: json.current.is_day === 1,
        }
      : null;

    const h = json.hourly;
    let hourly: WeatherHour[] = [];
    if (h && h.time.length) {
      const start = pickHourStartIndex(h.time, json.current?.time);
      hourly = h.time.slice(start, start + HOURLY_WINDOW).map((time, i) => ({
        time,
        temperature: h.temperature_2m[start + i] ?? 0,
        precipProb: h.precipitation_probability[start + i] ?? 0,
        weatherCode: h.weather_code[start + i] ?? 0,
      }));
    }

    const d = json.daily;
    const daily: WeatherDay[] = d
      ? d.time.map((date, i) => ({
          date,
          weatherCode: d.weather_code[i] ?? 0,
          max: d.temperature_2m_max[i] ?? 0,
          min: d.temperature_2m_min[i] ?? 0,
          precipProb: d.precipitation_probability_max[i] ?? 0,
          uvMax: d.uv_index_max[i] ?? 0,
          sunrise: d.sunrise[i] ?? "",
          sunset: d.sunset[i] ?? "",
        }))
      : [];

    return {
      current,
      hourly,
      daily,
      airQuality: await fetchAirQuality(),
      fetchedAt: new Date().toISOString(),
      source: "open-meteo",
    };
  } catch (e) {
    return {
      current: null,
      hourly: [],
      daily: [],
      airQuality: null,
      fetchedAt: new Date().toISOString(),
      source: "open-meteo",
      error: e instanceof Error ? e.message : "Weather unavailable",
    };
  }
}

// Air quality is best-effort: a failure here never breaks the forecast.
async function fetchAirQuality(): Promise<WeatherAirQuality | null> {
  try {
    const res = await fetch(airQualityUrl(), { headers: { Accept: "application/json" } });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      current?: {
        pm2_5?: number;
        pm10?: number;
        ozone?: number;
        nitrogen_dioxide?: number;
        us_aqi?: number;
      };
    };
    const c = json.current;
    if (!c) return null;
    return {
      pm2_5: c.pm2_5 ?? null,
      pm10: c.pm10 ?? null,
      ozone: c.ozone ?? null,
      no2: c.nitrogen_dioxide ?? null,
      usAqi: c.us_aqi ?? null,
    };
  } catch (_e) {
    return null;
  }
}

async function fetchFromBackend(slug: string): Promise<CityWeather | null> {
  const url =
    (import.meta.env.VITE_DN_WEATHER_URL as string | undefined) ??
    (typeof process !== "undefined" ? process.env.VITE_DN_WEATHER_URL : undefined);
  const key =
    (import.meta.env.VITE_DN_WEATHER_KEY as string | undefined) ??
    (typeof process !== "undefined" ? process.env.VITE_DN_WEATHER_KEY : undefined);
  if (!url || !key) return null;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ p_city: slug }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as CityWeather | null;
    if (data && typeof data === "object" && data.current) return data;
    return null;
  } catch {
    return null;
  }
}

export const getCityWeather = createServerFn({ method: "GET" }).handler(
  async (): Promise<CityWeather> => {
    const slug = citySlug();
    const now = Date.now();
    const hit = cache.get(slug);
    if (hit && now - hit.at < CACHE_MS) return hit.data;
    const backend = await fetchFromBackend(slug);
    if (backend) {
      cache.set(slug, { at: now, data: backend });
      return backend;
    }
    const data = await fetchWeather();
    // Only cache successful responses; let errors retry on next request.
    if (!data.error) cache.set(slug, { at: now, data });
    return data;
  },
);

// WMO weather code → short label + emoji icon. Kept compact and editorial.
export function describeWeather(code: number): { label: string; icon: string } {
  if (code === 0) return { label: "Clear", icon: "☀️" };
  if (code === 1) return { label: "Mainly clear", icon: "🌤️" };
  if (code === 2) return { label: "Partly cloudy", icon: "⛅" };
  if (code === 3) return { label: "Overcast", icon: "☁️" };
  if (code === 45 || code === 48) return { label: "Fog", icon: "🌫️" };
  if (code >= 51 && code <= 57) return { label: "Drizzle", icon: "🌦️" };
  if (code >= 61 && code <= 65) return { label: "Rain", icon: "🌧️" };
  if (code >= 66 && code <= 67) return { label: "Freezing rain", icon: "🌧️" };
  if (code >= 71 && code <= 77) return { label: "Snow", icon: "🌨️" };
  if (code >= 80 && code <= 82) return { label: "Showers", icon: "🌦️" };
  if (code >= 85 && code <= 86) return { label: "Snow showers", icon: "🌨️" };
  if (code >= 95) return { label: "Thunderstorm", icon: "⛈️" };
  return { label: "—", icon: "•" };
}

// WMO weather code → animated-scene kind for <WeatherScene>. Coarser than
// describeWeather (we animate by family, not by exact code) so the hero scene
// mirrors Google's "what does it look like outside" illustration.
export type WeatherSceneKind = "clear" | "partly" | "cloudy" | "fog" | "rain" | "snow" | "storm";

export function weatherScene(code: number): WeatherSceneKind {
  if (code === 0 || code === 1) return "clear";
  if (code === 2) return "partly";
  if (code === 3) return "cloudy";
  if (code === 45 || code === 48) return "fog";
  if (code >= 71 && code <= 77) return "snow";
  if (code >= 85 && code <= 86) return "snow";
  if (code >= 95) return "storm";
  if (code >= 51 && code <= 82) return "rain"; // drizzle, rain, freezing rain, showers
  return "cloudy";
}

// Wind bearing (degrees) → 8-point compass abbreviation.
export function windCompass(deg: number): string {
  const points = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const i = Math.round((deg % 360) / 45) % 8;
  return points[(i + 8) % 8];
}

// UV index → plain-English category (matches the WHO/ARPANSA bands).
export function uvCategory(uv: number): string {
  if (uv < 3) return "Low";
  if (uv < 6) return "Moderate";
  if (uv < 8) return "High";
  if (uv < 11) return "Very high";
  return "Extreme";
}

export interface WeatherAlert {
  id: "frost" | "heat" | "uv" | "rain" | "wind";
  tone: "warn" | "cool" | "info";
  text: string;
}

// Canberra-smart advisories derived purely from the forecast (no extra source).
// The capital's frosts, dry-heat days and high alpine UV are exactly what locals
// plan around, so we surface the most relevant few rather than every metric.
export function computeWeatherAlerts(w: CityWeather): WeatherAlert[] {
  const out: WeatherAlert[] = [];
  const today = w.daily[0];
  const tomorrow = w.daily[1];
  const c = w.current;

  if (today) {
    // Frost looks at the lower of the next two overnight minimums so an
    // afternoon visitor still gets warned about tonight, not just this morning.
    const overnightLow = Math.min(today.min, tomorrow?.min ?? today.min);
    if (overnightLow <= 0) {
      out.push({
        id: "frost",
        tone: "cool",
        text: "Hard frost overnight. Cover the windscreen before dawn.",
      });
    } else if (overnightLow <= 2) {
      out.push({ id: "frost", tone: "cool", text: "Frost likely overnight. Rug up early." });
    }

    if (today.max >= 35) {
      out.push({
        id: "heat",
        tone: "warn",
        text: "Hot day ahead. Stay hydrated and out of the afternoon sun.",
      });
    }

    const uv = Math.max(today.uvMax ?? 0, c?.uvIndex ?? 0);
    if (uv >= 8) {
      out.push({
        id: "uv",
        tone: "warn",
        text: `Very high UV (${Math.round(uv)}). Sun protection from mid-morning.`,
      });
    }

    if ((today.precipProb ?? 0) >= 70) {
      out.push({
        id: "rain",
        tone: "info",
        text: `Wet day, ${Math.round(today.precipProb)}% chance of rain. Bring a brolly.`,
      });
    }
  }

  if (c && c.windSpeed >= 40) {
    out.push({
      id: "wind",
      tone: "info",
      text: `Strong winds, around ${Math.round(c.windSpeed)} km/h from the ${windCompass(c.windDirection)}.`,
    });
  }

  return out.slice(0, 3);
}

// US AQI band → label + tone, matching the EPA categories. tone maps to the
// page's restrained palette: "good" green, "warn" amber, "bad" red.
export function aqiCategory(aqi: number): {
  label: string;
  tone: "good" | "fair" | "warn" | "bad";
} {
  if (aqi <= 50) return { label: "Good", tone: "good" };
  if (aqi <= 100) return { label: "Moderate", tone: "fair" };
  if (aqi <= 150) return { label: "Unhealthy for sensitive groups", tone: "warn" };
  if (aqi <= 200) return { label: "Unhealthy", tone: "bad" };
  if (aqi <= 300) return { label: "Very unhealthy", tone: "bad" };
  return { label: "Hazardous", tone: "bad" };
}

// Moon phase for a given date, computed from the synodic month (no API call).
// phase is 0..1 (0 = new, 0.5 = full); illumination is a 0..100 percentage.
export function moonPhase(date: Date): {
  phase: number;
  name: string;
  icon: string;
  illumination: number;
} {
  const SYNODIC = 29.530588853;
  const knownNewMoon = Date.UTC(2000, 0, 6, 18, 14) / 86400000; // days
  const days = date.getTime() / 86400000;
  let phase = ((days - knownNewMoon) / SYNODIC) % 1;
  if (phase < 0) phase += 1;
  const illumination = Math.round(((1 - Math.cos(2 * Math.PI * phase)) / 2) * 100);
  const buckets: { name: string; icon: string }[] = [
    { name: "New moon", icon: "🌑" },
    { name: "Waxing crescent", icon: "🌒" },
    { name: "First quarter", icon: "🌓" },
    { name: "Waxing gibbous", icon: "🌔" },
    { name: "Full moon", icon: "🌕" },
    { name: "Waning gibbous", icon: "🌖" },
    { name: "Last quarter", icon: "🌗" },
    { name: "Waning crescent", icon: "🌘" },
  ];
  const i = Math.round(phase * 8) % 8;
  return { phase, illumination, ...buckets[i] };
}

// A deterministic, plain-English "today" summary built only from the forecast
// numbers. Used as the weather briefing until the AI narrative is wired, so the
// page always reads like a person wrote it. No em-dashes.
export function composeSummary(w: CityWeather): string {
  const c = w.current;
  const today = w.daily[0];
  if (!c || !today) return "";
  const cond = describeWeather(c.weatherCode).label.toLowerCase();
  const parts: string[] = [];
  parts.push(`${Math.round(c.temperature)}° and ${cond} right now in ${cityName()}`);
  parts.push(`heading for a top of ${Math.round(today.max)}°`);
  const rain = Math.round(today.precipProb ?? 0);
  let sentence2 = `Overnight down to ${Math.round(today.min)}°`;
  if (rain >= 40) sentence2 += `, with a ${rain}% chance of rain`;
  sentence2 += ".";
  const uv = Math.round(Math.max(today.uvMax ?? 0, c.uvIndex ?? 0));
  const uvNote = uv >= 6 ? ` UV is ${uvCategory(uv).toLowerCase()}, so cover up midday.` : "";
  return `${parts.join(", ")}. ${sentence2}${uvNote}`;
}
