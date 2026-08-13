import { NextResponse, type NextRequest } from "next/server";

import { getSearchSuggestions } from "@/server/catalog";
import { rateLimit } from "@/lib/ratelimit";
import { clientIp } from "@/lib/request";

/**
 * Type-ahead suggestions for the header search overlay.
 *
 * Rate limited because it is an unauthenticated endpoint that runs several
 * `ILIKE` queries per call — trivially abusable as a database load generator
 * otherwise.
 */
export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.slice(0, 80) ?? "";

  if (query.trim().length < 2) {
    return NextResponse.json({ products: [], categories: [], collections: [] });
  }

  const limit = await rateLimit({
    bucket: `search:suggest:${clientIp(request)}`,
    limit: 40,
    windowSeconds: 60,
  });

  if (!limit.allowed) {
    return NextResponse.json(
      { products: [], categories: [], collections: [] },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  const suggestions = await getSearchSuggestions(query);

  return NextResponse.json(suggestions, {
    headers: {
      // Short shared cache: suggestions change only when the catalogue does.
      "Cache-Control": "private, max-age=30",
    },
  });
}
