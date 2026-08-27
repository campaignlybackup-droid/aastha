import { AdminHeading, Panel } from "@/components/admin/ui";
import { CollectionManager } from "@/components/admin/collection-manager";
import { db } from "@/lib/db";
import { requireArea } from "@/server/auth";

export const metadata = { title: "Collections" };

export default async function AdminCollectionsPage() {
  await requireArea("products");

  const [collections, products, media] = await Promise.all([
    db.collection.findMany({
      orderBy: [{ position: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        imageId: true,
        image: { select: { id: true, url: true, secureUrl: true } },
        isActive: true,
        isFeatured: true,
        products: { select: { productId: true } },
        _count: { select: { products: true } },
      },
    }),
    db.product.findMany({
      where: { status: { in: ["ACTIVE", "DRAFT"] } },
      orderBy: { name: "asc" },
      select: { id: true, name: true, sku: true },
    }),
    db.media.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, url: true, filename: true, alt: true },
    }),
  ]);

  const mediaOptions = media.map((m) => ({
    id: m.id,
    url: m.url,
    label: m.alt || m.filename || m.id,
  }));

  return (
    <>
      <AdminHeading
        title="Collections"
        description="Curated groups that cut across categories — “Bridal Edit”, “Under ₹2,000”. Customize collection cover photos and products."
      />

      <Panel>
        <CollectionManager
          collections={collections.map((c) => ({
            ...c,
            productIds: c.products.map((p) => p.productId),
          }))}
          products={products}
          media={mediaOptions}
        />
      </Panel>
    </>
  );
}
