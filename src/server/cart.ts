import "server-only";

import { cookies } from "next/headers";
import { cache } from "react";

import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { getSetting } from "@/server/catalog";
import { validateCoupon } from "@/server/coupons";

/**
 * Cart reads and pricing.
 *
 * PRICING IS ALWAYS COMPUTED HERE, FROM THE DATABASE.
 *
 * The cart stores only (variant, quantity). Prices, discounts, shipping and
 * tax are recalculated on every read from current product data, so a cart left
 * open for a week cannot lock in last week's price, and a tampered client
 * payload has nothing to tamper with. Checkout re-runs this same function and
 * charges its output — the browser never supplies an amount.
 *
 * TAX MODEL: displayed prices are GST-INCLUSIVE, which is the norm for Indian
 * jewellery retail. `taxPaise` is therefore the GST component already contained
 * within the total, not an amount added on top. Checkout labels it accordingly.
 */

export const CART_COOKIE = "asj_cart";
const CART_TTL_DAYS = 30;

export type CartLine = {
  itemId: string;
  productId: string;
  variantId: string;
  slug: string;
  name: string;
  variantTitle: string;
  variantOptions: Record<string, string>;
  sku: string;
  imageUrl: string | null;
  quantity: number;
  /** Quantity actually purchasable right now. Drives the stock warning. */
  availableQuantity: number;
  unitPricePaise: number;
  unitMrpPaise: number;
  lineTotalPaise: number;
  taxPercent: number;
  inStock: boolean;
  /** True when the stored quantity exceeds what is available. */
  quantityAdjusted: boolean;
};

export type CartTotals = {
  subtotalPaise: number;
  discountPaise: number;
  shippingPaise: number;
  /** GST already included in `totalPaise`, not added to it. */
  taxPaise: number;
  totalPaise: number;
  /** How much more to spend to reach free shipping; 0 when already free. */
  freeShippingRemainingPaise: number;
};

export type CartView = {
  id: string | null;
  lines: CartLine[];
  totals: CartTotals;
  itemCount: number;
  coupon: { code: string; description: string | null } | null;
  couponError: string | null;
  /** True when any line was clamped or removed due to stock changes. */
  hasStockIssues: boolean;
};

export const EMPTY_CART: CartView = {
  id: null,
  lines: [],
  totals: {
    subtotalPaise: 0,
    discountPaise: 0,
    shippingPaise: 0,
    taxPaise: 0,
    totalPaise: 0,
    freeShippingRemainingPaise: 0,
  },
  itemCount: 0,
  coupon: null,
  couponError: null,
  hasStockIssues: false,
};

/* -----------------------------------------------------------------------------
 * Cookie helpers
 * -------------------------------------------------------------------------- */

export async function readCartToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(CART_COOKIE)?.value ?? null;
}

export function cartCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: CART_TTL_DAYS * 24 * 60 * 60,
  };
}

export function cartExpiry() {
  return new Date(Date.now() + CART_TTL_DAYS * 24 * 60 * 60 * 1000);
}

/* -----------------------------------------------------------------------------
 * Loading
 * -------------------------------------------------------------------------- */

const cartInclude = {
  coupon: true,
  items: {
    orderBy: { createdAt: "asc" },
    include: {
      product: {
        select: {
          id: true,
          slug: true,
          name: true,
          status: true,
          taxPercent: true,
          images: {
            orderBy: { position: "asc" },
            take: 1,
            select: { media: { select: { secureUrl: true } } },
          },
        },
      },
      variant: {
        select: {
          id: true,
          sku: true,
          title: true,
          options: true,
          pricePaise: true,
          mrpPaise: true,
          isActive: true,
          trackInventory: true,
          stockQuantity: true,
          reservedQuantity: true,
          image: { select: { secureUrl: true } },
        },
      },
    },
  },
} satisfies Prisma.CartInclude;

/**
 * Loads the current cart. Never creates one — creation happens only in the
 * mutating server actions, because a server component render cannot set
 * cookies.
 */
export const getCart = cache(async (): Promise<CartView> => {
  const token = await readCartToken();
  if (!token) return EMPTY_CART;

  const cart = await db.cart.findUnique({
    where: { token },
    include: cartInclude,
  });

  if (!cart) return EMPTY_CART;

  return priceCart(cart);
});

/** Cheap count for the header badge — avoids loading and pricing every line. */
export const getCartCount = cache(async (): Promise<number> => {
  const token = await readCartToken();
  if (!token) return 0;

  const result = await db.cartItem.aggregate({
    where: { cart: { token } },
    _sum: { quantity: true },
  });

  return result._sum.quantity ?? 0;
});

