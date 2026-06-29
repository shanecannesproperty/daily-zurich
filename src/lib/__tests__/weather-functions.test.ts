// Unit tests for the pure helpers behind the /weather page. These carry no
// server-only imports, so we exercise the forecast-derived logic directly:
//  1. pickHourStartIndex finds the current hour in the hourly array via a
//     timezone-free string compare (the bug-prone part of the hourly strip).
//  2. windCompass / uvCategory map raw numbers to the labels shown on the page.
//  3. computeWeatherAlerts surfaces the right Canberra advisories (frost/heat/
//     UV/rain/wind) and caps the count.
import { describe, expect, it } from "vitest";
import {
  pickHourStartIndex,
  weatherScene,
  windCompass,
  uvCategory,
  computeWeatherAlerts,
  aqiCategory,
  moonPhase,
  composeSummary,
  type CityWeather,
  type WeatherDay,
  type WeatherCurrent,
} from "@/lib/weather.functions";

const HOURS = [
  "2026-06-25T12:00",
  "2026-06-25T13:00",
  "2026-06-25T14:00",
  "2026-06-25T15:00",
  "2026-06-25T16:00",
];

describe("pickHourStartIndex", () => {
  it("returns the index of the current hour", () => {
    expect(pickHourStartIndex(HOURS, "2026-06-25T14:30")).toBe(2);
  });

  it("snaps to the current hour even when minutes differ", () => {
    expect(pickHourStartIndex(HOURS, "2026-06-25T13:05")).toBe(1);
  });

  it("falls back to 0 when there is no current time", () => {
    expect(pickHourStartIndex(HOURS, undefined)).toBe(0);
  });

  it("falls back to 0 when current time is past the array", () => {
    expect(pickHourStartIndex(HOURS, "2026-06-26T09:00")).toBe(0);
  });
});

describe("weatherScene", () => {
  it("maps WMO codes to the right animated scene family", () => {
    expect(weatherScene(0)).toBe("clear"); // clear sky
    expect(weatherScene(1)).toBe("clear"); // mainly clear
    expect(weatherScene(2)).toBe("partly"); // partly cloudy
    expect(weatherScene(3)).toBe("cloudy"); // overcast
    expect(weatherScene(45)).toBe("fog");
    expect(weatherScene(48)).toBe("fog");
    expect(weatherScene(53)).toBe("rain"); // drizzle
    expect(weatherScene(63)).toBe("rain"); // rain
    expect(weatherScene(66)).toBe("rain"); // freezing rain
    expect(weatherScene(81)).toBe("rain"); // showers
    expect(weatherScene(73)).toBe("snow");
    expect(weatherScene(86)).toBe("snow"); // snow showers
    expect(weatherScene(95)).toBe("storm");
    expect(weatherScene(99)).toBe("storm");
  });

  it("falls back to cloudy for unmapped codes", () => {
    expect(weatherScene(4)).toBe("cloudy"); // gap between overcast and fog
    expect(weatherScene(49)).toBe("cloudy"); // gap between fog and drizzle
  });
});

describe("windCompass", () => {
  it("maps cardinal bearings", () => {
    expect(windCompass(0)).toBe("N");
    expect(windCompass(90)).toBe("E");
    expect(windCompass(180)).toBe("S");
    expect(windCompass(270)).toBe("W");
  });

  it("rounds to the nearest 8-point and wraps 360", () => {
    expect(windCompass(45)).toBe("NE");
    expect(windCompass(360)).toBe("N");
    expect(windCompass(315)).toBe("NW");
  });
});

describe("uvCategory", () => {
  it("maps the ARPANSA bands", () => {
    expect(uvCategory(0)).toBe("Low");
    expect(uvCategory(2.9)).toBe("Low");
    expect(uvCategory(3)).toBe("Moderate");
    expect(uvCategory(6)).toBe("High");
    expect(uvCategory(8)).toBe("Very high");
    expect(uvCategory(11)).toBe("Extreme");
  });
});

function buildWeather(overrides: {
  daily?: Partial<WeatherDay>[];
  current?: Partial<WeatherCurrent>;
}): CityWeather {
  const day = (d: Partial<WeatherDay>): WeatherDay => ({
    date: "2026-06-25",
    weatherCode: 0,
    max: 18,
    min: 8,
    precipProb: 10,
    uvMax: 4,
    sunrise: "2026-06-25T07:10",
    sunset: "2026-06-25T17:00",
    ...d,
  });
  return {
    current: overrides.current
      ? {
          temperature: 10,
          apparent: 9,
          humidity: 60,
          windSpeed: 10,
          windDirection: 0,
          weatherCode: 0,
          uvIndex: 3,
          isDay: true,
          time: "2026-06-25T14:00",
          ...overrides.current,
        }
      : null,
    hourly: [],
    daily: (overrides.daily ?? [{}]).map(day),
    airQuality: null,
    fetchedAt: "2026-06-25T14:00:00.000Z",
    source: "open-meteo",
  };
}

