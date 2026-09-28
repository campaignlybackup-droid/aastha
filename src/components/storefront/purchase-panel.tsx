"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Minus, Plus, Ruler, ShoppingBag, Sparkles } from "lucide-react";

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

export type ProductSpecsProp = {
  silverPurity?: string | null;
  silverWeightGram?: number | null;
  dimensions?: string | null;
  finish?: string | null;
  plating?: string | null;
  stoneType?: string | null;
  stoneColour?: string | null;
  stoneCount?: number | null;
  isAdjustable?: boolean | null;
  extraSpecs?: Record<string, string | number> | null;
};

export function isProductRing(
  categoryName: string,
  productName: string,
): boolean {
  const c = (categoryName || "").toLowerCase();
  const p = (productName || "").toLowerCase();
  if (
    c.includes("earring") ||
    p.includes("earring") ||
    p.includes("stud") ||
    p.includes("hoop") ||
    p.includes("silicon-ring-adjuster") ||
    p.includes("silicon ring adjuster")
  ) {
    return false;
  }
  return /\brings?\b/i.test(c) || /\brings?\b/i.test(p) || /\bband\b/i.test(p);
}

const COMMON_GEMSTONES = [
  "blue topaz",
  "yellow topaz",
  "green amethyst",
  "rose quartz",
  "rosequarts",
  "black onyx",
  "pink zircon",
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
  "lapiz",
  "lapis",
  "carnelian",
];

function extractGemstoneName(title: string): string | null {
  const lower = (title || "").toLowerCase();
  for (const gem of COMMON_GEMSTONES) {
    if (new RegExp(`\\b${gem}\\b`, "i").test(lower)) {
      if (gem === "rosequarts") return "Rose Quartz";
      if (gem === "lapiz") return "Lapis";
      return gem
        .split(" ")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(" ");
    }
  }
  return null;
}

function extractSizeFromTitle(title: string): string | null {
  const m =
    title.match(/\b(?:us\s*)?size\s*(\d+(?:\/\d+)?)\b/i) ||
    title.match(/\bsize(\d+)\b/i);
  if (m) return `Size ${m[1]}`;
  return null;
}

function isGenericTitle(title: string): boolean {
  const t = (title || "").trim().toLowerCase();
  return !t || t === "standard" || t === "default title" || t === "default";
}

