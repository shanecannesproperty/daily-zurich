// Shared hero/thumbnail image for articles and live-feed cards. It:
//  - renders nothing when the src is null or not a real photo (graceful empty)
//  - keeps a fixed aspect box so layout never shifts (object-cover crop)
//  - shows a shimmer until the image decodes, then fades it in
//  - blurs a duplicate of the image behind portrait/odd-ratio photos so the
//    letterbox bars read as a soft "blur-up" rather than dead grey space
//  - swaps to the text-only branch (null) if the image fails to load
//
// This mirrors EventImage's load/retry handling but adds the blur-up backdrop
// and a configurable aspect ratio for editorial heroes.
import { useEffect, useRef, useState } from "react";
import { isRealImage } from "@/lib/media";

const MAX_RETRIES = 1;

export function HeroImage({
  src,
  alt,
  // Tailwind aspect ratio class for the crop box, e.g. "aspect-[3/2]".
  aspect = "aspect-[3/2]",
  className = "",
  loading = "lazy",
  fetchPriority,
  width = 1200,
  height = 800,
  // When true, fill odd-ratio images onto a blurred copy of themselves instead
  // of cropping. Use for portrait heroes where cropping would lose the subject.
  blurUp = false,
  sizes,
}: {
  src: string | null | undefined;
  alt: string;
  aspect?: string;
  className?: string;
  loading?: "lazy" | "eager";
  fetchPriority?: "high" | "low" | "auto";
  width?: number;
  height?: number;
  blurUp?: boolean;
  sizes?: string;
}) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [loaded, setLoaded] = useState(true);
  const [failed, setFailed] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const isFirstMount = useRef(true);

  const handleFailure = () => {
    if (retryCount < MAX_RETRIES) {
      setRetryCount((n) => n + 1);
      setLoaded(false);
      return;
    }
    setFailed(true);
  };

  useEffect(() => {
    if (isFirstMount.current) { isFirstMount.current = false; return; }
    setLoaded(false);
    setFailed(false);
    setRetryCount(0);
  }, [src]);

  // SSR hydration: the image may already be decoded by the time React mounts.
  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;
    if (img.complete) {
      if (img.naturalWidth === 0) handleFailure();
      else setLoaded(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  if (!isRealImage(src) || failed) return null;

  const finalSrc = retryCount > 0 ? `${src}${src.includes("?") ? "&" : "?"}__r=${retryCount}` : src;

  return (
    <div className={`relative w-full ${aspect} overflow-hidden bg-[var(--surface)] ${className}`}>
      {!loaded && (
        <div
          aria-hidden
          className="img-shimmer absolute inset-0 z-0 transition-opacity duration-500"
        />
      )}
      {blurUp && (
        // Blurred, cropped copy of the same photo to soften letterbox bars.
        <img
          src={finalSrc}
          alt=""
          aria-hidden
          width={width}
          height={height}
          loading={loading}
          decoding="async"
          className={`absolute inset-0 z-0 h-full w-full scale-110 object-cover blur-xl transition-opacity duration-500 ${loaded ? "opacity-60" : "opacity-0"}`}
        />
      )}
      <img
        ref={imgRef}
        src={finalSrc}
        alt={alt}
        width={width}
        height={height}
        loading={loading}
        decoding="async"
        fetchPriority={fetchPriority}
        sizes={sizes}
        onError={() => handleFailure()}
        onLoad={(e) => {
          const img = e.currentTarget;
          if (!img.naturalWidth) {
            handleFailure();
            return;
          }
          setLoaded(true);
        }}
        className={`absolute inset-0 z-[1] h-full w-full transition-opacity duration-500 ${blurUp ? "object-contain" : "object-cover"} ${loaded ? "opacity-100" : "opacity-0"}`}
      />
    </div>
  );
}
