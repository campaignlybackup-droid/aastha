import Link from "next/link";

import { cn } from "@/lib/utils";

/**
 * Typographic wordmark.
 *
 * Deliberately not an image: it stays crisp at any size, needs no request, and
 * inherits the campaign accent. To use the painted brand mark instead, replace
 * the inner markup with an <Image> — every call site goes through this
 * component.
 */
export function Logo({
  className,
  tone = "dark",
  size = "md",
  asLink = true,
}: {
  className?: string;
  /** "dark" for light backgrounds, "light" for the teal footer and hero overlays. */
  tone?: "dark" | "light";
  size?: "sm" | "md" | "lg";
  asLink?: boolean;
}) {
  const sizes = {
    sm: { name: "text-lg", sub: "text-[0.5rem] tracking-[0.3em]" },
    md: { name: "text-2xl", sub: "text-[0.5625rem] tracking-[0.32em]" },
    lg: { name: "text-4xl", sub: "text-[0.6875rem] tracking-[0.34em]" },
  }[size];

  const content = (
    <span className={cn("flex flex-col items-center leading-none", className)}>
      <span
        className={cn(
          "font-display font-normal tracking-[0.14em]",
          sizes.name,
          tone === "dark" ? "text-brand-800" : "text-sand-50",
        )}
      >
        AASTHA
      </span>
      <span
        className={cn(
          "mt-1 font-sans font-medium uppercase",
          sizes.sub,
          tone === "dark" ? "text-gold-600" : "text-gold-300",
        )}
      >
        Silver &amp; Jewels
      </span>
    </span>
  );

  if (!asLink) return content;

  return (
    <Link
      href="/"
      aria-label="Aastha Silver &amp; Jewels — home"
      className="inline-flex focus-visible:outline-2 focus-visible:outline-offset-4"
    >
      {content}
    </Link>
  );
}
