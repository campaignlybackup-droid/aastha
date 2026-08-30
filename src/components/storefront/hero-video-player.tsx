"use client";

import * as React from "react";

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
  const mobileRef = React.useRef<HTMLVideoElement | null>(null);
  const desktopRef = React.useRef<HTMLVideoElement | null>(null);

  // Playback trigger on mount/visible
  React.useEffect(() => {
    const playVideo = (video: HTMLVideoElement | null) => {
      if (video && video.paused) {
        video.play().catch(() => {
          // Autoplay prevented by browser power-saving; poster stays visible
        });
      }
    };

    playVideo(mobileRef.current);
    playVideo(desktopRef.current);
  }, []);

  return (
    <div className="relative w-full aspect-[1078/800] md:aspect-auto md:h-[60vh] lg:h-[85vh] flex items-center justify-center overflow-hidden bg-sand-900">
      {/* Fallback Poster Background Image */}
      <picture className="absolute inset-0 size-full object-cover pointer-events-none z-0">
        <source srcSet="/banner-poster-mobile.webp" media="(max-width: 767px)" type="image/webp" />
        <source srcSet="/banner-poster.jpg" media="(min-width: 768px)" />
        <img
          src="/banner-poster-mobile.webp"
          alt=""
          aria-hidden="true"
          className="size-full object-cover"
        />
      </picture>

      {/* ---------------- Mobile Video (< 768px) ----------------
          Loads ONLY the 1.0MB mobile video payload. Streams instantly. */}
      <div className="md:hidden absolute inset-0 size-full z-10">
        <video
          ref={mobileRef}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          poster="/banner-poster-mobile.webp"
          aria-hidden="true"
          className="size-full object-cover"
        >
          <source src="/banner-mobile.mp4" type="video/mp4" />
        </video>
      </div>

      {/* ---------------- Desktop Video (>= 768px) ---------------- */}
      <div className="hidden md:block absolute inset-0 size-full z-10">
        <video
          ref={desktopRef}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          poster="/banner-poster.jpg"
          aria-hidden="true"
          className="size-full object-cover"
        >
          <source src="/banner-final.mp4" type="video/mp4" />
        </video>
      </div>

      <div className="absolute inset-0 bg-sand-950/0 pointer-events-none z-20" aria-hidden="true" />
    </div>
  );
}
