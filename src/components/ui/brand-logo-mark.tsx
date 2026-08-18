import * as React from "react";
import { cn } from "@/lib/utils";

export type BrandLogoMarkProps = {
  className?: string;
  tone?: "gold" | "dark" | "light" | "current";
};

/**
 * Authentic ASJ Monogram Mark from Aastha Silver & Jewels.
 * Features the signature interlocked ASJ letters enclosed within a rounded gold capsule.
 */
export function BrandLogoMark({
  className,
  tone = "gold",
}: BrandLogoMarkProps) {
  const strokeColor =
    tone === "gold"
      ? "url(#asj-gold-grad)"
      : tone === "dark"
        ? "var(--color-brand-800, #1f5557)"
        : tone === "light"
          ? "#ffffff"
          : "currentColor";

  const fillColor =
    tone === "gold"
      ? "url(#asj-gold-grad)"
      : tone === "dark"
        ? "var(--color-brand-800, #1f5557)"
        : tone === "light"
          ? "#ffffff"
          : "currentColor";

  return (
    <svg
      viewBox="0 0 240 310"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("size-auto shrink-0 select-none", className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient
          id="asj-gold-grad"
          x1="0%"
          y1="0%"
          x2="100%"
          y2="100%"
        >
          <stop offset="0%" stopColor="#F7E5A9" />
          <stop offset="30%" stopColor="#E5C365" />
          <stop offset="60%" stopColor="#C6A444" />
          <stop offset="85%" stopColor="#A98433" />
          <stop offset="100%" stopColor="#866329" />
        </linearGradient>
      </defs>

      {/* Pill Outer Container Frame */}
      <rect
        x="8"
        y="8"
        width="224"
        height="294"
        rx="80"
        ry="80"
        stroke={strokeColor}
        strokeWidth="4"
        fill="none"
      />

      {/* Monogram Interlocked Letters: A, S, J */}
      <g fill={fillColor}>
        {/* Letter A (Serif left diagonal & crossbar) */}
        <path d="M82 205 L114 65 L132 65 L164 205 L148 205 L138 160 L108 160 L98 205 Z M112 146 L134 146 L123 90 Z" />

        {/* Letter J (Serif right stem with bottom hook) */}
        <path d="M136 72 L176 72 L176 84 L162 84 L162 178 C162 206 144 222 118 222 C98 222 84 210 82 194 L96 194 C98 202 106 209 118 209 C134 209 146 197 146 178 L146 72 Z" />

        {/* Letter S (Elegant sweeping central curve) */}
        <path
          d="M148 136 C148 114 130 104 108 104 C86 104 70 114 70 136 C70 157 90 164 112 171 C134 178 152 186 152 210 C152 235 128 246 102 246 C76 246 54 232 52 208 L68 208 C70 222 83 232 102 232 C122 232 134 223 134 210 C134 195 116 188 94 181 C70 174 52 165 52 136 C52 108 76 90 108 90 C134 90 148 106 148 136 Z"
          opacity="0.96"
        />
      </g>
    </svg>
  );
}
