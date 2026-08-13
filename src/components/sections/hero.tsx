"use client";

import * as React from "react";
import Link from "next/link";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";

import { MediaImage } from "@/components/ui/media-image";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { SectionSettings } from "@/lib/cms/sections";

type HeroSettings = SectionSettings["HERO"];
type Slide = HeroSettings["slides"][number];

const HEIGHTS = {
  // dvh rather than vh so mobile browser chrome collapsing does not clip the CTA.
  compact: "h-[58dvh] min-h-[380px] lg:h-[62vh]",
  standard: "h-[76dvh] min-h-[480px] lg:h-[80vh]",
  full: "h-[calc(100dvh-var(--header-height))] min-h-[540px]",
} as const;

export function HeroSection({ settings }: { settings: HeroSettings }) {
  const multiple = settings.slides.length > 1;

  if (!multiple) {
    return (
      <section className={cn("relative", HEIGHTS[settings.height])}>
        <HeroSlide slide={settings.slides[0]} priority />
      </section>
    );
  }

  return <HeroCarousel settings={settings} />;
}

function HeroCarousel({ settings }: { settings: HeroSettings }) {
  const plugins = React.useMemo(
    () =>
      settings.autoplay
        ? [
            Autoplay({
              delay: settings.autoplayDelayMs,
              stopOnInteraction: true,
              stopOnMouseEnter: true,
            }),
          ]
        : [],
    [settings.autoplay, settings.autoplayDelayMs],
  );

  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true }, plugins);
  const [selected, setSelected] = React.useState(0);

  React.useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setSelected(emblaApi.selectedScrollSnap());
    onSelect();
    emblaApi.on("select", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi]);

  return (
    <section
      className={cn("relative", HEIGHTS[settings.height])}
      aria-roledescription="carousel"
      aria-label="Featured collections"
    >
      <div ref={emblaRef} className="h-full overflow-hidden">
        <div className="flex h-full">
          {settings.slides.map((slide, index) => (
            <div
              key={index}
              className="relative h-full min-w-0 flex-[0_0_100%]"
              role="group"
              aria-roledescription="slide"
              aria-label={`${index + 1} of ${settings.slides.length}`}
              // Off-screen slides must not be reachable by keyboard.
              inert={index !== selected}
            >
              <HeroSlide slide={slide} priority={index === 0} />
            </div>
          ))}
        </div>
      </div>

      <div className="absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 gap-2">
        {settings.slides.map((_, index) => (
          <button
            key={index}
            type="button"
            onClick={() => emblaApi?.scrollTo(index)}
            aria-label={`Go to slide ${index + 1}`}
            aria-current={index === selected}
            className={cn(
              "h-1 rounded-full transition-all duration-300",
              index === selected
                ? "w-8 bg-sand-50"
                : "w-4 bg-sand-50/45 hover:bg-sand-50/70",
            )}
          />
        ))}
      </div>
    </section>
  );
}

function HeroSlide({ slide, priority }: { slide: Slide; priority?: boolean }) {
  const light = slide.theme === "dark"; // dark overlay ⇒ light text

  return (
    <div className="relative h-full w-full overflow-hidden bg-brand-900">
      {/* Portrait crop on phones, landscape on desktop. Jewellery heroes shot
          for desktop crop badly to a 9:16 viewport. */}
      {slide.mobileImage ? (
        <>
          <MediaImage
            src={slide.mobileImage.url}
            alt={slide.mobileImage.alt || ""}
            fill
            priority={priority}
            sizes="100vw"
            className="object-cover md:hidden"
          />
          <MediaImage
            src={slide.desktopImage.url}
            alt={slide.desktopImage.alt || ""}
            fill
            priority={priority}
            sizes="100vw"
            className="hidden object-cover md:block"
          />
        </>
      ) : (
        <MediaImage
          src={slide.desktopImage.url}
          alt={slide.desktopImage.alt || ""}
          fill
          priority={priority}
          sizes="100vw"
          className="object-cover"
        />
      )}

      {/* A flat scrim plus a bottom gradient: the flat layer guarantees the
          contrast ratio, the gradient keeps the image from looking muddy. */}
      <div
        className="absolute inset-0 bg-sand-950"
        style={{ opacity: slide.overlayOpacity / 100 }}
        aria-hidden="true"
      />
      <div
        className="absolute inset-0 bg-gradient-to-t from-sand-950/55 via-transparent to-transparent"
        aria-hidden="true"
      />

      <div className="u-container relative flex h-full items-center">
        <div
          className={cn(
            "flex w-full flex-col gap-5",
            slide.align === "center" && "items-center text-center",
            slide.align === "right" && "items-end text-right",
            slide.align === "left" && "items-start text-left",
            slide.position === "top" && "justify-start pt-16",
            slide.position === "bottom" && "justify-end pb-20",
          )}
        >
          <div
            className={cn(
              "max-w-xl space-y-4",
              slide.align === "center" && "mx-auto",
            )}
          >
            {slide.eyebrow ? (
              <p
                className={cn(
                  "u-eyebrow",
                  light ? "text-gold-300" : "text-brand-800",
                )}
              >
                {slide.eyebrow}
              </p>
            ) : null}

            {slide.heading ? (
              <h1
                className={cn(
                  "text-display-md md:text-display-lg xl:text-display-xl",
                  light ? "text-sand-50" : "text-sand-900",
                )}
              >
                {slide.heading}
              </h1>
            ) : null}

            {slide.subheading ? (
              <p
                className={cn(
                  "max-w-lg text-sm leading-relaxed md:text-base",
                  slide.align === "center" && "mx-auto",
                  light ? "text-sand-200" : "text-sand-700",
                )}
              >
                {slide.subheading}
              </p>
            ) : null}
          </div>

          {slide.primaryCta?.href || slide.secondaryCta?.href ? (
            <div
              className={cn(
                "flex flex-wrap gap-3",
                slide.align === "center" && "justify-center",
                slide.align === "right" && "justify-end",
              )}
            >
              {slide.primaryCta?.href && slide.primaryCta.label ? (
                <Button asChild size="lg" variant={light ? "inverse" : "primary"}>
                  <Link href={slide.primaryCta.href}>
                    {slide.primaryCta.label}
                  </Link>
                </Button>
              ) : null}

              {slide.secondaryCta?.href && slide.secondaryCta.label ? (
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className={
                    light
                      ? "border-sand-50/50 text-sand-50 hover:border-sand-50 hover:text-sand-50"
                      : undefined
                  }
                >
                  <Link href={slide.secondaryCta.href}>
                    {slide.secondaryCta.label}
                  </Link>
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
