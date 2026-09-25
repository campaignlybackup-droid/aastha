"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Minus, Plus, Ruler, ShoppingBag } from "lucide-react";

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

function isGenericTitle(title: string): boolean {
  const t = (title || "").trim().toLowerCase();
  return !t || t === "standard" || t === "default title" || t === "default";
}

function inferDimensionLabel(
  variants: PurchaseVariant[],
  categoryName: string,
  productName: string,
): string {
  const isRing = /ring/i.test(categoryName) || /ring/i.test(productName);
  const isBangleOrBracelet =
    /bangle|bracelet|kada/i.test(categoryName) ||
    /bangle|bracelet|kada/i.test(productName);
  const isChainOrNecklace =
    /chain|necklace|pendant|mangalsutra/i.test(categoryName) ||
    /chain|necklace|pendant|mangalsutra/i.test(productName);

  const titles = variants.map((v) => (v.title || "").toLowerCase());

  const hasSizeWord = titles.some((t) => /\bsize\b/i.test(t));
  const hasMeasurements = titles.some((t) =>
    /\b\d+\s*(mm|cm|inch|in|"|'|gauge)\b/i.test(t),
  );
  const hasNumbers = titles.some((t) => /\b\d+(\.\d+)?\b/.test(t));

  if (hasSizeWord) return "Size";
  if (hasMeasurements) {
    if (isChainOrNecklace) return "Length";
    return "Size";
  }
  if ((isRing || isBangleOrBracelet) && hasNumbers) return "Size";

  const commonGems = [
    "garnet",
    "topaz",
    "amethyst",
    "peridot",
    "citrine",
    "quartz",
    "onyx",
    "pearl",
    "zircon",
    "ruby",
    "sapphire",
    "emerald",
    "larimar",
    "labradorite",
    "moonstone",
    "tourmaline",
    "turquoise",
    "stone",
    "gemstone",
  ];
  if (titles.some((t) => commonGems.some((g) => t.includes(g)))) {
    return "Gemstone";
  }

  if (
    titles.some((t) =>
      /silver|gold|rose gold|oxidised|polish|rhodium|plating/i.test(t),
    )
  ) {
    return "Finish";
  }

  if (titles.some((t) => /pair|single|piece|set/i.test(t))) {
    return "Option";
  }

  if (isRing) return "Size";
  if (isBangleOrBracelet) return "Size";
  if (isChainOrNecklace) return "Length";

  return "Size";
}

function formatVariantDisplay(title: string): string {
  const trimmed = (title || "").trim();
  if (!trimmed) return "Standard";

  return trimmed
    .split(/\s+/)
    .map((word) => {
      if (/^us$/i.test(word)) return "US";
      if (/^uk$/i.test(word)) return "UK";
      if (/^\d+(mm|cm|in|inch)$/i.test(word)) return word.toLowerCase();
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

/**
 * Variant selection + add to bag.
 *
 * Supports both structured dimensional options (e.g. Size + Finish) and
 * variant-level size/style variations (e.g. "Size 6", "Size 7", "4mm", "Pair")
 * so any product with variants allows seamless selection on both mobile and desktop.
 */
export function PurchasePanel({
  productId,
  productName,
  categoryName,
  variants,
  freeShippingAbovePaise,
  dispatchCopy,
}: {
  productId: string;
  productName: string;
  categoryName: string;
  variants: PurchaseVariant[];
  freeShippingAbovePaise: number;
  dispatchCopy?: string;
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

  const isRingProduct =
    /ring/i.test(categoryName ?? "") || /ring/i.test(productName ?? "");

  // Check if explicit structured options exist on any variant
  const hasStructuredOptions = React.useMemo(() => {
    return variants.some((v) => {
      const opts = v.options ?? {};
      return (
        Object.keys(opts).length > 0 &&
        Object.values(opts).some(
          (val) => typeof val === "string" && val.trim().length > 0,
        )
      );
    });
  }, [variants]);

  // Structured option dimensions (e.g. Size, Finish)
  const structuredDimensions = React.useMemo(() => {
    if (!hasStructuredOptions) return [];
    const keys: string[] = [];
    for (const variant of variants) {
      for (const key of Object.keys(variant.options ?? {})) {
        if (variant.options[key]?.trim() && !keys.includes(key)) {
          keys.push(key);
        }
      }
    }
    return keys.map((key) => {
      const rawValues = [
        ...new Set(variants.map((v) => v.options[key]).filter(Boolean)),
      ];
      // Natural sort so numeric sizes (e.g. 12, 14, 16, 18) appear in ascending order
      rawValues.sort((a, b) =>
        a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }),
      );
      return {
        key,
        values: rawValues,
      };
    });
  }, [hasStructuredOptions, variants]);

  // If no structured options are set, infer the dimension label and sort variants
  const inferredLabel = React.useMemo(() => {
    return inferDimensionLabel(variants, categoryName, productName);
  }, [variants, categoryName, productName]);

  const sortedVariants = React.useMemo(() => {
    return [...variants].sort((a, b) =>
      a.title.localeCompare(b.title, undefined, {
        numeric: true,
        sensitivity: "base",
      }),
    );
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

  const awayFromFreeShipping = 0;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Price
          pricePaise={selected?.pricePaise ?? 0}
          mrpPaise={selected?.mrpPaise}
          size="lg"
        />
        <p className="text-xs text-content-subtle">
          Inclusive of all taxes · Free Shipping on all orders
        </p>
      </div>

      {/* Variant selectors ------------------------------------------------ */}
      {hasStructuredOptions ? (
        // Case 1: Structured dimensional options (e.g. Size + Finish)
        structuredDimensions.map((dimension) => {
          const isSizeDimension = /size|length/i.test(dimension.key);
          const showSizeGuide = isSizeDimension && isRingProduct;

          return (
            <fieldset key={dimension.key} className="space-y-2.5">
              <div className="flex items-center justify-between">
                <legend className="u-eyebrow text-content-muted">
                  <span>{dimension.key}</span>
                  {selected?.options[dimension.key] ? (
                    <span className="ml-2 font-medium normal-case tracking-normal text-content">
                      {selected.options[dimension.key]}
                    </span>
                  ) : null}
                </legend>

                {showSizeGuide && (
                  <Link
                    href="/category/ring-size-guide"
                    target="_blank"
                    className="inline-flex items-center gap-1 text-xs font-medium text-content-muted transition-colors hover:text-[var(--color-accent)] underline underline-offset-4"
                  >
                    <Ruler className="size-3.5" aria-hidden="true" />
                    <span>Size guide</span>
                  </Link>
                )}
              </div>

              <div
                className="flex flex-wrap gap-2.5"
                role="radiogroup"
                aria-label={`Select ${dimension.key}`}
              >
                {dimension.values.map((value) => {
                  const candidate =
                    variants.find(
                      (v) =>
                        v.options[dimension.key] === value &&
                        structuredDimensions
                          .filter((d) => d.key !== dimension.key)
                          .every(
                            (d) =>
                              v.options[d.key] === selected?.options[d.key],
                          ),
                    ) ??
                    variants.find((v) => v.options[dimension.key] === value);

                  const isSelected = selected?.options[dimension.key] === value;
                  const unavailable = !candidate || candidate.available <= 0;

                  return (
                    <button
                      key={value}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      onClick={() => candidate && setSelectedId(candidate.id)}
                      disabled={!candidate}
                      className={cn(
                        "relative min-h-10 min-w-12 rounded-xs border px-3.5 py-2 text-sm font-medium transition-all duration-150 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2",
                        isSelected
                          ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-[var(--color-accent-contrast)] shadow-xs"
                          : "border-line-strong bg-surface text-content hover:border-[var(--color-accent)] hover:bg-sand-50 active:scale-[0.98]",
                        unavailable &&
                          !isSelected &&
                          "text-content-subtle opacity-60 line-through hover:border-line-strong",
                      )}
                    >
                      {value}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          );
        })
      ) : variants.length > 1 ? (
        // Case 2: Variants without structured options (e.g. Size 6, Size 7, Size 8, Size 9)
        <fieldset className="space-y-2.5">
          <div className="flex items-center justify-between">
            <legend className="u-eyebrow text-content-muted">
              <span>{inferredLabel}</span>
              {selected?.title ? (
                <span className="ml-2 font-medium normal-case tracking-normal text-content">
                  {formatVariantDisplay(selected.title)}
                </span>
              ) : null}
            </legend>

            {isRingProduct && /size/i.test(inferredLabel) && (
              <Link
                href="/category/ring-size-guide"
                target="_blank"
                className="inline-flex items-center gap-1 text-xs font-medium text-content-muted transition-colors hover:text-[var(--color-accent)] underline underline-offset-4"
              >
                <Ruler className="size-3.5" aria-hidden="true" />
                <span>Size guide</span>
              </Link>
            )}
          </div>

          <div
            className="flex flex-wrap gap-2.5"
            role="radiogroup"
            aria-label={`Select ${inferredLabel}`}
          >
            {sortedVariants.map((variant) => {
              const isSelected = selected?.id === variant.id;
              const unavailable = variant.available <= 0;

              return (
                <button
                  key={variant.id}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => setSelectedId(variant.id)}
                  className={cn(
                    "relative min-h-10 min-w-12 rounded-xs border px-3.5 py-2 text-sm font-medium transition-all duration-150 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2",
                    isSelected
                      ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-[var(--color-accent-contrast)] shadow-xs"
                      : "border-line-strong bg-surface text-content hover:border-[var(--color-accent)] hover:bg-sand-50 active:scale-[0.98]",
                    unavailable &&
                      !isSelected &&
                      "text-content-subtle opacity-60 line-through hover:border-line-strong",
                  )}
                >
                  {formatVariantDisplay(variant.title)}
                </button>
              );
            })}
          </div>
        </fieldset>
      ) : variants.length === 1 && !isGenericTitle(variants[0].title) ? (
        // Case 3: Single variant with specific size/option (e.g. "Size 7" or "18 inch")
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="u-eyebrow text-content-muted">
              <span>{inferredLabel}</span>
              <span className="ml-2 font-medium normal-case tracking-normal text-content">
                {formatVariantDisplay(variants[0].title)}
              </span>
            </span>

            {isRingProduct && /size/i.test(inferredLabel) && (
              <Link
                href="/category/ring-size-guide"
                target="_blank"
                className="inline-flex items-center gap-1 text-xs font-medium text-content-muted transition-colors hover:text-[var(--color-accent)] underline underline-offset-4"
              >
                <Ruler className="size-3.5" aria-hidden="true" />
                <span>Size guide</span>
              </Link>
            )}
          </div>

          <div className="flex flex-wrap gap-2.5">
            <span className="inline-flex min-h-10 min-w-12 items-center justify-center rounded-xs border border-[var(--color-accent)] bg-[var(--color-accent)] px-3.5 py-2 text-sm font-medium text-[var(--color-accent-contrast)] shadow-xs">
              {formatVariantDisplay(variants[0].title)}
            </span>
          </div>
        </div>
      ) : null}

      {/* Stock & Dispatch info --------------------------------------------- */}
      <div aria-live="polite" className="flex flex-wrap items-center gap-2">
        {soldOut ? (
          <Badge variant="neutral" size="md">
            Out of stock
          </Badge>
        ) : selected?.isLowStock ? (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Badge variant="warning" size="md">
              Only {selected.available} left
            </Badge>
            {dispatchCopy ? (
              <span className="text-content-muted leading-relaxed">
                · {dispatchCopy}
              </span>
            ) : null}
          </div>
        ) : (
          <Badge
            variant="success"
            size="md"
            className="whitespace-normal h-auto py-1 px-2.5 text-left leading-relaxed max-w-full inline-flex flex-wrap items-center gap-1.5"
          >
            <span className="font-semibold uppercase tracking-[0.08em] shrink-0">
              In stock
            </span>
            {dispatchCopy ? (
              <span className="normal-case tracking-normal font-normal text-success-800">
                · {dispatchCopy}
              </span>
            ) : null}
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
