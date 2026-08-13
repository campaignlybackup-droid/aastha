import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";

/**
 * Prisma client singleton.
 *
 * Prisma 7 talks to Postgres through a driver adapter rather than a bundled
 * query engine. We pass the POOLED `DATABASE_URL` here — the app makes many
 * short-lived queries and benefits from a pooler. Schema migrations take the
 * direct connection instead; see the comment in prisma.config.ts.
 *
 * Next.js hot-reloads modules in development, which would otherwise open a new
 * pool on every edit until Postgres refuses connections. Stashing the instance
 * on `globalThis` keeps exactly one pool per process.
 */

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env and configure it.",
    );
  }

  const adapter = new PrismaPg({
    connectionString,
    // Serverless functions are short-lived; a large pool per instance just
    // exhausts the database's connection limit.
    max: process.env.NODE_ENV === "production" ? 5 : 10,
  });

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

export const db = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}

export type { PrismaClient };
