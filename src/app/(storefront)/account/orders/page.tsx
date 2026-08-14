import type { Metadata } from "next";
import Link from "next/link";
import { Package } from "lucide-react";

import { OrderStatusBadge } from "@/components/storefront/order-summary";
import { MediaImage } from "@/components/ui/media-image";
import { Button } from "@/components/ui/button";
import { Card, CardBody, EmptyState } from "@/components/ui/primitives";
import { db } from "@/lib/db";
import { formatPrice } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { requireUser } from "@/server/auth";

export const metadata: Metadata = {
  title: "Orders",
  robots: { index: false, follow: false },
};

export default async function OrdersPage() {
  const user = await requireUser("/account/orders");

  const orders = await db.order.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      orderNumber: true,
      status: true,
      totalPaise: true,
      createdAt: true,
      placedAt: true,
      items: {
        select: {
          id: true,
          productName: true,
          imageUrl: true,
          quantity: true,
        },
      },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl">Your orders</h2>
        <p className="mt-1 text-sm text-content-muted">
          Everything you&rsquo;ve ordered from us.
        </p>
      </div>

      {orders.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No orders yet"
          description="When you place an order it will appear here with its status and receipt."
          action={
            <Button asChild>
              <Link href="/shop">Browse jewellery</Link>
            </Button>
          }
        />
      ) : (
        <ul className="space-y-4">
          {orders.map((order) => (
            <li key={order.id}>
              <Card className="transition-colors hover:border-[var(--color-accent)]">
                <CardBody>
                  <Link href={`/order/${order.id}`} className="block">
                    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium tracking-wide">
                          {order.orderNumber}
                        </p>
                        <p className="mt-0.5 text-xs text-content-subtle">
                          {formatDate(order.placedAt ?? order.createdAt)} ·{" "}
                          {order.items.length}{" "}
                          {order.items.length === 1 ? "item" : "items"}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <OrderStatusBadge status={order.status} />
                        <p className="text-sm font-medium">
                          {formatPrice(order.totalPaise)}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {order.items.slice(0, 5).map((item) => (
                        <div
                          key={item.id}
                          className="relative size-14 overflow-hidden bg-sand-100"
                          title={item.productName}
                        >
                          {item.imageUrl ? (
                            <MediaImage
                              src={item.imageUrl}
                              alt={item.productName}
                              fill
                              sizes="56px"
                              className="object-cover"
                            />
                          ) : null}
                        </div>
                      ))}
                      {order.items.length > 5 ? (
                        <span className="text-xs text-content-subtle">
                          +{order.items.length - 5} more
                        </span>
                      ) : null}
                    </div>
                  </Link>
                </CardBody>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