describe("computeWeatherAlerts", () => {
  it("warns about an overnight frost", () => {
    const w = buildWeather({ daily: [{ min: 1 }, { min: 3 }] });
    expect(w && computeWeatherAlerts(w).some((a) => a.id === "frost")).toBe(true);
  });

  it("escalates a sub-zero low to a hard frost", () => {
    const w = buildWeather({ daily: [{ min: -2 }] });
    const frost = computeWeatherAlerts(w).find((a) => a.id === "frost");
    expect(frost?.text).toMatch(/hard frost/i);
  });

  it("uses the lower of the next two overnight lows", () => {
    // Today's low is mild but tomorrow night drops below freezing.
    const w = buildWeather({ daily: [{ min: 6 }, { min: -1 }] });
    expect(computeWeatherAlerts(w).some((a) => a.id === "frost")).toBe(true);
  });

  it("flags hot days and high UV", () => {
    const w = buildWeather({ daily: [{ min: 18, max: 37, uvMax: 11 }] });
    const ids = computeWeatherAlerts(w).map((a) => a.id);
    expect(ids).toContain("heat");
    expect(ids).toContain("uv");
  });

  it("flags a wet day", () => {
    const w = buildWeather({ daily: [{ min: 10, max: 16, precipProb: 80 }] });
    expect(computeWeatherAlerts(w).some((a) => a.id === "rain")).toBe(true);
  });

  it("flags strong wind from the current reading", () => {
    const w = buildWeather({
      daily: [{ min: 10 }],
      current: { windSpeed: 45, windDirection: 270 },
    });
    const wind = computeWeatherAlerts(w).find((a) => a.id === "wind");
    expect(wind?.text).toMatch(/W/);
  });

  it("returns nothing on a mild day", () => {
    const w = buildWeather({ daily: [{ min: 9, max: 20, uvMax: 4, precipProb: 10 }] });
    expect(computeWeatherAlerts(w)).toHaveLength(0);
  });

  it("caps the number of advisories at three", () => {
    const w = buildWeather({
      daily: [{ min: -3, max: 38, uvMax: 12, precipProb: 90 }],
      current: { windSpeed: 60, windDirection: 180 },
    });
    expect(computeWeatherAlerts(w).length).toBeLessThanOrEqual(3);
  });
});

describe("aqiCategory", () => {
  it("maps the US AQI bands to label + tone", () => {
    expect(aqiCategory(20)).toEqual({ label: "Good", tone: "good" });
    expect(aqiCategory(75).tone).toBe("fair");
    expect(aqiCategory(120).tone).toBe("warn");
    expect(aqiCategory(180).tone).toBe("bad");
    expect(aqiCategory(350)).toEqual({ label: "Hazardous", tone: "bad" });
  });
});

describe("moonPhase", () => {
  it("returns a near-new moon at a known new moon", () => {
    // 2000-01-06 18:14 UTC is the reference new moon.
    const m = moonPhase(new Date(Date.UTC(2000, 0, 6, 18, 14)));
    expect(m.illumination).toBeLessThan(2);
    expect(m.name).toBe("New moon");
  });

  it("returns a full moon about half a cycle later", () => {
    const m = moonPhase(new Date(Date.UTC(2000, 0, 21, 12, 0)));
    expect(m.illumination).toBeGreaterThan(90);
    expect(m.name).toBe("Full moon");
  });

  it("always returns illumination within 0..100", () => {
    for (let d = 0; d < 30; d++) {
      const m = moonPhase(new Date(Date.UTC(2026, 5, 1 + d)));
      expect(m.illumination).toBeGreaterThanOrEqual(0);
      expect(m.illumination).toBeLessThanOrEqual(100);
    }
  });
});

describe("composeSummary", () => {
  it("builds a plain-English summary from the forecast numbers", () => {
    const w = buildWeather({ daily: [{ min: 1, max: 14, precipProb: 20, uvMax: 3 }], current: {} });
    const s = composeSummary(w);
    expect(s).toContain("14°");
    expect(s).toContain("right now in Canberra");
    expect(s).not.toContain("—"); // no em-dashes (house style)
  });

  it("mentions rain when the chance is meaningful", () => {
    const w = buildWeather({ daily: [{ min: 8, max: 16, precipProb: 80, uvMax: 2 }], current: {} });
    expect(composeSummary(w)).toMatch(/80% chance of rain/);
  });

  it("returns empty string when there is no current reading", () => {
    const w = buildWeather({ daily: [{ min: 8, max: 16 }] });
    w.current = null;
    expect(composeSummary(w)).toBe("");
  });
});
