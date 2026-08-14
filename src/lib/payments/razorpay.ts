import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import Razorpay from "razorpay";

import { env, integrations, publicEnv } from "@/lib/env";

/**
 * Razorpay integration.
 *
 * Isolated behind this module so a second provider can be added later without
 * touching checkout: the rest of the app deals in "create a payment intent"
 * and "verify this callback", not in Razorpay specifics.
 *
 * NOTHING here trusts the browser. The client-side handler callback is treated
 * as a hint that payment may have happened; the authoritative confirmation is
 * the signature-verified webhook.
 */

let client: Razorpay | null = null;

function razorpay(): Razorpay {
  if (!integrations.razorpay()) {
    throw new Error(
      "Razorpay is not configured. Set NEXT_PUBLIC_RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.",
    );
  }
  client ??= new Razorpay({
    key_id: publicEnv.razorpayKeyId,
    key_secret: env().RAZORPAY_KEY_SECRET,
  });
  return client;
}

export type RazorpayOrder = {
  id: string;
  amount: number;
  currency: string;
};

export async function createRazorpayOrder({
  amountPaise,
  receipt,
  notes,
}: {
  amountPaise: number;
  /** Our order number, so a Razorpay dashboard row maps to a store order. */
  receipt: string;
  notes?: Record<string, string>;
}): Promise<RazorpayOrder> {
  const order = await razorpay().orders.create({
    amount: amountPaise, // Razorpay is denominated in paise, as we are.
    currency: "INR",
    receipt,
    notes,
    // Capture automatically: an authorised-but-uncaptured payment expires and
    // has to be chased manually, which is not a workflow this store wants.
    payment_capture: true,
  });

  return {
    id: order.id,
    amount: Number(order.amount),
    currency: order.currency,
  };
}

/** Constant-time HMAC comparison; `===` on secrets leaks timing. */
function safeEqual(a: string, b: string): boolean {
  const bufferA = Buffer.from(a, "utf8");
  const bufferB = Buffer.from(b, "utf8");
  if (bufferA.length !== bufferB.length) return false;
  return timingSafeEqual(bufferA, bufferB);
}

/**
 * Verifies the signature Razorpay Checkout hands back in the browser.
 *
 * A valid signature proves the payment reference really came from Razorpay,
 * but it is still only used to give the customer immediate feedback. Money is
 * recognised on the webhook.
 */
export function verifyCheckoutSignature({
  razorpayOrderId,
  razorpayPaymentId,
  signature,
}: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  signature: string;
}): boolean {
  const secret = env().RAZORPAY_KEY_SECRET;
  if (!secret) return false;

  const expected = createHmac("sha256", secret)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest("hex");

  return safeEqual(expected, signature);
}

/**
 * Verifies an inbound webhook.
 *
 * The signature is computed over the RAW request body. Parsing to JSON and
 * re-serialising changes byte-for-byte content (key order, whitespace) and
 * breaks verification — the caller must pass the untouched text.
 */
export function verifyWebhookSignature({
  rawBody,
  signature,
}: {
  rawBody: string;
  signature: string;
}): boolean {
  const secret = env().RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return false;

  const expected = createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");

  return safeEqual(expected, signature);
}

export async function fetchPayment(paymentId: string) {
  return razorpay().payments.fetch(paymentId);
}
