"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BadgePercent,
  Boxes,
  CalendarClock,
  ExternalLink,
  Image as ImageIcon,
  LayoutDashboard,
  LayoutTemplate,
  LogOut,
  Menu,
  Package,
  Search,
  Settings,
  ShoppingCart,
  Star,
  Tags,
  Users,
  X,
} from "lucide-react";

import { Logo } from "@/components/storefront/logo";
import { logout } from "@/server/actions/auth";
import { canAccess, type AdminArea } from "@/lib/auth/roles";
import type { Role } from "@/generated/prisma/enums";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Admin area used for the role check; omitted means "any staff". */
  area?: AdminArea;
};

const NAV: Array<{ heading: string; items: NavItem[] }> = [
  {
    heading: "Overview",
    items: [{ href: "/admin", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    heading: "Catalogue",
    items: [
      { href: "/admin/products", label: "Products", icon: Package, area: "products" },
      { href: "/admin/categories", label: "Categories", icon: Tags, area: "products" },
      { href: "/admin/collections", label: "Collections", icon: Boxes, area: "products" },
      { href: "/admin/inventory", label: "Inventory", icon: Boxes, area: "inventory" },
      { href: "/admin/media", label: "Media", icon: ImageIcon, area: "media" },
    ],
  },
  {
    heading: "Selling",
    items: [
      { href: "/admin/orders", label: "Orders", icon: ShoppingCart, area: "orders" },
      { href: "/admin/customers", label: "Customers", icon: Users, area: "customers" },
      { href: "/admin/coupons", label: "Coupons", icon: BadgePercent, area: "coupons" },
      { href: "/admin/reviews", label: "Reviews", icon: Star, area: "reviews" },
    ],
  },
  {
    heading: "Storefront",
    items: [
      { href: "/admin/homepage", label: "Homepage", icon: LayoutTemplate, area: "homepage" },
      { href: "/admin/campaigns", label: "Campaigns", icon: CalendarClock, area: "campaigns" },
      { href: "/admin/seo", label: "SEO", icon: Search, area: "seo" },
      { href: "/admin/settings", label: "Settings", icon: Settings, area: "settings" },
    ],
  },
];

export function AdminSidebar({
  role,
  user,
}: {
  role: Role;
  user: { name: string | null; mobile: string };
}) {
  const [open, setOpen] = React.useState(false);
  const pathname = usePathname();

  // Close the mobile drawer on navigation, during render so the new page is
  // never painted behind an overlay.
  const [seenPathname, setSeenPathname] = React.useState(pathname);
  if (pathname !== seenPathname) {
    setSeenPathname(pathname);
    setOpen(false);
  }

  // A Product Manager should not see Coupons at all — hiding is clearer than
  // showing a link that redirects.
  const sections = NAV.map((section) => ({
    ...section,
    items: section.items.filter((item) => !item.area || canAccess(role, item.area)),
  })).filter((section) => section.items.length > 0);

  return (
    <>
      {/* Mobile bar ------------------------------------------------------- */}
      <div className="flex items-center justify-between border-b border-line bg-surface-raised px-4 py-3 lg:hidden">
        <Logo size="sm" />
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open admin menu"
          className="inline-flex size-10 items-center justify-center rounded-sm text-content"
        >
          <Menu className="size-5" aria-hidden="true" />
        </button>
      </div>

      {open ? (
        <div
          className="fixed inset-0 z-40 bg-sand-950/40 lg:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      ) : null}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-line bg-surface-raised transition-transform lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <Logo size="sm" />
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close admin menu"
            className="inline-flex size-8 items-center justify-center rounded-sm text-content-muted lg:hidden"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        <nav
          aria-label="Admin"
          className="flex-1 space-y-6 overflow-y-auto px-3 py-5"
        >
          {sections.map((section) => (
            <div key={section.heading}>
              <p className="u-eyebrow mb-2 px-2 text-content-subtle">
                {section.heading}
              </p>
              <ul className="space-y-0.5">
                {section.items.map((item) => {
                  const active =
                    item.href === "/admin"
                      ? pathname === "/admin"
                      : pathname.startsWith(item.href);

                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "flex items-center gap-2.5 rounded-sm px-2.5 py-2 text-sm transition-colors",
                          active
                            ? "bg-brand-800 text-sand-50"
                            : "text-content-muted hover:bg-sand-100 hover:text-content",
                        )}
                      >
                        <item.icon className="size-4 shrink-0" />
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="space-y-1 border-t border-line px-3 py-4">
          <p className="px-2.5 pb-2 text-xs text-content-subtle">
            <span className="block text-content">{user.name ?? "Staff"}</span>
            {role.replace(/_/g, " ").toLowerCase()}
          </p>

          <Link
            href="/"
            target="_blank"
            className="flex items-center gap-2.5 rounded-sm px-2.5 py-2 text-sm text-content-muted transition-colors hover:bg-sand-100"
          >
            <ExternalLink className="size-4" aria-hidden="true" />
            View storefront
          </Link>

          <form action={logout}>
            <button
              type="submit"
              className="flex w-full items-center gap-2.5 rounded-sm px-2.5 py-2 text-sm text-content-muted transition-colors hover:bg-sand-100 hover:text-danger-700"
            >
              <LogOut className="size-4" aria-hidden="true" />
              Sign out
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
