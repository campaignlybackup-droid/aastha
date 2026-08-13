"use client";

import * as React from "react";

import { trackViewItem } from "@/lib/analytics/events";

const RECENT_KEY = "asj.recentlyViewed";
const RECENT_LIMIT = 8;

/**
 * Fires the ViewContent / view_item event and records the product in the
 * browser's recently-viewed list.
 *
 * Recently-viewed lives in localStorage rather than the database: it is a
 * per-device convenience, it needs no login, and keeping it client-side means
 * the product page stays cacheable.
 */
export function ProductViewTracker({
  product,
}: {
  product: {
    productId: string;
    productName: string;
    categoryName: string;
    pricePaise: number;
    slug: string;
  };
}) {
  // Guard against React 18+ double-invocation in development, which would
  // otherwise report every product view twice.
  const fired = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (fired.current === product.productId) return;
    fired.current = product.productId;

    trackViewItem({
      productId: product.productId,
      productName: product.productName,
      categoryName: product.categoryName,
      pricePaise: product.pricePaise,
    });

    try {
      const raw = window.localStorage.getItem(RECENT_KEY);
      const parsed: unknown = raw ? JSON.parse(raw) : [];
      const existing = Array.isArray(parsed)
        ? parsed.filter((s): s is string => typeof s === "string")
        : [];

      const next = [
        product.slug,
        ...existing.filter((s) => s !== product.slug),
      ].slice(0, RECENT_LIMIT);

      window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    } catch {
      // Private browsing or a full quota — recently-viewed is optional.
    }
  }, [product]);

  return null;
}
