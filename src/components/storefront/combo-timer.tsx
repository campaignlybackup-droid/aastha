"use client";

import * as React from "react";
import { Clock } from "lucide-react";

export function ComboTimer({
  endsAt,
  variant = "badge",
}: {
  endsAt: Date | string | null;
  variant?: "badge" | "banner" | "compact";
}) {
  const [timeLeft, setTimeLeft] = React.useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    expired: boolean;
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: false });

  React.useEffect(() => {
    if (!endsAt) return;

    const targetDate = new Date(endsAt).getTime();

    function update() {
      const now = new Date().getTime();
      const diff = targetDate - now;

      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: true });
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds, expired: false });
    }

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [endsAt]);

  if (!endsAt) return null;
  if (timeLeft.expired) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-danger-700">
        <Clock className="size-3.5 shrink-0" />
        Offer expired
      </span>
    );
  }

  const pad = (n: number) => n.toString().padStart(2, "0");

  if (variant === "banner") {
    return (
      <div className="flex items-center gap-2 rounded-md bg-amber-50 px-3 py-1.5 border border-amber-200/80 text-amber-900 text-xs font-semibold">
        <Clock className="size-4 text-amber-700 shrink-0 animate-pulse" />
        <span>Offer ends in:</span>
        <div className="font-mono flex items-center gap-1 text-brand-950 font-bold">
          {timeLeft.days > 0 ? <span>{timeLeft.days}d </span> : null}
          <span>{pad(timeLeft.hours)}h</span>:
          <span>{pad(timeLeft.minutes)}m</span>:
          <span>{pad(timeLeft.seconds)}s</span>
        </div>
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-amber-800 font-mono font-medium">
        <Clock className="size-3.5 text-amber-600 shrink-0" />
        {timeLeft.days > 0 ? `${timeLeft.days}d ` : ""}
        {pad(timeLeft.hours)}:{pad(timeLeft.minutes)}:{pad(timeLeft.seconds)}
      </span>
    );
  }

  return (
    <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-100/90 px-2.5 py-0.5 text-xs font-semibold text-amber-900 border border-amber-300/60 shadow-xs">
      <Clock className="size-3.5 text-amber-700 shrink-0" />
      <span className="font-mono">
        {timeLeft.days > 0 ? `${timeLeft.days}d ` : ""}
        {pad(timeLeft.hours)}h {pad(timeLeft.minutes)}m {pad(timeLeft.seconds)}s
      </span>
    </div>
  );
}
