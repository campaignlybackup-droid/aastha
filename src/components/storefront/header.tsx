import Link from "next/link";
import { ChevronDown, Heart, Search, User } from "lucide-react";

import { CartBadge } from "@/components/storefront/cart-badge";
import { Logo } from "@/components/storefront/logo";
import { MobileNav } from "@/components/storefront/mobile-nav";
import { SearchTrigger } from "@/components/storefront/search-dialog";
import { getCategoryTree, getCollections } from "@/server/catalog";
import { cn } from "@/lib/utils";

/**
 * Storefront header.
 *
 * Dynamic responsive navbar that automatically scales font sizes, letter spacing,
 * gaps, and responsive "More" dropdowns based on category count so icons never overlap.
 */
export async function Header({
  hasActiveCombos = false,
}: {
  hasActiveCombos?: boolean;
}) {
  const [categories, collections] = await Promise.all([
    getCategoryTree(),
    getCollections(true),
  ]);

  const featuredCategories = categories.filter((c) => c.isFeatured);
  const primaryNav = featuredCategories.length > 0 ? featuredCategories : categories;

  // Responsive slicing:
  // lg (1024px-1279px): 4 categories + (Combo if active)
  // xl (1280px-1535px): 6 categories + (Combo if active)
  // 2xl (1536px+): all categories up to 9
  const lgVisibleCount = hasActiveCombos ? 3 : 4;
  const xlVisibleCount = hasActiveCombos ? 5 : 6;

  const lgMore = primaryNav.slice(lgVisibleCount);
  const xlMore = primaryNav.slice(xlVisibleCount);

  return (
    <header className="sticky top-0 z-40 border-b border-brand-950/80 bg-brand-900 text-sand-50 shadow-md backdrop-blur-sm">
      <div className="u-container">
        <div className="flex h-16 items-center gap-2 lg:h-20 lg:gap-4 xl:gap-6">
          {/* Mobile: menu ------------------------------------------------- */}
          <div className="lg:hidden">
            <MobileNav categories={categories} collections={collections} />
          </div>

          {/* Logo ---------------------------------------------------------- */}
          <div className="shrink-0 z-20 bg-brand-900 pr-1">
            <Logo size="sm" align="left" className="lg:hidden" />
            <Logo size="md" align="left" className="hidden lg:flex" />
          </div>

          {/* Desktop: primary navigation ----------------------------------- */}
          <nav
            aria-label="Primary"
            className="hidden min-w-0 flex-1 items-center justify-start overflow-hidden gap-1.5 sm:gap-2.5 lg:gap-3 xl:gap-4 2xl:gap-5 lg:flex"
          >
            {hasActiveCombos ? (
              <Link
                href="/combos"
                className="u-eyebrow whitespace-nowrap text-gold-300 font-semibold text-[10px] lg:text-[10.5px] xl:text-[11px] tracking-tight xl:tracking-wider transition-colors hover:text-white shrink-0"
              >
                Combo Offers
              </Link>
            ) : null}

            {primaryNav.map((category, index) => {
              // Hide beyond lg threshold on lg screen, beyond xl threshold on xl screen
              const visibilityClass =
                index < lgVisibleCount
                  ? "block"
                  : index < xlVisibleCount
                  ? "hidden xl:block"
                  : "hidden 2xl:block";

              return (
                <NavItem
                  key={category.id}
                  category={category}
                  className={visibilityClass}
                />
              );
            })}

            {/* Responsive "More" Dropdown on lg screens (visible when items hidden) */}
            {lgMore.length > 0 ? (
              <div className="group/more relative hidden lg:block xl:hidden shrink-0">
                <button
                  type="button"
                  className="u-eyebrow inline-flex items-center gap-1 whitespace-nowrap py-2 text-gold-300 font-semibold text-[10px] tracking-tight hover:text-white transition-colors"
                >
                  <span>MORE</span>
                  <ChevronDown className="size-3 transition-transform group-hover/more:rotate-180" />
                </button>
                <div className="invisible absolute left-0 top-full z-50 w-52 pt-2 opacity-0 transition-[opacity,visibility] duration-200 group-hover/more:visible group-hover/more:opacity-100 group-focus-within/more:visible group-focus-within/more:opacity-100">
                  <div className="rounded-sm border border-brand-800 bg-brand-900 p-2 shadow-2xl space-y-0.5">
                    {lgMore.map((cat) => (
                      <Link
                        key={cat.id}
                        href={`/category/${cat.slug}`}
                        className="block rounded-xs px-3 py-2 text-xs font-medium text-sand-100 transition-colors hover:bg-brand-800 hover:text-gold-300"
                      >
                        {cat.name}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}

            {/* Responsive "More" Dropdown on xl screens */}
            {xlMore.length > 0 ? (
              <div className="group/more relative hidden xl:block 2xl:hidden shrink-0">
                <button
                  type="button"
                  className="u-eyebrow inline-flex items-center gap-1 whitespace-nowrap py-2 text-gold-300 font-semibold text-[10.5px] tracking-wider hover:text-white transition-colors"
                >
                  <span>MORE</span>
                  <ChevronDown className="size-3 transition-transform group-hover/more:rotate-180" />
                </button>
                <div className="invisible absolute left-0 top-full z-50 w-52 pt-2 opacity-0 transition-[opacity,visibility] duration-200 group-hover/more:visible group-hover/more:opacity-100 group-focus-within/more:visible group-focus-within/more:opacity-100">
                  <div className="rounded-sm border border-brand-800 bg-brand-900 p-2 shadow-2xl space-y-0.5">
                    {xlMore.map((cat) => (
                      <Link
                        key={cat.id}
                        href={`/category/${cat.slug}`}
                        className="block rounded-xs px-3 py-2 text-xs font-medium text-sand-100 transition-colors hover:bg-brand-800 hover:text-gold-300"
                      >
                        {cat.name}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </nav>

          {/* Actions (Guaranteed protected from overlap with solid background & z-20) ---------------- */}
          <div className="ml-auto flex shrink-0 items-center gap-0.5 sm:gap-1 bg-brand-900 z-20 pl-2">
            <SearchTrigger>
              <span className="sr-only">Search</span>
              <Search className="size-[1.15rem]" aria-hidden="true" />
            </SearchTrigger>

            <Link
              href="/account"
              className={actionClass}
              aria-label="My account"
            >
              <User className="size-[1.15rem]" aria-hidden="true" />
            </Link>

            <Link
              href="/account/wishlist"
              className={cn(actionClass, "hidden sm:inline-flex")}
              aria-label="Wishlist"
            >
              <Heart className="size-[1.15rem]" aria-label="Wishlist" />
            </Link>

            <CartBadge className={cn(actionClass, "relative")} />
          </div>
        </div>
      </div>
    </header>
  );
}

const actionClass =
  "inline-flex size-10 items-center justify-center rounded-sm text-sand-100 transition-colors hover:bg-brand-800 hover:text-gold-300";

/**
 * Top-level nav entry. Categories with children reveal a dropdown panel on hover/focus.
 */
function NavItem({
  category,
  className,
}: {
  category: Awaited<ReturnType<typeof getCategoryTree>>[number];
  className?: string;
}) {
  const hasChildren = category.children.length > 0;

  const itemLinkClass =
    "u-eyebrow whitespace-nowrap text-sand-100 font-medium text-[10px] lg:text-[10.5px] xl:text-[11px] tracking-tight xl:tracking-wider transition-colors hover:text-gold-300 shrink-0";

  if (!hasChildren) {
    return (
      <Link
        href={`/category/${category.slug}`}
        className={cn(itemLinkClass, className)}
      >
        {category.name}
      </Link>
    );
  }

  return (
    <div className={cn("group/nav relative shrink-0", className)}>
      <Link
        href={`/category/${category.slug}`}
        className={cn(itemLinkClass, "inline-flex items-center py-2")}
      >
        {category.name}
      </Link>

      <div
        className={cn(
          "invisible absolute left-0 top-full z-50 w-56 pt-2 opacity-0",
          "transition-[opacity,visibility] duration-200",
          "group-hover/nav:visible group-hover/nav:opacity-100",
          "group-focus-within/nav:visible group-focus-within/nav:opacity-100",
        )}
      >
        <div className="rounded-sm border border-brand-800 bg-brand-900 p-2 shadow-2xl">
          <Link
            href={`/category/${category.slug}`}
            className="block rounded-xs px-3 py-2 text-sm text-sand-300 transition-colors hover:bg-brand-800 hover:text-gold-300"
          >
            All {category.name}
          </Link>
          {category.children.map((child) => (
            <Link
              key={child.slug}
              href={`/category/${child.slug}`}
              className="block rounded-xs px-3 py-2 text-sm text-sand-100 transition-colors hover:bg-brand-800 hover:text-gold-300"
            >
              {child.name}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
