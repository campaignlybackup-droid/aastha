"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import * as Accordion from "@radix-ui/react-accordion";
import { ChevronDown, Menu, X } from "lucide-react";

import { Logo } from "@/components/storefront/logo";
import { cn } from "@/lib/utils";

type Category = {
  id: string;
  name: string;
  slug: string;
  children: Array<{ name: string; slug: string }>;
};

type Collection = { id: string; name: string; slug: string };

/**
 * Mobile navigation drawer.
 *
 * Radix Dialog handles the focus trap, scroll lock, escape key and
 * `aria-modal` semantics — all of which are easy to get subtly wrong by hand
 * and all of which matter on a checkout-bearing site.
 */
export function MobileNav({
  categories,
  collections,
}: {
  categories: Category[];
  collections: Collection[];
}) {
  const [open, setOpen] = React.useState(false);
  const pathname = usePathname();

  // Route changes must close the drawer; otherwise tapping a link navigates
  // behind an overlay that never goes away. Done during render rather than in
  // an effect so the drawer is already gone on the first frame of the new page.
  const [seenPathname, setSeenPathname] = React.useState(pathname);
  if (pathname !== seenPathname) {
    setSeenPathname(pathname);
    setOpen(false);
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger
        className="inline-flex size-10 items-center justify-center rounded-sm text-content transition-colors hover:bg-sand-100"
        aria-label="Open menu"
      >
        <Menu className="size-5" aria-hidden="true" />
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-sand-950/40 backdrop-blur-[2px] data-[state=closed]:animate-fade-out data-[state=open]:animate-fade-in" />
        <Dialog.Content
          className={cn(
            "fixed inset-y-0 left-0 z-50 flex w-[min(22rem,88vw)] flex-col bg-surface shadow-[var(--shadow-overlay)]",
            "data-[state=closed]:animate-slide-out-left data-[state=open]:animate-slide-in-left",
          )}
        >
          <Dialog.Title className="sr-only">Site navigation</Dialog.Title>
          <Dialog.Description className="sr-only">
            Browse jewellery categories and collections.
          </Dialog.Description>

          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <Logo size="sm" />
            <Dialog.Close
              className="inline-flex size-9 items-center justify-center rounded-sm text-content-muted transition-colors hover:bg-sand-100"
              aria-label="Close menu"
            >
              <X className="size-5" aria-hidden="true" />
            </Dialog.Close>
          </div>

          <nav className="flex-1 overflow-y-auto overscroll-contain px-2 py-3">
            <Accordion.Root type="multiple" className="space-y-0.5">
              {categories.map((category) =>
                category.children.length ? (
                  <Accordion.Item
                    key={category.id}
                    value={category.id}
                    className="border-b border-line/60 last:border-0"
                  >
                    <div className="flex items-center">
                      <Link
                        href={`/category/${category.slug}`}
                        className="flex-1 px-3 py-3 text-sm text-content"
                      >
                        {category.name}
                      </Link>
                      <Accordion.Trigger
                        className="group inline-flex size-11 items-center justify-center text-content-muted"
                        aria-label={`Show ${category.name} subcategories`}
                      >
                        <ChevronDown
                          className="size-4 transition-transform duration-200 group-data-[state=open]:rotate-180"
                          aria-hidden="true"
                        />
                      </Accordion.Trigger>
                    </div>
                    <Accordion.Content className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
                      <div className="space-y-0.5 pb-2 pl-6">
                        {category.children.map((child) => (
                          <Link
                            key={child.slug}
                            href={`/category/${child.slug}`}
                            className="block px-3 py-2.5 text-sm text-content-muted"
                          >
                            {child.name}
                          </Link>
                        ))}
                      </div>
                    </Accordion.Content>
                  </Accordion.Item>
                ) : (
                  <Link
                    key={category.id}
                    href={`/category/${category.slug}`}
                    className="block border-b border-line/60 px-3 py-3 text-sm text-content last:border-0"
                  >
                    {category.name}
                  </Link>
                ),
              )}
            </Accordion.Root>

            {collections.length ? (
              <div className="mt-6 px-3">
                <p className="u-eyebrow mb-2 text-content-subtle">
                  Collections
                </p>
                <div className="space-y-0.5">
                  {collections.map((collection) => (
                    <Link
                      key={collection.id}
                      href={`/collections/${collection.slug}`}
                      className="block py-2.5 text-sm text-content"
                    >
                      {collection.name}
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="mt-6 border-t border-line px-3 pt-4">
              <div className="space-y-0.5">
                {[
                  { href: "/shop", label: "All Jewellery" },
                  { href: "/account/orders", label: "My Orders" },
                  { href: "/account/wishlist", label: "Wishlist" },
                  { href: "/about", label: "Our Story" },
                  { href: "/care-guide", label: "Silver Care Guide" },
                  { href: "/contact", label: "Contact" },
                ].map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="block py-2.5 text-sm text-content-muted"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          </nav>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
