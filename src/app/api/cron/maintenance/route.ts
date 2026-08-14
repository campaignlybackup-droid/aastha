import { NextResponse, type NextRequest } from "next/server";

import { env } from "@/lib/env";
import { pruneRateLimits } from "@/lib/ratelimit";
import { pruneExpiredOtps } from "@/server/otp";
import { releaseStaleReservations } from "@/server/orders";
import { db } from "@/lib/db";

/**
 * Scheduled maintenance.
 *
 * Hourly: release stock held by checkouts that were started but never paid.
 * Without it, abandoned baskets slowly make the catalogue look sold out.
 *
 * Also prunes expired OTP and rate-limit rows, and marks finished campaigns
 * EXPIRED. Note the campaign sweep is cosmetic only — whether a campaign is
 * live is decided by its dates at read time, so a missed run cannot leave a
 * finished campaign on the storefront.
 *
 * Protected by a bearer token: this endpoint is public and mutates data.
 */
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const secret = env().CRON_SECRET;

  if (!secret) {
    return NextResponse.json(
      { ok: false, error: "CRON_SECRET is not configured." },
      { status: 503 },
    );
  }

  // Vercel Cron sends the secret as a bearer token.
  const provided = request.headers.get("authorization");
  if (provided !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const now = new Date();

  const [released, otps, limits, expired] = await Promise.all([
    releaseStaleReservations(30),
    pruneExpiredOtps(),
    pruneRateLimits(),
    db.campaign.updateMany({
      where: { status: { in: ["SCHEDULED", "ACTIVE"] }, endsAt: { lt: now } },
      data: { status: "EXPIRED" },
    }),
  ]);

  return NextResponse.json({
    ok: true,
    releasedReservations: released,
    prunedOtps: otps,
    prunedRateLimits: limits,
    expiredCampaigns: expired.count,
  });
}
