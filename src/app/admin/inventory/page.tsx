import Link from "next/link";

import { AdminHeading, Panel, TableWrap, Td, Th, EmptyRow } from "@/components/admin/ui";
import { StockEditor } from "@/components/admin/stock-editor";
import { Badge } from "@/components/ui/primitives";
import { db } from "@/lib/db";
import { requireArea } from "@/server/auth";

export const metadata = { title: "Inventory" };

/**
 * Inventory.
 *
 * Sorted by scarcity, not alphabetically — the reason to open this page is to
 * find what is about to run out.
 *
 * "Free" is stock minus what in-flight orders have reserved. That is the
 * number the storefront sells against, so it is the number shown here.
 */
export default async function AdminInventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  await requireArea("inventory");
  const { filter } = await searchParams;

  const variants = await db.productVariant.findMany({
    where: {
      isActive: true,
      trackInventory: true,
      product: { status: { in: ["ACTIVE", "DRAFT"] } },
    },
    orderBy: [{ stockQuantity: "asc" }, { updatedAt: "desc" }],
    take: 200,
    select: {
      id: true,
      sku: true,
      title: true,
      stockQuantity: true,
      reservedQuantity: true,
      lowStockThreshold: true,
      product: { select: { id: true, name: true, status: true } },
    },
  });

  const withFree = variants.map((variant) => ({
    ...variant,
    free: Math.max(0, variant.stockQuantity - variant.reservedQuantity),
  }));

  const visible =
    filter === "low"
      ? withFree.filter((v) => v.free <= v.lowStockThreshold)
      : filter === "out"
        ? withFree.filter((v) => v.free === 0)
        : withFree;

  const lowCount = withFree.filter((v) => v.free <= v.lowStockThreshold).length;
  const outCount = withFree.filter((v) => v.free === 0).length;

  return (
    <>
      <AdminHeading
        title="Inventory"
        description="“Free” is stock minus quantities held by unpaid orders — the number customers can actually buy."
      />

      <nav aria-label="Filter" className="mb-5 flex flex-wrap gap-1.5">
        {[
          { value: undefined, label: `All (${withFree.length})` },
          { value: "low", label: `Low stock (${lowCount})` },
          { value: "out", label: `Out of stock (${outCount})` },
        ].map((tab) => {
          const active = filter === tab.value || (!filter && !tab.value);
          return (
            <Link
              key={tab.label}
              href={tab.value ? `/admin/inventory?filter=${tab.value}` : "/admin/inventory"}
              aria-current={active ? "page" : undefined}
              className={
                active
                  ? "rounded-xs bg-brand-800 px-3 py-1.5 text-xs text-sand-50"
                  : "rounded-xs border border-line-strong px-3 py-1.5 text-xs text-content-muted hover:border-[var(--color-accent)]"
              }
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>

      <Panel>
        <TableWrap>
          <thead>
            <tr>
              <Th>Product</Th>
              <Th>Variant</Th>
              <Th align="right">In stock</Th>
              <Th align="right">Reserved</Th>
              <Th align="right">Free</Th>
              <Th align="right">Adjust</Th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <EmptyRow colSpan={6} message="Nothing to show in this view." />
            ) : (
              visible.map((variant) => (
                <tr key={variant.id} className="hover:bg-sand-50">
                  <Td>
                    <Link
                      href={`/admin/products/${variant.product.id}`}
                      className="hover:text-[var(--color-accent)]"
                    >
                      {variant.product.name}
                    </Link>
                    {variant.product.status !== "ACTIVE" ? (
                      <Badge variant="neutral" className="ml-2">
                        {variant.product.status}
                      </Badge>
                    ) : null}
                    <span className="block text-xs text-content-subtle">
                      {variant.sku}
                    </span>
                  </Td>
                  <Td className="text-content-muted">{variant.title}</Td>
                  <Td align="right">{variant.stockQuantity}</Td>
                  <Td align="right" className="text-content-muted">
                    {variant.reservedQuantity || "—"}
                  </Td>
                  <Td align="right">
                    {variant.free === 0 ? (
                      <Badge variant="danger">Out</Badge>
                    ) : variant.free <= variant.lowStockThreshold ? (
                      <Badge variant="warning">{variant.free}</Badge>
                    ) : (
                      variant.free
                    )}
                  </Td>
                  <Td align="right">
                    <StockEditor
                      variantId={variant.id}
                      stockQuantity={variant.stockQuantity}
                    />
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </TableWrap>
      </Panel>
    </>
  );
}
