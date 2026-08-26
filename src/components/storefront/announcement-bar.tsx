"use client";

import * as React from "react";
import Link from "next/link";
import { CreditCard, ShieldCheck, Truck } from "lucide-react";

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
 * Automatically animates and changes text by itself with crisp white styling.
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

  React.useEffect(() => {
    if (items.length <= 1) return;

    const timer = setInterval(() => {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % items.length);
        setIsAnimating(false);
      }, 350);
    }, 3600);

    return () => clearInterval(timer);
  }, [items.length]);

  const current = items[currentIndex];
  const Icon = current?.icon;

  return (
    <div className="relative z-40 bg-brand-950 py-2.5 text-white shadow-xs border-b border-brand-900/50 select-none overflow-hidden">
      <div className="u-container flex justify-center items-center text-center text-xs font-medium tracking-wider">
        <div className="overflow-hidden h-5 flex justify-center items-center">
          <div
            className={`flex items-center justify-center gap-2 transition-all duration-350 transform ${
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
      </div>
    </div>
  );
}
