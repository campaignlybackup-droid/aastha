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

/** Automatically injects Cloudinary f_auto,q_auto,w_800 CDN transformation if src is a Cloudinary URL */
export function optimizeMediaUrl(url: string, width = 800): string {
  if (!url || typeof url !== "string") return url;
  if (url.includes("res.cloudinary.com") && url.includes("/upload/")) {
    if (url.includes("/upload/f_auto") || url.includes("/upload/q_auto")) return url;
    return url.replace("/upload/", `/upload/f_auto,q_auto,w_${width},c_limit/`);
  }
  return url;
}

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
  const rawSrc =
    typeof src === "string" && src.trim().length > 0
      ? src.trim()
      : "/brand/logo-mark-transparent.png";
  const safeSrc = optimizeMediaUrl(rawSrc);
  const isSvg = safeSrc.toLowerCase().endsWith(".svg");

  const image = (
    <Image
      src={safeSrc}
      alt={alt || "Aastha Silver & Jewels"}
      fill={fill}
      sizes={fill ? (sizes ?? "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw") : sizes}
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
