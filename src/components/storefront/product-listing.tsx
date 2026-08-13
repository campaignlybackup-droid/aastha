import Link from "next/link";
import { SearchX, SlidersHorizontal } from "lucide-react";

import { FilterPanel, MobileFilterDrawer } from "@/components/storefront/filters";
import { ProductCard, ProductGrid } from "@/components/storefront/product-card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/primitives";
import { SORT_OPTIONS, getFacets, listProducts } from "@/server/catalog";
import {
  hasActiveFilters,
  parseListingParams,
  setParamHref,
  type RawSearchParams,
} from "@/lib/search-params";
import type { CatalogFilters } from "@/server/catalog";
import { cn } from "@/lib/utils";

const PER_PAGE = 24;

/**
 * The shared catalogue listing.
 *
 * /shop, /category/[slug], /collections/[slug] and /search all render this,
 * differing only in the filters they lock in. Facet counts are computed from
 * the same filtered set the products come from, so a facet never offers a
 * combination that yields nothing.
 */
export async function ProductListing({
  pathname,
  searchParams,
  lockedFilters = {},
  /** Facets that are implied by the page and so should not be offered again. */
  hideFacets = [],
  emptyMessage,
}: {
  pathname: string;
  searchParams: RawSearchParams;
  lockedFilters?: Partial<CatalogFilters>;
  hideFacets?: Array<"category" | "purity" | "gender" | "occasion" | "stone">;
  emptyMessage?: string;
}) {
  const { filters: urlFilters, sort, page } = parseListingParams(searchParams);

  // Locked filters are applied LAST so they cannot be overridden from the URL.
  // Without this, /category/rings?category=earrings would silently show
  // earrings under the Rings heading.
  const filters: CatalogFilters = { ...urlFilters, ...lockedFilters };

  const [{ products, total, pageCount }, facets] = await Promise.all([
    listProducts({ filters, sort, page, perPage: PER_PAGE }),
    getFacets(filters),
  ]);

  const filtersActive = hasActiveFilters(searchParams);

  return (
    <div className="u-container pb-20">
      <div className="grid gap-10 lg:grid-cols-[16rem_1fr] lg:gap-14">
        {/* Desktop filters ------------------------------------------------- */}
        <aside className="hidden lg:block">
          <div className="sticky top-[calc(var(--header-height)+1.5rem)] max-h-[calc(100dvh-var(--header-height)-3rem)] overflow-y-auto pr-2">
            <FilterPanel
              pathname={pathname}
              searchParams={searchParams}
              facets={facets}
              hideFacets={hideFacets}
            />
          </div>
        </aside>

        <div>
          {/* Toolbar ------------------------------------------------------- */}
          <div className="mb-8 flex items-center justify-between gap-3 border-b border-line pb-4">
            <p className="text-sm text-content-muted" aria-live="polite">
              {total === 0
                ? "No pieces"
                : `${total} ${total === 1 ? "piece" : "pieces"}`}
            </p>

            <div className="flex items-center gap-2">
              <div className="lg:hidden">
                <MobileFilterDrawer
                  pathname={pathname}
                  searchParams={searchParams}
                  facets={facets}
                  hideFacets={hideFacets}
                  activeCount={filtersActive ? 1 : 0}
                >
                  <SlidersHorizontal className="size-4" aria-hidden="true" />
                  Filter
                </MobileFilterDrawer>
              </div>

              <SortMenu
                pathname={pathname}
                searchParams={searchParams}
                current={sort}
              />
            </div>
          </div>

          {/* Results ------------------------------------------------------- */}
          {products.length === 0 ? (
            <EmptyState
              icon={SearchX}
              title="Nothing here yet"
              description={
                emptyMessage ??
                (filtersActive
                  ? "No pieces match these filters. Try removing one."
                  : "There are no pieces in this section right now.")
              }
              action={
                filtersActive ? (
                  <Button asChild variant="outline">
                    <Link href={pathname}>Clear all filters</Link>
                  </Button>
                ) : (
                  <Button asChild variant="outline">
                    <Link href="/shop">Browse all jewellery</Link>
                  </Button>
                )
              }
            />
          ) : (
            <>
              <ProductGrid columns={3}>
                {products.map((product, index) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    priority={index < 3}
                    sizes="(min-width: 1280px) 26vw, (min-width: 768px) 30vw, 45vw"
                  />
                ))}
              </ProductGrid>

              {pageCount > 1 ? (
                <Pagination
                  pathname={pathname}
                  searchParams={searchParams}
                  page={page}
                  pageCount={pageCount}
                />
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Sort control.
 *
 * Rendered as links rather than a <select> + JS handler so it works without
 * client JavaScript and each sort order gets a real, crawlable URL.
 */
function SortMenu({
  pathname,
  searchParams,
  current,
}: {
  pathname: string;
  searchParams: RawSearchParams;
  current: string;
}) {
  return (
    <div className="group relative">
      <button
        type="button"
        className="inline-flex h-9 items-center gap-1.5 rounded-xs border border-line-strong px-3 text-xs text-content transition-colors hover:border-[var(--color-accent)]"
        aria-haspopup="true"
      >
        Sort:{" "}
        <span className="font-medium">
          {SORT_OPTIONS.find((o) => o.value === current)?.label ?? "Relevance"}
        </span>
      </button>

      <div className="invisible absolute right-0 top-full z-30 w-52 pt-1 opacity-0 transition-[opacity,visibility] group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
        <ul className="border border-line bg-surface-raised py-1 shadow-[var(--shadow-raised)]">
          {SORT_OPTIONS.map((option) => (
            <li key={option.value}>
              <Link
                href={setParamHref(pathname, searchParams, "sort", option.value)}
                className={cn(
                  "block px-3.5 py-2 text-sm transition-colors hover:bg-sand-50",
                  option.value === current
                    ? "text-[var(--color-accent)]"
                    : "text-content-muted",
                )}
                aria-current={option.value === current}
              >
                {option.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Pagination({
  pathname,
  searchParams,
  page,
  pageCount,
}: {
  pathname: string;
  searchParams: RawSearchParams;
  page: number;
  pageCount: number;
}) {
  // Window of pages around the current one, always including first and last.
  const pages = new Set<number>([1, pageCount, page - 1, page, page + 1]);
  const visible = [...pages]
    .filter((p) => p >= 1 && p <= pageCount)
    .sort((a, b) => a - b);

  return (
    <nav
      aria-label="Pagination"
      className="mt-14 flex items-center justify-center gap-1.5"
    >
      {page > 1 ? (
        <Link
          href={setParamHref(pathname, searchParams, "page", String(page - 1), {
            resetPage: false,
          })}
          rel="prev"
          className="inline-flex h-9 items-center rounded-xs border border-line-strong px-3 text-xs transition-colors hover:border-[var(--color-accent)]"
        >
          Previous
        </Link>
      ) : null}

      {visible.map((p, index) => (
        <span key={p} className="flex items-center gap-1.5">
          {index > 0 && p - visible[index - 1] > 1 ? (
            <span className="px-1 text-xs text-content-subtle" aria-hidden="true">
              …
            </span>
          ) : null}
          <Link
            href={setParamHref(pathname, searchParams, "page", String(p), {
              resetPage: false,
            })}
            aria-current={p === page ? "page" : undefined}
            className={cn(
              "inline-flex size-9 items-center justify-center rounded-xs border text-xs transition-colors",
              p === page
                ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-[var(--color-accent-contrast)]"
                : "border-line-strong hover:border-[var(--color-accent)]",
            )}
          >
            {p}
          </Link>
        </span>
      ))}

      {page < pageCount ? (
        <Link
          href={setParamHref(pathname, searchParams, "page", String(page + 1), {
            resetPage: false,
          })}
          rel="next"
          className="inline-flex h-9 items-center rounded-xs border border-line-strong px-3 text-xs transition-colors hover:border-[var(--color-accent)]"
        >
          Next
        </Link>
      ) : null}
    </nav>
  );
}
