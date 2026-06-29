// Animated weather hero. A single inline SVG (viewBox 400×200) whose contents
// are chosen by the current WMO weather code and day/night flag, mirroring the
// illustrated scene Google shows on its weather panel. Deliberately built from
// vector shapes + CSS keyframes (see styles.css, the `wx-*` classes) rather
// than animated GIFs: it stays a few KB, scales crisply, and goes still under
// prefers-reduced-motion.
//
// Everything is deterministic (no Math.random) so the server-rendered markup
// matches the client on hydration.
import { weatherScene, describeWeather, type WeatherSceneKind } from "@/lib/weather.functions";

// Sky gradient + element tints per scene, in day and night variants. Kept muted
// to sit inside the paper/ink editorial palette rather than read as a cartoon.
const PALETTE: Record<WeatherSceneKind, { day: [string, string]; night: [string, string] }> = {
  clear: { day: ["#bfe2f3", "#eaf6fb"], night: ["#1b2540", "#33507c"] },
  partly: { day: ["#bcdcec", "#e7f1f6"], night: ["#1d2742", "#39527a"] },
  cloudy: { day: ["#cdd3d8", "#e8ebed"], night: ["#272f3c", "#49535f"] },
  fog: { day: ["#d4d6d7", "#ecedec"], night: ["#2b3038", "#4c525a"] },
  rain: { day: ["#9fb3c1", "#c6d1d7"], night: ["#222b36", "#414d5a"] },
  snow: { day: ["#d6dee4", "#f1f4f6"], night: ["#2c333d", "#505863"] },
  storm: { day: ["#8a94a1", "#b6bec6"], night: ["#1c2129", "#3a414b"] },
};

const CLOUD_TINT = { day: "#ffffff", night: "#aab4c2" };

// One puffy cloud, drawn around (cx, cy) at the given scale + colour.
function Cloud({
  cx,
  cy,
  scale = 1,
  fill,
  opacity = 1,
}: {
  cx: number;
  cy: number;
  scale?: number;
  fill: string;
  opacity?: number;
}) {
  return (
    <g transform={`translate(${cx} ${cy}) scale(${scale})`} fill={fill} opacity={opacity}>
      <ellipse cx="0" cy="6" rx="34" ry="16" />
      <circle cx="-18" cy="2" r="14" />
      <circle cx="2" cy="-6" r="18" />
      <circle cx="22" cy="0" r="15" />
    </g>
  );
}

// Deterministic falling streaks (rain) / dots (snow). Positions and timings come
// from the index so SSR and client agree.
function Precip({ kind }: { kind: "rain" | "snow" }) {
  const count = kind === "rain" ? 26 : 22;
  const drops = Array.from({ length: count }, (_, i) => {
    const x = ((i * 53) % 100) * 4; // spread across 0–400
    const dur = kind === "rain" ? 0.7 + ((i * 7) % 5) / 10 : 2.6 + ((i * 11) % 9) / 10;
    const delay = ((i * 13) % 20) / 10;
    return { x, dur, delay, key: i };
  });
  return (
    <g>
      {drops.map((d) =>
        kind === "rain" ? (
          <line
            key={d.key}
            className="wx-drop"
            x1={d.x}
            y1={70}
            x2={d.x - 4}
            y2={82}
            stroke="#dce6ec"
            strokeWidth={1.6}
            strokeLinecap="round"
            style={{ animationDuration: `${d.dur}s`, animationDelay: `${d.delay}s` }}
          />
        ) : (
          <circle
            key={d.key}
            className="wx-flake"
            cx={d.x}
            cy={72}
            r={2.1}
            fill="#f3f7fa"
            style={{ animationDuration: `${d.dur}s`, animationDelay: `${d.delay}s` }}
          />
        ),
      )}
    </g>
  );
}

// Twinkling stars for clear/partly nights. Fixed positions for determinism.
function Stars() {
  const pts = [
    [40, 34],
    [88, 22],
    [150, 40],
    [210, 26],
    [268, 46],
    [320, 30],
    [360, 52],
    [64, 60],
    [188, 64],
    [296, 66],
  ];
  return (
    <g>
      {pts.map(([x, y], i) => (
        <circle
          key={i}
          className="wx-star"
          cx={x}
          cy={y}
          r={i % 3 === 0 ? 1.8 : 1.2}
          fill="#fdfdf6"
          style={{ animationDelay: `${(i * 0.4).toFixed(1)}s` }}
        />
      ))}
    </g>
  );
}

