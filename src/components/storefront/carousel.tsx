"use client";

import * as React from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Horizontal scroller used by every product/category/collection row.
 *
 * On touch devices this is a native-feeling drag; on desktop the arrows appear
 * and disable at the ends rather than looping, so the customer can tell when
 * they have seen everything.
 */
export function Carousel({
  children,
  itemClassName = "flex-[0_0_70%] sm:flex-[0_0_45%] md:flex-[0_0_32%] xl:flex-[0_0_24%]",
  className,
  ariaLabel,
}: {
  children: React.ReactNode[];
  itemClassName?: string;
  className?: string;
  ariaLabel: string;
}) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "start",
    containScroll: "trimSnaps",
    dragFree: true,
  });

  const [canPrev, setCanPrev] = React.useState(false);
  const [canNext, setCanNext] = React.useState(false);

  React.useEffect(() => {
    if (!emblaApi) return;
    const update = () => {
      setCanPrev(emblaApi.canScrollPrev());
      setCanNext(emblaApi.canScrollNext());
    };
    update();
    emblaApi.on("select", update).on("reInit", update);
    return () => {
      emblaApi.off("select", update).off("reInit", update);
    };
  }, [emblaApi]);

  const showArrows = canPrev || canNext;

  return (
    <div className={cn("relative", className)}>
      <div
        ref={emblaRef}
        className="overflow-hidden -mx-5 px-5 md:mx-0 md:px-0"
        role="region"
        aria-label={ariaLabel}
      >
        <div className="flex gap-4 sm:gap-6">
          {children.map((child, index) => (
            <div key={index} className={cn("min-w-0", itemClassName)}>
              {child}
            </div>
          ))}
        </div>
      </div>

      {showArrows ? (
        <div className="mt-6 hidden justify-end gap-2 md:flex">
          <CarouselButton
            direction="prev"
            disabled={!canPrev}
            onClick={() => emblaApi?.scrollPrev()}
          />
          <CarouselButton
            direction="next"
            disabled={!canNext}
            onClick={() => emblaApi?.scrollNext()}
          />
        </div>
      ) : null}
    </div>
  );
}

function CarouselButton({
  direction,
  disabled,
  onClick,
}: {
  direction: "prev" | "next";
  disabled: boolean;
  onClick: () => void;
}) {
  const Icon = direction === "prev" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={direction === "prev" ? "Previous items" : "Next items"}
      className="inline-flex size-10 items-center justify-center rounded-sm border border-line-strong text-content transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] disabled:pointer-events-none disabled:opacity-35"
    >
      <Icon className="size-4" aria-hidden="true" />
    </button>
  );
}
