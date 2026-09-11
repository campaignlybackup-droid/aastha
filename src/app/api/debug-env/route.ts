import { NextResponse } from "next/server";
import { env, publicEnv } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function GET() {
  const mask = (str?: string) => {
    if (!str) return "MISSING";
    if (str.length <= 4) return "****";
    return str.substring(0, 4) + "..." + str.substring(str.length - 4);
  };

  return NextResponse.json({
    NEXT_PUBLIC_RAZORPAY_KEY_ID: mask(publicEnv.razorpayKeyId),
    RAZORPAY_KEY_SECRET: mask(env().RAZORPAY_KEY_SECRET),
    RAZORPAY_WEBHOOK_SECRET: mask(env().RAZORPAY_WEBHOOK_SECRET),
    META_CAPI_ACCESS_TOKEN: mask(env().META_CAPI_ACCESS_TOKEN),
  });
}
