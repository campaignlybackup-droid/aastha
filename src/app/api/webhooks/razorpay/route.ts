import { NextResponse, type NextRequest } from "next/server";

import { db } from "@/lib/db";
import { integrations } from "@/lib/env";
import { verifyWebhookSignature } from "@/lib/payments/razorpay";
import { confirmOrder } from "@/server/orders";
import { onOrderConfirmed, onPaymentFailed } from "@/server/notifications";

/**
 * Razorpay webhook.
 *
 * This is the authoritative record of payment — not the browser callback.
 *
 * Order of operations matters:
 *   1. Read the RAW body. Signature is computed over exact bytes, so parsing
 *      first and re-serialising would break verification.
 *   2. Verify the signature. Anything unsigned is discarded; this endpoint is
 *      public and would otherwise let anyone mark orders paid.
 *   3. Claim the event id. The unique constraint on (provider, eventId) makes
 *      a duplicate delivery a no-op instead of a second stock decrement.
 *   4. Only then act.
 *
 * Always returns 200 once the event is recorded. A non-2xx makes Razorpay
 * retry, which is only useful when we genuinely failed to persist anything.
 */

export const dynamic = "force-dynamic";
// The signature covers the raw body, so no framework body parsing may occur.
export const runtime = "nodejs";

type RazorpayPaymentEntity = {
  id?: string;
  order_id?: string;
  amount?: number;
  method?: string;
  status?: string;
  error_description?: string;
  error_code?: string;
  notes?: Record<string, string>;
};

type RazorpayWebhookPayload = {
  event?: string;
  payload?: { payment?: { entity?: RazorpayPaymentEntity } };
};

export async function POST(request: NextRequest) {
  if (!integrations.razorpayWebhook()) {
    console.error("[razorpay] Webhook received but no secret is configured.");
    return NextResponse.json({ ok: false }, { status: 503 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature") ?? "";

  if (!signature || !verifyWebhookSignature({ rawBody, signature })) {
    // Deliberately terse: an attacker probing this endpoint learns nothing.
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  let payload: RazorpayWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as RazorpayWebhookPayload;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const eventType = payload.event ?? "unknown";
  const payment = payload.payload?.payment?.entity;

  // Razorpay's own delivery id, falling back to the payment id so an event
  // without the header still deduplicates on something stable.
  const eventId =
    request.headers.get("x-razorpay-event-id") ??
    `${eventType}:${payment?.id ?? rawBody.length}`;

  // --- Idempotency ---------------------------------------------------------
  try {
    await db.webhookEvent.create({
      data: {
        provider: "razorpay",
        eventId,
        eventType,
        payload: payload as never,
      },
    });
  } catch {
    // Unique violation: we have seen this delivery. Acknowledge and stop.
    return NextResponse.json({ ok: true, duplicate: true });
  }

  try {
    await handleEvent(eventType, payment);

    await db.webhookEvent.update({
      where: { provider_eventId: { provider: "razorpay", eventId } },
      data: { processedAt: new Date() },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[razorpay] Failed handling ${eventType}:`, message);

    await db.webhookEvent.update({
      where: { provider_eventId: { provider: "razorpay", eventId } },
      data: { error: message.slice(0, 1000) },
    });

    // The event is recorded, so a retry would be deduplicated away and achieve
    // nothing. Acknowledge and let the stored error drive a manual replay.
    return NextResponse.json({ ok: true, handled: false });
  }

  return NextResponse.json({ ok: true });
}

async function handleEvent(
  eventType: string,
  payment: RazorpayPaymentEntity | undefined,
) {
  if (!payment?.id) return;

  // Our order id travels in `notes`, set when the Razorpay order was created.
  const orderId = payment.notes?.orderId;
  if (!orderId) {
    console.warn(`[razorpay] ${eventType} for ${payment.id} has no orderId note.`);
    return;
  }

  switch (eventType) {
    case "payment.captured":
    case "order.paid": {
      const result = await confirmOrder({
        orderId,
        providerPaymentId: payment.id,
        providerOrderId: payment.order_id ?? null,
        method: payment.method ?? null,
        amountPaise: payment.amount ?? 0,
        rawPayload: payment,
      });

      // Notifications and the Meta Purchase event fire only on the transition
      // to CONFIRMED, never on a duplicate delivery.
      if (result.ok && !result.alreadyConfirmed) {
        await onOrderConfirmed(orderId);
      }
      break;
    }

    case "payment.failed": {
      await db.payment.upsert({
        where: { providerPaymentId: payment.id },
        update: {
          status: "FAILED",
          failureCode: payment.error_code ?? null,
          failureDescription: payment.error_description ?? null,
        },
        create: {
          orderId,
          provider: "RAZORPAY",
          status: "FAILED",
          amountPaise: payment.amount ?? 0,
          providerPaymentId: payment.id,
          providerOrderId: payment.order_id ?? null,
          failureCode: payment.error_code ?? null,
          failureDescription: payment.error_description ?? null,
          rawPayload: payment as never,
        },
      });

      // The order stays PENDING so the customer can retry. Stale reservations
      // are released by the hourly cron if they never do.
      await db.order.update({
        where: { id: orderId },
        data: { paymentStatus: "FAILED" },
      });

      await onPaymentFailed(orderId);
      break;
    }

    case "refund.processed": {
      // Recorded for reconciliation. Refund handling proper is V2.
      await db.payment.updateMany({
        where: { providerPaymentId: payment.id },
        data: { status: "REFUNDED" },
      });
      await db.order.update({
        where: { id: orderId },
        data: { paymentStatus: "REFUNDED" },
      });
      break;
    }

    default:
      // Subscribed to more events than we handle — that is fine and expected.
      break;
  }
}
