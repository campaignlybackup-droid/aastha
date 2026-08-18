import Link from "next/link";
import Image from "next/image";

import { cn } from "@/lib/utils";

export type LogoProps = {
  className?: string;
  /** "dark" for light backgrounds, "light" for dark footers. */
  tone?: "dark" | "light" | "gold";
  size?: "sm" | "md" | "lg" | "xl";
  /** "horizontal" (navbar/header), "stacked" (standard), "mark" (icon only), or "card" (full branded card). */
  variant?: "horizontal" | "stacked" | "mark" | "card";
  align?: "left" | "center";
  asLink?: boolean;
};

/**
 * Official Brand Logo Component for Aastha Silver & Jewels.
 * Uses the exact horizontal, stacked, card, and monogram logo variations
 * directly provided by the brand, rendered crisp at all sizes.
 */
export function Logo({
  className,
  tone = "dark",
  size = "md",
  variant = "horizontal",
  asLink = true,
}: LogoProps) {
  // 1. Card Variant (Original dark pine teal background card)
  if (variant === "card") {
    const cardHeightMap = {
      sm: "h-24 md:h-28",
      md: "h-36 md:h-44",
      lg: "h-48 md:h-56",
      xl: "h-64 md:h-72",
    };

    const cardElement = (
      <div
        className={cn(
          "inline-flex shrink-0 overflow-hidden rounded-xl shadow-card transition-transform hover:scale-[1.01]",
          className
        )}
      >
        <img
          src="/logo-card.png"
          alt="Aastha Silver & Jewels"
          className={cn("w-auto object-contain", cardHeightMap[size])}
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

  // 2. Monogram Mark Only
  if (variant === "mark") {
    const markHeightMap = {
      sm: "h-8 w-auto",
      md: "h-11 w-auto",
      lg: "h-16 w-auto",
      xl: "h-24 w-auto",
    };

    const markElement = (
      <img
        src="/logo-mark.png"
        alt="Aastha Silver & Jewels Monogram"
        className={cn(
          "shrink-0 object-contain transition-transform hover:scale-105",
          tone === "dark" && "drop-shadow-[0_1px_2px_rgba(20,53,55,0.3)]",
          markHeightMap[size],
          className
        )}
      />
    );

    if (!asLink) return markElement;
    return (
      <Link href="/" aria-label="Aastha Silver & Jewels">
        {markElement}
      </Link>
    );
  }

  // 3. Stacked Variant (Monogram on top, text below)
  if (variant === "stacked") {
    const stackedHeightMap = {
      sm: "h-16 md:h-20 w-auto",
      md: "h-24 md:h-28 w-auto",
      lg: "h-36 md:h-40 w-auto",
      xl: "h-48 md:h-56 w-auto",
    };

    const stackedElement = (
      <img
        src="/logo-stacked.png"
        alt="Aastha Silver & Jewels"
        className={cn(
          "shrink-0 object-contain transition-transform hover:scale-[1.02]",
          tone === "dark" && "drop-shadow-[0_1px_3px_rgba(20,53,55,0.25)]",
          stackedHeightMap[size],
          className
        )}
      />
    );

    if (!asLink) return stackedElement;
    return (
      <Link href="/" aria-label="Aastha Silver & Jewels — Home">
        {stackedElement}
      </Link>
    );
  }

  // 4. Horizontal Variant (Default for Navbar / Header)
  const horizHeightMap = {
    sm: "h-9 sm:h-10 w-auto",
    md: "h-11 sm:h-12 lg:h-14 w-auto",
    lg: "h-16 sm:h-18 lg:h-20 w-auto",
    xl: "h-24 sm:h-28 lg:h-32 w-auto",
  };

  const horizElement = (
    <img
      src="/logo-horizontal.png"
      alt="Aastha Silver & Jewels"
      className={cn(
        "shrink-0 object-contain transition-transform hover:scale-[1.01]",
        // Added shadow on light backgrounds so gold lettering pops with high contrast
        tone === "dark" && "filter drop-shadow-[0_1px_3px_rgba(20,53,55,0.35)]",
        horizHeightMap[size],
        className
      )}
    />
  );

  if (!asLink) return horizElement;

  return (
    <Link
      href="/"
      aria-label="Aastha Silver & Jewels — Home"
      className="inline-flex shrink-0 items-center focus-visible:outline-2 focus-visible:outline-offset-4"
    >
      {horizElement}
    </Link>
  );
}
