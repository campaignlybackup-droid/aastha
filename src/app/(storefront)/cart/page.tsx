import type { Metadata } from "next";

import { CartView } from "@/components/storefront/cart-view";
import { PageHeader } from "@/components/storefront/page-header";
import { getCart } from "@/server/cart";

export const metadata: Metadata = {
  title: "Your Bag",
  robots: { index: false, follow: false },
};

/** The cart is per-visitor; it must never be cached or statically rendered. */
export const dynamic = "force-dynamic";

export default async function CartPage() {
  const cart = await getCart();

  return (
    <>
      <PageHeader
        crumbs={[
          { name: "Home", href: "/" },
          { name: "Your Bag", href: "/cart" },
        ]}
        title="Your Bag"
        description={
          cart.itemCount > 0
            ? `${cart.itemCount} ${cart.itemCount === 1 ? "piece" : "pieces"} ready to order.`
            : null
        }
      />

      <div className="u-container pb-24">
        <CartView initialCart={cart} />
      </div>
    </>
  );
}
