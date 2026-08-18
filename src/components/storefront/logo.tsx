import Link from "next/link";
import Image from "next/image";

import { cn } from "@/lib/utils";

export type LogoProps = {
  className?: string;
  /** "dark" for light backgrounds, "light" for dark footers, "card" for dark teal card. */
  tone?: "dark" | "light" | "gold";
  size?: "sm" | "md" | "lg" | "xl";
  /** "horizontal" (nav bar), "stacked" (standard stacked), "mark" (monogram only), or "card" (original dark card). */
  variant?: "horizontal" | "stacked" | "mark" | "card";
  align?: "left" | "center";
  asLink?: boolean;
  showMark?: boolean;
};

/**
 * Official Brand Logo Component for Aastha Silver & Jewels.
 * Renders the original, unedited logo image assets provided by the brand.
 */
export function Logo({
  className,
  tone = "dark",
  size = "md",
  variant = "horizontal",
  align = "left",
  asLink = true,
}: LogoProps) {
  if (variant === "card") {
    const heightMap = {
      sm: "h-20 w-auto",
      md: "h-28 w-auto",
      lg: "h-40 w-auto",
      xl: "h-52 w-auto",
    };

    const cardElement = (
      <div
        className={cn(
          "inline-flex overflow-hidden rounded-xl shadow-card transition-transform hover:scale-[1.01]",
          className
        )}
      >
        <img
          src="/brand/logo-dark-card.png"
          alt="Aastha Silver & Jewels"
          className={cn("object-contain", heightMap[size])}
        />
      </div>
    );

    if (!asLink) return cardElement;
    return (
      <Link href="/" aria-label="Aastha Silver & Jewels — Home">
        {cardElement}
      </Link>
    );
  }

  if (variant === "mark") {
    const markHeightMap = {
      sm: "h-7 w-auto",
      md: "h-10 w-auto",
      lg: "h-14 w-auto",
      xl: "h-20 w-auto",
    };

    const markElement = (
      <img
        src="/brand/logo-mark-transparent.png"
        alt="Aastha Silver & Jewels Monogram"
        className={cn("object-contain shrink-0", markHeightMap[size], className)}
      />
    );

    if (!asLink) return markElement;
    return (
      <Link href="/" aria-label="Aastha Silver & Jewels">
        {markElement}
      </Link>
    );
  }

  if (variant === "stacked") {
    const stackedHeightMap = {
      sm: "h-16 w-auto",
      md: "h-24 w-auto",
      lg: "h-36 w-auto",
      xl: "h-48 w-auto",
    };

    const stackedElement = (
      <img
        src="/brand/logo-gold-stacked-transparent.png"
        alt="Aastha Silver & Jewels"
        className={cn("object-contain shrink-0", stackedHeightMap[size], className)}
      />
    );

    if (!asLink) return stackedElement;
    return (
      <Link href="/" aria-label="Aastha Silver & Jewels — Home">
        {stackedElement}
      </Link>
    );
  }

  // Horizontal variant (default for Header / Navbar)
  const horizHeightMap = {
    sm: "h-8 sm:h-9 w-auto",
    md: "h-10 lg:h-12 w-auto",
    lg: "h-14 lg:h-16 w-auto",
    xl: "h-20 lg:h-24 w-auto",
  };

  const horizElement = (
    <img
      src="/brand/logo-gold-horizontal-transparent.png"
      alt="Aastha Silver & Jewels"
      className={cn("object-contain shrink-0", horizHeightMap[size], className)}
    />
  );

  if (!asLink) return horizElement;

  return (
    <Link
      href="/"
      aria-label="Aastha Silver & Jewels — Home"
      className="inline-flex items-center focus-visible:outline-2 focus-visible:outline-offset-4"
    >
      {horizElement}
    </Link>
  );
}
