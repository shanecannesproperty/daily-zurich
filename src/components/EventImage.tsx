// Single source of truth for rendering an event cover image.
// Per project memory `mem://design/no-branded-fallback`:
// - Render <img> only when image_url is a real photo
// - Never render a placeholder tile / category block / wordmark
// - On load error, swap to null (text-only branch)
import { useEffect, useRef, useState } from "react";

const FALLBACK_MARKERS = ["-fallback-tile"];

export function isRealCover(url: string | null | undefined): url is string {
  if (typeof url !== "string") return false;
  const u = url.trim();
  if (u.length === 0) return false;
  const lower = u.toLowerCase();
  if (FALLBACK_MARKERS.some((m) => lower.includes(m))) return false;
  if (!/^https?:\/\//i.test(u)) return false;
  return true;
}

const MAX_RETRIES = 1;

export function EventImage({
  src,
  alt,
  className = "",
  loading = "eager",
  fetchPriority,
}: {
  src: string | null | undefined;
  alt: string;
  className?: string;
  loading?: "lazy" | "eager";
  fetchPriority?: "high" | "low" | "auto";
}) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [loaded, setLoaded] = useState(true);
  const [failed, setFailed] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const handleFailure = () => {
    if (retryCount < MAX_RETRIES) {
      setRetryCount((n) => n + 1);
      setLoaded(false);
      return;
    }
    setFailed(true);
  };

  // Reset state when src changes (SPA navigation reuses the component instance)
  useEffect(() => {
    setLoaded(false);
    setFailed(false);
    setRetryCount(0);
  }, [src]);

  // SSR hydration: the image may already be decoded by the time React
  // mounts on the client. Without this check the loaded state stays false
  // and the image remains invisible behind opacity-0.
  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;
    if (img.complete) {
      if (img.naturalWidth === 0) {
        handleFailure();
      } else {
        setLoaded(true);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  if (!isRealCover(src) || failed) return null;

  const finalSrc = retryCount > 0 ? `${src}${src.includes("?") ? "&" : "?"}__r=${retryCount}` : src;

  return (
    <div
      className={`relative w-full aspect-[16/9] overflow-hidden bg-[var(--surface)] ${className}`}
    >
      {!loaded && (
        <div
          aria-hidden
          className="img-shimmer absolute inset-0 z-0 transition-opacity duration-500"
        />
      )}
      <img
        ref={imgRef}
        src={finalSrc}
        alt={alt}
        width={1600}
        height={900}
        loading={loading}
        decoding="async"
        fetchPriority={fetchPriority}
        onError={() => handleFailure()}
        onLoad={(e) => {
          const img = e.currentTarget;
          if (!img.naturalWidth) {
            handleFailure();
            return;
          }
          setLoaded(true);
        }}
        className="absolute inset-0 z-[1] h-full w-full object-cover"
      />
    </div>
  );
}
