import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function GET() {
  let e;
  try {
    e = env();
  } catch (error: any) {
    return NextResponse.json({ success: false, envError: error.message }, { status: 500 });
  }

  try {
    const start = Date.now();
    const categories = await db.category.findMany({ select: { id: true }, take: 1 });
    const elapsed = Date.now() - start;

    return NextResponse.json({
      success: true,
      message: "Database connection successful",
      elapsedMs: elapsed,
      databaseUrlMasked: e.DATABASE_URL.replace(/:[^:@]*@/, ":***@"),
      directUrlMasked: (e.DIRECT_DATABASE_URL || "").replace(/:[^:@]*@/, ":***@")
    });
  } catch (error: any) {
    console.error("Test DB Error:", error);
    return NextResponse.json({
      success: false,
      errorName: error.name,
      errorMessage: error.message,
      databaseUrlMasked: e.DATABASE_URL.replace(/:[^:@]*@/, ":***@"),
      directUrlMasked: (e.DIRECT_DATABASE_URL || "").replace(/:[^:@]*@/, ":***@")
    }, { status: 500 });
  }
}
