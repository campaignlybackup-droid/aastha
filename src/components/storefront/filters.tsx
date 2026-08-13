"use client";

import * as React from "react";
import Link from "next/link";
import * as Dialog from "@radix-ui/react-dialog";
import { Check, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/money";
import {
  hasActiveFilters,
  setParamHref,
  toggleFacetHref,
  type RawSearchParams,
} from "@/lib/search-params";
import { cn } from "@/lib/utils";

type Facet = { value: string; count: number; label?: string };

export type Facets = {
  categories: Facet[];
  purities: Facet[];
  genders: Facet[];
  occasions: Facet[];
  stoneTypes: Facet[];
  priceRange: { min: number; max: number };
  total: number;
};

type HideableFacet = "category" | "purity" | "gender" | "occasion" | "stone";

const GENDER_LABELS: Record<string, string> = {
  WOMEN: "Women",
  MEN: "Men",
  UNISEX: "Unisex",
  KIDS: "Kids",
};

/**
 * Facet filters.
 *
 * Every control is an anchor to a filtered URL, not a JS state update. That
 * keeps filters shareable and crawlable, works with the back button for free,
 * and means the listing stays a server component.
 */
export function FilterPanel({
  pathname,
  searchParams,
  facets,
  hideFacets = [],
  onNavigate,
}: {
  pathname: string;
  searchParams: RawSearchParams;
  facets: Facets;
  hideFacets?: HideableFacet[];
  onNavigate?: () => void;
}) {
  const active = hasActiveFilters(searchParams);

  const selected = (key: string) => {
    const raw = searchParams[key];
    if (!raw) return [] as string[];
    return (Array.isArray(raw) ? raw : [raw]).flatMap((v) => v.split(","));
  };

  return (
    <div className="space-y-7">
      {active ? (
        <div className="flex items-center justify-between">
          <p className="u-eyebrow text-content-subtle">Filters</p>
          <Link
            href={pathname}
            onClick={onNavigate}
            className="text-xs underline underline-offset-4 hover:text-[var(--color-accent)]"
          >
            Clear all
          </Link>
        </div>
      ) : null}

      {!hideFacets.includes("category") && facets.categories.length > 1 ? (
        <FacetGroup title="Category">
          {facets.categories.map((facet) => (
            <FacetLink
              key={facet.value}
              href={toggleFacetHref(pathname, searchParams, "category", facet.value)}
              label={facet.label ?? facet.value}
              count={facet.count}
              checked={selected("category").includes(facet.value)}
              onNavigate={onNavigate}
            />
          ))}
        </FacetGroup>
      ) : null}

      <PriceFacet
        pathname={pathname}
        searchParams={searchParams}
        range={facets.priceRange}
        onNavigate={onNavigate}
      />

      {!hideFacets.includes("purity") && facets.purities.length > 1 ? (
        <FacetGroup title="Silver purity">
          {facets.purities.map((facet) => (
            <FacetLink
              key={facet.value}
              href={toggleFacetHref(pathname, searchParams, "purity", facet.value)}
              label={facet.value}
              count={facet.count}
              checked={selected("purity").includes(facet.value)}
              onNavigate={onNavigate}
            />
          ))}
        </FacetGroup>
      ) : null}

      {!hideFacets.includes("gender") && facets.genders.length > 1 ? (
        <FacetGroup title="Worn by">
          {facets.genders.map((facet) => (
            <FacetLink
              key={facet.value}
              href={toggleFacetHref(pathname, searchParams, "gender", facet.value)}
              label={GENDER_LABELS[facet.value] ?? facet.value}
              count={facet.count}
              checked={selected("gender").includes(facet.value)}
              onNavigate={onNavigate}
            />
          ))}
        </FacetGroup>
      ) : null}

      {!hideFacets.includes("occasion") && facets.occasions.length > 1 ? (
        <FacetGroup title="Occasion">
          {facets.occasions.map((facet) => (
            <FacetLink
              key={facet.value}
              href={toggleFacetHref(pathname, searchParams, "occasion", facet.value)}
              label={facet.value}
              count={facet.count}
              checked={selected("occasion").includes(facet.value)}
              onNavigate={onNavigate}
            />
          ))}
        </FacetGroup>
      ) : null}

      {!hideFacets.includes("stone") && facets.stoneTypes.length > 1 ? (
        <FacetGroup title="Stone">
          {facets.stoneTypes.map((facet) => (
            <FacetLink
              key={facet.value}
              href={toggleFacetHref(pathname, searchParams, "stone", facet.value)}
              label={facet.value}
              count={facet.count}
              checked={selected("stone").includes(facet.value)}
              onNavigate={onNavigate}
            />
          ))}
        </FacetGroup>
      ) : null}

      <FacetGroup title="Availability">
        <FacetLink
          href={setParamHref(
            pathname,
            searchParams,
            "stock",
            searchParams.stock === "in" ? null : "in",
          )}
          label="In stock only"
          checked={searchParams.stock === "in"}
          onNavigate={onNavigate}
        />
      </FacetGroup>
    </div>
  );
}

function FacetGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="border-t border-line pt-5">
      <legend className="u-eyebrow mb-3 text-content-subtle">{title}</legend>
      <ul className="space-y-0.5">{children}</ul>
    </fieldset>
  );
}

