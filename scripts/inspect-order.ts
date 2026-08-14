/**
 * Prints the most recent order with its stock reservations.
 * A development aid for verifying the checkout path end to end.
 *
 *   npx tsx scripts/inspect-order.ts
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";

const db = new PrismaClient({
  adapter: new PrismaPg({
    connectionString:
      process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL ?? "",
  }),
});

async function main() {
  const order = await db.order.findFirst({
    orderBy: { createdAt: "desc" },
    include: { items: true, payments: true },
  });

  if (!order) {
    console.log("No orders yet.");
    return;
  }

  console.log("order      :", order.orderNumber, order.status, order.paymentStatus);
  console.log(
    "amounts    : subtotal",
    order.subtotalPaise,
    "ship",
    order.shippingPaise,
    "tax",
    order.taxPaise,
    "total",
    order.totalPaise,
  );
  console.log("metaEventId:", order.metaEventId);
  console.log("ship       :", order.shipName, "|", order.shipCity, order.shipPincode);
  console.log(
    "items      :",
    order.items
      .map((i) => `${i.quantity}x ${i.productName} @${i.unitPricePaise}`)
      .join(", "),
  );
  console.log("payments   :", order.payments.map((p) => `${p.status}`).join(", ") || "none");

  for (const item of order.items) {
    if (!item.variantId) continue;
    const variant = await db.productVariant.findUnique({
      where: { id: item.variantId },
      select: { sku: true, stockQuantity: true, reservedQuantity: true },
    });
    if (variant) {
      console.log(
        "stock      :",
        variant.sku,
        "qty",
        variant.stockQuantity,
        "reserved",
        variant.reservedQuantity,
      );
    }
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
