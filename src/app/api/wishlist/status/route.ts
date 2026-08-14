import { NextResponse, type NextRequest } from "next/server";

import { db } from "@/lib/db";
import { getCurrentUser } from "@/server/auth";

/**
 * Whether the current visitor has saved a product.
 *
 * Exists so the product page does not have to read the session. Doing that in
 * the page would opt every prerendered product page into dynamic rendering —
 * the same trade already made for the header bag count.
 */
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const productId = request.nextUrl.searchParams.get("productId")?.slice(0, 40);

  const user = await getCurrentUser();
  if (!user || !productId) {
    return NextResponse.json(
      { signedIn: Boolean(user), saved: false },
      { headers: { "Cache-Control": "no-store, private" } },
    );
  }

  const saved = await db.wishlistItem.findUnique({
    where: { userId_productId: { userId: user.id, productId } },
    select: { id: true },
  });

  return NextResponse.json(
    { signedIn: true, saved: Boolean(saved) },
    { headers: { "Cache-Control": "no-store, private" } },
  );
}
