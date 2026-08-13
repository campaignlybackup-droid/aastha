"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, Minus, Plus, ShoppingBag } from "lucide-react";

import { Button } from "@/components/ui/button";
import { notifyCartUpdated } from "@/components/storefront/cart-badge";
import { Alert, Badge, Price } from "@/components/ui/primitives";
import { addToCart } from "@/server/actions/cart";
import { trackAddToCart } from "@/lib/analytics/events";
import { cn } from "@/lib/utils";

export type PurchaseVariant = {
  id: string;
  title: string;
  options: Record<string, string>;
  pricePaise: number;
  mrpPaise: number;
  available: number;
  isLowStock: boolean;
};

/**
 * Variant selection + add to bag.
 *
 * One selector per option dimension is derived from the variants themselves,
 * so a product with Size only renders one row and a product with Size + Finish
 * renders two — without any per-product configuration.
 */
export function PurchasePanel({
  productId,
  productName,
  categoryName,
  variants,
  freeShippingAbovePaise,
}: {
  productId: string;
  productName: string;
  categoryName: string;
  variants: PurchaseVariant[];
  freeShippingAbovePaise: number;
}) {
  const router = useRouter();

  // Default to the first variant that is actually purchasable.
  const [selectedId, setSelectedId] = React.useState(
    () => (variants.find((v) => v.available > 0) ?? variants[0])?.id,
  );
  const [requestedQuantity, setQuantity] = React.useState(1);
  const [pending, startTransition] = React.useTransition();
  const [feedback, setFeedback] = React.useState<{
    tone: "success" | "danger";
    message: string;
  } | null>(null);

  const selected = variants.find((v) => v.id === selectedId) ?? variants[0];

  // Option dimensions, in the order they appear on the first variant.
  const dimensions = React.useMemo(() => {
    const keys: string[] = [];
    for (const variant of variants) {
      for (const key of Object.keys(variant.options)) {
        if (!keys.includes(key)) keys.push(key);
      }
    }
    return keys.map((key) => ({
      key,
      values: [
        ...new Set(variants.map((v) => v.options[key]).filter(Boolean)),
      ],
    }));
  }, [variants]);

  const maxQuantity = Math.max(1, Math.min(selected?.available ?? 1, 10));

  // Clamp during render rather than syncing state in an effect: switching to a
  // lower-stock variant must never leave an impossible quantity on screen,
  // even for one frame.
  const quantity = Math.min(requestedQuantity, maxQuantity);

  const soldOut = !selected || selected.available <= 0;

  function onAdd(thenGoToCheckout: boolean) {
    if (!selected || soldOut) return;
    setFeedback(null);

    startTransition(async () => {
      const result = await addToCart({ variantId: selected.id, quantity });

      if (!result.ok) {
        setFeedback({ tone: "danger", message: result.error });
        return;
      }

      trackAddToCart({
        productId,
        productName,
        categoryName,
        variantId: selected.id,
        quantity,
        pricePaise: selected.pricePaise,
      });

      setFeedback({
        tone: "success",
        message: result.message ?? "Added to your bag.",
      });

      // The header badge is client-rendered, so push it the fresh count
      // directly rather than making it refetch.
      notifyCartUpdated(result.cart.itemCount);

      if (thenGoToCheckout) router.push("/checkout");
    });
  }

  const awayFromFreeShipping =
    selected && selected.pricePaise * quantity < freeShippingAbovePaise
      ? freeShippingAbovePaise - selected.pricePaise * quantity
      : 0;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Price
          pricePaise={selected?.pricePaise ?? 0}
          mrpPaise={selected?.mrpPaise}
          size="lg"
        />
        <p className="text-xs text-content-subtle">
          Inclusive of all taxes · Free shipping above ₹
          {(freeShippingAbovePaise / 100).toLocaleString("en-IN")}
        </p>
      </div>

      {/* Variant selectors ------------------------------------------------ */}
      {dimensions.map((dimension) => (
        <fieldset key={dimension.key}>
          <legend className="u-eyebrow mb-2.5 text-content-muted">
            {dimension.key}
            {selected?.options[dimension.key] ? (
              <span className="ml-2 normal-case tracking-normal text-content">
                {selected.options[dimension.key]}
              </span>
            ) : null}
          </legend>

          <div className="flex flex-wrap gap-2">
            {dimension.values.map((value) => {
              // Find the variant this value would select, holding the other
              // dimensions at their current values where possible.
              const candidate =
                variants.find(
                  (v) =>
                    v.options[dimension.key] === value &&
                    dimensions
                      .filter((d) => d.key !== dimension.key)
                      .every(
                        (d) =>
                          v.options[d.key] === selected?.options[d.key],
                      ),
                ) ?? variants.find((v) => v.options[dimension.key] === value);

              const isSelected = selected?.options[dimension.key] === value;
              const unavailable = !candidate || candidate.available <= 0;

              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => candidate && setSelectedId(candidate.id)}
                  disabled={!candidate}
                  aria-pressed={isSelected}
                  className={cn(
                    "min-w-12 rounded-xs border px-3.5 py-2 text-sm transition-colors",
                    isSelected
                      ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-[var(--color-accent-contrast)]"
                      : "border-line-strong text-content hover:border-[var(--color-accent)]",
                    // Out-of-stock options stay selectable so the customer can
                    // see the price and stock message rather than being
                    // silently blocked.
                    unavailable && !isSelected && "text-content-subtle line-through",
                  )}
                >
                  {value}
                </button>
              );
            })}
          </div>
        </fieldset>
      ))}

      {/* Stock ------------------------------------------------------------ */}
      <div aria-live="polite">
        {soldOut ? (
          <Badge variant="neutral" size="md">
            Out of stock
          </Badge>
        ) : selected.isLowStock ? (
          <Badge variant="warning" size="md">
            Only {selected.available} left
          </Badge>
        ) : (
          <Badge variant="success" size="md">
            In stock · dispatched in 48 hours
          </Badge>
        )}
      </div>

      {/* Quantity + CTAs --------------------------------------------------- */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="inline-flex items-center rounded-sm border border-line-strong">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              disabled={quantity <= 1 || soldOut}
              aria-label="Decrease quantity"
              className="inline-flex size-11 items-center justify-center text-content transition-colors hover:text-[var(--color-accent)] disabled:opacity-35"
            >
              <Minus className="size-4" aria-hidden="true" />
            </button>
            <span
              className="w-10 text-center text-sm tabular-nums"
              aria-live="polite"
              aria-label={`Quantity ${quantity}`}
            >
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.min(maxQuantity, q + 1))}
              disabled={quantity >= maxQuantity || soldOut}
              aria-label="Increase quantity"
              className="inline-flex size-11 items-center justify-center text-content transition-colors hover:text-[var(--color-accent)] disabled:opacity-35"
            >
              <Plus className="size-4" aria-hidden="true" />
            </button>
          </div>

          <Button
            size="lg"
            block
            disabled={soldOut}
            loading={pending}
            onClick={() => onAdd(false)}
            className="flex-1"
          >
            {!pending && <ShoppingBag aria-hidden="true" />}
            {soldOut ? "Out of stock" : "Add to bag"}
          </Button>
        </div>

        <Button
          size="lg"
          variant="secondary"
          block
          disabled={soldOut || pending}
          onClick={() => onAdd(true)}
        >
          Buy now
        </Button>
      </div>

      {feedback ? (
        <Alert variant={feedback.tone === "success" ? "success" : "danger"}>
          <span className="flex items-center gap-2">
            {feedback.tone === "success" ? (
              <Check className="size-4" aria-hidden="true" />
            ) : null}
            {feedback.message}
          </span>
        </Alert>
      ) : null}

      {!soldOut && awayFromFreeShipping > 0 ? (
        <p className="text-xs text-content-muted">
          Add ₹{(awayFromFreeShipping / 100).toLocaleString("en-IN")} more for
          free shipping.
        </p>
      ) : null}
    </div>
  );
}
