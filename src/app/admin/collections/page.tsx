import { AdminHeading, Panel } from "@/components/admin/ui";
import { CollectionManager } from "@/components/admin/collection-manager";
import { db } from "@/lib/db";
import { requireArea } from "@/server/auth";

export const metadata = { title: "Collections" };

export default async function AdminCollectionsPage() {
  await requireArea("products");

  const [collections, products] = await Promise.all([
    db.collection.findMany({
      orderBy: [{ position: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
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
  ]);

  return (
    <>
      <AdminHeading
        title="Collections"
        description="Curated groups that cut across categories — “Bridal Edit”, “Under ₹2,000”. A product can sit in any number of them."
      />

      <Panel>
        <CollectionManager
          collections={collections.map((c) => ({
            ...c,
            productIds: c.products.map((p) => p.productId),
          }))}
          products={products}
        />
      </Panel>
    </>
  );
}
