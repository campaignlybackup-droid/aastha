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

  React.useEffect(() => {
    const isMobile = window.matchMedia("(max-width: 767px)").matches;

    if (isMobile) {
      if (mobileRef.current) {
        mobileRef.current.defaultMuted = true;
        mobileRef.current.muted = true;
        if (mobileRef.current.paused) {
          mobileRef.current.play().catch(() => {});
        }
      }
    } else {
      if (desktopRef.current) {
        if (!desktopRef.current.src && desktopRef.current.dataset.src) {
          desktopRef.current.src = desktopRef.current.dataset.src;
        }
        desktopRef.current.defaultMuted = true;
        desktopRef.current.muted = true;
        if (desktopRef.current.paused) {
          desktopRef.current.play().catch(() => {});
        }
      }
    }
  }, []);

  return (
    <div className="relative w-full aspect-[1078/800] md:aspect-auto md:h-[60vh] lg:h-[85vh] flex items-center justify-center overflow-hidden bg-sand-900">
      {/* ---------------- Mobile Video (< 768px) ----------------
          Rendered directly in initial SSR HTML with parse-time inline script.
          Starts playback seamlessly the millisecond bytes arrive with zero pause. */}
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
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var v = document.currentScript.previousElementSibling;
                if (v && v.tagName === 'VIDEO') {
                  v.muted = true;
                  v.defaultMuted = true;
                  v.playsInline = true;
                  var p = v.play();
                  if (p && p.catch) p.catch(function() {});
                }
              } catch(e) {}
            `,
          }}
        />
      </div>

      {/* ---------------- Desktop Video (>= 768px) ----------------
          Uses data-src so mobile devices never download the 8.8MB desktop payload. */}
      <div className="hidden md:block absolute inset-0 size-full z-10">
        <video
          ref={desktopRef}
          data-src="/banner-final.mp4"
          muted
          loop
          playsInline
          preload="none"
          poster="/banner-poster.jpg"
          aria-hidden="true"
          className="size-full object-cover"
        />
      </div>

      <div className="absolute inset-0 bg-sand-950/0 pointer-events-none z-20" aria-hidden="true" />
    </div>
  );
}