function inferDimensionLabel(
  variants: PurchaseVariant[],
  categoryName: string,
  productName: string,
): string {
  const isRing = isProductRing(categoryName, productName);
  const isBangleOrBracelet =
    /bangle|bracelet|kada/i.test(categoryName) ||
    /bangle|bracelet|kada/i.test(productName);
  const isChainOrNecklace =
    /chain|necklace|pendant|mangalsutra/i.test(categoryName) ||
    /chain|necklace|pendant|mangalsutra/i.test(productName);
  const isAnklet = /anklet/i.test(categoryName) || /anklet/i.test(productName);

  const titles = variants.map((v) => (v.title || "").toLowerCase());

  const hasFinish = titles.some((t) =>
    /\b(silver|gold|gold plating|gold plated|rose gold|oxidised|polish|rhodium)\b/i.test(
      t,
    ),
  );
  const hasMeasurements = titles.some(
    (t) =>
      /\b\d+\s*(inch|in|"|cm|mm)\b/i.test(t) ||
      /^(16|18|20|22|24|7|8|9|10)$/i.test(t.trim()),
  );

  // Mixed finish and measurements (e.g. 18 vs Gold Plating)
  if (hasFinish && hasMeasurements) {
    return "Specification";
  }

  // Plating / Finish
  if (hasFinish) {
    return "Finish / Plating";
  }

  // Single / Pair
  if (titles.some((t) => /\b(pair|single|piece|set)\b/i.test(t))) {
    return "Set / Quantity";
  }

  // Length on chains, anklets, bracelets
  if (isChainOrNecklace || isAnklet || isBangleOrBracelet) {
    if (hasMeasurements) {
      return "Length";
    }
  }

  // Rings
  if (isRing) {
    const hasGems = titles.some((t) => extractGemstoneName(t) !== null);
    const hasSizes = titles.some(
      (t) => /\bsize\b/i.test(t) || extractSizeFromTitle(t) !== null,
    );
    if (hasGems) return "Gemstone";
    if (hasSizes) return "Ring Size";
    return "Ring Size";
  }

  const hasSizeWord = titles.some((t) => /\bsize\b/i.test(t));
  if (hasSizeWord) return "Size";

  const hasGems = titles.some((t) => extractGemstoneName(t) !== null);
  if (hasGems) return "Gemstone";

  return "Specification";
}

function cleanOptionTitle(title: string, inferredLabel: string): string {
  const trimmed = (title || "").trim();
  if (!trimmed) return "Standard";

  if (inferredLabel === "Finish / Plating") {
    if (/^gold\s*plat(ing|ed)$/i.test(trimmed)) return "Gold Plating";
    if (/^silver$/i.test(trimmed)) return "925 Silver";
  }

  if (inferredLabel === "Set / Quantity") {
    if (/^single(\s*(anklet|bracelet))?$/i.test(trimmed)) return "Single";
    if (/^pair(\s*(anklet|bracelet))?$/i.test(trimmed)) return "Pair";
    if (/^silver\s*single$/i.test(trimmed)) return "Silver Single";
    if (/^silver\s*pair$/i.test(trimmed)) return "Silver Pair";
  }

  // Pure numeric length or inch
  const numMatch = trimmed.match(/^(\d+)(?:\s*(?:inch|in|"))?$/i);
  if (numMatch && (inferredLabel === "Length" || inferredLabel === "Specification" || Number(numMatch[1]) >= 6)) {
    return `${numMatch[1]} Inch`;
  }

  if (inferredLabel === "Ring Size") {
    const m =
      trimmed.match(/^(?:us\s*)?size\s*(\d+(?:\/\d+)?)$/i) ||
      trimmed.match(/^size(\d+)$/i);
    if (m) return `Size ${m[1]}`;
  }

  if (inferredLabel === "Gemstone") {
    const gem = extractGemstoneName(trimmed);
    if (gem) return gem;
  }

  return formatVariantDisplay(trimmed);
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

const STANDARD_RING_SIZES = ["Size 6", "Size 7", "Size 8", "Size 9"];

/**
 * Variant selection + add to bag with comprehensive specification highlights,
 * dynamic pricing per spec, and ring size selection.
 */
export function PurchasePanel({
  productId,
  productName,
  categoryName,
  variants,
  freeShippingAbovePaise,
  dispatchCopy,
  specs,
}: {
  productId: string;
  productName: string;
  categoryName: string;
  variants: PurchaseVariant[];
  freeShippingAbovePaise: number;
  dispatchCopy?: string;
  specs?: ProductSpecsProp;
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

  const isRing = isProductRing(categoryName ?? "", productName ?? "");
  const isAdjustableRing = Boolean(
    isRing &&
      (specs?.isAdjustable ||
        /adjustable/i.test(selected?.title ?? "") ||
        /adjustable/i.test(productName ?? "")),
  );

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

  // Check if prices differ across variants
  const hasDifferingPrices = React.useMemo(() => {
    return new Set(variants.map((v) => v.pricePaise)).size > 1;
  }, [variants]);

  // Rings with gemstone variants where ring size needs selection
  const isGemstoneRing = React.useMemo(() => {
    if (!isRing || isAdjustableRing) return false;
    return variants.some((v) => extractGemstoneName(v.title) !== null);
  }, [isRing, isAdjustableRing, variants]);

  // Extract initial ring size for gemstone rings if present in variant title
  const initialRingSize = React.useMemo(() => {
    if (!isRing) return null;
    const extracted = extractSizeFromTitle(selected?.title ?? "");
    return extracted ?? "Size 7";
  }, [isRing, selected?.title]);

  const [selectedRingSize, setSelectedRingSize] = React.useState<string>(
    initialRingSize ?? "Size 7",
  );

  // If variants have multi-size gemstone combinations (e.g. Celeste ring)
  const multiSizeVariantsForCurrentStone = React.useMemo(() => {
    if (!isGemstoneRing) return [];
    const currentStone = extractGemstoneName(selected?.title ?? "");
    if (!currentStone) return [];
    return variants.filter(
      (v) =>
        extractGemstoneName(v.title)?.toLowerCase() ===
          currentStone.toLowerCase() && extractSizeFromTitle(v.title) !== null,
    );
  }, [isGemstoneRing, selected?.title, variants]);

  const sortedVariants = React.useMemo(() => {
    return [...variants].sort((a, b) => {
      if (hasDifferingPrices && a.pricePaise !== b.pricePaise) {
        return a.pricePaise - b.pricePaise;
      }
      return a.title.localeCompare(b.title, undefined, {
        numeric: true,
        sensitivity: "base",
      });
    });
  }, [hasDifferingPrices, variants]);

  const maxQuantity = Math.max(1, Math.min(selected?.available ?? 1, 10));
  const quantity = Math.min(requestedQuantity, maxQuantity);
  const soldOut = !selected || selected.available <= 0;

  function onAdd(thenGoToCheckout: boolean) {
    if (!selected || soldOut) return;
    setFeedback(null);

    // Save ring size / spec customization to sessionStorage so checkout & bag can pick it up
    if (typeof window !== "undefined") {
      try {
        const saved = JSON.parse(
          sessionStorage.getItem("asj_custom_specs") || "{}",
        );
        const ringCustomization = isRing
          ? isAdjustableRing
            ? "Adjustable Free Size"
            : isGemstoneRing
              ? selectedRingSize
              : extractSizeFromTitle(selected.title) || selected.title
          : null;

        saved[selected.id] = {
          productId,
          productName,
          variantTitle: selected.title,
          ringSize: ringCustomization,
        };
        sessionStorage.setItem("asj_custom_specs", JSON.stringify(saved));
      } catch {}
    }

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

      notifyCartUpdated(result.cart.itemCount);

      if (thenGoToCheckout) router.push("/checkout");
    });
  }

  // Handle switching ring size for gemstone rings
  function handleRingSizeChange(size: string) {
    setSelectedRingSize(size);
    // If variants actually encode different sizes for this gemstone (like Celeste ring)
    if (multiSizeVariantsForCurrentStone.length > 1) {
      const match = multiSizeVariantsForCurrentStone.find(
        (v) => extractSizeFromTitle(v.title) === size,
      );
      if (match) setSelectedId(match.id);
    }
  }

  // Check if any specifications are available to highlight
  const hasSpecs = Boolean(
    specs?.silverPurity ||
      specs?.silverWeightGram ||
      specs?.dimensions ||
      specs?.plating ||
      specs?.finish ||
      specs?.stoneType ||
      specs?.isAdjustable,
  );

  return (
    <div className="space-y-6">
      {/* Price & Taxes --------------------------------------------------- */}
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

      {/* Product Highlights & Key Specifications ------------------------- */}
      {hasSpecs && (
        <div className="flex flex-wrap items-center gap-2 pt-1 pb-1">
          {specs?.silverPurity ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-sand-300 bg-sand-100/70 px-2.5 py-1 text-xs font-medium text-content">
              <Sparkles className="size-3 text-[var(--color-accent)]" />
              {specs.silverPurity}
            </span>
          ) : null}
          {specs?.silverWeightGram ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-sand-300 bg-sand-100/70 px-2.5 py-1 text-xs font-medium text-content-muted">
              Weight:{" "}
              <span className="font-medium text-content">
                {specs.silverWeightGram}g
              </span>
            </span>
          ) : null}
          {specs?.dimensions ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-sand-300 bg-sand-100/70 px-2.5 py-1 text-xs font-medium text-content-muted">
              Dimensions:{" "}
              <span className="font-medium text-content">
                {specs.dimensions}
              </span>
            </span>
          ) : null}
          {specs?.plating ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-sand-300 bg-sand-100/70 px-2.5 py-1 text-xs font-medium text-content-muted">
              Plating:{" "}
              <span className="font-medium text-content">{specs.plating}</span>
            </span>
          ) : null}
          {specs?.finish ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-sand-300 bg-sand-100/70 px-2.5 py-1 text-xs font-medium text-content-muted">
              Finish:{" "}
              <span className="font-medium text-content">{specs.finish}</span>
            </span>
          ) : null}
          {specs?.stoneType ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-sand-300 bg-sand-100/70 px-2.5 py-1 text-xs font-medium text-content-muted">
              Stone:{" "}
              <span className="font-medium text-content capitalize">
                {specs.stoneType}
              </span>
            </span>
          ) : null}
          {specs?.isAdjustable ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800">
              <Check className="size-3 text-emerald-700" />
              Adjustable (Free Size)
            </span>
          ) : null}
        </div>
      )}

      {/* Variant selectors ------------------------------------------------ */}
      {hasStructuredOptions ? (
        // Case 1: Structured dimensional options (e.g. Size + Finish)
        structuredDimensions.map((dimension) => {
          const isSizeDimension = /size|length/i.test(dimension.key);
          const showSizeGuide = isSizeDimension && isRing && !isAdjustableRing;

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
                      <span className="flex items-center gap-1.5">
                        <span>{value}</span>
                        {hasDifferingPrices && candidate ? (
                          <span
                            className={cn(
                              "text-xs font-semibold tabular-nums",
                              isSelected
                                ? "text-[var(--color-accent-contrast)] opacity-90"
                                : "text-[var(--color-accent)]",
                            )}
                          >
                            · ₹
                            {(candidate.pricePaise / 100).toLocaleString(
                              "en-IN",
                            )}
                          </span>
                        ) : null}
                      </span>
                    </button>
                  );
                })}
              </div>
            </fieldset>
          );
        })
      ) : variants.length > 1 ? (
        // Case 2: Variants without structured options (e.g. Gemstone, Length, Set/Quantity, Size)
        <fieldset className="space-y-2.5">
          <div className="flex items-center justify-between">
            <legend className="u-eyebrow text-content-muted">
              <span>{inferredLabel}</span>
              {selected?.title ? (
                <span className="ml-2 font-medium normal-case tracking-normal text-content">
                  {cleanOptionTitle(selected.title, inferredLabel)}
                </span>
              ) : null}
            </legend>

            {isRing &&
              !isAdjustableRing &&
              /size/i.test(inferredLabel) &&
              !isGemstoneRing && (
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
              const cleanTitle = cleanOptionTitle(variant.title, inferredLabel);

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
                  <span className="flex items-center gap-1.5">
                    <span>{cleanTitle}</span>
                    {hasDifferingPrices ? (
                      <span
                        className={cn(
                          "text-xs font-semibold tabular-nums",
                          isSelected
                            ? "text-[var(--color-accent-contrast)] opacity-90"
                            : "text-[var(--color-accent)]",
                        )}
                      >
                        · ₹{(variant.pricePaise / 100).toLocaleString("en-IN")}
                      </span>
                    ) : null}
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>
      ) : variants.length === 1 &&
        !isGenericTitle(variants[0].title) &&
        !isAdjustableRing ? (
        // Case 3: Single variant with specific size/option (e.g. "Size 7" or "18 inch")
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="u-eyebrow text-content-muted">
              <span>{inferredLabel}</span>
              <span className="ml-2 font-medium normal-case tracking-normal text-content">
                {cleanOptionTitle(variants[0].title, inferredLabel)}
              </span>
            </span>

            {isRing && !isAdjustableRing && /size/i.test(inferredLabel) && (
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
              {cleanOptionTitle(variants[0].title, inferredLabel)}
            </span>
          </div>
        </div>
      ) : null}

      {/* Ring Size Customization for Rings with Gemstones ---------------- */}
      {isRing && isGemstoneRing && !isAdjustableRing && (
        <fieldset className="space-y-2.5 pt-1">
          <div className="flex items-center justify-between">
            <legend className="u-eyebrow text-content-muted">
              <span>Ring Size</span>
              <span className="ml-2 font-medium normal-case tracking-normal text-content">
                {selectedRingSize}
              </span>
            </legend>

            <Link
              href="/category/ring-size-guide"
              target="_blank"
              className="inline-flex items-center gap-1 text-xs font-medium text-content-muted transition-colors hover:text-[var(--color-accent)] underline underline-offset-4"
            >
              <Ruler className="size-3.5" aria-hidden="true" />
              <span>Size guide</span>
            </Link>
          </div>

          <div
            className="flex flex-wrap gap-2.5"
            role="radiogroup"
            aria-label="Select Ring Size"
          >
            {STANDARD_RING_SIZES.map((size) => {
              const isSelected = selectedRingSize === size;
              return (
                <button
                  key={size}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => handleRingSizeChange(size)}
                  className={cn(
                    "relative min-h-10 min-w-12 rounded-xs border px-3.5 py-2 text-sm font-medium transition-all duration-150 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2",
                    isSelected
                      ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-[var(--color-accent-contrast)] shadow-xs"
                      : "border-line-strong bg-surface text-content hover:border-[var(--color-accent)] hover:bg-sand-50 active:scale-[0.98]",
                  )}
                >
                  {size}
                </button>
              );
            })}
          </div>
        </fieldset>
      )}

      {/* Adjustable Ring Notice ------------------------------------------- */}
      {isRing && isAdjustableRing && (
        <div className="rounded-xs border border-emerald-300/80 bg-emerald-50/70 p-3 text-sm">
          <div className="flex items-center gap-2 font-medium text-emerald-900">
            <Check className="size-4 text-emerald-700" />
            <span>Adjustable Free Size</span>
          </div>
          <p className="mt-0.5 text-xs text-emerald-800">
            Gently adjustable to fit any finger size comfortably. No ring sizing
            required.
          </p>
        </div>
      )}

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

      {!soldOut && freeShippingAbovePaise > 0 ? (
        <p className="text-xs text-content-muted">
          Free Shipping on all orders.
        </p>
      ) : null}
    </div>
  );
}
