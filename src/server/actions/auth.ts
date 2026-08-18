"use server";

import { cookies, headers } from "next/headers";
import { z } from "zod";

import { db } from "@/lib/db";
import { env } from "@/lib/env";
import {
  SESSION_COOKIE,
  SESSION_TTL_DAYS,
  sessionCookieOptions,
  signSessionToken,
} from "@/lib/auth/session";
import { getCurrentUser } from "@/server/auth";
import { sendOtp, verifyOtp } from "@/server/otp";
import { mergeGuestCartIntoUser } from "@/server/actions/cart";
import { normaliseMobile } from "@/lib/utils";

/**
 * Login, logout and session creation.
 *
 * The flow deliberately does NOT reveal whether a mobile number already has an
 * account: `requestLoginCode` behaves identically either way, and the account
 * is created on first successful verification. Otherwise the login form
 * doubles as a "does this person shop here" oracle.
 */

async function requestContext() {
  const headerList = await headers();
  const forwarded = headerList.get("x-forwarded-for");
  const ip =
    forwarded?.split(",")[0]?.trim() ||
    headerList.get("x-real-ip")?.trim() ||
    "unknown";
  return {
    ip,
    userAgent: headerList.get("user-agent")?.slice(0, 300) ?? "",
  };
}

export type RequestCodeResult =
  | {
      ok: true;
      mobile: string;
      cooldownSeconds: number;
      isExistingUser: boolean;
      userName: string | null;
    }
  | { ok: false; error: string; retryAfterSeconds?: number };

export async function requestLoginCode(
  rawMobile: string,
): Promise<RequestCodeResult> {
  const parsed = z.string().min(6).max(20).safeParse(rawMobile);
  if (!parsed.success) {
    return { ok: false, error: "Enter a valid mobile number." };
  }

  const mobile = normaliseMobile(parsed.data);
  if (!mobile) {
    return {
      ok: false,
      error: "Enter a valid 10-digit Indian mobile number.",
    };
  }

  // A blocked customer gets the same generic response as anyone else.
  const existing = await db.user.findUnique({
    where: { mobile },
    select: { status: true, name: true },
  });
  if (existing?.status === "BLOCKED") {
    return {
      ok: false,
      error: "We couldn't sign you in. Please contact support.",
    };
  }

  const { ip } = await requestContext();
  const result = await sendOtp({ destination: mobile, ip });

  if (!result.ok) {
    return {
      ok: false,
      error: result.error,
      retryAfterSeconds: result.retryAfterSeconds,
    };
  }

  const isExistingUser = Boolean(existing && existing.name);
  const userName = existing?.name ?? null;

  return {
    ok: true,
    mobile,
    cooldownSeconds: result.cooldownSeconds,
    isExistingUser,
    userName,
  };
}

export type VerifyCodeResult =
  | { ok: true; isNewAccount: boolean; redirectTo: string }
  | { ok: false; error: string };

export async function verifyLoginCode({
  mobile: rawMobile,
  code,
  name,
  next,
}: {
  mobile: string;
  code: string;
  /** Collected on the same step for first-time customers. */
  name?: string;
  next?: string;
}): Promise<VerifyCodeResult> {
  const mobile = normaliseMobile(rawMobile);
  if (!mobile) return { ok: false, error: "Enter a valid mobile number." };

  const { ip, userAgent } = await requestContext();

  const verification = await verifyOtp({ destination: mobile, code, ip });
  if (!verification.ok) return { ok: false, error: verification.error };

  // --- Find or create the account ------------------------------------------
  const bootstrapMobiles = env()
    .ADMIN_BOOTSTRAP_MOBILES.split(",")
    .map((m) => m.trim())
    .filter(Boolean);

  const existing = await db.user.findUnique({ where: { mobile } });

  const user = existing
    ? await db.user.update({
        where: { id: existing.id },
        data: {
          lastLoginAt: new Date(),
          mobileVerifiedAt: existing.mobileVerifiedAt ?? new Date(),
          ...(name && !existing.name ? { name: name.trim().slice(0, 80) } : {}),
        },
      })
    : await db.user.create({
        data: {
          mobile,
          name: name?.trim().slice(0, 80) || null,
          // Bootstrap only: lets the very first admin sign in before any admin
          // UI exists. Afterwards roles are managed in /admin.
          role: bootstrapMobiles.includes(mobile) ? "SUPER_ADMIN" : "CUSTOMER",
          mobileVerifiedAt: new Date(),
          lastLoginAt: new Date(),
        },
      });

  // --- Session --------------------------------------------------------------
  const session = await db.session.create({
    data: {
      userId: user.id,
      expiresAt: new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000),
      ip,
      userAgent,
    },
  });

  const token = await signSessionToken({
    sub: user.id,
    jti: session.id,
    role: user.role,
  });

  const store = await cookies();
  store.set(SESSION_COOKIE, token, sessionCookieOptions());

  // Whatever they put in the bag before signing in should still be there.
  await mergeGuestCartIntoUser(user.id);

  return {
    ok: true,
    isNewAccount: !existing,
    redirectTo: safeRedirect(next, user.role === "CUSTOMER" ? "/account" : "/admin"),
  };
}

/**
 * Only same-origin relative paths are accepted as a post-login destination.
 * An open redirect on a login endpoint is a phishing primitive.
 */
function safeRedirect(next: string | undefined, fallback: string): string {
  if (!next) return fallback;
  if (!next.startsWith("/") || next.startsWith("//")) return fallback;
  return next;
}

export async function logout() {
  const user = await getCurrentUser();

  if (user) {
    // Revoke server-side so the token is dead even if the cookie survives.
    await db.session.update({
      where: { id: user.sessionId },
      data: { revokedAt: new Date() },
    });
  }

  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

/** Signs the customer out of every device. */
export async function logoutEverywhere() {
  const user = await getCurrentUser();
  if (!user) return;

  await db.session.updateMany({
    where: { userId: user.id, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  const store = await cookies();
  store.delete(SESSION_COOKIE);
}
