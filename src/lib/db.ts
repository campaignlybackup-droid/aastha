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

/** Next sets this while `next build` is prerendering. */
const isBuild = process.env.NEXT_PHASE === "phase-production-build";

function createClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env and configure it.",
    );
  }

  const adapter = new PrismaPg({
    connectionString,
    // Pool size.
    //
    // Production (Neon pooled endpoint): serverless instances are short-lived
    // and numerous, so a small pool per instance avoids exhausting the
    // database's connection budget.
    //
    // Development: the local `prisma dev` server accepts exactly 10
    // simultaneous connections and RESETS the 11th. Claiming all 10 here means
    // that running `prisma db seed` or `prisma studio` alongside `next dev`
    // knocks the app's connections out, surfacing as P1017 "Server has closed
    // the connection". Four leaves room for those tools.
    //
    // Build: `next build` fans out across one worker process per core, each
    // importing this module. A pool of 4 × 7 workers is 28 connections for
    // work that is a handful of sequential reads per worker — one connection
    // each is plenty, and keeps the total under any sane server limit.
    max: isBuild ? 1 : process.env.NODE_ENV === "production" ? 5 : 4,
    // Retire idle connections before any upstream pooler drops them.
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 30_000,
    maxLifetimeSeconds: 600,
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
