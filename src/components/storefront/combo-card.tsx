"use client";

import * as React from "react";
import Link from "next/link";
import { Check, Flame, Plus, ShoppingBag } from "lucide-react";

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
      // Add all bundled items to cart
      const itemsToAdd = combo.items.map((item) => ({
        productId: item.productId,
        variantId: item.variantId ?? undefined,
        quantity: item.quantity,
      }));

      const res = await addMultipleToCartAction(itemsToAdd);
      if (res.ok) {
        setAdded(true);
        setTimeout(() => setAdded(false), 2500);
      }
    });
  };

  const soldOut = combo.availableStock <= 0;

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-md border border-line bg-surface transition-all duration-300 hover:shadow-md hover:border-gold-400">
      {/* Top badges */}
      <div className="absolute left-3 top-3 z-10 flex flex-wrap gap-2">
        {combo.savingsPaise > 0 ? (
          <Badge variant="accent" className="bg-brand-900 text-white font-semibold">
            Save {formatPrice(combo.savingsPaise)} ({combo.savingsPercent}% OFF)
          </Badge>
        ) : null}
      </div>

      {combo.endsAt ? (
        <div className="absolute right-3 top-3 z-10">
          <ComboTimer endsAt={combo.endsAt} variant="badge" />
        </div>
      ) : null}

      {/* Media Image Showcase */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-sand-100 p-4">
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
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-surface shadow-xs text-brand-900 font-bold text-xs">
                    +
                  </span>
                ) : null}
                <div className="relative h-full flex-1 overflow-hidden rounded-sm border border-line bg-surface">
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
      <div className="flex flex-1 flex-col p-5 space-y-3">
        <div className="space-y-1">
          <h3 className="font-display text-lg leading-tight text-content transition-colors group-hover:text-brand-900">
            {combo.title}
          </h3>
          {combo.description ? (
            <p className="line-clamp-2 text-xs text-content-muted leading-relaxed">
              {combo.description}
            </p>
          ) : null}
        </div>

        {/* Included Items Pill List */}
        <div className="space-y-1 text-xs">
          <p className="font-semibold text-content-subtle uppercase tracking-wider text-[10px]">
            Includes {combo.items.length} Items:
          </p>
          <ul className="divide-y divide-line/60 rounded border border-line/60 bg-sand-50/50 p-2 text-content-muted">
            {combo.items.map((item) => (
              <li key={item.id} className="flex items-center justify-between py-1 text-xs">
                <span className="truncate pr-2 font-medium">
                  {item.quantity > 1 ? `${item.quantity}× ` : ""}
                  {item.productName}
                  {item.variantTitle ? ` (${item.variantTitle})` : ""}
                </span>
                <span className="shrink-0 text-content-subtle line-through">
                  {formatPrice(item.pricePaise * item.quantity)}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Pricing & Stock indicator */}
        <div className="pt-1 mt-auto space-y-2">
          <div className="flex items-baseline justify-between">
            <div>
              <span className="text-xl font-bold text-brand-950">
                {formatPrice(combo.comboPricePaise)}
              </span>
              {combo.originalTotalPaise > combo.comboPricePaise ? (
                <span className="ml-2 text-sm text-content-subtle line-through">
                  {formatPrice(combo.originalTotalPaise)}
                </span>
              ) : null}
            </div>

            {/* Live Stock Counter */}
            {!soldOut && combo.availableStock <= 10 ? (
              <span className="flex items-center gap-1 text-xs font-medium text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                <Flame className="size-3 text-amber-600 animate-bounce" />
                Only {combo.availableStock} left!
              </span>
            ) : null}
          </div>

          <Button
            type="button"
            onClick={handleAddCombo}
            disabled={pending || soldOut}
            className="w-full bg-brand-900 hover:bg-brand-950 text-white font-medium"
          >
            {added ? (
              <>
                <Check className="size-4 mr-1 text-gold-400" />
                Combo Added to Bag
              </>
            ) : soldOut ? (
              "Sold Out"
            ) : (
              <>
                <ShoppingBag className="size-4 mr-1" />
                Buy Combo ({formatPrice(combo.comboPricePaise)})
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
