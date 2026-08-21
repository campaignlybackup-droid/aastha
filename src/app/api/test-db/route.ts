import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Force a runtime evaluation of env to see if it throws
    const e = env();
    
    // Try to connect to the database
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
      errorStack: error.stack,
      rawEnv: {
        DATABASE_URL_EXISTS: !!process.env.DATABASE_URL,
        DIRECT_DATABASE_URL_EXISTS: !!process.env.DIRECT_DATABASE_URL,
        NODE_ENV: process.env.NODE_ENV
      }
    }, { status: 500 });
  }
}
