"use client";

/**
 * Client-side analytics dispatch.
 *
 * One module, one call site per event. Components call `trackAddToCart(...)`;
 * they never touch `window.fbq` or `window.dataLayer` directly. That keeps
 * tracking out of the UI and makes it possible to add or remove a destination
 * in one place.
 *
 * Every event fans out to:
 *   • GA4, via the GTM dataLayer (so the container owns the tag config)
 *   • Meta Pixel, via fbq
 *
 * Purchase is special: it also has a server-side Conversions API counterpart.
 * Both sides send the SAME eventID so Meta deduplicates them. See
 * src/lib/meta/capi.ts.
 */

import { paiseToRupees } from "@/lib/money";

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
    fbq?: (...args: unknown[]) => void;
  }
}

type Item = {
  productId: string;
  productName: string;
  categoryName?: string;
  variantId?: string;
  quantity: number;
  pricePaise: number;
};

function pushDataLayer(event: string, payload: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];
  // GA4 recommends clearing `ecommerce` between events so fields do not leak
  // from the previous push.
  window.dataLayer.push({ ecommerce: null });
  window.dataLayer.push({ event, ...payload });
}

function fbq(...args: unknown[]) {
  if (typeof window === "undefined" || typeof window.fbq !== "function") return;
  window.fbq(...args);
}

function ga4Items(items: Item[]) {
  return items.map((item) => ({
    item_id: item.productId,
    item_name: item.productName,
    item_category: item.categoryName,
    item_variant: item.variantId,
    price: paiseToRupees(item.pricePaise),
    quantity: item.quantity,
    currency: "INR",
  }));
}

function value(items: Item[]) {
  return paiseToRupees(
    items.reduce((sum, i) => sum + i.pricePaise * i.quantity, 0),
  );
}

export function trackViewItem(item: Omit<Item, "quantity">) {
  const items = [{ ...item, quantity: 1 }];

  pushDataLayer("view_item", {
    ecommerce: { currency: "INR", value: value(items), items: ga4Items(items) },
  });

  fbq("track", "ViewContent", {
    content_ids: [item.productId],
    content_name: item.productName,
    content_category: item.categoryName,
    content_type: "product",
    value: paiseToRupees(item.pricePaise),
    currency: "INR",
  });
}

export function trackAddToCart(item: Item) {
  const items = [item];

  pushDataLayer("add_to_cart", {
    ecommerce: { currency: "INR", value: value(items), items: ga4Items(items) },
  });

  fbq("track", "AddToCart", {
    content_ids: [item.productId],
    content_name: item.productName,
    content_category: item.categoryName,
    content_type: "product",
    contents: [{ id: item.productId, quantity: item.quantity }],
    value: value(items),
    currency: "INR",
  });
}

export function trackSearch(query: string) {
  pushDataLayer("search", { search_term: query });
  fbq("track", "Search", { search_string: query });
}

export function trackBeginCheckout(items: Item[], totalPaise: number) {
  pushDataLayer("begin_checkout", {
    ecommerce: {
      currency: "INR",
      value: paiseToRupees(totalPaise),
      items: ga4Items(items),
    },
  });

  fbq("track", "InitiateCheckout", {
    content_ids: items.map((i) => i.productId),
    contents: items.map((i) => ({ id: i.productId, quantity: i.quantity })),
    content_type: "product",
    num_items: items.reduce((sum, i) => sum + i.quantity, 0),
    value: paiseToRupees(totalPaise),
    currency: "INR",
  });
}

export function trackAddPaymentInfo(totalPaise: number, items: Item[]) {
  pushDataLayer("add_payment_info", {
    ecommerce: {
      currency: "INR",
      value: paiseToRupees(totalPaise),
      items: ga4Items(items),
    },
  });

  fbq("track", "AddPaymentInfo", {
    value: paiseToRupees(totalPaise),
    currency: "INR",
    content_ids: items.map((i) => i.productId),
  });
}

/**
 * Purchase.
 *
 * `eventId` MUST be the order's `metaEventId`, the same value the server sends
 * to the Conversions API. Meta collapses the pair into one conversion. Without
 * it, every purchase is counted twice and ROAS reads as half what it is.
 */
export function trackPurchase({
  orderNumber,
  eventId,
  totalPaise,
  shippingPaise,
  taxPaise,
  couponCode,
  items,
}: {
  orderNumber: string;
  eventId: string;
  totalPaise: number;
  shippingPaise: number;
  taxPaise: number;
  couponCode?: string | null;
  items: Item[];
}) {
  pushDataLayer("purchase", {
    ecommerce: {
      transaction_id: orderNumber,
      currency: "INR",
      value: paiseToRupees(totalPaise),
      shipping: paiseToRupees(shippingPaise),
      tax: paiseToRupees(taxPaise),
      coupon: couponCode ?? undefined,
      items: ga4Items(items),
    },
  });

  fbq(
    "track",
    "Purchase",
    {
      content_ids: items.map((i) => i.productId),
      contents: items.map((i) => ({
        id: i.productId,
        quantity: i.quantity,
        item_price: paiseToRupees(i.pricePaise),
      })),
      content_type: "product",
      num_items: items.reduce((sum, i) => sum + i.quantity, 0),
      value: paiseToRupees(totalPaise),
      currency: "INR",
      order_id: orderNumber,
    },
    { eventID: eventId },
  );
}
