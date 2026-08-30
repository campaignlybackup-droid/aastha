"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight, Expand, X } from "lucide-react";

import { MediaImage } from "@/components/ui/media-image";
import { cn } from "@/lib/utils";

export type GalleryImage = {
  url: string;
  alt: string;
  blurDataUrl?: string | null;
};

/**
 * Product gallery.
 *
 * Desktop: a thumbnail rail beside a large image with cursor-tracking zoom.
 * Mobile: a swipeable carousel with dots.
 * Both: tap/click opens a full-screen viewer.
 *
 * The zoom is pure CSS transform on pointer move — no second high-res request,
 * because the source is already served at a larger intrinsic size than the
 * frame displays.
 */
export function ProductGallery({
  images,
  productName,
}: {
  images: GalleryImage[];
  productName: string;
}) {
  const [active, setActive] = React.useState(0);
  const [zooming, setZooming] = React.useState(false);
  const [origin, setOrigin] = React.useState("50% 50%");
  const [lightboxOpen, setLightboxOpen] = React.useState(false);

  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: images.length > 1 });

  React.useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setActive(emblaApi.selectedScrollSnap());
    emblaApi.on("select", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi]);

  if (!images.length) {
    return (
      <div className="flex aspect-[4/5] items-center justify-center bg-sand-100 text-sm text-content-subtle">
        No image available
      </div>
    );
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    setOrigin(`${x}% ${y}%`);
  }

  return (
    <>
      {/* ---------------- Mobile: swipe carousel ---------------- */}
      <div className="lg:hidden">
        <div
          ref={emblaRef}
          className="overflow-hidden"
          role="region"
          aria-roledescription="carousel"
          aria-label={`${productName} images`}
        >
          <div className="flex">
            {images.map((image, index) => (
              <button
                key={image.url + index}
                type="button"
                onClick={() => {
                  setActive(index);
                  setLightboxOpen(true);
                }}
                className="relative aspect-[4/5] min-w-0 flex-[0_0_100%] bg-sand-100"
                aria-label={`View image ${index + 1} full screen`}
              >
                <MediaImage
                  src={image.url}
                  alt={image.alt}
                  fill
                  priority={index === 0}
                  sizes="100vw"
                  className="object-cover"
                />
              </button>
            ))}
          </div>
        </div>

        {images.length > 1 ? (
          <div className="mt-3 flex justify-center gap-1.5">
            {images.map((_, index) => (
              <button
                key={index}
                type="button"
                onClick={() => emblaApi?.scrollTo(index)}
                aria-label={`Go to image ${index + 1}`}
                aria-current={index === active}
                className={cn(
                  "h-1 rounded-full transition-all",
                  index === active
                    ? "w-6 bg-[var(--color-accent)]"
                    : "w-3 bg-sand-300",
                )}
              />
            ))}
          </div>
        ) : null}
      </div>

      {/* ---------------- Desktop: rail + single main image with zoom ---------------- */}
      <div className="hidden gap-4 lg:flex">
        {images.length > 1 ? (
          <div
            className="flex w-20 shrink-0 flex-col gap-3"
            role="tablist"
            aria-label={`${productName} image thumbnails`}
          >
            {images.map((image, index) => (
              <button
                key={image.url + index}
                type="button"
                role="tab"
                aria-selected={index === active}
                onClick={() => setActive(index)}
                className={cn(
                  "relative aspect-[4/5] overflow-hidden border bg-sand-100 transition-colors rounded-xs",
                  index === active
                    ? "border-[var(--color-accent)] ring-1 ring-[var(--color-accent)]"
                    : "border-transparent hover:border-line-strong",
                )}
              >
                <MediaImage
                  src={image.url}
                  alt=""
                  fill
                  sizes="80px"
                  className="object-cover"
                />
                <span className="sr-only">View image {index + 1}</span>
              </button>
            ))}
          </div>
        ) : null}

        <div className="relative flex-1">
          <div
            className="relative aspect-[4/5] cursor-zoom-in overflow-hidden bg-sand-100 rounded-sm border border-line/40"
            onPointerEnter={() => setZooming(true)}
            onPointerLeave={() => setZooming(false)}
            onPointerMove={onPointerMove}
            onClick={() => setLightboxOpen(true)}
          >
            <MediaImage
              src={images[active].url}
              alt={images[active].alt}
              fill
              priority
              sizes="(min-width: 1280px) 45vw, 50vw"
              className="object-cover transition-transform duration-300 ease-out"
              style={{
                transform: zooming ? "scale(1.9)" : "scale(1)",
                transformOrigin: origin,
              }}
            />
          </div>

          <button
            type="button"
            onClick={() => setLightboxOpen(true)}
            aria-label="View full screen"
            className="absolute bottom-3 right-3 inline-flex size-9 items-center justify-center rounded-sm bg-surface-raised/90 text-content shadow-[var(--shadow-subtle)] transition-colors hover:text-[var(--color-accent)]"
          >
            <Expand className="size-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      <Lightbox
        open={lightboxOpen}
        onOpenChange={setLightboxOpen}
        images={images}
        index={active}
        onIndexChange={setActive}
        productName={productName}
      />
    </>
  );
}

