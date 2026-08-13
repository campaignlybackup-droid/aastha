import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    // `prisma db seed` runs this. tsx is used so the seed can import from src/.
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // The CLI (migrate/studio/seed) must talk to Postgres DIRECTLY. Migrations
    // take session-level advisory locks, which a transaction pooler such as
    // Neon's pooled endpoint or PgBouncer does not preserve. The application
    // itself uses the pooled DATABASE_URL via the pg driver adapter in
    // src/lib/db.ts — the two paths intentionally differ.
    url: process.env["DIRECT_DATABASE_URL"] || process.env["DATABASE_URL"],
    // Only needed by `prisma migrate dev`, and only when the target database
    // cannot create a shadow database itself (the local `prisma dev` server).
    shadowDatabaseUrl: process.env["SHADOW_DATABASE_URL"] || undefined,
  },
});
