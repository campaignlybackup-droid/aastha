import { NextResponse, type NextRequest } from "next/server";

import { db } from "@/lib/db";
import { toProductCard } from "@/server/catalog";
import type { Prisma } from "@/generated/prisma/client";

/**
 * Product cards by slug, preserving the requested order.
 * Backs the client-rendered "Recently viewed" strip.
 */

const MAX_SLUGS = 12;

const select = {
  id: true,
  slug: true,
  name: true,
  shortDescription: true,
  pricePaise: true,
  mrpPaise: true,
  ratingAverage: true,
  ratingCount: true,
  salesCount: true,
  publishedAt: true,
  isFeatured: true,
  silverPurity: true,
  category: { select: { name: true, slug: true } },
  images: {
    orderBy: { position: "asc" },
    take: 2,
    select: {
      alt: true,
      media: { select: { secureUrl: true, blurDataUrl: true } },
    },
  },
  variants: {
    where: { isActive: true },
    select: {
      id: true,
      stockQuantity: true,
      reservedQuantity: true,
      trackInventory: true,
      lowStockThreshold: true,
    },
  },
} satisfies Prisma.ProductSelect;

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("slugs") ?? "";

  const slugs = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, MAX_SLUGS);

  if (!slugs.length) return NextResponse.json({ products: [] });

  const rows = await db.product.findMany({
    where: { slug: { in: slugs }, status: "ACTIVE" },
    select,
  });

  const bySlug = new Map(rows.map((row) => [row.slug, row]));
  const products = slugs
    .map((slug) => bySlug.get(slug))
    .filter((row): row is (typeof rows)[number] => Boolean(row))
    .map(toProductCard);

  return NextResponse.json(
    { products },
    { headers: { "Cache-Control": "private, max-age=60" } },
  );
}
