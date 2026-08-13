import "server-only";

import { db } from "@/lib/db";

/**
 * Fixed-window rate limiting backed by Postgres.
 *
 * Redis would be the conventional choice, but it would be the only piece of
 * infrastructure this store needs beyond Postgres, for a traffic level where
 * a single indexed upsert per limited request is immaterial. Revisit if OTP
 * volume ever justifies it.
 *
 * The window is fixed rather than sliding, which permits a burst of up to 2×
 * the limit across a window boundary. That is an acceptable trade here: the
 * limits exist to stop abuse and runaway loops, not to meter precisely.
 */

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  limit: number;
  retryAfterSeconds: number;
};

export async function rateLimit({
  bucket,
  limit,
  windowSeconds,
}: {
  /** Stable identity for the thing being limited, e.g. `otp:send:9198…`. */
  bucket: string;
  limit: number;
  windowSeconds: number;
}): Promise<RateLimitResult> {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const windowStart = new Date(Math.floor(now / windowMs) * windowMs);
  const expiresAt = new Date(windowStart.getTime() + windowMs);

  try {
    // Atomic: the unique constraint on (bucket, windowStart) makes concurrent
    // requests contend on one row, and `increment` is evaluated by Postgres.
    const record = await db.rateLimit.upsert({
      where: { bucket_windowStart: { bucket, windowStart } },
      update: { count: { increment: 1 } },
      create: { bucket, windowStart, expiresAt, count: 1 },
      select: { count: true },
    });

    const allowed = record.count <= limit;
    return {
      allowed,
      remaining: Math.max(0, limit - record.count),
      limit,
      retryAfterSeconds: allowed
        ? 0
        : Math.max(1, Math.ceil((expiresAt.getTime() - now) / 1000)),
    };
  } catch {
    // Fail open. A rate limiter that takes the site down when the database
    // hiccups is worse than the abuse it prevents — the endpoints that must
    // not fail open (OTP verification) enforce their own attempt caps in the
    // same transaction as the check.
    return { allowed: true, remaining: limit, limit, retryAfterSeconds: 0 };
  }
}

/** Reads the current count without consuming budget. */
export async function peekRateLimit(bucket: string, windowSeconds: number) {
  const windowMs = windowSeconds * 1000;
  const windowStart = new Date(Math.floor(Date.now() / windowMs) * windowMs);
  const record = await db.rateLimit.findUnique({
    where: { bucket_windowStart: { bucket, windowStart } },
    select: { count: true },
  });
  return record?.count ?? 0;
}

/**
 * Deletes expired windows. Called from the daily cron; rows are tiny but
 * unbounded growth is still growth.
 */
export async function pruneRateLimits() {
  const { count } = await db.rateLimit.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
  return count;
}
