import Link from "next/link";

import {
  AdminHeading,
  AdminPagination,
  EmptyRow,
  Panel,
  TableWrap,
  Td,
  Th,
} from "@/components/admin/ui";
import { ProductStatusToggle } from "@/components/admin/product-status-toggle";
import { MediaImage } from "@/components/ui/media-image";
import { Badge } from "@/components/ui/primitives";
import { db } from "@/lib/db";
import { formatPrice, discountPercent } from "@/lib/money";
import { requireArea } from "@/server/auth";
import type { Prisma } from "@/generated/prisma/client";
import type { ProductStatus } from "@/generated/prisma/enums";

export const metadata = { title: "Products" };

const PER_PAGE = 25;

const STATUS_TABS = [
  { value: "all", label: "All" },
  { value: "ACTIVE", label: "Active" },
  { value: "DRAFT", label: "Draft" },
  { value: "ARCHIVED", label: "Archived" },
];

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; page?: string }>;
}) {
  await requireArea("products");
  const params = await searchParams;

  const status = STATUS_TABS.some((t) => t.value === params.status)
    ? params.status!
    : "all";
  const query = params.q?.trim() ?? "";
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);

  const where: Prisma.ProductWhereInput = {
    ...(status !== "all" ? { status: status as ProductStatus } : {}),
    ...(query
      ? {
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { sku: { contains: query, mode: "insensitive" } },
            { tags: { has: query.toLowerCase() } },
          ],
        }
      : {}),
  };

  const [products, total] = await Promise.all([
    db.product.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      select: {
        id: true,
        name: true,
        slug: true,
        sku: true,
        status: true,
        pricePaise: true,
        mrpPaise: true,
        salesCount: true,
        category: { select: { name: true } },
        images: {
          orderBy: { position: "asc" },
          take: 1,
          select: { media: { select: { secureUrl: true } } },
        },
        variants: {
          where: { isActive: true },
          select: {
            stockQuantity: true,
            reservedQuantity: true,
            trackInventory: true,
          },
        },
      },
    }),
    db.product.count({ where }),
  ]);

  const pageCount = Math.max(1, Math.ceil(total / PER_PAGE));

  const hrefFor = (overrides: Record<string, string | undefined>) => {
    const next = new URLSearchParams();
    const merged = { status, q: query, page: String(page), ...overrides };
    for (const [key, value] of Object.entries(merged)) {
      if (value && value !== "all" && !(key === "page" && value === "1")) {
        next.set(key, value);
      }
    }
    const qs = next.toString();
    return qs ? `/admin/products?${qs}` : "/admin/products";
  };

  return (
    <>
      <AdminHeading
        title="Products"
        description={`${total} ${total === 1 ? "product" : "products"}`}
      />

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <nav aria-label="Filter by status" className="flex flex-wrap gap-1.5">
          {STATUS_TABS.map((tab) => (
            <Link
              key={tab.value}
              href={hrefFor({ status: tab.value, page: "1" })}
              aria-current={tab.value === status ? "page" : undefined}
              className={
                tab.value === status
                  ? "rounded-xs bg-brand-800 px-3 py-1.5 text-xs text-sand-50"
                  : "rounded-xs border border-line-strong px-3 py-1.5 text-xs text-content-muted hover:border-[var(--color-accent)]"
              }
            >
              {tab.label}
            </Link>
          ))}
        </nav>

        <form method="GET" action="/admin/products" className="ml-auto flex gap-2">
          {status !== "all" ? (
            <input type="hidden" name="status" value={status} />
          ) : null}
          <label htmlFor="product-search" className="sr-only">
            Search products
          </label>
          <input
            id="product-search"
            name="q"
            defaultValue={query}
            placeholder="Name, SKU or tag"
            className="h-9 w-56 rounded-sm border border-line-strong bg-surface-raised px-3 text-sm outline-none focus:border-[var(--color-accent)]"
          />
          <button
            type="submit"
            className="rounded-sm border border-line-strong px-3 text-xs hover:border-[var(--color-accent)]"
          >
            Search
          </button>
        </form>
      </div>

      <Panel>
        <TableWrap>
          <thead>
            <tr>
              <Th>Product</Th>
              <Th>Category</Th>
              <Th align="right">Price</Th>
              <Th align="right">Stock</Th>
              <Th align="right">Sold</Th>
              <Th align="center">Status</Th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <EmptyRow
                colSpan={6}
                message={query ? `No products match “${query}”.` : "No products yet."}
              />
            ) : (
              products.map((product) => {
                const free = product.variants.reduce(
                  (sum, v) =>
                    sum +
                    (v.trackInventory
                      ? Math.max(0, v.stockQuantity - v.reservedQuantity)
                      : 0),
                  0,
                );
                const untracked = product.variants.some((v) => !v.trackInventory);
                const off = discountPercent(product.mrpPaise, product.pricePaise);

                return (
                  <tr key={product.id} className="hover:bg-sand-50">
                    <Td>
                      <div className="flex items-center gap-3">
                        <div className="relative size-11 shrink-0 overflow-hidden bg-sand-100">
                          {product.images[0] ? (
                            <MediaImage
                              src={product.images[0].media.secureUrl}
                              alt=""
                              fill
                              sizes="44px"
                              className="object-cover"
                            />
                          ) : null}
                        </div>
                        <div className="min-w-0">
                          <Link
                            href={`/admin/products/${product.id}`}
                            className="block truncate font-medium hover:text-[var(--color-accent)]"
                          >
                            {product.name}
                          </Link>
                          <span className="block text-xs text-content-subtle">
                            {product.sku}
                          </span>
                        </div>
                      </div>
                    </Td>
                    <Td className="text-content-muted">{product.category.name}</Td>
                    <Td align="right" className="whitespace-nowrap">
                      {formatPrice(product.pricePaise)}
                      {off > 0 ? (
                        <span className="block text-xs text-content-subtle">
                          {off}% off
                        </span>
                      ) : null}
                    </Td>
                    <Td align="right">
                      {untracked ? (
                        <span className="text-content-subtle">—</span>
                      ) : free === 0 ? (
                        <Badge variant="danger">Out</Badge>
                      ) : free <= 3 ? (
                        <Badge variant="warning">{free}</Badge>
                      ) : (
                        free
                      )}
                    </Td>
                    <Td align="right" className="text-content-muted">
                      {product.salesCount}
                    </Td>
                    <Td align="center">
                      <ProductStatusToggle
                        productId={product.id}
                        status={product.status}
                      />
                    </Td>
                  </tr>
                );
              })
            )}
          </tbody>
        </TableWrap>

        <AdminPagination
          page={page}
          pageCount={pageCount}
          buildHref={(p) => hrefFor({ page: String(p) })}
        />
      </Panel>
    </>
  );
}
