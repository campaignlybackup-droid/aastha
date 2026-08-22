import * as React from "react";
import { Star } from "lucide-react";

export function TrustedCustomersBanner() {
  return (
    <section className="w-full border-y border-line-subtle bg-sand-50/50 py-5">
      <div className="u-container flex flex-col items-center justify-center gap-3 text-center sm:flex-row sm:gap-6">
        {/* --- Customer Avatars --- */}
        <div className="flex items-center -space-x-2">
          <div className="flex size-7 items-center justify-center rounded-full bg-amber-100 font-display text-[10px] font-bold text-amber-900 ring-2 ring-white">
            AN
          </div>
          <div className="flex size-7 items-center justify-center rounded-full bg-emerald-100 font-display text-[10px] font-bold text-emerald-900 ring-2 ring-white">
            PS
          </div>
          <div className="flex size-7 items-center justify-center rounded-full bg-rose-100 font-display text-[10px] font-bold text-rose-900 ring-2 ring-white">
            RK
          </div>
          <div className="flex size-7 items-center justify-center rounded-full bg-indigo-100 font-display text-[10px] font-bold text-indigo-900 ring-2 ring-white">
            MD
          </div>
          <div className="flex size-7 items-center justify-center rounded-full bg-brand-800 font-display text-[10px] font-bold text-sand-50 ring-2 ring-white">
            2k+
          </div>
        </div>

        {/* --- Minimal Rating & Copy --- */}
        <div className="flex flex-wrap items-center justify-center gap-2 text-xs sm:text-sm">
          <div className="flex text-amber-500">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="size-3.5 fill-amber-400 stroke-amber-500" />
            ))}
          </div>
          <span className="font-medium text-sand-950">
            Trusted by 2,000+ Happy Customers Across India
          </span>
        </div>
      </div>
    </section>
  );
}
