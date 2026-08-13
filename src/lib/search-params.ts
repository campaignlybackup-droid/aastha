import type { CatalogFilters, SortKey } from "@/server/catalog";
import type { Gender } from "@/generated/prisma/enums";

/**
 * Parses catalogue listing URLs into typed filters.
 *
 * The URL is the single source of truth for listing state — filters survive
 * refresh, back/forward and sharing, and the page stays a server component.
 * Everything is defensively parsed: a hand-edited query string must degrade to
 * "no filter", never to a crash or an unbounded query.
 */

export type ListingParams = {
  filters: CatalogFilters;
  sort: SortKey;
  page: number;
};

const VALID_SORTS: SortKey[] = [
  "relevance",
  "newest",
  "price-asc",
  "price-desc",
  "popular",
  "rating",
];

const VALID_GENDERS: Gender[] = ["WOMEN", "MEN", "UNISEX", "KIDS"];

/** Next 16 passes searchParams as a plain object of string | string[]. */
export type RawSearchParams = Record<string, string | string[] | undefined>;

function list(value: string | string[] | undefined): string[] {
  if (!value) return [];
  const values = Array.isArray(value) ? value : [value];
  return values
    .flatMap((v) => v.split(","))
    .map((v) => v.trim())
    .filter(Boolean)
    .slice(0, 20); // Cap: a 500-entry `IN` clause is someone probing.
}

function first(value: string | string[] | undefined): string | undefined {
  if (!value) return undefined;
  return Array.isArray(value) ? value[0] : value;
}

function positiveInt(
  value: string | string[] | undefined,
  fallback: number,
  max = 100_000_000,
): number {
  const raw = first(value);
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return Math.min(parsed, max);
}

export function parseListingParams(params: RawSearchParams): ListingParams {
  const sortRaw = first(params.sort) as SortKey | undefined;
  const sort = sortRaw && VALID_SORTS.includes(sortRaw) ? sortRaw : "relevance";

  // Prices arrive in rupees (readable URLs) and are stored in paise.
  const minRupees = first(params.min);
  const maxRupees = first(params.max);

  const genders = list(params.gender)
    .map((g) => g.toUpperCase() as Gender)
    .filter((g) => VALID_GENDERS.includes(g));

  return {
    sort,
    page: Math.max(1, positiveInt(params.page, 1, 5000)),
    filters: {
      categorySlugs: list(params.category),
      purities: list(params.purity),
      genders: genders.length ? genders : undefined,
      occasions: list(params.occasion),
      stoneTypes: list(params.stone),
      tags: list(params.tag),
      minPricePaise: minRupees
        ? positiveInt(minRupees, 0) * 100
        : undefined,
      maxPricePaise: maxRupees
        ? positiveInt(maxRupees, 0) * 100
        : undefined,
      inStockOnly: first(params.stock) === "in",
      query: first(params.q)?.slice(0, 120),
    },
  };
}

/**
 * Builds a listing URL with one facet toggled, preserving everything else and
 * resetting pagination — page 4 of the old filter set is meaningless.
 */
export function toggleFacetHref(
  pathname: string,
  current: RawSearchParams,
  key: string,
  value: string,
): string {
  const params = new URLSearchParams();

  for (const [k, v] of Object.entries(current)) {
    if (v === undefined || k === "page") continue;
    for (const item of Array.isArray(v) ? v : [v]) params.append(k, item);
  }

  const existing = params.getAll(key).flatMap((v) => v.split(","));
  const next = existing.includes(value)
    ? existing.filter((v) => v !== value)
    : [...existing, value];

  params.delete(key);
  if (next.length) params.set(key, next.join(","));

  const qs = params.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

export function setParamHref(
  pathname: string,
  current: RawSearchParams,
  key: string,
  value: string | null,
  { resetPage = true }: { resetPage?: boolean } = {},
): string {
  const params = new URLSearchParams();

  for (const [k, v] of Object.entries(current)) {
    if (v === undefined) continue;
    if (k === key) continue;
    if (resetPage && k === "page") continue;
    for (const item of Array.isArray(v) ? v : [v]) params.append(k, item);
  }

  if (value !== null && value !== "") params.set(key, value);

  const qs = params.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

/** True when any facet is active — drives the "Clear all" affordance. */
export function hasActiveFilters(params: RawSearchParams): boolean {
  return ["category", "purity", "gender", "occasion", "stone", "tag", "min", "max", "stock"].some(
    (key) => Boolean(params[key]),
  );
}
