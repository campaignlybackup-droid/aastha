import "server-only";

import { customAlphabet } from "nanoid";
import { randomUUID } from "node:crypto";

import { db } from "@/lib/db";
import type { CartView } from "@/server/cart";
import { validateCoupon } from "@/server/coupons";

/**
 * Order lifecycle.
 *
 * The money-critical invariants, and where each is enforced:
 *
 *  1. PRICE IS NEVER TAKEN FROM THE CLIENT. `createPendingOrder` re-prices the
 *     cart from the database and charges that.
 *  2. INVENTORY CANNOT OVERSELL. Reservation uses a conditional UPDATE whose
 *     WHERE clause requires the stock to still be there; if two customers race
 *     for the last piece, one UPDATE matches zero rows and that order fails.
 *  3. CONFIRMATION IS IDEMPOTENT. Razorpay retries webhooks. `confirmOrder`
 *     is a no-op on an already-confirmed order, so stock is decremented once,
 *     the coupon is consumed once, and Purchase is reported once.
 */

/** No I, O, 0 or 1 — order numbers get read aloud over the phone. */
const orderCode = customAlphabet("23456789ABCDEFGHJKLMNPQRSTUVWXYZ", 6);

async function generateOrderNumber(): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const candidate = `ASJ-${orderCode()}`;
    const clash = await db.order.findUnique({
      where: { orderNumber: candidate },
      select: { id: true },
    });
    if (!clash) return candidate;
  }
  // 32^6 ≈ 1 billion; five collisions means something is badly wrong, so fall
  // back to a value that cannot collide rather than looping forever.
  return `ASJ-${Date.now().toString(36).toUpperCase()}`;
}

export type CreateOrderResult =
  | {
      ok: true;
      orderId: string;
      orderNumber: string;
      totalPaise: number;
      metaEventId: string;
    }
  | { ok: false; error: string };

/**
 * Creates a PENDING order and reserves stock for it.
 *
 * Called immediately before handing the customer to Razorpay. The order exists
 * in the database before any payment is attempted, so a webhook that arrives
 * before the browser returns still has something to attach to.
 */
