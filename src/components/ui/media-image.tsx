import Image, { type ImageProps } from "next/image";

import { cn } from "@/lib/utils";

type MediaImageProps = Omit<ImageProps, "alt" | "src"> & {
  src?: string | null;
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
  const safeSrc = typeof src === "string" && src.trim().length > 0 ? src.trim() : "/brand/logo-mark-transparent.png";
  const isSvg = safeSrc.toLowerCase().endsWith(".svg");

  const image = (
    <Image
      src={safeSrc}
      alt={alt || "Aastha Silver & Jewels"}
      fill={fill}
      sizes={fill ? (sizes ?? "100vw") : sizes}
      unoptimized={isSvg || !safeSrc.startsWith("http")}
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
