import Link from "next/link";
import { Plus } from "lucide-react";

import { AdminHeading, AdminPagination, EmptyRow, Panel, TableWrap, Td, Th } from "@/components/admin/ui";
import { ProductsTableClient } from "./products-table-client";
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
        action={
          <Link
            href="/admin/products/new"
            className="inline-flex items-center gap-1.5 rounded-sm bg-brand-800 px-4 py-2.5 text-xs text-sand-50 transition-colors hover:bg-brand-900"
          >
            <Plus className="size-3.5" aria-hidden="true" />
            New product
          </Link>
        }
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
        <ProductsTableClient products={products} query={query} />

        <AdminPagination
          page={page}
          pageCount={pageCount}
          buildHref={(p) => hrefFor({ page: String(p) })}
        />
      </Panel>
    </>
  );
}
