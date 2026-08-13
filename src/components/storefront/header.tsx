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

  // Five is what fits either side of a centred logo at 1280px without the
  // labels wrapping. Everything else lives in the footer and the mobile drawer.
  const primaryNav = categories.filter((c) => c.isFeatured).slice(0, 5);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/95 backdrop-blur-sm supports-[backdrop-filter]:bg-surface/80">
      <div className="u-container">
        <div className="flex h-16 items-center justify-between gap-4 lg:h-[5.5rem]">
          {/* Mobile: menu ------------------------------------------------- */}
          <div className="flex flex-1 items-center gap-1 lg:hidden">
            <MobileNav categories={categories} collections={collections} />
          </div>

          {/* Desktop: primary navigation ---------------------------------- */}
          <nav
            aria-label="Primary"
            className="hidden flex-1 items-center gap-5 lg:flex xl:gap-7"
          >
            <Link
              href="/shop"
              className="u-eyebrow whitespace-nowrap text-content transition-colors hover:text-[var(--color-accent)]"
            >
              All Jewellery
            </Link>
            {primaryNav.map((category) => (
              <NavItem key={category.id} category={category} />
            ))}
          </nav>

          {/* Logo ---------------------------------------------------------- */}
          <div className="flex shrink-0 justify-center px-4 lg:flex-none">
            <Logo size="md" />
          </div>

          {/* Actions ------------------------------------------------------- */}
          <div className="flex flex-1 items-center justify-end gap-0.5 sm:gap-1">
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
}: {
  category: Awaited<ReturnType<typeof getCategoryTree>>[number];
}) {
  const hasChildren = category.children.length > 0;

  if (!hasChildren) {
    return (
      <Link
        href={`/category/${category.slug}`}
        className="u-eyebrow whitespace-nowrap text-content transition-colors hover:text-[var(--color-accent)]"
      >
        {category.name}
      </Link>
    );
  }

  return (
    <div className="group/nav relative">
      <Link
        href={`/category/${category.slug}`}
        className="u-eyebrow inline-flex items-center whitespace-nowrap py-2 text-content transition-colors hover:text-[var(--color-accent)]"
      >
        {category.name}
      </Link>

      <div
        className={cn(
          "invisible absolute left-1/2 top-full z-50 w-56 -translate-x-1/2 pt-2 opacity-0",
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
