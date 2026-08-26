import * as React from "react";
import Link from "next/link";
import { Sparkles, ArrowRight } from "lucide-react";

import { ComboCard } from "@/components/storefront/combo-card";
import type { ComboOfferDetail } from "@/server/combos";

export function HomepageCombosSection({ combos }: { combos: ComboOfferDetail[] }) {
  if (!combos || combos.length === 0) return null;

  return (
    <section className="py-12 md:py-16 bg-sand-50/60 border-y border-line/60">
      <div className="u-container">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gold-700">
              <Sparkles className="size-3.5 shrink-0" />
              <span>Bundle & Save Extra</span>
            </div>
            <h2 className="font-display text-2xl md:text-3xl text-brand-950 mt-1">
              Limited Time Combo Offers
            </h2>
            <p className="text-sm text-content-muted mt-1">
              Handpicked 925 sterling silver sets paired at exclusive discounted prices.
            </p>
          </div>

          <Link
            href="/combos"
            className="inline-flex items-center gap-1 text-xs font-semibold text-brand-900 hover:text-gold-700 underline underline-offset-4 shrink-0"
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
