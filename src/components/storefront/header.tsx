import Link from "next/link";
import { ChevronDown, Heart, Search, User } from "lucide-react";

import { CartBadge } from "@/components/storefront/cart-badge";
import { Logo } from "@/components/storefront/logo";
import { MobileNav } from "@/components/storefront/mobile-nav";
import { SearchTrigger } from "@/components/storefront/search-dialog";
import { getCategoryTree, getCollections, type CategoryNode } from "@/server/catalog";
import { cn } from "@/lib/utils";

/**
 * Storefront header.
 *
 * Styled with the brand's signature Pine Emerald Teal Green background (bg-brand-900).
 * Displays all categories cleanly in the main navbar with mouse hover subcategory dropdowns.
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

  return (
    <header className="sticky top-0 z-40 border-b border-brand-950/80 bg-brand-900 text-sand-50 shadow-md backdrop-blur-sm">
      <div className="u-container">
        <div className="flex h-16 items-center gap-2 lg:h-20 lg:gap-3 xl:gap-5">
          {/* Mobile: menu ------------------------------------------------- */}
          <div className="lg:hidden">
            <MobileNav categories={categories} collections={collections} />
          </div>

          {/* Logo ---------------------------------------------------------- */}
          <div className="shrink-0 z-20 bg-brand-900 pr-1">
            <Logo size="sm" align="left" className="lg:hidden" />
            <Logo size="md" align="left" className="hidden lg:flex" />
          </div>

          {/* Desktop: primary navigation (renders ALL categories cleanly with hover subcategories) */}
          <nav
            aria-label="Primary"
            className="hidden min-w-0 flex-1 items-center justify-start gap-1.5 sm:gap-2 lg:gap-2.5 xl:gap-3.5 2xl:gap-4.5 lg:flex"
          >
            {hasActiveCombos ? (
              <Link
                href="/combos"
                className="u-eyebrow whitespace-nowrap text-gold-300 font-semibold text-[9.5px] lg:text-[10px] xl:text-[10.5px] 2xl:text-[11px] tracking-tight xl:tracking-wider transition-colors hover:text-white shrink-0 py-2"
              >
                Combo Offers
              </Link>
            ) : null}

            {primaryNav.map((category) => (
              <NavItem key={category.id} category={category} />
            ))}
          </nav>

          {/* Actions (100% protected from overlap with solid background & z-20) ---------------- */}
          <div className="ml-auto flex shrink-0 items-center gap-0.5 sm:gap-1 bg-brand-900 z-20 pl-2 sm:pl-3">
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
 * Top-level nav entry. Categories reveal a subcategory dropdown panel on mouse hover.
 */
function NavItem({
  category,
  className,
}: {
  category: CategoryNode;
  className?: string;
}) {
  const dbChildren = category.children || [];

  // Fallback subcategory options if specific children records aren't in DB yet
  const fallbackMap: Record<string, Array<{ name: string; href: string }>> = {
    earrings: [
      { name: "Stud Earrings", href: "/category/earrings?style=studs" },
      { name: "Jhumka Earrings", href: "/category/earrings?style=jhumka" },
      { name: "Dangler & Drop Earrings", href: "/category/earrings?style=dangler" },
      { name: "Hoop Earrings", href: "/category/earrings?style=hoops" },
    ],
    rings: [
      { name: "Solitaire Rings", href: "/category/rings?style=solitaire" },
      { name: "Statement Rings", href: "/category/rings?style=statement" },
      { name: "Adjustable Rings", href: "/category/rings?style=adjustable" },
    ],
    chains: [
      { name: "Figaro Chains", href: "/category/chains?style=figaro" },
      { name: "Rope & Box Chains", href: "/category/chains?style=rope" },
    ],
    anklets: [
      { name: "Single Anklets", href: "/category/anklets?type=single" },
      { name: "Pair Anklets", href: "/category/anklets?type=pair" },
    ],
    bracelets: [
      { name: "Chain Bracelets", href: "/category/bracelets?type=chain" },
      { name: "Cuff & Bangle Bracelets", href: "/category/bracelets?type=cuff" },
    ],
  };

  const subItems =
    dbChildren.length > 0
      ? dbChildren.map((c) => ({ name: c.name, href: `/category/${c.slug}` }))
      : fallbackMap[category.slug.toLowerCase()] || [];

  const hasSubItems = subItems.length > 0;

  const itemLinkClass =
    "u-eyebrow whitespace-nowrap text-sand-100 font-medium text-[9.5px] lg:text-[10px] xl:text-[10.5px] 2xl:text-[11px] tracking-normal lg:tracking-tight xl:tracking-wider transition-colors hover:text-gold-300 shrink-0";

  return (
    <div className={cn("group/nav relative shrink-0 py-2", className)}>
      <Link
        href={`/category/${category.slug}`}
        className={cn(
          itemLinkClass,
          "inline-flex items-center gap-1 py-1 group-hover/nav:text-gold-300",
        )}
      >
        <span>{category.name}</span>
        {hasSubItems ? (
          <ChevronDown className="size-3 text-gold-400/80 transition-transform duration-200 group-hover/nav:rotate-180 group-hover/nav:text-gold-300" />
        ) : null}
      </Link>

      {hasSubItems ? (
        <div
          className={cn(
            "invisible absolute left-0 top-full z-50 min-w-[200px] pt-1 opacity-0 pointer-events-none",
            "transition-all duration-200 transform translate-y-1",
            "group-hover/nav:visible group-hover/nav:opacity-100 group-hover/nav:translate-y-0 group-hover/nav:pointer-events-auto",
            "group-focus-within/nav:visible group-focus-within/nav:opacity-100 group-focus-within/nav:translate-y-0 group-focus-within/nav:pointer-events-auto",
          )}
        >
          <div className="rounded-md border border-brand-800/90 bg-brand-900/95 p-2 shadow-2xl backdrop-blur-md space-y-0.5">
            <Link
              href={`/category/${category.slug}`}
              className="block rounded-xs px-3 py-2 text-xs font-semibold text-gold-300 border-b border-brand-800/60 transition-colors hover:bg-brand-800 hover:text-white"
            >
              All {category.name} →
            </Link>
            {subItems.map((sub, idx) => (
              <Link
                key={idx}
                href={sub.href}
                className="block rounded-xs px-3 py-1.5 text-xs text-sand-100 transition-colors hover:bg-brand-800 hover:text-gold-300"
              >
                {sub.name}
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
