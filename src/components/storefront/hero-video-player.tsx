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
  const mobileRef = React.useRef<HTMLVideoElement | null>(null);
  const desktopRef = React.useRef<HTMLVideoElement | null>(null);

  // Autoplay trigger ensuring playback starts immediately even if browser pauses initial frame
  React.useEffect(() => {
    const playSafe = (v: HTMLVideoElement | null) => {
      if (v && v.paused) {
        v.play().catch(() => {
          // Autoplay restricted by iOS/Android low power mode; poster remains visible
        });
      }
    };

    playSafe(mobileRef.current);
    playSafe(desktopRef.current);
  }, []);

  return (
    <div className="relative w-full aspect-[1078/800] md:aspect-auto md:h-[60vh] lg:h-[85vh] flex items-center justify-center overflow-hidden bg-sand-900">
      {/* Fallback Poster Background Image - rendered synchronously for 0ms initial render */}
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

      {/* ---------------- Mobile Video (< 768px) ----------------
          Rendered directly in initial SSR HTML. Coupled with the <link rel="preload"> in layout.tsx,
          this begins streaming and playing instantly on mobile without waiting for React hydration. */}
      <div className="md:hidden absolute inset-0 size-full z-10">
        <video
          ref={mobileRef}
          src="/banner-mobile.mp4"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          poster="/banner-poster-mobile.webp"
          aria-hidden="true"
          className="size-full object-cover"
        />
      </div>

      {/* ---------------- Desktop Video (>= 768px) ----------------
          Preload metadata only so mobile devices never download the desktop video payload. */}
      <div className="hidden md:block absolute inset-0 size-full z-10">
        <video
          ref={desktopRef}
          src="/banner-final.mp4"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster="/banner-poster.jpg"
          aria-hidden="true"
          className="size-full object-cover"
        />
      </div>

      <div className="absolute inset-0 bg-sand-950/0 pointer-events-none z-20" aria-hidden="true" />
    </div>
  );
}
