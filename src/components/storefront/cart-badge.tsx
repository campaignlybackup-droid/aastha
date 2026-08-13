"use client";

import * as React from "react";
import Link from "next/link";
import { ShoppingBag } from "lucide-react";

/**
 * Header bag icon and item count.
 *
 * The count is fetched AFTER hydration rather than rendered on the server, and
 * that is a deliberate architectural choice: reading the cart cookie in the
 * layout would opt every page that uses this layout — including every product
 * and category page — into dynamic rendering. Keeping the one per-visitor
 * value client-side lets the entire catalogue be statically prerendered and
 * served from the CDN.
 *
 * The badge is absent on first paint and appears a moment later. That is the
 * right trade: an anonymous first-time visitor has an empty bag anyway, and a
 * returning customer sees the count well before they could act on it.
 */

/** Cart mutations dispatch this so the badge updates without a route change. */
export const CART_UPDATED_EVENT = "asj:cart-updated";

export function notifyCartUpdated(count?: number) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(CART_UPDATED_EVENT, { detail: { count } }),
  );
}

export function CartBadge({ className }: { className?: string }) {
  const [count, setCount] = React.useState<number | null>(null);

  React.useEffect(() => {
    const controller = new AbortController();

    async function refresh() {
      try {
        const res = await fetch("/api/cart/count", {
          signal: controller.signal,
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = (await res.json()) as { count: number };
        setCount(data.count);
      } catch {
        /* A missing badge is not worth surfacing an error for. */
      }
    }

    void refresh();

    function onCartUpdated(event: Event) {
      // Prefer the count the mutation already knows; fall back to a refetch.
      const detail = (event as CustomEvent<{ count?: number }>).detail;
      if (typeof detail?.count === "number") {
        setCount(detail.count);
      } else {
        void refresh();
      }
    }

    window.addEventListener(CART_UPDATED_EVENT, onCartUpdated);
    // A bag filled in another tab should show up when this one is refocused.
    window.addEventListener("focus", refresh);

    return () => {
      controller.abort();
      window.removeEventListener(CART_UPDATED_EVENT, onCartUpdated);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  const label =
    count && count > 0
      ? `Shopping bag, ${count} item${count === 1 ? "" : "s"}`
      : "Shopping bag";

  return (
    <Link href="/cart" className={className} aria-label={label}>
      <ShoppingBag className="size-[1.15rem]" aria-hidden="true" />
      {count && count > 0 ? (
        <span
          aria-hidden="true"
          className="absolute -right-0.5 -top-0.5 flex size-4.5 items-center justify-center rounded-full bg-[var(--color-accent)] text-[0.625rem] font-medium text-[var(--color-accent-contrast)]"
        >
          {count > 9 ? "9+" : count}
        </span>
      ) : null}
    </Link>
  );
}
