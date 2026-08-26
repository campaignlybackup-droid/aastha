"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, CreditCard, ShieldCheck, Truck } from "lucide-react";

export type AnnouncementItem = {
  text: string;
  icon?: React.ComponentType<{ className?: string }>;
  href?: string | null;
};

const DEFAULT_ANNOUNCEMENTS: AnnouncementItem[] = [
  {
    text: "Free Shipping on all orders across India",
    icon: Truck,
    href: "/shipping-policy",
  },
  {
    text: "100% Hallmarked 925 Sterling Silver Jewellery",
    icon: ShieldCheck,
    href: "/about",
  },
  {
    text: "Partial COD Available — Pay 60% Now & 40% on Delivery",
    icon: CreditCard,
    href: "/checkout",
  },
];

/**
 * Announcement bar above the header.
 * Features rotating text with smooth fade/slide animation effect and white text styling.
 */
export function AnnouncementBar({
  text,
  href,
}: {
  text?: string | null;
  href?: string | null;
}) {
  const items = React.useMemo(() => {
    if (text && text.trim()) {
      return [
        { text: text.trim(), href },
        ...DEFAULT_ANNOUNCEMENTS,
      ];
    }
    return DEFAULT_ANNOUNCEMENTS;
  }, [text, href]);

  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [isAnimating, setIsAnimating] = React.useState(false);
  const [isPaused, setIsPaused] = React.useState(false);

  React.useEffect(() => {
    if (isPaused || items.length <= 1) return;

    const timer = setInterval(() => {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % items.length);
        setIsAnimating(false);
      }, 300);
    }, 3800);

    return () => clearInterval(timer);
  }, [isPaused, items.length]);

  const current = items[currentIndex];
  const Icon = current?.icon;

  const handlePrev = () => {
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);
      setIsAnimating(false);
    }, 200);
  };

  const handleNext = () => {
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % items.length);
      setIsAnimating(false);
    }, 200);
  };

  return (
    <div
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className="relative z-40 bg-brand-950 py-2.5 text-white shadow-xs border-b border-brand-900/50 select-none overflow-hidden"
    >
      <div className="u-container flex items-center justify-between gap-4 text-xs font-semibold tracking-wider">
        <button
          type="button"
          onClick={handlePrev}
          aria-label="Previous announcement"
          className="hidden sm:inline-flex items-center justify-center p-1 text-sand-300 hover:text-white transition-colors rounded hover:bg-brand-900/60"
        >
          <ChevronLeft className="size-3.5" />
        </button>

        <div className="flex-1 flex justify-center items-center text-center overflow-hidden h-5">
          <div
            className={`flex items-center justify-center gap-2 transition-all duration-300 transform ${
              isAnimating
                ? "-translate-y-2 opacity-0 scale-95"
                : "translate-y-0 opacity-100 scale-100"
            }`}
          >
            {Icon ? <Icon className="size-3.5 text-gold-400 shrink-0" /> : null}
            {current.href ? (
              <Link
                href={current.href}
                className="font-medium text-white hover:text-gold-300 transition-colors tracking-wide truncate"
              >
                {current.text}
              </Link>
            ) : (
              <span className="font-medium text-white tracking-wide truncate">
                {current.text}
              </span>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={handleNext}
          aria-label="Next announcement"
          className="hidden sm:inline-flex items-center justify-center p-1 text-sand-300 hover:text-white transition-colors rounded hover:bg-brand-900/60"
        >
          <ChevronRight className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
