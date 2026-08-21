"use client";

import * as React from "react";
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
  onLoad,
  priority,
  ...props
}: MediaImageProps) {
  const [loaded, setLoaded] = React.useState(false);

  const safeSrc =
    typeof src === "string" && src.trim().length > 0
      ? src.trim()
      : "/brand/logo-mark-transparent.png";
  const isSvg = safeSrc.toLowerCase().endsWith(".svg");
  const isExternal = safeSrc.startsWith("http://") || safeSrc.startsWith("https://");

  const image = (
    <Image
      src={safeSrc}
      alt={alt || "Aastha Silver & Jewels"}
      fill={fill}
      priority={priority}
      sizes={fill ? (sizes ?? "100vw") : sizes}
      unoptimized={isSvg || isExternal}
      onLoad={(e) => {
        setLoaded(true);
        if (onLoad) onLoad(e);
      }}
      className={cn(
        fill && "object-cover",
        "transition-opacity duration-500 ease-out",
        !loaded && !priority && "opacity-0",
        loaded && "opacity-100",
        className,
      )}
      {...props}
    />
  );

  if (!ratio) {
    return (
      <div
        className={cn(
          "relative overflow-hidden bg-sand-100/80",
          !loaded && !priority && "animate-pulse bg-sand-200/60",
          wrapperClassName,
        )}
      >
        {image}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative overflow-hidden bg-sand-100/80",
        !loaded && !priority && "animate-pulse bg-sand-200/60",
        RATIOS[ratio],
        wrapperClassName,
      )}
    >
      {image}
    </div>
  );
}
