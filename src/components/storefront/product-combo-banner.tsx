"use client";

import * as React from "react";
import Link from "next/link";
import { Check, Flame, Sparkles, ShoppingBag } from "lucide-react";

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

      const res = await addMultipleToCartAction(itemsToAdd);
      if (res.ok) {
        setAddedComboId(combo.id);
        setTimeout(() => setAddedComboId(null), 2500);
      }
    });
  };

  return (
    <div className="space-y-4 my-8 rounded-lg border border-gold-500/40 bg-gold-50/40 p-5 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gold-300/40 pb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-gold-600 shrink-0" />
          <h3 className="font-display text-base font-semibold text-brand-950">
            Frequently Bought Together — Combo Offer Available!
          </h3>
        </div>
        <Link
          href="/combos"
          className="text-xs font-semibold text-brand-900 underline underline-offset-4 hover:text-gold-700"
        >
          View all combo offers →
        </Link>
      </div>

      {combos.map((combo) => {
        const otherItems = combo.items.filter((item) => item.productId !== currentProductId);
        const isAdded = addedComboId === combo.id;
        const soldOut = combo.availableStock <= 0;

        return (
          <div
            key={combo.id}
            className="flex flex-col gap-4 rounded-md border border-line bg-surface p-4 sm:flex-row sm:items-center sm:justify-between"
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
              <div className="space-y-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="font-medium text-sm text-brand-950">{combo.title}</h4>
                  {combo.savingsPaise > 0 ? (
                    <Badge variant="accent" className="bg-brand-900 text-white text-[10px] py-0.5">
                      Save {formatPrice(combo.savingsPaise)} ({combo.savingsPercent}% OFF)
                    </Badge>
                  ) : null}
                </div>

                <p className="text-xs text-content-muted">
                  Includes this item +{" "}
                  <span className="font-semibold text-content">
                    {otherItems.map((i) => i.productName).join(", ")}
                  </span>
                </p>

                <div className="flex flex-wrap items-center gap-3 pt-1">
                  {combo.endsAt ? <ComboTimer endsAt={combo.endsAt} variant="compact" /> : null}
                  {!soldOut && combo.availableStock <= 8 ? (
                    <span className="flex items-center gap-1 text-[11px] font-medium text-amber-800">
                      <Flame className="size-3 text-amber-600" />
                      Only {combo.availableStock} left
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Price & Action Button */}
            <div className="flex flex-row items-center justify-between sm:flex-col sm:items-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-line/60">
              <div className="text-left sm:text-right">
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
                className="bg-brand-900 hover:bg-brand-950 text-white text-xs px-4"
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
