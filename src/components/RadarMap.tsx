// Interactive animated rain radar for the weather hub. Uses Leaflet (loaded
// client-side only) with RainViewer tiles, which aggregate the Bureau of
// Meteorology radars for Australia. We never brand this as BOM and we link out
// to the official BOM radar loop as the trust fallback.
//
// The component is SSR-safe: the server renders only the container and the
// fallback link; the map hydrates in a client effect. Any failure (no WebGL,
// blocked tiles, RainViewer down) degrades to the fallback, so it can never
// break the page. Base map is MapTiler when VITE_MAPTILER_KEY is set, otherwise
// OpenStreetMap with attribution.
import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import { cityCoords, cityName, citySlug, cityTimezone } from "@/lib/city";

const RAINVIEWER_INDEX = "https://api.rainviewer.com/public/weather-maps.json";
// Canberra has a dedicated BOM radar loop; other cities fall back to the BOM
// radar index so the trust link is never wrong for a non-Canberra build.
const BOM_RADAR_CANBERRA = "http://www.bom.gov.au/products/IDR403.loop.shtml";
const BOM_RADAR_NATIONAL = "http://www.bom.gov.au/australia/radar/";

type Status = "loading" | "ready" | "error";

interface RvFrame {
  time: number;
  path: string;
}

export function RadarMap() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [stamp, setStamp] = useState<string>("");
  const bomRadarUrl = citySlug() === "canberra" ? BOM_RADAR_CANBERRA : BOM_RADAR_NATIONAL;

  useEffect(() => {
    if (typeof window === "undefined" || !containerRef.current) return;
    let map: { remove(): void } | null = null;
    let timer: ReturnType<typeof setInterval> | null = null;
    let cancelled = false;

    (async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const L: any = (await import("leaflet")).default;
        const mtKey = (import.meta as { env?: Record<string, string | undefined> }).env
          ?.VITE_MAPTILER_KEY;
        const base = mtKey
          ? {
              url: `https://api.maptiler.com/maps/dataviz/{z}/{x}/{y}.png?key=${mtKey}`,
              attribution: '© <a href="https://www.maptiler.com/">MapTiler</a> © OpenStreetMap',
            }
          : {
              url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
              attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
            };

        if (cancelled || !containerRef.current) return;
        map = L.map(containerRef.current, {
          center: cityCoords(),
          zoom: 7,
          minZoom: 4,
          maxZoom: 7, // RainViewer free tier caps at zoom 7
          attributionControl: true,
          scrollWheelZoom: false,
        });
        L.tileLayer(base.url, { attribution: base.attribution, opacity: 0.85 }).addTo(map);
        L.control
          .attribution({ prefix: false })
          .addAttribution("Radar by RainViewer (BOM)")
          .addTo(map);

        const res = await fetch(RAINVIEWER_INDEX);
        if (!res.ok) throw new Error(`RainViewer ${res.status}`);
        const data = (await res.json()) as {
          host: string;
          radar?: { past?: RvFrame[]; nowcast?: RvFrame[] };
        };
        const frames = [...(data.radar?.past ?? []), ...(data.radar?.nowcast ?? [])];
        if (cancelled || !frames.length) throw new Error("No radar frames");

        // One tile layer per frame, all stacked, only the active one visible.
        const layers = frames.map((f) =>
          L.tileLayer(`${data.host}${f.path}/256/{z}/{x}/{y}/2/1_1.png`, {
            opacity: 0,
            zIndex: 5,
          }).addTo(map),
        );

        let i = 0;
        const show = (idx: number) => {
          layers.forEach((l: { setOpacity(o: number): void }, n: number) =>
            l.setOpacity(n === idx ? 0.7 : 0),
          );
          const d = new Date(frames[idx].time * 1000);
          setStamp(
            d.toLocaleTimeString("en-AU", {
              hour: "numeric",
              minute: "2-digit",
              timeZone: cityTimezone(),
            }),
          );
        };
        show(0);
        if (!cancelled) setStatus("ready");
        timer = setInterval(() => {
          i = (i + 1) % layers.length;
          show(i);
        }, 600);
      } catch (_e) {
        if (!cancelled) setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
      if (map) map.remove();
    };
  }, []);

  return (
    <div className="relative">
      <div
        ref={containerRef}
        className="h-[380px] w-full border border-[var(--hairline)] bg-[#eceae3]"
        aria-label={`Animated ${cityName()} rain radar`}
        role="img"
      />
      {status === "ready" && stamp && (
        <div className="absolute top-2 left-2 z-[500] bg-[var(--paper,#fff)] border border-[var(--hairline)] px-2 py-1 text-[12px]">
          <span className="opacity-60">Radar</span> <span className="font-semibold">{stamp}</span>
        </div>
      )}
      {status === "error" && (
        <div className="absolute inset-0 z-[500] flex items-center justify-center bg-[#eceae3] text-center p-6">
          <p className="meta">
            Live radar is unavailable right now.{" "}
            <a href={bomRadarUrl} target="_blank" rel="noopener noreferrer" className="underline">
              Open the full Bureau of Meteorology radar
            </a>
            .
          </p>
        </div>
      )}
      <p className="meta mt-2 opacity-70">
        Animated rain radar via RainViewer (Bureau of Meteorology sources).{" "}
        <a href={bomRadarUrl} target="_blank" rel="noopener noreferrer" className="underline">
          Full BOM radar loop
        </a>
        .
      </p>
    </div>
  );
}