type CartWithRelations = Prisma.CartGetPayload<{
  include: typeof cartInclude;
}>;

/* -----------------------------------------------------------------------------
 * Pricing
 * -------------------------------------------------------------------------- */

export async function priceCart(cart: CartWithRelations): Promise<CartView> {
  const shipping = await getSetting("shipping");

  const lines: CartLine[] = [];
  let hasStockIssues = false;

  for (const item of cart.items) {
    // Drop lines whose product was archived or variant deactivated. The line
    // simply disappears rather than blocking checkout with an error.
    if (item.product.status !== "ACTIVE" || !item.variant.isActive) {
      hasStockIssues = true;
      continue;
    }

    const available = item.variant.trackInventory
      ? Math.max(0, item.variant.stockQuantity - item.variant.reservedQuantity)
      : Number.MAX_SAFE_INTEGER;

    const quantity = Math.min(item.quantity, available);
    const quantityAdjusted = quantity !== item.quantity;
    if (quantityAdjusted) hasStockIssues = true;

    // Keep zero-stock lines visible so the customer understands why the total
    // changed, rather than silently deleting the thing they wanted.
    lines.push({
      itemId: item.id,
      productId: item.product.id,
      variantId: item.variant.id,
      slug: item.product.slug,
      name: item.product.name,
      variantTitle: item.variant.title,
      variantOptions: (item.variant.options ?? {}) as Record<string, string>,
      sku: item.variant.sku,
      imageUrl:
        item.variant.image?.secureUrl ??
        item.product.images[0]?.media.secureUrl ??
        null,
      quantity,
      availableQuantity: item.variant.trackInventory ? available : 99,
      unitPricePaise: item.variant.pricePaise,
      unitMrpPaise: item.variant.mrpPaise,
      lineTotalPaise: item.variant.pricePaise * quantity,
      taxPercent: item.product.taxPercent,
      inStock: available > 0,
      quantityAdjusted,
    });
  }

  const subtotalPaise = lines.reduce((sum, l) => sum + l.lineTotalPaise, 0);

  // --- Coupon --------------------------------------------------------------
  let discountPaise = 0;
  let coupon: CartView["coupon"] = null;
  let couponError: string | null = null;

  if (cart.coupon) {
    const result = await validateCoupon({
      code: cart.coupon.code,
      userId: cart.userId,
      lines: lines.map((l) => ({
        productId: l.productId,
        lineTotalPaise: l.lineTotalPaise,
      })),
      subtotalPaise,
    });

    if (result.valid) {
      discountPaise = result.discountPaise;
      coupon = { code: cart.coupon.code, description: cart.coupon.description };
    } else {
      // Surface why rather than silently dropping it — a customer who applied
      // WELCOME10 and then removed items deserves to know it stopped applying.
      couponError = result.reason;
    }
  }

  const afterDiscount = Math.max(0, subtotalPaise - discountPaise);

  // --- Shipping ------------------------------------------------------------
  const shippingPaise =
    lines.length === 0 || afterDiscount >= shipping.freeAbovePaise
      ? 0
      : shipping.flatRatePaise;

  const totalPaise = afterDiscount + shippingPaise;

  // --- Tax (component already inside the total) -----------------------------
  // Weighted by each line's own rate so a future 0%-rated item stays correct.
  const taxPaise = lines.reduce((sum, line) => {
    const share =
      subtotalPaise > 0 ? line.lineTotalPaise / subtotalPaise : 0;
    const lineNet = afterDiscount * share;
    return sum + Math.round((lineNet * line.taxPercent) / (100 + line.taxPercent));
  }, 0);

  return {
    id: cart.id,
    lines,
    totals: {
      subtotalPaise,
      discountPaise,
      shippingPaise,
      taxPaise,
      totalPaise,
      freeShippingRemainingPaise:
        shippingPaise > 0
          ? Math.max(0, shipping.freeAbovePaise - afterDiscount)
          : 0,
    },
    itemCount: lines.reduce((sum, l) => sum + l.quantity, 0),
    coupon,
    couponError,
    hasStockIssues,
  };
}

/** Reload and re-price a cart by id — used after every mutation. */
export async function loadCartById(cartId: string): Promise<CartView> {
  const cart = await db.cart.findUnique({
    where: { id: cartId },
    include: cartInclude,
  });
  if (!cart) return EMPTY_CART;
  return priceCart(cart);
}
