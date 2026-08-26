"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { nanoid } from "nanoid";
import { z } from "zod";

import { db } from "@/lib/db";
import {
  CART_COOKIE,
  cartCookieOptions,
  cartExpiry,
  loadCartById,
  readCartToken,
  type CartView,
} from "@/server/cart";
import { getCurrentUser } from "@/server/auth";
import { validateCoupon } from "@/server/coupons";

/**
 * Cart mutations.
 *
 * All quantity and stock decisions are made here against live database state.
 * The client sends an intent ("add this variant", "set quantity to 3"); it
 * never sends a price, and the returned CartView is recomputed from scratch.
 */

export type CartActionResult =
  | { ok: true; cart: CartView; message?: string }
  | { ok: false; error: string };

const MAX_QTY_PER_LINE = 10;

/** Finds the caller's cart, creating one (and its cookie) if needed. */
async function getOrCreateCart() {
  const store = await cookies();
  const token = store.get(CART_COOKIE)?.value;
  const user = await getCurrentUser();

  if (token) {
    const existing = await db.cart.findUnique({
      where: { token },
      select: { id: true, userId: true },
    });

    if (existing) {
      // Claim an anonymous cart for a user who has since signed in.
      if (user && !existing.userId) {
        await db.cart.update({
          where: { id: existing.id },
          data: { userId: user.id, expiresAt: cartExpiry() },
        });
      }
      return existing.id;
    }
  }

  const newToken = nanoid(32);
  const cart = await db.cart.create({
    data: {
      token: newToken,
      userId: user?.id ?? null,
      expiresAt: cartExpiry(),
    },
    select: { id: true },
  });

  store.set(CART_COOKIE, newToken, cartCookieOptions());
  return cart.id;
}

/**
 * Merges a guest cart into the user's existing cart at login.
 * Quantities are summed and then clamped to available stock.
 */
export async function mergeGuestCartIntoUser(userId: string) {
  const token = await readCartToken();
  if (!token) return;

  const guestCart = await db.cart.findUnique({
    where: { token },
    include: { items: true },
  });
  if (!guestCart || guestCart.userId === userId) {
    if (guestCart && !guestCart.userId) {
      await db.cart.update({ where: { id: guestCart.id }, data: { userId } });
    }
    return;
  }

  const userCart = await db.cart.findFirst({
    where: { userId, id: { not: guestCart.id } },
    orderBy: { updatedAt: "desc" },
    include: { items: true },
  });

  if (!userCart) {
    await db.cart.update({ where: { id: guestCart.id }, data: { userId } });
    return;
  }

  for (const item of guestCart.items) {
    const existing = userCart.items.find((i) => i.variantId === item.variantId);
    if (existing) {
      await db.cartItem.update({
        where: { id: existing.id },
        data: {
          quantity: Math.min(
            MAX_QTY_PER_LINE,
            existing.quantity + item.quantity,
          ),
        },
      });
    } else {
      await db.cartItem.create({
        data: {
          cartId: userCart.id,
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
        },
      });
    }
  }

  await db.cart.delete({ where: { id: guestCart.id } });

  const store = await cookies();
  store.set(CART_COOKIE, userCart.token, cartCookieOptions());
}

const addSchema = z.object({
  variantId: z.string().min(1).max(40),
  quantity: z.number().int().min(1).max(MAX_QTY_PER_LINE).default(1),
});

export async function addToCart(input: {
  variantId: string;
  quantity?: number;
}): Promise<CartActionResult> {
  const parsed = addSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request." };

  const variant = await db.productVariant.findUnique({
    where: { id: parsed.data.variantId },
    select: {
      id: true,
      productId: true,
      isActive: true,
      trackInventory: true,
      stockQuantity: true,
      reservedQuantity: true,
      product: { select: { status: true, name: true } },
    },
  });

  if (!variant || !variant.isActive || variant.product.status !== "ACTIVE") {
    return { ok: false, error: "This piece is no longer available." };
  }

  const available = variant.trackInventory
    ? Math.max(0, variant.stockQuantity - variant.reservedQuantity)
    : MAX_QTY_PER_LINE;

  if (available <= 0) {
    return { ok: false, error: "This piece is out of stock." };
  }

  const cartId = await getOrCreateCart();

  const existing = await db.cartItem.findUnique({
    where: { cartId_variantId: { cartId, variantId: variant.id } },
    select: { id: true, quantity: true },
  });

  const desired = (existing?.quantity ?? 0) + parsed.data.quantity;
  const quantity = Math.min(desired, available, MAX_QTY_PER_LINE);

  if (existing) {
    await db.cartItem.update({
      where: { id: existing.id },
      data: { quantity },
    });
  } else {
    await db.cartItem.create({
      data: {
        cartId,
        productId: variant.productId,
        variantId: variant.id,
        quantity,
      },
    });
  }

  await db.cart.update({
    where: { id: cartId },
    data: { expiresAt: cartExpiry() },
  });

  const cart = await loadCartById(cartId);
  revalidatePath("/cart");

  return {
    ok: true,
    cart,
    message:
      quantity < desired
        ? `Only ${quantity} left — we've added what we have.`
        : `${variant.product.name} added to your bag.`,
  };
}

