import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";

import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { confirmOrder } from "@/server/orders";

function safeEqual(a: string, b: string): boolean {
  const bufferA = Buffer.from(a, "utf8");
  const bufferB = Buffer.from(b, "utf8");
  if (bufferA.length !== bufferB.length) return false;
  return timingSafeEqual(bufferA, bufferB);
}

export async function POST(request: Request) {
  try {
    const keySecret = env().RAZORPAY_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
      return NextResponse.json(
        { error: "Razorpay secret key not configured" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json(
        { error: "Missing required verification fields: razorpay_order_id, razorpay_payment_id, or razorpay_signature" },
        { status: 400 }
      );
    }

    const expectedSignature = createHmac("sha256", keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    const isMatched = safeEqual(expectedSignature, razorpay_signature);

    if (!isMatched) {
      return NextResponse.json(
        { success: false, error: "Signature mismatch" },
        { status: 400 }
      );
    }

    // Update database order to CONFIRMED & PAID
    const targetId = orderId || body.order_id;
    if (targetId) {
      const order = await db.order.findUnique({
        where: { id: targetId },
        select: { id: true, totalPaise: true, internalNote: true },
      }).catch(() => null);

      if (order) {
        const isPartialCod = Boolean(order.internalNote?.includes("[PARTIAL_COD]"));
        const expectedAdvance = isPartialCod ? Math.round(order.totalPaise * 0.60) : order.totalPaise;

        await confirmOrder({
          orderId: order.id,
          providerPaymentId: razorpay_payment_id,
          providerOrderId: razorpay_order_id,
          amountPaise: expectedAdvance,
        }).catch((err) => {
          console.error("[verify-payment] confirmOrder error:", err);
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: "Payment verified successfully",
    });
  } catch (error: unknown) {
    console.error("[Razorpay verify-payment error]:", error);
    const message = error instanceof Error ? error.message : "Payment verification failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
