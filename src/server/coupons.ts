import "server-only";

import { db } from "@/lib/db";
import { applyPercentage } from "@/lib/money";

/**
 * Coupon validation.
 *
 * Runs server-side on every cart read and again inside the order transaction.
 * A coupon that was valid when applied can stop being valid — the cart total
 * drops below the minimum, the usage limit fills up, the window closes — so
 * validity is never cached on the cart.
 */

export type CouponValidation =
  | { valid: true; couponId: string; discountPaise: number }
  | { valid: false; reason: string };

export async function validateCoupon({
  code,
  userId,
  lines,
  subtotalPaise,
  /** Set when re-validating inside order creation, to exclude the in-flight order. */
  excludeOrderId,
}: {
  code: string;
  userId: string | null;
  lines: Array<{ productId: string; lineTotalPaise: number }>;
  subtotalPaise: number;
  excludeOrderId?: string;
}): Promise<CouponValidation> {
  const coupon = await db.coupon.findUnique({
    where: { code: code.toUpperCase().trim() },
  });

  if (!coupon || !coupon.isActive) {
    return { valid: false, reason: "This code isn't valid." };
  }

  const now = new Date();
  if (coupon.startsAt && coupon.startsAt > now) {
    return { valid: false, reason: "This code isn't active yet." };
  }
  if (coupon.endsAt && coupon.endsAt < now) {
    return { valid: false, reason: "This code has expired." };
  }

  if (coupon.usageLimit != null && coupon.usageCount >= coupon.usageLimit) {
    return { valid: false, reason: "This code has been fully redeemed." };
  }

  if (userId) {
    const used = await db.couponUsage.count({
      where: {
        couponId: coupon.id,
        userId,
        ...(excludeOrderId ? { orderId: { not: excludeOrderId } } : {}),
      },
    });
    if (used >= coupon.perCustomerLimit) {
      return { valid: false, reason: "You've already used this code." };
    }
  }

  // --- Which lines the coupon applies to -----------------------------------
  // An unrestricted coupon discounts the whole subtotal. A restricted one
  // discounts only the qualifying lines, so "15% off earrings" cannot take 15%
  // off a bridal set sitting in the same cart.
  const restricted =
    coupon.productIds.length > 0 || coupon.categoryIds.length > 0;

  let eligiblePaise = subtotalPaise;

  if (restricted) {
    const eligibleProductIds = new Set(coupon.productIds);

    if (coupon.categoryIds.length) {
      const inCategories = await db.product.findMany({
        where: {
          id: { in: lines.map((l) => l.productId) },
          categoryId: { in: coupon.categoryIds },
        },
        select: { id: true },
      });
      for (const p of inCategories) eligibleProductIds.add(p.id);
    }

    eligiblePaise = lines
      .filter((l) => eligibleProductIds.has(l.productId))
      .reduce((sum, l) => sum + l.lineTotalPaise, 0);

    if (eligiblePaise === 0) {
      return {
        valid: false,
        reason: "This code doesn't apply to anything in your bag.",
      };
    }
  }

  // Minimum order value is assessed against the whole cart, not the eligible
  // subset — that is what "minimum order value" means to a customer.
  if (subtotalPaise < coupon.minOrderPaise) {
    const shortfall = (coupon.minOrderPaise - subtotalPaise) / 100;
    return {
      valid: false,
      reason: `Spend ₹${shortfall.toLocaleString("en-IN")} more to use this code.`,
    };
  }

  const discountPaise =
    coupon.type === "PERCENTAGE"
      ? applyPercentage(eligiblePaise, coupon.value, coupon.maxDiscountPaise)
      : Math.min(coupon.value, eligiblePaise);

  if (discountPaise <= 0) {
    return { valid: false, reason: "This code doesn't reduce your total." };
  }

  return { valid: true, couponId: coupon.id, discountPaise };
}
