import Link from "next/link";
import { Heart, Search, User } from "lucide-react";

import { CartBadge } from "@/components/storefront/cart-badge";
import { Logo } from "@/components/storefront/logo";
import { MobileNav } from "@/components/storefront/mobile-nav";
import { SearchTrigger } from "@/components/storefront/search-dialog";
import { getCategoryTree, getCollections } from "@/server/catalog";
import { cn } from "@/lib/utils";

/**
 * Storefront header.
 *
 * Logo sits top-left, nav runs beside it, actions sit right. A centred logo
 * splits the nav into two halves and leaves neither enough width — that is
 * what made longer labels wrap. Anchoring left gives the nav one continuous
 * run and room for more categories.
 *
 * Server component: the category tree and collections come from the database
 * so the navigation reflects whatever the admin has configured, with no
 * hard-coded menu. Only the interactive pieces (mobile drawer, search overlay)
 * are client components.
 */
export async function Header() {
  const [categories, collections] = await Promise.all([
    getCategoryTree(),
    getCollections(true),
  ]);

  // Four category links fit comfortably at lg; any additional featured links
  // are revealed at xl. Every category remains available in the mobile drawer.
  const primaryNav = categories.filter((c) => c.isFeatured).slice(0, 8);
  const ALWAYS_VISIBLE = 4;

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/95 backdrop-blur-sm supports-[backdrop-filter]:bg-surface/80">
      <div className="u-container">
        <div className="flex h-16 items-center gap-3 lg:h-20 lg:gap-8">
          {/* Mobile: menu ------------------------------------------------- */}
          <div className="lg:hidden">
            <MobileNav categories={categories} collections={collections} />
          </div>

          {/* Logo ----------------------------------------------------------
              Two renders rather than a responsive size prop: the wordmark's
              letter-spacing is tuned per size, so it needs the discrete step
              rather than a fluid one. Only one is ever in the layout. */}
          <div className="shrink-0">
            <Logo size="sm" align="left" className="lg:hidden" />
            <Logo size="md" align="left" className="hidden lg:flex" />
          </div>

          {/* Desktop: primary navigation ----------------------------------- */}
          <nav
            aria-label="Primary"
            className="hidden min-w-0 flex-1 items-center gap-4 lg:flex xl:gap-5"
          >
            <Link
              href="/shop?sort=popular"
              className="u-eyebrow whitespace-nowrap text-content transition-colors hover:text-[var(--color-accent)]"
            >
              Best Selling
            </Link>
            {primaryNav.map((category, index) => (
              <NavItem
                key={category.id}
                category={category}
                className={
                  index >= ALWAYS_VISIBLE ? "hidden xl:block" : undefined
                }
              />
            ))}
          </nav>

          {/* Actions ------------------------------------------------------- */}
          <div className="ml-auto flex shrink-0 items-center gap-0.5 sm:gap-1">
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
              <Heart className="size-[1.15rem]" aria-hidden="true" />
            </Link>

            <CartBadge className={cn(actionClass, "relative")} />
          </div>
        </div>
      </div>
    </header>
  );
}

const actionClass =
  "inline-flex size-10 items-center justify-center rounded-sm text-content transition-colors hover:bg-sand-100 hover:text-[var(--color-accent)]";

/**
 * A top-level nav entry. Categories with children reveal a panel on hover and
 * on focus — hover alone would make the submenu unreachable by keyboard.
 */
function NavItem({
  category,
  className,
}: {
  category: Awaited<ReturnType<typeof getCategoryTree>>[number];
  className?: string;
}) {
  const hasChildren = category.children.length > 0;

  if (!hasChildren) {
    return (
      <Link
        href={`/category/${category.slug}`}
        className={cn(
          "u-eyebrow whitespace-nowrap text-content transition-colors hover:text-[var(--color-accent)]",
          className,
        )}
      >
        {category.name}
      </Link>
    );
  }

  return (
    <div className={cn("group/nav relative", className)}>
      <Link
        href={`/category/${category.slug}`}
        className="u-eyebrow inline-flex items-center whitespace-nowrap py-2 text-content transition-colors hover:text-[var(--color-accent)]"
      >
        {category.name}
      </Link>

      <div
        className={cn(
          // Left-aligned to its trigger rather than centred: the first nav item
          // sits near the page gutter, and a centred panel would overflow it.
          "invisible absolute left-0 top-full z-50 w-56 pt-2 opacity-0",
          "transition-[opacity,visibility] duration-200",
          "group-hover/nav:visible group-hover/nav:opacity-100",
          "group-focus-within/nav:visible group-focus-within/nav:opacity-100",
        )}
      >
        <div className="border border-line bg-surface-raised p-2 shadow-[var(--shadow-raised)]">
          <Link
            href={`/category/${category.slug}`}
            className="block px-3 py-2 text-sm text-content-muted transition-colors hover:bg-sand-50 hover:text-[var(--color-accent)]"
          >
            All {category.name}
          </Link>
          {category.children.map((child) => (
            <Link
              key={child.slug}
              href={`/category/${child.slug}`}
              className="block px-3 py-2 text-sm text-content transition-colors hover:bg-sand-50 hover:text-[var(--color-accent)]"
            >
              {child.name}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
