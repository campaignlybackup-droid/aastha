"use client";

import * as React from "react";
import Link from "next/link";
import { Check, Flame, Sparkles, ShoppingBag, ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/primitives";
import { MediaImage } from "@/components/ui/media-image";
import { formatPrice } from "@/lib/money";
import { ComboTimer } from "@/components/storefront/combo-timer";
import type { ComboOfferDetail } from "@/server/combos";
import { addMultipleToCartAction } from "@/server/actions/cart";

export function ProductComboBanner({
  combos,
  currentProductId,
}: {
  combos: ComboOfferDetail[];
  currentProductId: string;
}) {
  const [pending, startTransition] = React.useTransition();
  const [addedComboId, setAddedComboId] = React.useState<string | null>(null);

  if (!combos.length) return null;

  const handleAddCombo = (combo: ComboOfferDetail) => {
    startTransition(async () => {
      const itemsToAdd = combo.items.map((item) => ({
        productId: item.productId,
        variantId: item.variantId ?? undefined,
        quantity: item.quantity,
      }));

      const res = await addMultipleToCartAction(itemsToAdd, combo.id);
      if (res.ok) {
        setAddedComboId(combo.id);
        setTimeout(() => setAddedComboId(null), 2500);
      }
    });
  };

  return (
    <div className="my-8 rounded-xl border border-gold-300/80 bg-gradient-to-br from-gold-50/60 via-sand-50/50 to-gold-50/30 p-5 shadow-xs font-sans">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gold-300/40 pb-3.5 mb-4">
        <div className="flex items-center gap-2">
          <span className="flex size-6 items-center justify-center rounded-full bg-gold-200 text-gold-900">
            <Sparkles className="size-3.5" />
          </span>
          <h3 className="font-sans text-sm md:text-base font-semibold text-brand-950">
            Frequently Bought Together — Combo Savings!
          </h3>
        </div>
        <Link
          href="/combos"
          className="inline-flex items-center gap-1 text-xs font-semibold text-brand-900 underline underline-offset-4 hover:text-gold-700"
        >
          <span>All Combos</span>
          <ArrowRight className="size-3" />
        </Link>
      </div>

      {combos.map((combo) => {
        const otherItems = combo.items.filter((item) => item.productId !== currentProductId);
        const isAdded = addedComboId === combo.id;
        const soldOut = combo.availableStock <= 0;

        return (
          <div
            key={combo.id}
            className="flex flex-col gap-4 rounded-lg border border-line/80 bg-surface p-4 shadow-2xs sm:flex-row sm:items-center sm:justify-between transition-all hover:border-gold-400"
          >
            <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
              {/* Product preview thumbnails */}
              <div className="flex items-center gap-2 shrink-0">
                {combo.imageUrl ? (
                  <div className="relative size-16 overflow-hidden rounded-md border border-line bg-sand-100">
                    <MediaImage
                      src={combo.imageUrl}
                      alt={combo.title}
                      fill
                      sizes="64px"
                      className="object-cover"
                    />
                  </div>
                ) : (
                  combo.items.map((item, idx) => (
                    <React.Fragment key={item.id}>
                      {idx > 0 ? (
                        <span className="font-bold text-xs text-brand-900">+</span>
                      ) : null}
                      <div className="relative size-14 overflow-hidden rounded-md border border-line bg-sand-100">
                        {item.imageUrl ? (
                          <MediaImage
                            src={item.imageUrl}
                            alt={item.productName}
                            fill
                            sizes="56px"
                            className="object-cover"
                          />
                        ) : null}
                      </div>
                    </React.Fragment>
                  ))
                )}
              </div>

              {/* Info & Timer */}
              <div className="space-y-1 min-w-0 font-sans">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="font-semibold text-sm text-brand-950">{combo.title}</h4>
                  {combo.savingsPaise > 0 ? (
                    <span className="rounded bg-brand-950 px-2 py-0.5 text-[11px] font-semibold text-gold-300">
                      Save {formatPrice(combo.savingsPaise)} ({combo.savingsPercent}% OFF)
                    </span>
                  ) : null}
                </div>

                <p className="text-xs text-content-muted leading-snug">
                  Includes this piece +{" "}
                  <span className="font-medium text-brand-900">
                    {otherItems.map((i) => i.productName).join(", ")}
                  </span>
                </p>

                <div className="flex flex-wrap items-center gap-3 pt-1">
                  {combo.endsAt ? <ComboTimer endsAt={combo.endsAt} variant="compact" /> : null}
                  {!soldOut && combo.availableStock <= 8 ? (
                    <span className="flex items-center gap-1 text-[11px] font-medium text-amber-800">
                      <Flame className="size-3 text-amber-600 animate-pulse" />
                      Only {combo.availableStock} left
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Price & Action Button */}
            <div className="flex flex-row items-center justify-between sm:flex-col sm:items-end gap-3 shrink-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-line/60">
              <div className="text-left sm:text-right font-sans">
                <div className="text-base font-bold text-brand-950">
                  {formatPrice(combo.comboPricePaise)}
                </div>
                {combo.originalTotalPaise > combo.comboPricePaise ? (
                  <div className="text-xs text-content-subtle line-through">
                    {formatPrice(combo.originalTotalPaise)}
                  </div>
                ) : null}
              </div>

              <Button
                type="button"
                size="sm"
                onClick={() => handleAddCombo(combo)}
                disabled={pending || soldOut}
                className="bg-brand-900 hover:bg-brand-950 text-white font-sans text-xs px-4 h-9 font-medium"
              >
                {isAdded ? (
                  <>
                    <Check className="size-3.5 mr-1 text-gold-400" />
                    Combo Added
                  </>
                ) : soldOut ? (
                  "Sold Out"
                ) : (
                  <>
                    <ShoppingBag className="size-3.5 mr-1" />
                    Add Combo to Bag
                  </>
                )}
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
