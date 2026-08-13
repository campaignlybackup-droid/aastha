import { NextResponse } from "next/server";

import { getCartCount } from "@/server/cart";

/**
 * Item count for the header badge.
 *
 * Exists so the storefront layout does not have to read the cart cookie, which
 * would force every catalogue page into dynamic rendering. See
 * components/storefront/cart-badge.tsx.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const count = await getCartCount();

  return NextResponse.json(
    { count },
    // Per-visitor and volatile — never let a shared cache hold this.
    { headers: { "Cache-Control": "no-store, private" } },
  );
}