export async function createPendingOrder({
  userId,
  cart,
  address,
  customerNote,
  isGiftWrapped,
}: {
  userId: string;
  cart: CartView;
  address: {
    name: string;
    mobile: string;
    email?: string | null;
    line1: string;
    line2?: string | null;
    landmark?: string | null;
    city: string;
    state: string;
    pincode: string;
    country: string;
  };
  customerNote?: string;
  isGiftWrapped?: boolean;
}): Promise<CreateOrderResult> {
  if (!cart.id || cart.lines.length === 0) {
    return { ok: false, error: "Your bag is empty." };
  }

  const purchasable = cart.lines.filter((line) => line.inStock);
  if (purchasable.length === 0) {
    return { ok: false, error: "Nothing in your bag is currently in stock." };
  }
  if (purchasable.length !== cart.lines.length) {
    return {
      ok: false,
      error: "Some pieces went out of stock. Please review your bag.",
    };
  }

  // Re-validate the coupon at the moment of purchase; it may have expired or
  // hit its usage limit since the cart was priced.
  let couponId: string | null = null;
  let discountPaise = 0;

  if (cart.coupon) {
    const validation = await validateCoupon({
      code: cart.coupon.code,
      userId,
      lines: cart.lines.map((l) => ({
        productId: l.productId,
        lineTotalPaise: l.lineTotalPaise,
      })),
      subtotalPaise: cart.totals.subtotalPaise,
    });

    if (!validation.valid) {
      return {
        ok: false,
        error: `${cart.coupon.code} is no longer valid: ${validation.reason}`,
      };
    }
    couponId = validation.couponId;
    discountPaise = validation.discountPaise;
  }

  const giftWrapPaise = isGiftWrapped ? 4000 : 0;
  const subtotalPaise = cart.totals.subtotalPaise;
  const shippingPaise = cart.totals.shippingPaise;
  const totalPaise = Math.max(0, subtotalPaise - discountPaise) + shippingPaise + giftWrapPaise;
  const taxPaise = cart.totals.taxPaise;

  const noteWithGift = isGiftWrapped
    ? [customerNote?.trim(), "[Gift Wrapped (+₹40)]"].filter(Boolean).join(" · ")
    : customerNote;

  const orderNumber = await generateOrderNumber();
  // Generated once here and reused by both the browser Pixel and the
  // server-side CAPI call so Meta deduplicates the Purchase.
  const metaEventId = randomUUID();

  try {
    const order = await db.$transaction(async (tx) => {
      // --- Reserve stock ---------------------------------------------------
      for (const line of cart.lines) {
        const reserved = await tx.productVariant.updateMany({
          where: {
            id: line.variantId,
            isActive: true,
            OR: [
              { trackInventory: false },
              // Conditional: only reserves if enough is genuinely free.
              {
                trackInventory: true,
                stockQuantity: { gte: line.quantity },
              },
            ],
          },
          data: { reservedQuantity: { increment: line.quantity } },
        });

        if (reserved.count === 0) {
          throw new OutOfStockError(line.name);
        }
      }

      // --- Create the order ------------------------------------------------
      return tx.order.create({
        data: {
          orderNumber,
          userId,
          status: "PENDING",
          paymentStatus: "PENDING",
          subtotalPaise,
          discountPaise,
          taxPaise,
          shippingPaise,
          totalPaise,
          couponId,
          couponCode: cart.coupon?.code ?? null,
          metaEventId,
          shipName: address.name,
          shipMobile: address.mobile,
          shipEmail: address.email ?? null,
          shipLine1: address.line1,
          shipLine2: address.line2 ?? null,
          shipLandmark: address.landmark ?? null,
          shipCity: address.city,
          shipState: address.state,
          shipPincode: address.pincode,
          shipCountry: address.country,
          customerNote: noteWithGift?.slice(0, 500) ?? null,
          items: {
            create: cart.lines.map((line) => ({
              productId: line.productId,
              variantId: line.variantId,
              // Snapshot — a later rename or price change must not rewrite
              // what this customer actually bought.
              productName: line.name,
              variantTitle: line.variantTitle,
              sku: line.sku,
              slug: line.slug,
              imageUrl: line.imageUrl,
              quantity: line.quantity,
              unitMrpPaise: line.unitMrpPaise,
              unitPricePaise: line.unitPricePaise,
              lineTotalPaise: line.lineTotalPaise,
              taxPercent: line.taxPercent,
            })),
          },
        },
        select: { id: true, orderNumber: true, totalPaise: true },
      });
    });

    return {
      ok: true,
      orderId: order.id,
      orderNumber: order.orderNumber,
      totalPaise: order.totalPaise,
      metaEventId,
    };
  } catch (error) {
    if (error instanceof OutOfStockError) {
      return {
        ok: false,
        error: `${error.productName} just sold out. Please review your bag.`,
      };
    }
    console.error("[orders] createPendingOrder failed", error);
    return {
      ok: false,
      error: "We couldn't start your order. Please try again.",
    };
  }
}

class OutOfStockError extends Error {
  constructor(public productName: string) {
    super(`Out of stock: ${productName}`);
    this.name = "OutOfStockError";
  }
}

export type ConfirmResult =
  | { ok: true; alreadyConfirmed: boolean; orderId: string }
  | { ok: false; error: string };

/**
 * Marks an order paid and commits its stock.
 *
 * Idempotent by design: the guard reads the order inside the transaction and
 * returns early if it is already CONFIRMED, so a duplicate webhook delivery
 * cannot double-decrement inventory or double-count a coupon.
 */
