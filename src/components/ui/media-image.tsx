import Image, { type ImageProps } from "next/image";

import { cn } from "@/lib/utils";

type MediaImageProps = Omit<ImageProps, "alt" | "src"> & {
  src?: string | null;
  alt: string;
  /** Aspect ratio applied to the wrapper when using `fill`. */
  ratio?: "portrait" | "square" | "landscape" | "wide";
  wrapperClassName?: string;
  /** Custom width for Cloudinary dynamic image delivery (defaults to 600 for high-DPI cards). */
  cloudinaryWidth?: number;
};

const RATIOS = {
  portrait: "aspect-[4/5]",
  square: "aspect-square",
  landscape: "aspect-[3/2]",
  wide: "aspect-[16/9]",
} as const;

/** Automatically injects Cloudinary f_auto,q_auto,w_${width} CDN transformation if src is a Cloudinary URL */
export function optimizeMediaUrl(url: string, width = 600): string {
  if (!url || typeof url !== "string") return url;
  // Enforce HTTPS to prevent 301 redirects and mixed-content latency
  const safe = url.replace(/^http:\/\/res\.cloudinary\.com/, "https://res.cloudinary.com");
  if (safe.includes("res.cloudinary.com") && safe.includes("/upload/")) {
    const uploadRegex = /\/upload\/(?:[a-zA-Z0-9_,:]+\/)?(v\d+\/.*)$/;
    if (uploadRegex.test(safe)) {
      return safe.replace(uploadRegex, `/upload/f_auto,q_auto:good,w_${width},c_limit/$1`);
    }
    return safe.replace("/upload/", `/upload/f_auto,q_auto:good,w_${width},c_limit/`);
  }
  return safe;
}

export function MediaImage({
  src,
  alt,
  ratio,
  className,
  wrapperClassName,
  cloudinaryWidth,
  fill,
  sizes,
  ...props
}: MediaImageProps) {
  const rawSrc =
    typeof src === "string" && src.trim().length > 0
      ? src.trim()
      : "/brand/logo-mark-transparent.png";
  const safeSrc = optimizeMediaUrl(rawSrc, cloudinaryWidth ?? 600);
  const isSvg = safeSrc.toLowerCase().endsWith(".svg");
  const isCloudinary = safeSrc.includes("res.cloudinary.com");

  const image = (
    <Image
      src={safeSrc}
      alt={alt || "Aastha Silver & Jewels"}
      fill={fill}
      sizes={fill ? (sizes ?? "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw") : sizes}
      unoptimized={isSvg || isCloudinary}
      decoding="async"
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
