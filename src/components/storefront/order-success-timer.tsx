"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Package, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";

export function OrderSuccessTimer({
  orderId,
  orderNumber,
  customerName,
}: {
  orderId: string;
  orderNumber: string;
  customerName: string;
}) {
  const router = useRouter();
  const [seconds, setSeconds] = React.useState(5);

  React.useEffect(() => {
    if (seconds <= 0) {
      router.push(`/account/orders`);
      return;
    }

    const timer = setTimeout(() => {
      setSeconds((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [seconds, router]);

  return (
    <div className="mb-10 rounded-2xl border border-emerald-200 bg-gradient-to-b from-emerald-50/80 via-white to-emerald-50/30 p-8 text-center shadow-lg shadow-emerald-950/5">
      <div className="relative mx-auto mb-6 flex size-20 items-center justify-center rounded-full bg-emerald-100/80 shadow-inner">
        <CheckCircle2 className="size-10 text-emerald-600 animate-bounce" aria-hidden="true" />
        <span className="absolute -top-1 -right-1 flex size-6 items-center justify-center rounded-full bg-emerald-600 text-white text-xs">
          <Sparkles className="size-3.5" />
        </span>
      </div>

      <span className="inline-block rounded-full bg-emerald-100 px-3.5 py-1 text-xs font-semibold tracking-wider uppercase text-emerald-800 mb-3">
        Payment Verified &amp; Confirmed
      </span>

      <h1 className="font-display text-3xl font-semibold text-sand-950 sm:text-4xl">
        Order Placed Successfully!
      </h1>

      <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-sand-700">
        Thank you, <span className="font-medium text-sand-900">{customerName}</span>! Order{" "}
        <span className="font-semibold text-emerald-700">#{orderNumber}</span> has been confirmed.
      </p>

      {/* --- 5 Second Countdown Banner ---------------------------------- */}
      <div className="mx-auto my-6 max-w-sm rounded-xl border border-emerald-200/80 bg-white/90 p-4 backdrop-blur-sm shadow-sm">
        <p className="text-xs font-medium uppercase tracking-wider text-emerald-800">
          Redirecting to Profile Orders in
        </p>
        <div className="my-2 flex items-center justify-center gap-2">
          <span className="font-display text-4xl font-bold text-emerald-600 tabular-nums">
            {seconds}
          </span>
          <span className="text-sm font-medium text-emerald-700">seconds</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-emerald-100">
          <div
            className="h-full bg-emerald-500 transition-all duration-1000 ease-linear"
            style={{ width: `${(seconds / 5) * 100}%` }}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button asChild size="lg" className="bg-emerald-700 text-white hover:bg-emerald-800">
          <Link href="/account/orders">
            <Package className="mr-2 size-4" />
            View in My Orders Profile
            <ArrowRight className="ml-2 size-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