// The sun (day) or moon (night) with a slow rotating ray ring for the sun.
function Luminary({ isDay }: { isDay: boolean }) {
  if (!isDay) {
    return (
      <g className="wx-pulse" transform="translate(310 56)">
        <circle r="20" fill="#f3efe2" />
        <circle cx="8" cy="-6" r="18" fill="#e9eef5" />
      </g>
    );
  }
  const rays = Array.from({ length: 12 }, (_, i) => i * 30);
  return (
    <g transform="translate(310 54)">
      <g className="wx-spin">
        {rays.map((deg) => (
          <line
            key={deg}
            x1="0"
            y1="-30"
            x2="0"
            y2="-40"
            stroke="#f6c544"
            strokeWidth="3"
            strokeLinecap="round"
            transform={`rotate(${deg})`}
          />
        ))}
      </g>
      <circle className="wx-pulse" r="22" fill="#f9d65c" />
    </g>
  );
}

export function WeatherScene({
  code,
  isDay,
  className = "",
  caption,
}: {
  code: number;
  isDay: boolean;
  className?: string;
  caption?: string;
}) {
  const scene = weatherScene(code);
  const [skyTop, skyBottom] = PALETTE[scene][isDay ? "day" : "night"];
  const cloud = CLOUD_TINT[isDay ? "day" : "night"];
  const gradId = `wx-sky-${scene}-${isDay ? "d" : "n"}`;
  const label = describeWeather(code).label;
  const showStars = !isDay && (scene === "clear" || scene === "partly");

  return (
    <div
      className={`wx-scene rounded-md border border-[var(--hairline)] ${className}`}
      role="img"
      aria-label={`${label}${isDay ? "" : " (night)"} — animated conditions`}
    >
      <svg
        viewBox="0 0 400 200"
        preserveAspectRatio="xMidYMid slice"
        className="block h-full w-full"
        aria-hidden
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={skyTop} />
            <stop offset="100%" stopColor={skyBottom} />
          </linearGradient>
        </defs>
        <rect width="400" height="200" fill={`url(#${gradId})`} />

        {showStars && <Stars />}

        {/* Sun/moon shows for clear + partly; storms/overcast/fog hide it. */}
        {(scene === "clear" || scene === "partly") && <Luminary isDay={isDay} />}

        {/* Cloud cover, layered by how heavy the scene is. */}
        {scene === "partly" && (
          <g className="wx-cloud">
            <Cloud cx={120} cy={70} scale={0.9} fill={cloud} />
          </g>
        )}
        {(scene === "cloudy" ||
          scene === "rain" ||
          scene === "snow" ||
          scene === "storm" ||
          scene === "fog") && (
          <>
            <g className="wx-cloud-2">
              <Cloud cx={250} cy={60} scale={1.05} fill={cloud} opacity={0.95} />
            </g>
            <g className="wx-cloud">
              <Cloud cx={110} cy={66} scale={1.25} fill={cloud} />
            </g>
          </>
        )}

        {/* Precipitation. */}
        {scene === "rain" && <Precip kind="rain" />}
        {scene === "storm" && <Precip kind="rain" />}
        {scene === "snow" && <Precip kind="snow" />}

        {/* Lightning flash overlay for storms. */}
        {scene === "storm" && <rect className="wx-flash" width="400" height="200" fill="#fffbe6" />}

        {/* Drifting fog bands. */}
        {scene === "fog" && (
          <g>
            {[96, 120, 144].map((y, i) => (
              <rect
                key={y}
                className="wx-fogband"
                x="-40"
                y={y}
                width="480"
                height="12"
                rx="6"
                fill="#f2f3f1"
                opacity={0.6}
                style={{ animationDelay: `${i * 1.3}s` }}
              />
            ))}
          </g>
        )}

        {/* Ground line for a sense of horizon. */}
        <rect
          x="0"
          y="178"
          width="400"
          height="22"
          fill={isDay ? "rgba(0,0,0,0.06)" : "rgba(0,0,0,0.18)"}
        />
      </svg>

      {caption && (
        <>
          {/* Scrim so the white caption stays legible over light skies (fog,
              snow, overcast) as well as dark ones. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2"
            style={{ background: "linear-gradient(to top, rgba(0,0,0,0.5), rgba(0,0,0,0))" }}
          />
          <p className="absolute bottom-2 left-3 text-[12px] font-semibold tracking-wide text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">
            {caption}
          </p>
        </>
      )}
    </div>
  );
}