function Lightbox({
  open,
  onOpenChange,
  images,
  index,
  onIndexChange,
  productName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  images: GalleryImage[];
  index: number;
  onIndexChange: (index: number) => void;
  productName: string;
}) {
  // Arrow keys should page the lightbox, matching every other image viewer.
  React.useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "ArrowRight") {
        onIndexChange((index + 1) % images.length);
      } else if (event.key === "ArrowLeft") {
        onIndexChange((index - 1 + images.length) % images.length);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, index, images.length, onIndexChange]);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-sand-950/92 data-[state=closed]:animate-fade-out data-[state=open]:animate-fade-in" />
        <Dialog.Content className="fixed inset-0 z-50 flex flex-col data-[state=closed]:animate-fade-out data-[state=open]:animate-fade-in">
          <Dialog.Title className="sr-only">{productName} images</Dialog.Title>
          <Dialog.Description className="sr-only">
            Image {index + 1} of {images.length}. Use the arrow keys to browse.
          </Dialog.Description>

          <div className="flex justify-end p-4">
            <Dialog.Close
              className="inline-flex size-11 items-center justify-center rounded-sm text-sand-200 transition-colors hover:bg-sand-50/10"
              aria-label="Close"
            >
              <X className="size-6" aria-hidden="true" />
            </Dialog.Close>
          </div>

          <div className="relative flex flex-1 items-center justify-center p-4 pb-16">
            <div className="relative h-full w-full max-w-3xl">
              <MediaImage
                src={images[index].url}
                alt={images[index].alt}
                fill
                sizes="100vw"
                className="object-contain"
              />
            </div>

            {images.length > 1 ? (
              <>
                <LightboxArrow
                  side="left"
                  onClick={() =>
                    onIndexChange((index - 1 + images.length) % images.length)
                  }
                />
                <LightboxArrow
                  side="right"
                  onClick={() => onIndexChange((index + 1) % images.length)}
                />
              </>
            ) : null}
          </div>

          {images.length > 1 ? (
            <p className="pb-6 text-center text-xs text-sand-400">
              {index + 1} / {images.length}
            </p>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function LightboxArrow({
  side,
  onClick,
}: {
  side: "left" | "right";
  onClick: () => void;
}) {
  const Icon = side === "left" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={side === "left" ? "Previous image" : "Next image"}
      className={cn(
        "absolute top-1/2 inline-flex size-12 -translate-y-1/2 items-center justify-center rounded-full bg-sand-50/10 text-sand-100 transition-colors hover:bg-sand-50/20",
        side === "left" ? "left-3" : "right-3",
      )}
    >
      <Icon className="size-6" aria-hidden="true" />
    </button>
  );
}

function DesktopZoomImageItem({
  image,
  index,
  isPriority,
  onOpenLightbox,
}: {
  image: GalleryImage;
  index: number;
  isPriority: boolean;
  onOpenLightbox: () => void;
}) {
  const [zooming, setZooming] = React.useState(false);
  const [origin, setOrigin] = React.useState("50% 50%");

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    setOrigin(`${x}% ${y}%`);
  }

  return (
    <div
      id={`product-image-${index}`}
      className="relative aspect-[4/5] w-full cursor-zoom-in overflow-hidden bg-sand-100 rounded-sm border border-line/40 scroll-mt-28 group"
      onPointerEnter={() => setZooming(true)}
      onPointerLeave={() => setZooming(false)}
      onPointerMove={onPointerMove}
      onClick={onOpenLightbox}
    >
      <MediaImage
        src={image.url}
        alt={image.alt}
        fill
        priority={isPriority}
        sizes="(min-width: 1280px) 45vw, 50vw"
        className="object-cover transition-transform duration-300 ease-out"
        style={{
          transform: zooming ? "scale(1.9)" : "scale(1)",
          transformOrigin: origin,
        }}
      />
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onOpenLightbox();
        }}
        aria-label="View full screen"
        className="absolute bottom-3 right-3 inline-flex size-9 items-center justify-center rounded-sm bg-surface-raised/90 text-content shadow-[var(--shadow-subtle)] transition-colors hover:text-[var(--color-accent)] opacity-0 group-hover:opacity-100"
      >
        <Expand className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}
