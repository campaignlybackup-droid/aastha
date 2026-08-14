/** Reproduces concurrent queries against the configured database. Dev aid. */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";

const db = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL ?? "",
    max: 4,
  }),
});

async function main() {
  for (let round = 1; round <= 4; round += 1) {
    try {
      // Mirrors what the storefront layout does: several differently-shaped
      // queries issued concurrently.
      const results = await Promise.all([
        db.collection.findMany({
          where: { isActive: true, isFeatured: true },
          orderBy: [{ position: "asc" }, { name: "asc" }],
          include: { image: { select: { secureUrl: true } }, _count: { select: { products: true } } },
        }),
        db.category.findMany({ where: { isActive: true }, select: { id: true } }),
        db.setting.findUnique({ where: { key: "contact" } }),
        db.product.findMany({ where: { status: "ACTIVE" }, take: 3, select: { id: true } }),
        db.campaign.findFirst({ where: { status: { in: ["SCHEDULED", "ACTIVE"] } } }),
      ]);
      console.log(`round ${round}: OK (${results[0].length} collections)`);
    } catch (error) {
      console.log(`round ${round}: FAIL ${(error as Error).message.split("\n")[0]}`);
    }
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
