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
 * Styled with the brand's signature Pine Emerald Teal Green background (bg-brand-900)
 * so the official logo and navigation items pop cleanly with high contrast.
 */
export async function Header() {
  const [categories, collections] = await Promise.all([
    getCategoryTree(),
    getCollections(true),
  ]);

  const primaryNav = categories.filter((c) => c.isFeatured).slice(0, 8);
  const ALWAYS_VISIBLE = 4;

  return (
    <header className="sticky top-0 z-40 border-b border-brand-950/80 bg-brand-900 text-sand-50 shadow-md backdrop-blur-sm">
      <div className="u-container">
        <div className="flex h-16 items-center gap-3 lg:h-20 lg:gap-8">
          {/* Mobile: menu ------------------------------------------------- */}
          <div className="lg:hidden">
            <MobileNav categories={categories} collections={collections} />
          </div>

          {/* Logo ---------------------------------------------------------- */}
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
              href="/combos"
              className="u-eyebrow whitespace-nowrap text-gold-300 font-semibold transition-colors hover:text-white"
            >
              Combo Offers
            </Link>
            <Link
              href="/shop?sort=popular"
              className="u-eyebrow whitespace-nowrap text-sand-100 font-medium transition-colors hover:text-gold-300"
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

  if (!hasChildren) {
    return (
      <Link
        href={`/category/${category.slug}`}
        className={cn(
          "u-eyebrow whitespace-nowrap text-sand-100 font-medium transition-colors hover:text-gold-300",
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
        className="u-eyebrow inline-flex items-center whitespace-nowrap py-2 text-sand-100 font-medium transition-colors hover:text-gold-300"
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
