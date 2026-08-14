/** Revokes all active sessions. Dev aid for switching accounts quickly. */
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
  const { count } = await db.session.updateMany({
    where: { revokedAt: null },
    data: { revokedAt: new Date() },
  });
  console.log(`Revoked ${count} session(s).`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
