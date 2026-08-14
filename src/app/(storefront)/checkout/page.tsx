import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { CheckoutFlow } from "@/components/storefront/checkout-flow";
import { PageHeader } from "@/components/storefront/page-header";
import { db } from "@/lib/db";
import { getCart } from "@/server/cart";
import { requireUser } from "@/server/auth";

export const metadata: Metadata = {
  title: "Checkout",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const user = await requireUser("/checkout");
  const cart = await getCart();

  // Nothing to pay for — send them back rather than showing an empty form.
  if (cart.lines.length === 0) redirect("/cart");

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
    <>
      <PageHeader
        crumbs={[
          { name: "Home", href: "/" },
          { name: "Your Bag", href: "/cart" },
          { name: "Checkout", href: "/checkout" },
        ]}
        title="Checkout"
      />

      <div className="u-container pb-24">
        <CheckoutFlow
          cart={cart}
          addresses={addresses}
          customer={{
            name: user.name,
            email: user.email,
            mobile: user.mobile,
          }}
        />
      </div>
    </>
  );
}
