import type { Metadata } from "next";
import Link from "next/link";
import { Heart } from "lucide-react";

import { ProductCard, ProductGrid } from "@/components/storefront/product-card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/primitives";
import { db } from "@/lib/db";
import { toProductCard } from "@/server/catalog";
import { requireUser } from "@/server/auth";
import type { Prisma } from "@/generated/prisma/client";

export const metadata: Metadata = {
  title: "Wishlist",
  robots: { index: false, follow: false },
};

const cardSelect = {
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

export default async function WishlistPage() {
  const user = await requireUser("/account/wishlist");

  const saved = await db.wishlistItem.findMany({
    where: { userId: user.id, product: { status: "ACTIVE" } },
    orderBy: { createdAt: "desc" },
    select: { product: { select: cardSelect } },
  });

  const products = saved.map((item) => toProductCard(item.product));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl">Wishlist</h2>
        <p className="mt-1 text-sm text-content-muted">
          Pieces you&rsquo;ve saved for later.
        </p>
      </div>

      {products.length === 0 ? (
        <EmptyState
          icon={Heart}
          title="Nothing saved yet"
          description="Tap the heart on any piece to keep it here."
          action={
            <Button asChild>
              <Link href="/shop">Browse jewellery</Link>
            </Button>
          }
        />
      ) : (
        <ProductGrid columns={3}>
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </ProductGrid>
      )}
    </div>
  );
}
