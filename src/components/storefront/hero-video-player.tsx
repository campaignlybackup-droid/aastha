"use client";

import * as React from "react";

import useEmblaCarousel from "embla-carousel-react";

import { cn } from "@/lib/utils";

/**
 * Ultra-optimized responsive Hero Video Carousel component.
 *
 * Allows smooth touch swipe / mouse drag between Video 1 and Video 2,
 * with ZERO navigation buttons.
 *
 * Slide 1:
 * - Mobile: /banner-mobile.mp4 (999KB) with instant parse-time playback
 * - Desktop: /banner-final.mp4 (8.8MB)
 *
 * Slide 2 (Final Comp):
 * - Mobile: /banner-mobile-2.mp4 (1.3MB)
 * - Desktop: /banner-final-2.mp4 (4.4MB)
 */
export function HeroVideoPlayer() {
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: true,
    duration: 30,
    watchDrag: true,
  });

  const mobile1Ref = React.useRef<HTMLVideoElement | null>(null);
  const mobile2Ref = React.useRef<HTMLVideoElement | null>(null);
  const desktop1Ref = React.useRef<HTMLVideoElement | null>(null);
  const desktop2Ref = React.useRef<HTMLVideoElement | null>(null);

  // Sync active slide index on slide change
  React.useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => {
      setSelectedIndex(emblaApi.selectedScrollSnap());
    };
    emblaApi.on("select", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi]);

  // Manage playback based on active slide and device screen width
  React.useEffect(() => {
    const isMobile = window.matchMedia("(max-width: 767px)").matches;

    const playVideo = (v: HTMLVideoElement | null) => {
      if (!v) return;
      v.defaultMuted = true;
      v.muted = true;
      if (v.paused) {
        v.play().catch(() => {});
      }
    };

    const pauseVideo = (v: HTMLVideoElement | null) => {
      if (!v) return;
      if (!v.paused) {
        v.pause();
      }
    };

    if (isMobile) {
      if (selectedIndex === 0) {
        playVideo(mobile1Ref.current);
        pauseVideo(mobile2Ref.current);
      } else {
        playVideo(mobile2Ref.current);
        pauseVideo(mobile1Ref.current);
      }
    } else {
      // On desktop, lazily attach source from data-src
      if (desktop1Ref.current && !desktop1Ref.current.src && desktop1Ref.current.dataset.src) {
        desktop1Ref.current.src = desktop1Ref.current.dataset.src;
      }
      if (desktop2Ref.current && !desktop2Ref.current.src && desktop2Ref.current.dataset.src) {
        desktop2Ref.current.src = desktop2Ref.current.dataset.src;
      }

      if (selectedIndex === 0) {
        playVideo(desktop1Ref.current);
        pauseVideo(desktop2Ref.current);
      } else {
        playVideo(desktop2Ref.current);
        pauseVideo(desktop1Ref.current);
      }
    }
  }, [selectedIndex]);

  return (
    <div className="relative w-full aspect-[1078/800] md:aspect-auto md:h-[60vh] lg:h-[85vh] overflow-hidden bg-sand-900 select-none">
      {/* Embla Viewport */}
      <div ref={emblaRef} className="size-full overflow-hidden cursor-grab active:cursor-grabbing">
        <div className="flex size-full">
          {/* ---------------- SLIDE 1 ---------------- */}
          <div className="relative size-full flex-[0_0_100%] min-w-0 overflow-hidden">
            {/* Mobile Video 1 */}
            <div className="md:hidden absolute inset-0 size-full z-10">
              <video
                ref={mobile1Ref}
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

            {/* Desktop Video 1 */}
            <div className="hidden md:block absolute inset-0 size-full z-10">
              <video
                ref={desktop1Ref}
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

          {/* ---------------- SLIDE 2 (Final Comp) ---------------- */}
          <div className="relative size-full flex-[0_0_100%] min-w-0 overflow-hidden">
            {/* Mobile Video 2 */}
            <div className="md:hidden absolute inset-0 size-full z-10">
              <video
                ref={mobile2Ref}
                src="/banner-mobile-2.mp4"
                muted
                loop
                playsInline
                preload="metadata"
                poster="/banner-poster-mobile-2.webp"
                aria-hidden="true"
                className="size-full object-cover"
              />
            </div>

            {/* Desktop Video 2 */}
            <div className="hidden md:block absolute inset-0 size-full z-10">
              <video
                ref={desktop2Ref}
                data-src="/banner-final-2.mp4"
                muted
                loop
                playsInline
                preload="none"
                poster="/banner-poster-2.jpg"
                aria-hidden="true"
                className="size-full object-cover"
              />
            </div>

            <div className="absolute inset-0 bg-sand-950/0 pointer-events-none z-20" aria-hidden="true" />
          </div>
        </div>
      </div>

      {/* Subtle indicator dots (non-clickable, visual only — NO buttons) */}
      <div
        className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-30 pointer-events-none"
        aria-hidden="true"
      >
        <span
          className={cn(
            "h-1 rounded-full transition-all duration-300",
            selectedIndex === 0 ? "w-6 bg-sand-50" : "w-1.5 bg-sand-50/40"
          )}
        />
        <span
          className={cn(
            "h-1 rounded-full transition-all duration-300",
            selectedIndex === 1 ? "w-6 bg-sand-50" : "w-1.5 bg-sand-50/40"
          )}
        />
      </div>
    </div>
  );
}
