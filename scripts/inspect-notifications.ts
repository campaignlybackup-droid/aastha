/** Recent outbound messages and stock movements. Dev aid. */
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
  const notifications = await db.notification.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
    select: { channel: true, status: true, template: true, recipient: true, error: true },
  });
  console.log("--- notifications ---");
  for (const n of notifications) {
    console.log(
      `${n.channel.padEnd(9)} ${n.template.padEnd(14)} -> ${n.recipient} [${n.status}]${n.error ? ` err=${n.error}` : ""}`,
    );
  }

  const movements = await db.stockMovement.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
    select: { delta: true, balance: true, reason: true },
  });
  console.log("--- stock movements ---");
  for (const m of movements) {
    console.log(`${m.delta > 0 ? "+" : ""}${m.delta} -> balance ${m.balance} (${m.reason})`);
  }

  const events = await db.webhookEvent.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
    select: { eventType: true, eventId: true, processedAt: true, error: true },
  });
  console.log("--- webhook events ---");
  for (const e of events) {
    console.log(
      `${e.eventType} ${e.eventId.slice(0, 24)} processed=${Boolean(e.processedAt)}${e.error ? ` err=${e.error}` : ""}`,
    );
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
