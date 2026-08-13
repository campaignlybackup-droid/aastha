import "server-only";

import type { NextRequest } from "next/server";

/**
 * Best-effort client IP.
 *
 * Behind Vercel, `x-forwarded-for` is set by the platform and its first entry
 * is the real client. Self-hosting behind a different proxy may need a
 * different header — this is the single place to change it.
 *
 * Used for rate-limit bucketing and audit logs only. Never trust it for
 * authorisation: the header is client-supplied when no proxy overwrites it.
 */
export function clientIp(request: NextRequest | Request): string {
  const headers = request.headers;
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return headers.get("x-real-ip")?.trim() || "unknown";
}

export function userAgent(request: NextRequest | Request): string {
  return request.headers.get("user-agent")?.slice(0, 300) ?? "";
}