export async function updateCartItemQuantity(input: {
  itemId: string;
  quantity: number;
}): Promise<CartActionResult> {
  const parsed = z
    .object({
      itemId: z.string().min(1).max(40),
      quantity: z.number().int().min(0).max(MAX_QTY_PER_LINE),
    })
    .safeParse(input);

  if (!parsed.success) return { ok: false, error: "Invalid request." };

  const token = await readCartToken();
  if (!token) return { ok: false, error: "Your bag has expired." };

  // Scope the lookup by cart token so one customer cannot mutate another's
  // cart by guessing an item id.
  const item = await db.cartItem.findFirst({
    where: { id: parsed.data.itemId, cart: { token } },
    select: {
      id: true,
      cartId: true,
      variant: {
        select: {
          trackInventory: true,
          stockQuantity: true,
          reservedQuantity: true,
        },
      },
    },
  });

  if (!item) return { ok: false, error: "That item is no longer in your bag." };

  if (parsed.data.quantity === 0) {
    await db.cartItem.delete({ where: { id: item.id } });
    const cart = await loadCartById(item.cartId);
    revalidatePath("/cart");
    return { ok: true, cart, message: "Removed from your bag." };
  }

  const available = item.variant.trackInventory
    ? Math.max(0, item.variant.stockQuantity - item.variant.reservedQuantity)
    : MAX_QTY_PER_LINE;

  const quantity = Math.min(parsed.data.quantity, available);

  if (quantity <= 0) {
    await db.cartItem.delete({ where: { id: item.id } });
    const cart = await loadCartById(item.cartId);
    revalidatePath("/cart");
    return { ok: true, cart, message: "That piece just sold out." };
  }

  await db.cartItem.update({ where: { id: item.id }, data: { quantity } });

  const cart = await loadCartById(item.cartId);
  revalidatePath("/cart");

  return {
    ok: true,
    cart,
    message:
      quantity < parsed.data.quantity
        ? `Only ${quantity} available.`
        : undefined,
  };
}

export async function removeCartItem(itemId: string): Promise<CartActionResult> {
  return updateCartItemQuantity({ itemId, quantity: 0 });
}

export async function applyCouponToCart(
  code: string,
): Promise<CartActionResult> {
  const normalised = code.trim().toUpperCase().slice(0, 40);
  if (!normalised) return { ok: false, error: "Enter a code." };

  const token = await readCartToken();
  if (!token) return { ok: false, error: "Your bag is empty." };

  const cart = await db.cart.findUnique({
    where: { token },
    include: {
      items: { include: { variant: { select: { pricePaise: true } } } },
    },
  });

  if (!cart || cart.items.length === 0) {
    return { ok: false, error: "Add something to your bag first." };
  }

  const coupon = await db.coupon.findUnique({
    where: { code: normalised },
    select: { id: true },
  });
  if (!coupon) return { ok: false, error: "This code isn't valid." };

  const lines = cart.items.map((item) => ({
    productId: item.productId,
    lineTotalPaise: item.variant.pricePaise * item.quantity,
  }));
  const subtotalPaise = lines.reduce((sum, l) => sum + l.lineTotalPaise, 0);

  const validation = await validateCoupon({
    code: normalised,
    userId: cart.userId,
    lines,
    subtotalPaise,
  });

  if (!validation.valid) return { ok: false, error: validation.reason };

  await db.cart.update({
    where: { id: cart.id },
    data: { couponId: coupon.id },
  });

  const updated = await loadCartById(cart.id);
  revalidatePath("/cart");

  return { ok: true, cart: updated, message: `${normalised} applied.` };
}

export async function removeCouponFromCart(): Promise<CartActionResult> {
  const token = await readCartToken();
  if (!token) return { ok: false, error: "Your bag is empty." };

  const cart = await db.cart.findUnique({
    where: { token },
    select: { id: true },
  });
  if (!cart) return { ok: false, error: "Your bag is empty." };

  await db.cart.update({ where: { id: cart.id }, data: { couponId: null } });

  const updated = await loadCartById(cart.id);
  revalidatePath("/cart");

  return { ok: true, cart: updated, message: "Code removed." };
}

export async function addMultipleToCartAction(
  items: Array<{ productId: string; variantId?: string; quantity: number }>,
): Promise<{ ok: boolean; error?: string }> {
  try {
    for (const item of items) {
      let variantId = item.variantId;
      if (!variantId) {
        const firstVariant = await db.productVariant.findFirst({
          where: { productId: item.productId, isActive: true },
          orderBy: { position: "asc" },
          select: { id: true },
        });
        if (!firstVariant) continue;
        variantId = firstVariant.id;
      }
      await addToCart({ variantId, quantity: item.quantity });
    }
    revalidatePath("/cart");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: "Could not add items to cart." };
  }
}
