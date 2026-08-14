/**
 * Simulates a signed Razorpay webhook against the local server.
 *
 *   npx tsx scripts/simulate-webhook.ts payment.captured
 *   npx tsx scripts/simulate-webhook.ts payment.captured --replay
 *
 * Exists so the money path — signature verification, idempotency, stock
 * commit, coupon redemption, notifications — can be exercised without a real
 * Razorpay account. `--replay` re-sends the SAME event id to prove a duplicate
 * delivery is a no-op.
 */
import "dotenv/config";
import { createHmac, randomUUID } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";

const db = new PrismaClient({
  adapter: new PrismaPg({
    connectionString:
      process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL ?? "",
  }),
});

const eventType = process.argv[2] ?? "payment.captured";
const replay = process.argv.includes("--replay");
const baseUrl = process.env.WEBHOOK_TARGET ?? "http://127.0.0.1:3200";

async function main() {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) throw new Error("RAZORPAY_WEBHOOK_SECRET is not set.");

  // Replays deliberately target the latest order whatever its status — the
  // point is to prove a duplicate delivery against an ALREADY-CONFIRMED order
  // changes nothing.
  const order = replay
    ? await db.order.findFirst({ orderBy: { createdAt: "desc" } })
    : ((await db.order.findFirst({
        where: { status: "PENDING" },
        orderBy: { createdAt: "desc" },
      })) ?? (await db.order.findFirst({ orderBy: { createdAt: "desc" } })));

  if (!order) throw new Error("No order to simulate against.");

  const paymentId = `pay_sim${order.id.slice(-10)}`;

  const payload = {
    entity: "event",
    event: eventType,
    payload: {
      payment: {
        entity: {
          id: paymentId,
          entity: "payment",
          amount: order.totalPaise,
          currency: "INR",
          status: eventType === "payment.failed" ? "failed" : "captured",
          order_id: `order_sim${order.id.slice(-8)}`,
          method: "upi",
          ...(eventType === "payment.failed"
            ? { error_code: "BAD_REQUEST_ERROR", error_description: "Simulated decline" }
            : {}),
          notes: { orderId: order.id, orderNumber: order.orderNumber },
        },
      },
    },
  };

  // Signature is over the exact bytes we send — serialise once, reuse.
  const rawBody = JSON.stringify(payload);
  const signature = createHmac("sha256", secret).update(rawBody).digest("hex");
  const eventId = replay
    ? `sim-replay-${order.id}`
    : `sim-${randomUUID()}`;

  const response = await fetch(`${baseUrl}/api/webhooks/razorpay`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-razorpay-signature": signature,
      "x-razorpay-event-id": eventId,
    },
    body: rawBody,
  });

  console.log(`→ ${eventType} for ${order.orderNumber} (event ${eventId})`);
  console.log(`← ${response.status}`, await response.text());
}

main()
  .catch((error) => {
    console.error(error.message ?? error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