function FacetLink({
  href,
  label,
  count,
  checked,
  onNavigate,
}: {
  href: string;
  label: string;
  count?: number;
  checked: boolean;
  onNavigate?: () => void;
}) {
  return (
    <li>
      <Link
        href={href}
        onClick={onNavigate}
        // Anchors cannot carry aria-checked; role="checkbox" makes the toggle
        // semantics explicit to screen readers while keeping link behaviour.
        role="checkbox"
        aria-checked={checked}
        className="group flex items-center gap-2.5 py-1.5 text-sm text-content-muted transition-colors hover:text-[var(--color-accent)]"
      >
        <span
          className={cn(
            "flex size-4 shrink-0 items-center justify-center rounded-xs border transition-colors",
            checked
              ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-[var(--color-accent-contrast)]"
              : "border-line-strong group-hover:border-[var(--color-accent)]",
          )}
          aria-hidden="true"
        >
          {checked ? <Check className="size-3" strokeWidth={3} /> : null}
        </span>
        <span className="flex-1">{label}</span>
        {typeof count === "number" ? (
          <span className="text-xs text-content-subtle">{count}</span>
        ) : null}
      </Link>
    </li>
  );
}

/**
 * Price bands rather than a slider. Two-thumb sliders are fiddly on touch and
 * need JS to be usable at all; discrete bands are one tap and one URL.
 */
function PriceFacet({
  pathname,
  searchParams,
  range,
  onNavigate,
}: {
  pathname: string;
  searchParams: RawSearchParams;
  range: { min: number; max: number };
  onNavigate?: () => void;
}) {
  const bands = [
    { label: "Under ₹1,500", min: undefined, max: 1500 },
    { label: "₹1,500 – ₹3,000", min: 1500, max: 3000 },
    { label: "₹3,000 – ₹6,000", min: 3000, max: 6000 },
    { label: "₹6,000 – ₹12,000", min: 6000, max: 12000 },
    { label: "Over ₹12,000", min: 12000, max: undefined },
  ].filter(
    // Hide bands that cannot contain anything in the current result set.
    (band) =>
      (band.max === undefined || band.max * 100 >= range.min) &&
      (band.min === undefined || band.min * 100 <= range.max),
  );

  const currentMin = searchParams.min;
  const currentMax = searchParams.max;

  return (
    <FacetGroup title="Price">
      {bands.map((band) => {
        const isActive =
          String(band.min ?? "") === (currentMin ?? "") &&
          String(band.max ?? "") === (currentMax ?? "");

        const href = isActive
          ? setParamHref(
              setParamHref(pathname, searchParams, "min", null),
              { ...searchParams, min: undefined },
              "max",
              null,
            )
          : setParamHref(
              setParamHref(pathname, searchParams, "min", band.min ? String(band.min) : null),
              {
                ...searchParams,
                min: band.min ? String(band.min) : undefined,
              },
              "max",
              band.max ? String(band.max) : null,
            );

        return (
          <FacetLink
            key={band.label}
            href={href}
            label={band.label}
            checked={isActive}
            onNavigate={onNavigate}
          />
        );
      })}
    </FacetGroup>
  );
}

