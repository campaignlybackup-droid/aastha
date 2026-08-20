import { db } from "./src/lib/db";
import { createSession } from "./src/server/session";

async function main() {
  const admin = await db.user.findFirst({ where: { role: "SUPER_ADMIN" } });
  if (!admin) {
    console.log("No admin found");
    process.exit(1);
  }
  const token = await createSession(admin);
  console.log("COOKIE:", `session=${token}`);
  process.exit(0);
}
main();
