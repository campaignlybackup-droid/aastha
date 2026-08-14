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
import { OrderStatusBadge } from "@/components/storefront/order-summary";
import { db } from "@/lib/db";
import { formatPrice } from "@/lib/money";
import { formatDateTime } from "@/lib/utils";
import { requireArea } from "@/server/auth";
import type { Prisma } from "@/generated/prisma/client";
import type { OrderStatus } from "@/generated/prisma/enums";

export const metadata = { title: "Orders" };

const PER_PAGE = 25;

const STATUS_TABS: Array<{ value: string; label: string }> = [
  { value: "all", label: "All" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "PENDING", label: "Awaiting payment" },
  { value: "CANCELLED", label: "Cancelled" },
];

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; page?: string }>;
}) {
  await requireArea("orders");
  const params = await searchParams;

  const status = STATUS_TABS.some((t) => t.value === params.status)
    ? params.status!
    : "all";
  const query = params.q?.trim() ?? "";
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);

  const where: Prisma.OrderWhereInput = {
    ...(status !== "all" ? { status: status as OrderStatus } : {}),
    ...(query
      ? {
          OR: [
            { orderNumber: { contains: query, mode: "insensitive" } },
            { shipName: { contains: query, mode: "insensitive" } },
            { shipMobile: { contains: query } },
            { shipEmail: { contains: query, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [orders, total] = await Promise.all([
    db.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      select: {
        id: true,
        orderNumber: true,
        status: true,
        paymentStatus: true,
        totalPaise: true,
        createdAt: true,
        shipName: true,
        shipCity: true,
        _count: { select: { items: true } },
      },
    }),
    db.order.count({ where }),
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
    return qs ? `/admin/orders?${qs}` : "/admin/orders";
  };

  return (
    <>
      <AdminHeading
        title="Orders"
        description={`${total} ${total === 1 ? "order" : "orders"}${status !== "all" ? ` · ${status.toLowerCase()}` : ""}`}
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

        {/* GET form: the search term lives in the URL, so a filtered list is
            shareable and survives a refresh. */}
        <form method="GET" action="/admin/orders" className="ml-auto flex gap-2">
          {status !== "all" ? (
            <input type="hidden" name="status" value={status} />
          ) : null}
          <label htmlFor="order-search" className="sr-only">
            Search orders
          </label>
          <input
            id="order-search"
            name="q"
            defaultValue={query}
            placeholder="Order number, name, mobile"
            className="h-9 w-64 rounded-sm border border-line-strong bg-surface-raised px-3 text-sm outline-none focus:border-[var(--color-accent)]"
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
              <Th>Order</Th>
              <Th>Placed</Th>
              <Th>Customer</Th>
              <Th>Status</Th>
              <Th>Payment</Th>
              <Th align="right">Total</Th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <EmptyRow
                colSpan={6}
                message={
                  query
                    ? `No orders match “${query}”.`
                    : "No orders in this view."
                }
              />
            ) : (
              orders.map((order) => (
                <tr key={order.id} className="hover:bg-sand-50">
                  <Td>
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="font-medium hover:text-[var(--color-accent)]"
                    >
                      {order.orderNumber}
                    </Link>
                    <span className="block text-xs text-content-subtle">
                      {order._count.items}{" "}
                      {order._count.items === 1 ? "item" : "items"}
                    </span>
                  </Td>
                  <Td className="whitespace-nowrap text-xs text-content-muted">
                    {formatDateTime(order.createdAt)}
                  </Td>
                  <Td>
                    <span className="block">{order.shipName}</span>
                    <span className="block text-xs text-content-subtle">
                      {order.shipCity}
                    </span>
                  </Td>
                  <Td>
                    <OrderStatusBadge status={order.status} />
                  </Td>
                  <Td className="text-xs text-content-muted">
                    {order.paymentStatus}
                  </Td>
                  <Td align="right" className="whitespace-nowrap">
                    {formatPrice(order.totalPaise)}
                  </Td>
                </tr>
              ))
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