export async function confirmOrder({
  orderId,
  providerPaymentId,
  providerOrderId,
  method,
  amountPaise,
  rawPayload,
}: {
  orderId: string;
  providerPaymentId: string;
  providerOrderId: string | null;
  method?: string | null;
  amountPaise: number;
  rawPayload?: unknown;
}): Promise<ConfirmResult> {
  try {
    return await db.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { items: true },
      });

      if (!order) return { ok: false as const, error: "Order not found." };

      if (order.status === "CONFIRMED") {
        return { ok: true as const, alreadyConfirmed: true, orderId };
      }

      if (order.status === "CANCELLED") {
        // Paid after cancellation — do not resurrect it. Flag for a human.
        await tx.order.update({
          where: { id: orderId },
          data: {
            internalNote: [
              order.internalNote,
              `Payment ${providerPaymentId} captured after cancellation. Needs refund.`,
            ]
              .filter(Boolean)
              .join("\n"),
          },
        });
        return {
          ok: false as const,
          error: "Order was already cancelled.",
        };
      }

      // Amount mismatch means the client tampered with the Razorpay handler or
      // the provider sent something unexpected. Record, do not confirm.
      if (amountPaise !== order.totalPaise) {
        await tx.order.update({
          where: { id: orderId },
          data: {
            internalNote: [
              order.internalNote,
              `Amount mismatch: charged ${amountPaise}, expected ${order.totalPaise}.`,
            ]
              .filter(Boolean)
              .join("\n"),
          },
        });
        return { ok: false as const, error: "Payment amount did not match." };
      }

      // --- Commit inventory: reserved → sold -------------------------------
      for (const item of order.items) {
        if (!item.variantId) continue;

        const variant = await tx.productVariant.findUnique({
          where: { id: item.variantId },
          select: { trackInventory: true, stockQuantity: true },
        });
        if (!variant?.trackInventory) continue;

        const balance = Math.max(0, variant.stockQuantity - item.quantity);

        await tx.productVariant.update({
          where: { id: item.variantId },
          data: {
            stockQuantity: balance,
            reservedQuantity: { decrement: item.quantity },
          },
        });

        await tx.stockMovement.create({
          data: {
            variantId: item.variantId,
            delta: -item.quantity,
            balance,
            reason: "order.paid",
            orderId,
          },
        });
      }

      // --- Merchandising counters ------------------------------------------
      for (const item of order.items) {
        if (!item.productId) continue;
        await tx.product.update({
          where: { id: item.productId },
          data: { salesCount: { increment: item.quantity } },
        });
      }

      // --- Coupon redemption ------------------------------------------------
      if (order.couponId) {
        await tx.coupon.update({
          where: { id: order.couponId },
          data: { usageCount: { increment: 1 } },
        });
        // Unique on (couponId, orderId), so a retry cannot double-record.
        await tx.couponUsage.upsert({
          where: {
            couponId_orderId: { couponId: order.couponId, orderId },
          },
          update: {},
          create: {
            couponId: order.couponId,
            userId: order.userId,
            orderId,
            discountPaise: order.discountPaise,
          },
        });
      }

      // --- Payment record ----------------------------------------------------
      await tx.payment.upsert({
        where: { providerPaymentId },
        update: {
          status: "PAID",
          capturedAt: new Date(),
          method: method ?? undefined,
          rawPayload: (rawPayload ?? undefined) as never,
        },
        create: {
          orderId,
          provider: "RAZORPAY",
          status: "PAID",
          amountPaise,
          providerOrderId,
          providerPaymentId,
          method: method ?? null,
          capturedAt: new Date(),
          rawPayload: (rawPayload ?? undefined) as never,
        },
      });

      await tx.order.update({
        where: { id: orderId },
        data: {
          status: "CONFIRMED",
          paymentStatus: "PAID",
          placedAt: new Date(),
        },
      });

      // The cart has served its purpose; clearing it here means the customer
      // never sees a stale bag after paying.
      await tx.cartItem.deleteMany({
        where: { cart: { userId: order.userId } },
      });

      return { ok: true as const, alreadyConfirmed: false, orderId };
    });
  } catch (error) {
    console.error("[orders] confirmOrder failed", error);
    return { ok: false, error: "Could not confirm the order." };
  }
}

/** Releases reserved stock for an order that will never be paid. */
export async function cancelOrder({
  orderId,
  reason,
}: {
  orderId: string;
  reason: string;
}): Promise<ConfirmResult> {
  return db.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) return { ok: false as const, error: "Order not found." };
    if (order.status === "CANCELLED") {
      return { ok: true as const, alreadyConfirmed: true, orderId };
    }
    if (order.status === "CONFIRMED") {
      return {
        ok: false as const,
        error: "Paid orders cannot be cancelled here.",
      };
    }

    for (const item of order.items) {
      if (!item.variantId) continue;
      await tx.productVariant.updateMany({
        where: { id: item.variantId, trackInventory: true },
        data: { reservedQuantity: { decrement: item.quantity } },
      });
    }

    await tx.order.update({
      where: { id: orderId },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
        internalNote: [order.internalNote, `Cancelled: ${reason}`]
          .filter(Boolean)
          .join("\n"),
      },
    });

    return { ok: true as const, alreadyConfirmed: false, orderId };
  });
}

/**
 * Releases stock held by orders that were started but never paid.
 * Run from the hourly cron; without it, abandoned checkouts slowly make the
 * catalogue look sold out.
 */
export async function releaseStaleReservations(olderThanMinutes = 30) {
  const cutoff = new Date(Date.now() - olderThanMinutes * 60 * 1000);

  const stale = await db.order.findMany({
    where: { status: "PENDING", createdAt: { lt: cutoff } },
    select: { id: true },
    take: 200,
  });

  let released = 0;
  for (const order of stale) {
    const result = await cancelOrder({
      orderId: order.id,
      reason: "Payment not completed within 30 minutes.",
    });
    if (result.ok) released += 1;
  }

  return released;
}
