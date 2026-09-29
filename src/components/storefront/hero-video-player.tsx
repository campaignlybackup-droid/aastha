"use client";

import * as React from "react";
import Image from "next/image";

import posterMobileImg from "../../../public/banner-poster-mobile.webp";

/**
 * Ultra-optimized responsive Hero Video component.
 *
 * HTML5 <video> does NOT evaluate `media="..."` attributes on <source> tags
 * reliably across mobile browsers (iOS Safari, Android Chrome). When multiple
 * <source> tags are listed inside one <video>, mobile browsers fetch the FIRST
 * source (the 13MB desktop video), causing a 4-second delay before playback.
 *
 * This component renders device-targeted video elements:
 * - Mobile (< 768px): Requests ONLY `/banner-mobile.mp4` (1.0MB).
 * - Desktop (>= 768px): Requests `/banner-final.mp4` (13.1MB).
 */
export function HeroVideoPlayer() {
  const [device, setDevice] = React.useState<"mobile" | "desktop" | null>(null);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const videoRef = React.useRef<HTMLVideoElement | null>(null);

  React.useEffect(() => {
    const mql = window.matchMedia("(max-width: 767px)");
    setDevice(mql.matches ? "mobile" : "desktop");

    const handler = (e: MediaQueryListEvent) => {
      setDevice(e.matches ? "mobile" : "desktop");
    };

    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  // Ensure autoplay triggers as soon as video element is available
  React.useEffect(() => {
    if (!videoRef.current) return;
    const v = videoRef.current;
    if (v.paused) {
      v.play().catch(() => {
        // Autoplay may be restricted by low-power mode; poster remains visible
      });
    }
  }, [device]);

  return (
    <div className="relative w-full aspect-[1078/800] md:aspect-auto md:h-[60vh] lg:h-[85vh] flex items-center justify-center overflow-hidden bg-sand-900">
      {/* Fallback Poster Background Image - visible immediately, 0ms latency */}
      <picture className="absolute inset-0 size-full object-cover pointer-events-none z-0">
        <source srcSet="/banner-poster-mobile.webp" media="(max-width: 767px)" type="image/webp" />
        <source srcSet="/banner-poster.jpg" media="(min-width: 768px)" />
        <Image
          src={posterMobileImg}
          alt=""
          aria-hidden="true"
          priority
          className="size-full object-cover"
        />
      </picture>

      {/* Render ONLY the single active device video element to prevent loading both 9MB desktop and 1MB mobile payloads */}
      {device === "mobile" && (
        <div className="absolute inset-0 size-full z-10">
          <video
            ref={videoRef}
            src="/banner-mobile.mp4"
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            poster="/banner-poster-mobile.webp"
            aria-hidden="true"
            onPlaying={() => setIsPlaying(true)}
            className={`size-full object-cover transition-opacity duration-500 ${isPlaying ? "opacity-100" : "opacity-0"}`}
          />
        </div>
      )}

      {device === "desktop" && (
        <div className="absolute inset-0 size-full z-10">
          <video
            ref={videoRef}
            src="/banner-final.mp4"
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            poster="/banner-poster.jpg"
            aria-hidden="true"
            onPlaying={() => setIsPlaying(true)}
            className={`size-full object-cover transition-opacity duration-500 ${isPlaying ? "opacity-100" : "opacity-0"}`}
          />
        </div>
      )}

      <div className="absolute inset-0 bg-sand-950/0 pointer-events-none z-20" aria-hidden="true" />
    </div>
  );
}
