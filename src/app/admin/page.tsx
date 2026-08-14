import Link from "next/link";
import { AlertTriangle } from "lucide-react";

import {
  AdminHeading,
  EmptyRow,
  Panel,
  StatCard,
  TableWrap,
  Td,
  Th,
} from "@/components/admin/ui";
import { OrderStatusBadge } from "@/components/storefront/order-summary";
import { Badge } from "@/components/ui/primitives";
import { db } from "@/lib/db";
import { formatPrice } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { requireStaff } from "@/server/auth";

export const metadata = { title: "Dashboard" };

/**
 * Admin dashboard.
 *
 * Revenue counts CONFIRMED orders only — a PENDING order is an intention, not
 * money, and reporting it would overstate takings.
 */
export default async function AdminDashboardPage() {
  await requireStaff();

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const paidFilter = { status: "CONFIRMED" as const };

  const [
    revenueAllTime,
    revenueThisMonth,
    revenuePrevMonth,
    orderCount,
    pendingCount,
    customerCount,
    recentOrders,
    lowStock,
    bestSellers,
    pendingReviews,
  ] = await Promise.all([
    db.order.aggregate({ where: paidFilter, _sum: { totalPaise: true }, _count: true }),
    db.order.aggregate({
      where: { ...paidFilter, placedAt: { gte: monthStart } },
      _sum: { totalPaise: true },
      _count: true,
    }),
    db.order.aggregate({
      where: { ...paidFilter, placedAt: { gte: prevMonthStart, lt: monthStart } },
      _sum: { totalPaise: true },
    }),
    db.order.count(),
    db.order.count({ where: { status: "PENDING" } }),
    db.user.count({ where: { role: "CUSTOMER" } }),
    db.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        orderNumber: true,
        status: true,
        totalPaise: true,
        createdAt: true,
        shipName: true,
        _count: { select: { items: true } },
      },
    }),
    db.productVariant.findMany({
      where: {
        isActive: true,
        trackInventory: true,
        product: { status: "ACTIVE" },
      },
      orderBy: { stockQuantity: "asc" },
      take: 8,
      select: {
        id: true,
        sku: true,
        title: true,
        stockQuantity: true,
        reservedQuantity: true,
        lowStockThreshold: true,
        product: { select: { id: true, name: true } },
      },
    }),
    db.product.findMany({
      where: { status: "ACTIVE", salesCount: { gt: 0 } },
      orderBy: { salesCount: "desc" },
      take: 5,
      select: { id: true, name: true, salesCount: true, pricePaise: true },
    }),
    db.review.count({ where: { status: "PENDING" } }),
  ]);

  const paidCount = revenueAllTime._count || 0;
  const averageOrderPaise = paidCount
    ? Math.round((revenueAllTime._sum.totalPaise ?? 0) / paidCount)
    : 0;

  const thisMonthPaise = revenueThisMonth._sum.totalPaise ?? 0;
  const prevMonthPaise = revenuePrevMonth._sum.totalPaise ?? 0;
  const monthDelta =
    prevMonthPaise > 0
      ? Math.round(((thisMonthPaise - prevMonthPaise) / prevMonthPaise) * 100)
      : null;

  const critical = lowStock.filter(
    (v) => v.stockQuantity - v.reservedQuantity <= v.lowStockThreshold,
  );

  return (
    <>
      <AdminHeading
        title="Dashboard"
        description="Revenue counts confirmed orders only."
      />

      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Revenue this month"
          value={formatPrice(thisMonthPaise)}
          hint={
            monthDelta === null
              ? "No sales last month to compare"
              : `${monthDelta >= 0 ? "+" : ""}${monthDelta}% vs last month`
          }
        />
        <StatCard
          label="Revenue all time"
          value={formatPrice(revenueAllTime._sum.totalPaise ?? 0)}
          hint={`${paidCount} confirmed ${paidCount === 1 ? "order" : "orders"}`}
        />
        <StatCard
          label="Average order"
          value={averageOrderPaise ? formatPrice(averageOrderPaise) : "—"}
          hint={`${orderCount} orders total`}
          href="/admin/orders"
        />
        <StatCard
          label="Customers"
          value={String(customerCount)}
          hint={pendingCount ? `${pendingCount} awaiting payment` : "All settled"}
          href="/admin/customers"
        />
      </div>

      {(critical.length > 0 || pendingReviews > 0) && (
        <div className="mb-8 space-y-3">
          {critical.length > 0 ? (
            <Link
              href="/admin/inventory"
              className="flex items-center gap-3 rounded-md border border-warning-500/30 bg-warning-50 px-4 py-3 text-sm text-warning-700 transition-colors hover:border-warning-500"
            >
              <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
              {critical.length} {critical.length === 1 ? "variant is" : "variants are"} at
              or below the low-stock threshold.
            </Link>
          ) : null}

          {pendingReviews > 0 ? (
            <Link
              href="/admin/reviews"
              className="flex items-center gap-3 rounded-md border border-info-500/30 bg-info-50 px-4 py-3 text-sm text-info-700 transition-colors hover:border-info-500"
            >
              <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
              {pendingReviews} {pendingReviews === 1 ? "review is" : "reviews are"} waiting
              for moderation.
            </Link>
          ) : null}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Panel
          title="Recent orders"
          action={
            <Link
              href="/admin/orders"
              className="text-xs underline underline-offset-4 hover:text-[var(--color-accent)]"
            >
              View all
            </Link>
          }
        >
          <TableWrap>
            <thead>
              <tr>
                <Th>Order</Th>
                <Th>Customer</Th>
                <Th>Status</Th>
                <Th align="right">Total</Th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.length === 0 ? (
                <EmptyRow colSpan={4} message="No orders yet." />
              ) : (
                recentOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-sand-50">
                    <Td>
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="font-medium hover:text-[var(--color-accent)]"
                      >
                        {order.orderNumber}
                      </Link>
                      <span className="block text-xs text-content-subtle">
                        {formatDate(order.createdAt)} · {order._count.items}{" "}
                        {order._count.items === 1 ? "item" : "items"}
                      </span>
                    </Td>
                    <Td className="text-content-muted">{order.shipName}</Td>
                    <Td>
                      <OrderStatusBadge status={order.status} />
                    </Td>
                    <Td align="right">{formatPrice(order.totalPaise)}</Td>
                  </tr>
                ))
              )}
            </tbody>
          </TableWrap>
        </Panel>

        <div className="space-y-6">
          <Panel title="Low stock">
            <TableWrap>
              <thead>
                <tr>
                  <Th>Variant</Th>
                  <Th align="right">Free</Th>
                </tr>
              </thead>
              <tbody>
                {lowStock.length === 0 ? (
                  <EmptyRow colSpan={2} message="Nothing tracked yet." />
                ) : (
                  lowStock.map((variant) => {
                    const free = variant.stockQuantity - variant.reservedQuantity;
                    return (
                      <tr key={variant.id} className="hover:bg-sand-50">
                        <Td>
                          <Link
                            href={`/admin/products/${variant.product.id}`}
                            className="hover:text-[var(--color-accent)]"
                          >
                            {variant.product.name}
                          </Link>
                          <span className="block text-xs text-content-subtle">
                            {variant.title}
                          </span>
                        </Td>
                        <Td align="right">
                          {free <= 0 ? (
                            <Badge variant="danger">Out</Badge>
                          ) : free <= variant.lowStockThreshold ? (
                            <Badge variant="warning">{free}</Badge>
                          ) : (
                            <span className="text-content-muted">{free}</span>
                          )}
                        </Td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </TableWrap>
          </Panel>

          <Panel title="Best sellers">
            <TableWrap>
              <thead>
                <tr>
                  <Th>Product</Th>
                  <Th align="right">Sold</Th>
                </tr>
              </thead>
              <tbody>
                {bestSellers.length === 0 ? (
                  <EmptyRow colSpan={2} message="No sales recorded yet." />
                ) : (
                  bestSellers.map((product) => (
                    <tr key={product.id} className="hover:bg-sand-50">
                      <Td>
                        <Link
                          href={`/admin/products/${product.id}`}
                          className="hover:text-[var(--color-accent)]"
                        >
                          {product.name}
                        </Link>
                      </Td>
                      <Td align="right">{product.salesCount}</Td>
                    </tr>
                  ))
                )}
              </tbody>
            </TableWrap>
          </Panel>
        </div>
      </div>
    </>
  );
}
