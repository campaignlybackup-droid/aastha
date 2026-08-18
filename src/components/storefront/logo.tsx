import Link from "next/link";
import Image from "next/image";

import { BrandLogoMark } from "@/components/ui/brand-logo-mark";
import { cn } from "@/lib/utils";

export type LogoProps = {
  className?: string;
  /** "dark" for light backgrounds, "light" for dark/teal footers, "gold" for metallic highlights. */
  tone?: "dark" | "light" | "gold";
  size?: "sm" | "md" | "lg" | "xl";
  /** "horizontal" (icon + text inline), "stacked" (icon above text), "mark" (icon only), or "card" (full branded card). */
  variant?: "horizontal" | "stacked" | "mark" | "card";
  /** Alignment for stacked text layout. */
  align?: "left" | "center";
  asLink?: boolean;
  showMark?: boolean;
};

/**
 * Official Brand Logo Component for Aastha Silver & Jewels.
 * Features the signature ASJ monogram mark and luxurious serif wordmark.
 */
export function Logo({
  className,
  tone = "dark",
  size = "md",
  variant = "horizontal",
  align = "left",
  asLink = true,
  showMark = true,
}: LogoProps) {
  if (variant === "card") {
    const cardContent = (
      <div
        className={cn(
          "relative overflow-hidden rounded-xl bg-brand-900 p-6 text-center shadow-card border border-gold-500/30",
          size === "sm" && "max-w-[200px] p-4",
          size === "md" && "max-w-[280px] p-6",
          size === "lg" && "max-w-[340px] p-8",
          className
        )}
      >
        <div className="mx-auto mb-4 flex justify-center">
          <BrandLogoMark
            tone="gold"
            className={cn(
              size === "sm" && "h-14",
              size === "md" && "h-20",
              size === "lg" && "h-28"
            )}
          />
        </div>
        <div className="font-display tracking-[0.14em] text-gold-300 font-normal text-2xl lg:text-3xl">
          Aastha
        </div>
        <div className="mt-1 font-sans text-[0.65rem] tracking-[0.35em] text-gold-400 uppercase font-medium">
          Silver &amp; Jewels
        </div>
      </div>
    );

    if (!asLink) return cardContent;
    return (
      <Link
        href="/"
        aria-label="Aastha Silver & Jewels — Home"
        className="inline-block transition-transform hover:scale-[1.01]"
      >
        {cardContent}
      </Link>
    );
  }

  const markSizeMap = {
    sm: "h-6 w-auto",
    md: "h-8 w-auto",
    lg: "h-11 w-auto",
    xl: "h-14 w-auto",
  };

  const nameSizeMap = {
    sm: "text-base tracking-[0.14em]",
    md: "text-xl lg:text-2xl tracking-[0.14em]",
    lg: "text-3xl tracking-[0.16em]",
    xl: "text-4xl lg:text-5xl tracking-[0.18em]",
  };

  const subSizeMap = {
    sm: "text-[0.45rem] tracking-[0.28em]",
    md: "text-[0.55rem] tracking-[0.32em]",
    lg: "text-[0.68rem] tracking-[0.36em]",
    xl: "text-[0.75rem] tracking-[0.4em]",
  };

  const markTone =
    tone === "light" ? "gold" : tone === "gold" ? "gold" : "gold";

  const nameToneClass =
    tone === "dark"
      ? "text-brand-900"
      : tone === "light"
        ? "text-sand-50"
        : "text-gold-400";

  const subToneClass =
    tone === "dark"
      ? "text-gold-600"
      : tone === "light"
        ? "text-gold-300"
        : "text-gold-400";

  if (variant === "mark") {
    const markOnly = (
      <BrandLogoMark
        tone={markTone}
        className={cn(markSizeMap[size], className)}
      />
    );
    if (!asLink) return markOnly;
    return (
      <Link
        href="/"
        aria-label="Aastha Silver & Jewels"
        className="inline-flex focus-visible:outline-2 focus-visible:outline-offset-4"
      >
        {markOnly}
      </Link>
    );
  }

  const isStacked = variant === "stacked";

  const content = (
    <span
      className={cn(
        "inline-flex items-center gap-2.5 leading-none",
        isStacked ? "flex-col" : "flex-row",
        align === "center" || isStacked ? "items-center text-center" : "items-start",
        className
      )}
    >
      {showMark && (
        <BrandLogoMark
          tone={markTone}
          className={cn(markSizeMap[size], "transition-transform hover:scale-105")}
        />
      )}

      <span
        className={cn(
          "flex flex-col leading-none",
          align === "center" || isStacked ? "items-center" : "items-start"
        )}
      >
        <span
          className={cn(
            "font-display font-normal uppercase",
            nameSizeMap[size],
            nameToneClass
          )}
        >
          AASTHA
        </span>
        <span
          className={cn(
            "mt-1 font-sans font-medium uppercase",
            subSizeMap[size],
            subToneClass
          )}
        >
          Silver &amp; Jewels
        </span>
      </span>
    </span>
  );

  if (!asLink) return content;

  return (
    <Link
      href="/"
      aria-label="Aastha Silver & Jewels — home"
      className="inline-flex items-center focus-visible:outline-2 focus-visible:outline-offset-4"
    >
      {content}
    </Link>
  );
}
