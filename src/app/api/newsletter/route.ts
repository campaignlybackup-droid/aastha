import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { rateLimit } from "@/lib/ratelimit";
import { clientIp } from "@/lib/request";

const schema = z.object({
  email: z.email().max(180),
  source: z.string().max(40).optional(),
});

export async function POST(request: NextRequest) {
  const limit = await rateLimit({
    bucket: `newsletter:${clientIp(request)}`,
    limit: 5,
    windowSeconds: 300,
  });

  if (!limit.allowed) {
    return NextResponse.json(
      { ok: false, error: "Too many attempts. Please try again shortly." },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid request." },
      { status: 400 },
    );
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Please enter a valid email address." },
      { status: 400 },
    );
  }

  const email = parsed.data.email.toLowerCase().trim();

  try {
    await db.newsletterSubscriber.upsert({
      where: { email },
      // Re-subscribing after an unsubscribe should reactivate, not error.
      update: { isActive: true, unsubscribedAt: null },
      create: { email, source: parsed.data.source ?? "unknown" },
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Could not subscribe right now. Please try again." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
