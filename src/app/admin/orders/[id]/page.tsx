import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { AdminHeading, Panel } from "@/components/admin/ui";
import { CancelOrderButton } from "@/components/admin/cancel-order-button";
import {
  OrderStatusBadge,
  OrderSummary,
  paymentStatusLabel,
} from "@/components/storefront/order-summary";
import { Badge } from "@/components/ui/primitives";
import { db } from "@/lib/db";
import { formatDateTime, formatMobile } from "@/lib/utils";
import { requireArea } from "@/server/auth";

export const metadata = { title: "Order" };

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireArea("orders");
  const { id } = await params;

  const order = await db.order.findUnique({
    where: { id },
    include: {
      items: { orderBy: { id: "asc" } },
      payments: { orderBy: { createdAt: "desc" } },
      user: { select: { id: true, name: true, mobile: true, email: true } },
    },
  });

  if (!order) notFound();

  const notifications = await db.notification.findMany({
    where: { orderId: order.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      channel: true,
      template: true,
      status: true,
      error: true,
      createdAt: true,
    },
  });

  return (
    <>
      <Link
        href="/admin/orders"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-content-muted hover:text-[var(--color-accent)]"
      >
        <ArrowLeft className="size-3.5" aria-hidden="true" />
        All orders
      </Link>

      <AdminHeading
        title={order.orderNumber}
        description={`Placed ${formatDateTime(order.placedAt ?? order.createdAt)}`}
        action={
          order.status === "PENDING" ? (
            <CancelOrderButton orderId={order.id} />
          ) : null
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <OrderStatusBadge status={order.status} />
        <Badge variant={order.paymentStatus === "PAID" ? "success" : "neutral"} size="md">
          {paymentStatusLabel(order.paymentStatus)}
        </Badge>
        {order.metaCapiSentAt ? (
          <Badge variant="outline" size="md">
            Meta Purchase reported
          </Badge>
        ) : null}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.7fr_1fr]">
        <Panel title="Items">
          <div className="px-5 py-4">
            <OrderSummary order={order} />
          </div>
        </Panel>

        <div className="space-y-6">
          <Panel title="Customer">
            <div className="space-y-1.5 px-5 py-4 text-sm">
              <p>{order.user.name ?? order.shipName}</p>
              <p className="text-content-muted">
                {formatMobile(order.user.mobile)}
              </p>
              {order.user.email ? (
                <p className="text-content-muted">{order.user.email}</p>
              ) : null}
              <Link
                href={`/admin/customers/${order.user.id}`}
                className="inline-block pt-1 text-xs underline underline-offset-4 hover:text-[var(--color-accent)]"
              >
                View customer
              </Link>
            </div>
          </Panel>

          <Panel title="Payments">
            {order.payments.length === 0 ? (
              <p className="px-5 py-4 text-sm text-content-muted">
                No payment attempts recorded.
              </p>
            ) : (
              <ul className="divide-y divide-line text-sm">
                {order.payments.map((payment) => (
                  <li key={payment.id} className="px-5 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium">{payment.status}</span>
                      <span className="text-xs text-content-subtle">
                        {formatDateTime(payment.createdAt)}
                      </span>
                    </div>
                    {payment.providerPaymentId ? (
                      <p className="mt-1 break-all text-xs text-content-muted">
                        {payment.providerPaymentId}
                        {payment.method ? ` · ${payment.method}` : ""}
                      </p>
                    ) : null}
                    {payment.failureDescription ? (
                      <p className="mt-1 text-xs text-danger-700">
                        {payment.failureDescription}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel
            title="Notifications"
            description="Outbound messages for this order."
          >
            {notifications.length === 0 ? (
              <p className="px-5 py-4 text-sm text-content-muted">
                Nothing sent yet.
              </p>
            ) : (
              <ul className="divide-y divide-line text-sm">
                {notifications.map((notification) => (
                  <li key={notification.id} className="px-5 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <span>
                        {notification.channel} · {notification.template}
                      </span>
                      <Badge
                        variant={
                          notification.status === "SENT"
                            ? "success"
                            : notification.status === "FAILED"
                              ? "danger"
                              : "neutral"
                        }
                      >
                        {notification.status}
                      </Badge>
                    </div>
                    {notification.error ? (
                      <p className="mt-1 text-xs text-danger-700">
                        {notification.error}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          {order.internalNote ? (
            <Panel title="Internal notes">
              <p className="whitespace-pre-wrap px-5 py-4 text-sm text-content-muted">
                {order.internalNote}
              </p>
            </Panel>
          ) : null}
        </div>
      </div>
    </>
  );
}
