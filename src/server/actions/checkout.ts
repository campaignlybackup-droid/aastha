"use server";

import { z } from "zod";

import { db } from "@/lib/db";
import { integrations, publicEnv } from "@/lib/env";
import {
  createRazorpayOrder,
  verifyCheckoutSignature,
} from "@/lib/payments/razorpay";
import { getCart } from "@/server/cart";
import { getCurrentUser } from "@/server/auth";
import { confirmOrder, createPendingOrder } from "@/server/orders";
import { onOrderConfirmed } from "@/server/notifications";

/**
 * Checkout.
 *
 * Sequence:
 *   1. Re-price the cart server-side.
 *   2. Create a PENDING order and reserve its stock.
 *   3. Create a Razorpay order for exactly that amount.
 *   4. Browser opens Razorpay Checkout with the returned id.
 *   5. Razorpay's WEBHOOK confirms the order. The browser callback only gives
 *      the customer immediate feedback.
 *
 * The amount the browser sees comes from step 2, not from the browser.
 */

export type StartCheckoutResult =
  | {
      ok: true;
      orderId: string;
      orderNumber: string;
      amountPaise: number;
      metaEventId: string;
      razorpay: {
        keyId: string;
        orderId: string;
      } | null;
      /** True when Razorpay is unconfigured; the UI explains rather than fails. */
      paymentUnavailable: boolean;
    }
  | { ok: false; error: string };

const startSchema = z.object({
  addressId: z.string().min(1).max(40),
  email: z.email().max(180).optional().or(z.literal("")),
  customerNote: z.string().max(500).optional(),
  isGiftWrapped: z.boolean().optional(),
  paymentMethod: z.enum(["ONLINE", "PARTIAL_COD"]).optional().default("ONLINE"),
});

export async function startCheckout(
  input: z.input<typeof startSchema>,
): Promise<StartCheckoutResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Please sign in to continue." };

  const parsed = startSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Please choose a delivery address." };
  }

  // Ownership is enforced in the query, not assumed from the id.
  const address = await db.address.findFirst({
    where: { id: parsed.data.addressId, userId: user.id, deletedAt: null },
  });
  if (!address) {
    return { ok: false, error: "That delivery address is no longer available." };
  }

  const cart = await getCart();
  if (cart.lines.length === 0) {
    return { ok: false, error: "Your bag is empty." };
  }

  const email = parsed.data.email?.trim().toLowerCase() || user.email || null;

  // Remember the email for next time, so receipts keep working.
  if (email && email !== user.email) {
    const taken = await db.user.findFirst({
      where: { email, id: { not: user.id } },
      select: { id: true },
    });
    if (!taken) {
      await db.user.update({ where: { id: user.id }, data: { email } });
    }
  }

  const created = await createPendingOrder({
    userId: user.id,
    cart,
    address: {
      name: address.name,
      mobile: address.mobile,
      email,
      line1: address.line1,
      line2: address.line2,
      landmark: address.landmark,
      city: address.city,
      state: address.state,
      pincode: address.pincode,
      country: address.country,
    },
    customerNote: parsed.data.customerNote,
    isGiftWrapped: parsed.data.isGiftWrapped,
    paymentMethod: parsed.data.paymentMethod,
  });

  if (!created.ok) return { ok: false, error: created.error };

  // Amount charged now online (100% for ONLINE, 60% advance for PARTIAL_COD)
  const amountToChargePaise = created.payableNowPaise;

  // Razorpay not configured yet: the order still exists, so the store owner
  // can see the demand and the customer gets a clear explanation instead of a
  // stack trace.
  if (!integrations.razorpay()) {
    return {
      ok: true,
      orderId: created.orderId,
      orderNumber: created.orderNumber,
      amountPaise: amountToChargePaise,
      metaEventId: created.metaEventId,
      razorpay: null,
      paymentUnavailable: true,
    };
  }

  try {
    const rzpOrder = await createRazorpayOrder({
      amountPaise: amountToChargePaise,
      receipt: created.orderNumber,
      // The webhook reads `orderId` back out of these notes.
      notes: {
        orderId: created.orderId,
        orderNumber: created.orderNumber,
        paymentMethod: parsed.data.paymentMethod,
      },
    });

    await db.payment.create({
      data: {
        orderId: created.orderId,
        provider: "RAZORPAY",
        status: "PENDING",
        amountPaise: amountToChargePaise,
        providerOrderId: rzpOrder.id,
      },
    });

    return {
      ok: true,
      orderId: created.orderId,
      orderNumber: created.orderNumber,
      amountPaise: amountToChargePaise,
      metaEventId: created.metaEventId,
      razorpay: { keyId: publicEnv.razorpayKeyId, orderId: rzpOrder.id },
      paymentUnavailable: false,
    };
  } catch (error) {
    console.error("[checkout] Razorpay order creation failed", error);
    return {
      ok: false,
      error: "We couldn't reach the payment gateway. Please try again.",
    };
  }
}

export type VerifyPaymentResult =
  | { ok: true; orderId: string; orderNumber: string }
  | { ok: false; error: string };

/**
 * Handles the browser's post-payment callback.
 *
 * This exists to move the customer to the confirmation page promptly. It
 * verifies the signature — so a forged callback cannot mark an order paid —
 * but the webhook remains the authority. If the webhook has already landed,
 * `confirmOrder` returns `alreadyConfirmed` and nothing runs twice.
 */
export async function verifyCheckoutPayment(input: {
  orderId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  signature: string;
}): Promise<VerifyPaymentResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Please sign in." };

  const order = await db.order.findFirst({
    where: { id: input.orderId, userId: user.id },
    select: { id: true, orderNumber: true, totalPaise: true, internalNote: true, status: true },
  });
  if (!order) return { ok: false, error: "Order not found." };

  if (order.status === "CONFIRMED") {
    return { ok: true, orderId: order.id, orderNumber: order.orderNumber };
  }

  const valid = verifyCheckoutSignature({
    razorpayOrderId: input.razorpayOrderId,
    razorpayPaymentId: input.razorpayPaymentId,
    signature: input.signature,
  });

  if (!valid) {
    // Either tampering, or a genuine mismatch. Either way the webhook is the
    // safety net, so do not confirm.
    return {
      ok: false,
      error: "We couldn't verify that payment. If money was debited, it will be confirmed shortly.",
    };
  }

  const isPartialCod = Boolean(order.internalNote?.includes("[PARTIAL_COD]"));
  const expectedAmountPaise = isPartialCod ? Math.round(order.totalPaise * 0.60) : order.totalPaise;

  const result = await confirmOrder({
    orderId: order.id,
    providerPaymentId: input.razorpayPaymentId,
    providerOrderId: input.razorpayOrderId,
    amountPaise: expectedAmountPaise,
  });

  if (!result.ok) return { ok: false, error: result.error };

  if (!result.alreadyConfirmed) {
    await onOrderConfirmed(order.id);
  }

  return { ok: true, orderId: order.id, orderNumber: order.orderNumber };
}
