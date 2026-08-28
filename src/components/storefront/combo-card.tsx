"use client";

import * as React from "react";
import Link from "next/link";
import { Check, Flame, PackageCheck, ShoppingBag, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/primitives";
import { MediaImage } from "@/components/ui/media-image";
import { formatPrice } from "@/lib/money";
import { ComboTimer } from "@/components/storefront/combo-timer";
import type { ComboOfferDetail } from "@/server/combos";
import { addMultipleToCartAction } from "@/server/actions/cart";

export function ComboCard({ combo }: { combo: ComboOfferDetail }) {
  const [pending, startTransition] = React.useTransition();
  const [added, setAdded] = React.useState(false);

  const handleAddCombo = () => {
    startTransition(async () => {
      // Add all bundled items to cart, tagged with the combo offer id
      const itemsToAdd = combo.items.map((item) => ({
        productId: item.productId,
        variantId: item.variantId ?? undefined,
        quantity: item.quantity,
      }));

      const res = await addMultipleToCartAction(itemsToAdd, combo.id);
      if (res.ok) {
        setAdded(true);
        setTimeout(() => setAdded(false), 2500);
      }
    });
  };

  const soldOut = combo.availableStock <= 0;

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-lg border border-line/80 bg-surface shadow-xs transition-all duration-300 hover:-translate-y-0.5 hover:border-gold-400 hover:shadow-md">
      {/* Top badges */}
      <div className="absolute left-3 top-3 z-10 flex flex-wrap gap-2">
        {combo.savingsPaise > 0 ? (
          <span className="inline-flex items-center gap-1 rounded-md bg-brand-950 px-2.5 py-1 text-xs font-semibold text-gold-300 shadow-xs backdrop-blur-xs">
            <Sparkles className="size-3 text-gold-400" />
            Save {formatPrice(combo.savingsPaise)} ({combo.savingsPercent}% OFF)
          </span>
        ) : null}
      </div>

      {combo.endsAt ? (
        <div className="absolute right-3 top-3 z-10">
          <ComboTimer endsAt={combo.endsAt} variant="badge" />
        </div>
      ) : null}

      {/* Media Image Showcase */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-sand-100/70 p-3">
        {combo.imageUrl ? (
          /* Custom Photo uploaded by Admin */
          <MediaImage
            src={combo.imageUrl}
            alt={combo.title}
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          /* Dynamic Multi-Product Images Layout */
          <div className="flex h-full w-full items-center justify-center gap-2">
            {combo.items.map((item, idx) => (
              <React.Fragment key={item.id}>
                {idx > 0 ? (
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-surface shadow-xs text-brand-900 font-bold text-xs border border-line">
                    +
                  </span>
                ) : null}
                <div className="relative h-full flex-1 overflow-hidden rounded-md border border-line/80 bg-surface">
                  {item.imageUrl ? (
                    <MediaImage
                      src={item.imageUrl}
                      alt={item.productName}
                      fill
                      sizes="150px"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-content-subtle">
                      Product
                    </div>
                  )}
                </div>
              </React.Fragment>
            ))}
          </div>
        )}
      </div>

      {/* Content details */}
      <div className="flex flex-1 flex-col p-5 space-y-3.5">
        <div className="space-y-1">
          <h3 className="font-sans text-base font-semibold leading-tight text-brand-950 transition-colors group-hover:text-brand-700">
            {combo.title}
          </h3>
          {combo.description ? (
            <p className="line-clamp-2 text-xs text-content-muted leading-relaxed font-sans">
              {combo.description}
            </p>
          ) : null}
        </div>

        {/* Included Items Pill List */}
        <div className="space-y-1.5 text-xs font-sans">
          <div className="flex items-center justify-between text-[11px] font-semibold text-content-subtle uppercase tracking-wider">
            <span className="flex items-center gap-1 text-gold-700">
              <PackageCheck className="size-3.5" />
              Includes {combo.items.length} Bundled Items:
            </span>
          </div>
          <ul className="divide-y divide-line/40 rounded-md border border-line/70 bg-sand-50/60 p-2.5 text-content-muted">
            {combo.items.map((item) => (
              <li key={item.id} className="flex items-center justify-between py-1.5 text-xs">
                <span className="truncate pr-2 font-medium text-brand-950">
                  {item.quantity > 1 ? `${item.quantity}× ` : ""}
                  {item.productName}
                  {item.variantTitle && item.variantTitle !== "Standard" ? ` (${item.variantTitle})` : ""}
                </span>
                <span className="shrink-0 text-content-subtle line-through">
                  {formatPrice(item.pricePaise * item.quantity)}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Pricing & Stock indicator */}
        <div className="pt-1 mt-auto space-y-3">
          <div className="flex items-baseline justify-between">
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold font-sans text-brand-950">
                {formatPrice(combo.comboPricePaise)}
              </span>
              {combo.originalTotalPaise > combo.comboPricePaise ? (
                <span className="text-xs text-content-subtle line-through font-sans">
                  {formatPrice(combo.originalTotalPaise)}
                </span>
              ) : null}
            </div>

            {/* Live Stock Counter */}
            {!soldOut && combo.availableStock <= 10 ? (
              <span className="flex items-center gap-1 text-xs font-medium text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200/80">
                <Flame className="size-3 text-amber-600 animate-pulse" />
                Only {combo.availableStock} left
              </span>
            ) : null}
          </div>

          <Button
            type="button"
            onClick={handleAddCombo}
            disabled={pending || soldOut}
            className="w-full bg-brand-900 hover:bg-brand-950 text-white font-sans font-medium h-11 transition-colors"
          >
            {added ? (
              <>
                <Check className="size-4 mr-1.5 text-gold-400" />
                Combo Added to Bag
              </>
            ) : soldOut ? (
              "Sold Out"
            ) : (
              <>
                <ShoppingBag className="size-4 mr-1.5" />
                Buy Combo ({formatPrice(combo.comboPricePaise)})
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
