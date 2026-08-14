import type { Metadata } from "next";

import { AddressBook } from "@/components/storefront/address-book";
import { db } from "@/lib/db";
import { requireUser } from "@/server/auth";

export const metadata: Metadata = {
  title: "Addresses",
  robots: { index: false, follow: false },
};

export default async function AddressesPage() {
  const user = await requireUser("/account/addresses");

  const addresses = await db.address.findMany({
    where: { userId: user.id, deletedAt: null },
    orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
    select: {
      id: true,
      label: true,
      name: true,
      mobile: true,
      line1: true,
      line2: true,
      landmark: true,
      city: true,
      state: true,
      pincode: true,
      country: true,
      isDefault: true,
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl">Delivery addresses</h2>
        <p className="mt-1 text-sm text-content-muted">
          Saved addresses appear at checkout so you don&rsquo;t have to type
          them again.
        </p>
      </div>

      <AddressBook addresses={addresses} />
    </div>
  );
}
