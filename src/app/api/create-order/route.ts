import { NextResponse } from "next/server";
import Razorpay from "razorpay";

import { env, publicEnv } from "@/lib/env";

export async function POST(request: Request) {
  try {
    const keyId = publicEnv.razorpayKeyId || process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    const keySecret = env().RAZORPAY_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      return NextResponse.json(
        { error: "Razorpay credentials not configured" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { amount, currency = "INR", receipt } = body;

    // Minimum amount: 100 paise (1 INR)
    const amountPaise = Number(amount);
    if (isNaN(amountPaise) || amountPaise < 100) {
      return NextResponse.json(
        { error: "Amount must be a number of at least 100 paise (1 INR)" },
        { status: 400 }
      );
    }

    const razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });

    const order = await razorpay.orders.create({
      amount: amountPaise,
      currency: currency || "INR",
      receipt: receipt || `receipt_${Date.now()}`,
      payment_capture: true,
    });

    return NextResponse.json({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
    });
  } catch (error: unknown) {
    console.error("[Razorpay create-order error]:", error);
    const message = error instanceof Error ? error.message : "Failed to create Razorpay order";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
