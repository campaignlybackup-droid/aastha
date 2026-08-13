import "server-only";

import { SignJWT, jwtVerify } from "jose";

import { env } from "@/lib/env";
import type { Role } from "@/generated/prisma/enums";

/**
 * Session tokens.
 *
 * A signed JWT in an httpOnly cookie, carrying the session row's id as `jti`.
 * The JWT alone is not sufficient to authenticate — `getCurrentUser` also
 * checks that the session row exists and has not been revoked. That gives us
 * stateless-fast reads with the ability to log a device out immediately, which
 * a pure JWT cannot do.
 */

export const SESSION_COOKIE = "asj_session";
export const SESSION_TTL_DAYS = 30;

export type SessionPayload = {
  /** User id. */
  sub: string;
  /** Session row id — the revocation handle. */
  jti: string;
  role: Role;
};

let cachedKey: Uint8Array | null = null;

function secretKey(): Uint8Array {
  if (!cachedKey) {
    cachedKey = new TextEncoder().encode(env().SESSION_SECRET);
  }
  return cachedKey;
}

export async function signSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ role: payload.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setJti(payload.jti)
    .setIssuedAt()
    .setIssuer("aastha")
    .setAudience("aastha-storefront")
    .setExpirationTime(`${SESSION_TTL_DAYS}d`)
    .sign(secretKey());
}

export async function verifySessionToken(
  token: string,
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey(), {
      issuer: "aastha",
      audience: "aastha-storefront",
      algorithms: ["HS256"],
    });

    if (!payload.sub || !payload.jti) return null;

    return {
      sub: payload.sub,
      jti: payload.jti,
      role: (payload.role as Role) ?? "CUSTOMER",
    };
  } catch {
    // Expired, tampered, or signed with a rotated secret. All mean "no session".
    return null;
  }
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    // "lax" rather than "strict": Razorpay redirects the customer back to the
    // site after payment, and a strict cookie would not be sent on that
    // top-level cross-site navigation, silently logging them out mid-checkout.
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_DAYS * 24 * 60 * 60,
  };
}
