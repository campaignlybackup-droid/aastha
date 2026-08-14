import type { Metadata } from "next";
import Link from "next/link";
import { Package } from "lucide-react";

import { ProfileForm } from "@/components/storefront/profile-form";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/primitives";
import { db } from "@/lib/db";
import { formatMobile, formatDate } from "@/lib/utils";
import { formatPrice } from "@/lib/money";
import { requireUser } from "@/server/auth";

export const metadata: Metadata = {
  title: "Profile",
  robots: { index: false, follow: false },
};

export default async function AccountPage() {
  const user = await requireUser("/account");

  const [profile, recentOrders, counts] = await Promise.all([
    db.user.findUniqueOrThrow({
      where: { id: user.id },
      select: { name: true, email: true, mobile: true, marketingOptIn: true },
    }),
    db.order.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 3,
      select: {
        id: true,
        orderNumber: true,
        status: true,
        paymentStatus: true,
        totalPaise: true,
        createdAt: true,
        _count: { select: { items: true } },
      },
    }),
    db.$transaction([
      db.order.count({ where: { userId: user.id } }),
      db.address.count({ where: { userId: user.id, deletedAt: null } }),
      db.wishlistItem.count({ where: { userId: user.id } }),
    ]),
  ]);

  const [orderCount, addressCount, wishlistCount] = counts;

  return (
    <div className="space-y-8">
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Orders" value={orderCount} href="/account/orders" />
        <Stat label="Addresses" value={addressCount} href="/account/addresses" />
        <Stat label="Wishlist" value={wishlistCount} href="/account/wishlist" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your details</CardTitle>
        </CardHeader>
        <CardBody>
          <p className="mb-5 text-sm text-content-muted">
            Signed in as{" "}
            <span className="text-content">{formatMobile(profile.mobile)}</span>
            . Contact support to change your number.
          </p>
          <ProfileForm
            initial={{
              name: profile.name ?? "",
              email: profile.email ?? "",
              marketingOptIn: profile.marketingOptIn,
            }}
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle>Recent orders</CardTitle>
            {orderCount > 0 ? (
              <Link
                href="/account/orders"
                className="text-sm underline underline-offset-4 hover:text-[var(--color-accent)]"
              >
                View all
              </Link>
            ) : null}
          </div>
        </CardHeader>
        <CardBody>
          {recentOrders.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <Package className="size-6 text-content-subtle" aria-hidden="true" />
              <p className="text-sm text-content-muted">
                You haven&rsquo;t ordered anything yet.
              </p>
              <Link
                href="/shop"
                className="text-sm underline underline-offset-4 hover:text-[var(--color-accent)]"
              >
                Browse jewellery
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {recentOrders.map((order) => (
                <li key={order.id}>
                  <Link
                    href={`/account/orders/${order.id}`}
                    className="flex items-center justify-between gap-4 py-3 transition-colors hover:text-[var(--color-accent)]"
                  >
                    <div>
                      <p className="text-sm font-medium">{order.orderNumber}</p>
                      <p className="text-xs text-content-subtle">
                        {formatDate(order.createdAt)} ·{" "}
                        {order._count.items}{" "}
                        {order._count.items === 1 ? "item" : "items"}
                      </p>
                    </div>
                    <p className="text-sm">{formatPrice(order.totalPaise)}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function Stat({
  label,
  value,
  href,
}: {
  label: string;
  value: number;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-md border border-line bg-surface-raised p-4 transition-colors hover:border-[var(--color-accent)]"
    >
      <p className="font-display text-3xl">{value}</p>
      <p className="u-eyebrow mt-1 text-content-subtle">{label}</p>
    </Link>
  );
}
