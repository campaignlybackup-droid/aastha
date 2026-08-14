"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, LogOut, MapPin, Package, User } from "lucide-react";

import { logout } from "@/server/actions/auth";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/account", label: "Profile", icon: User },
  { href: "/account/orders", label: "Orders", icon: Package },
  { href: "/account/addresses", label: "Addresses", icon: MapPin },
  { href: "/account/wishlist", label: "Wishlist", icon: Heart },
];

export function AccountNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Account">
      <ul className="flex gap-1 overflow-x-auto border-b border-line pb-2 lg:flex-col lg:gap-0.5 lg:border-b-0 lg:pb-0">
        {LINKS.map((link) => {
          // `/account` must not stay highlighted on `/account/orders`.
          const active =
            link.href === "/account"
              ? pathname === "/account"
              : pathname.startsWith(link.href);

          return (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2.5 whitespace-nowrap rounded-sm px-3 py-2.5 text-sm transition-colors",
                  active
                    ? "bg-surface-sunken font-medium text-[var(--color-accent)]"
                    : "text-content-muted hover:bg-sand-100 hover:text-content",
                )}
              >
                <link.icon className="size-4" aria-hidden="true" />
                {link.label}
              </Link>
            </li>
          );
        })}

        <li className="lg:mt-4 lg:border-t lg:border-line lg:pt-4">
          {/* A server action in a form: logout must be a POST, not a GET link,
              so a prefetch or a crawler cannot sign the customer out. */}
          <form action={logout}>
            <button
              type="submit"
              className="flex w-full items-center gap-2.5 whitespace-nowrap rounded-sm px-3 py-2.5 text-sm text-content-muted transition-colors hover:bg-sand-100 hover:text-danger-700"
            >
              <LogOut className="size-4" aria-hidden="true" />
              Sign out
            </button>
          </form>
        </li>
      </ul>
    </nav>
  );
}