/** Bottom sheet holding the same panel on phones. */
export function MobileFilterDrawer({
  pathname,
  searchParams,
  facets,
  hideFacets,
  children,
}: {
  pathname: string;
  searchParams: RawSearchParams;
  facets: Facets;
  hideFacets?: HideableFacet[];
  activeCount?: number;
  children: React.ReactNode;
}) {
  // Closing on navigation is handled by the `onNavigate` callback passed to
  // FilterPanel below — every facet link calls it. No route-watching effect
  // is needed.
  const [open, setOpen] = React.useState(false);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger className="inline-flex h-9 items-center gap-1.5 rounded-xs border border-line-strong px-3 text-xs text-content transition-colors hover:border-[var(--color-accent)]">
        {children}
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-sand-950/40 data-[state=closed]:animate-fade-out data-[state=open]:animate-fade-in" />
        <Dialog.Content className="fixed inset-x-0 bottom-0 z-50 flex max-h-[85dvh] flex-col rounded-t-xl bg-surface data-[state=closed]:animate-slide-out-bottom data-[state=open]:animate-slide-in-bottom">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <Dialog.Title className="font-display text-xl">Filter</Dialog.Title>
            <Dialog.Close
              className="inline-flex size-9 items-center justify-center rounded-sm text-content-muted"
              aria-label="Close filters"
            >
              <X className="size-5" aria-hidden="true" />
            </Dialog.Close>
          </div>

          <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-5">
            <FilterPanel
              pathname={pathname}
              searchParams={searchParams}
              facets={facets}
              hideFacets={hideFacets}
              onNavigate={() => setOpen(false)}
            />
          </div>

          <div className="border-t border-line px-5 py-4">
            <Dialog.Close asChild>
              <Button block>
                Show {facets.total} {facets.total === 1 ? "piece" : "pieces"}
              </Button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** Chips summarising active filters, shown above the grid. */
export function ActiveFilterChips({
  pathname,
  searchParams,
}: {
  pathname: string;
  searchParams: RawSearchParams;
}) {
  const entries: Array<{ key: string; value: string; label: string }> = [];

  for (const key of ["category", "purity", "gender", "occasion", "stone"]) {
    const raw = searchParams[key];
    if (!raw) continue;
    for (const value of (Array.isArray(raw) ? raw : [raw]).flatMap((v) =>
      v.split(","),
    )) {
      entries.push({
        key,
        value,
        label: key === "gender" ? (GENDER_LABELS[value] ?? value) : value,
      });
    }
  }

  if (searchParams.min || searchParams.max) {
    const min = searchParams.min ? Number(searchParams.min) * 100 : null;
    const max = searchParams.max ? Number(searchParams.max) * 100 : null;
    entries.push({
      key: "price",
      value: "",
      label:
        min && max
          ? `${formatPrice(min)} – ${formatPrice(max)}`
          : min
            ? `Over ${formatPrice(min)}`
            : `Under ${formatPrice(max!)}`,
    });
  }

  if (!entries.length) return null;

  return (
    <ul className="mb-6 flex flex-wrap gap-2">
      {entries.map((entry) => (
        <li key={`${entry.key}-${entry.value}`}>
          <Link
            href={
              entry.key === "price"
                ? setParamHref(
                    setParamHref(pathname, searchParams, "min", null),
                    { ...searchParams, min: undefined },
                    "max",
                    null,
                  )
                : toggleFacetHref(pathname, searchParams, entry.key, entry.value)
            }
            className="inline-flex items-center gap-1.5 rounded-xs border border-line-strong px-2.5 py-1 text-xs text-content-muted transition-colors hover:border-danger-500 hover:text-danger-700"
          >
            {entry.label}
            <X className="size-3" aria-hidden="true" />
            <span className="sr-only">Remove filter</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
