import { AdminHeading, Panel } from "@/components/admin/ui";
import { ComboManager } from "@/components/admin/combo-manager";
import { db } from "@/lib/db";
import { requireArea } from "@/server/auth";
import { getComboOffers } from "@/server/combos";
import { getSetting } from "@/server/catalog";

export const metadata = { title: "Combo Offers | Admin" };

export default async function AdminCombosPage() {
  await requireArea("products");

  const [combos, products, media, comboSetting] = await Promise.all([
    getComboOffers(false),
    db.product.findMany({
      where: { status: "ACTIVE" },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        pricePaise: true,
        variants: {
          where: { isActive: true },
          select: { id: true, title: true, pricePaise: true },
        },
      },
    }),
    db.media.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, url: true, filename: true, alt: true },
    }),
    getSetting("combos"),
  ]);

  const mediaOptions = media.map((m) => ({
    id: m.id,
    url: m.url,
    label: m.alt || m.filename || m.id,
  }));

  return (
    <>
      <AdminHeading
        title="Combo Offers"
        description="Bundle multiple products at a discounted combo price with custom timers and live stock tracking."
      />

      <Panel>
        <ComboManager
          combos={combos}
          products={products}
          media={mediaOptions}
          combosEnabled={comboSetting.enabled}
        />
      </Panel>
    </>
  );
}
