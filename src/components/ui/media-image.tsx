import Image, { type ImageProps } from "next/image";

import { cn } from "@/lib/utils";

/**
 * The storefront's image component.
 *
 * Two behaviours worth knowing:
 *
 *  • SVG sources bypass the Next.js optimiser. The seeded placeholders are
 *    SVG, and Next refuses to optimise SVG unless `dangerouslyAllowSVG` is
 *    enabled globally — which would also apply to remote uploads. Opting out
 *    per-image keeps that flag off.
 *  • `sizes` is required whenever `fill` is used. Without it the browser
 *    downloads the largest candidate in the srcset, which on a product grid
 *    means fetching 1920px images into 300px slots.
 */

type MediaImageProps = Omit<ImageProps, "alt" | "src"> & {
  src: string;
  alt: string;
  /** Aspect ratio applied to the wrapper when using `fill`. */
  ratio?: "portrait" | "square" | "landscape" | "wide";
  wrapperClassName?: string;
};

const RATIOS = {
  portrait: "aspect-[4/5]",
  square: "aspect-square",
  landscape: "aspect-[3/2]",
  wide: "aspect-[16/9]",
} as const;

export function MediaImage({
  src,
  alt,
  ratio,
  className,
  wrapperClassName,
  fill,
  sizes,
  ...props
}: MediaImageProps) {
  const isSvg = src.toLowerCase().endsWith(".svg");

  const image = (
    <Image
      src={src}
      alt={alt}
      fill={fill}
      sizes={fill ? (sizes ?? "100vw") : sizes}
      unoptimized={isSvg}
      className={cn(fill && "object-cover", className)}
      {...props}
    />
  );

  if (!ratio) return image;

  return (
    <div
      className={cn(
        "relative overflow-hidden bg-sand-100",
        RATIOS[ratio],
        wrapperClassName,
      )}
    >
      {image}
    </div>
  );
}
