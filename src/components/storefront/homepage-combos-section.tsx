import * as React from "react";
import Link from "next/link";
import { Sparkles, ArrowRight, PackageCheck } from "lucide-react";

import { ComboCard } from "@/components/storefront/combo-card";
import type { ComboOfferDetail } from "@/server/combos";

export function HomepageCombosSection({ combos }: { combos: ComboOfferDetail[] }) {
  if (!combos || combos.length === 0) return null;

  return (
    <section className="py-14 md:py-20 bg-gradient-to-b from-sand-50/90 via-gold-50/20 to-sand-50/90 border-y border-line/70">
      <div className="u-container">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-gold-700 font-sans">
              <Sparkles className="size-3.5 shrink-0 text-gold-600" />
              <span>Exclusive Jewellery Sets</span>
            </div>
            <h2 className="font-display text-2xl md:text-4xl text-brand-950 mt-1.5 font-normal tracking-tight">
              Curated Combo Offers
            </h2>
            <p className="text-sm text-content-muted mt-1.5 max-w-xl font-sans">
              Handpicked 925 sterling silver sets paired together at special bundle discounts.
            </p>
          </div>

          <Link
            href="/combos"
            className="inline-flex items-center gap-1.5 rounded-full border border-brand-900/20 bg-surface px-4 py-2 text-xs font-semibold text-brand-900 transition-colors hover:border-gold-500 hover:bg-gold-50 hover:text-gold-800 shrink-0 font-sans shadow-2xs"
          >
            <span>View All Combos</span>
            <ArrowRight className="size-3.5" />
          </Link>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {combos.slice(0, 3).map((combo) => (
            <ComboCard key={combo.id} combo={combo} />
          ))}
        </div>
      </div>
    </section>
  );
}
