import { AdminHeading, Panel } from "@/components/admin/ui";
import { BestSellersManager, type AdminProductItem } from "@/components/admin/bestsellers-manager";
import { db } from "@/lib/db";
import { requireArea } from "@/server/auth";
import { getSetting } from "@/server/catalog";

export const metadata = { title: "Best Sellers | Admin" };

export default async function AdminBestSellersPage() {
  await requireArea("products");

  const [setting, rawProducts] = await Promise.all([
    getSetting("bestsellers").catch(() => ({ productIds: [] as string[] })),
    db.product.findMany({
      where: { status: "ACTIVE" },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        sku: true,
        pricePaise: true,
        images: {
          where: { isPrimary: true },
          take: 1,
          include: { media: { select: { secureUrl: true, url: true } } },
        },
      },
    }),
  ]);

  const initialProductIds: string[] = Array.isArray((setting as any).productIds)
    ? (setting as any).productIds
    : [];

  const products: AdminProductItem[] = rawProducts.map((p) => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    pricePaise: p.pricePaise,
    imageUrl: p.images[0]?.media?.secureUrl || p.images[0]?.media?.url || null,
  }));

  return (
    <>
      <AdminHeading
        title="Best Sellers Management"
        description="Manually select, sequence, and feature your Best Selling products across the store."
      />

      <Panel>
        <div className="p-5">
          <BestSellersManager initialProductIds={initialProductIds} products={products} />
        </div>
      </Panel>
    </>
  );
}
