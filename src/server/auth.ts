import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { db } from "@/lib/db";
import {
  SESSION_COOKIE,
  verifySessionToken,
} from "@/lib/auth/session";
import type { Role } from "@/generated/prisma/enums";

/**
 * Session resolution.
 *
 * `getCurrentUser` is the only place that turns a cookie into a user. It
 * verifies the JWT signature AND confirms the backing session row is live, so
 * a logout or an admin-forced revocation takes effect on the next request
 * rather than whenever the token happens to expire.
 */

export type CurrentUser = {
  id: string;
  mobile: string;
  email: string | null;
  name: string | null;
  role: Role;
  sessionId: string;
};

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const payload = await verifySessionToken(token);
  if (!payload) return null;

  const session = await db.session.findUnique({
    where: { id: payload.jti },
    select: {
      id: true,
      revokedAt: true,
      expiresAt: true,
      user: {
        select: {
          id: true,
          mobile: true,
          email: true,
          name: true,
          role: true,
          status: true,
        },
      },
    },
  });

  if (
    !session ||
    session.revokedAt ||
    session.expiresAt < new Date() ||
    session.user.status === "BLOCKED"
  ) {
    return null;
  }

  return {
    id: session.user.id,
    mobile: session.user.mobile,
    email: session.user.email,
    name: session.user.name,
    // Read the role from the DB, not the token: a demotion must take effect
    // without waiting for the customer to sign in again.
    role: session.user.role,
    sessionId: session.id,
  };
});

/** Redirects to login when signed out. `next` returns them where they were. */
export async function requireUser(next?: string): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect(next ? `/login?next=${encodeURIComponent(next)}` : "/login");
  }
  return user;
}

/** Roles permitted to reach /admin at all. */
const STAFF_ROLES: Role[] = [
  "SUPER_ADMIN",
  "ADMIN",
  "PRODUCT_MANAGER",
  "ORDER_MANAGER",
  "MARKETING_MANAGER",
  "CONTENT_MANAGER",
];

export function isStaff(role: Role): boolean {
  return STAFF_ROLES.includes(role);
}

export async function requireStaff(next = "/admin"): Promise<CurrentUser> {
  const user = await requireUser(next);
  if (!isStaff(user.role)) {
    // 404 rather than 403: an unauthorised visitor should not learn that
    // /admin exists.
    redirect("/");
  }
  return user;
}

/**
 * Capability check for a specific admin area.
 * SUPER_ADMIN and ADMIN can do everything; the rest are scoped.
 */
export const AREA_ROLES: Record<string, Role[]> = {
  products: ["SUPER_ADMIN", "ADMIN", "PRODUCT_MANAGER"],
  inventory: ["SUPER_ADMIN", "ADMIN", "PRODUCT_MANAGER"],
  orders: ["SUPER_ADMIN", "ADMIN", "ORDER_MANAGER"],
  customers: ["SUPER_ADMIN", "ADMIN", "ORDER_MANAGER"],
  coupons: ["SUPER_ADMIN", "ADMIN", "MARKETING_MANAGER"],
  campaigns: ["SUPER_ADMIN", "ADMIN", "MARKETING_MANAGER", "CONTENT_MANAGER"],
  homepage: ["SUPER_ADMIN", "ADMIN", "CONTENT_MANAGER", "MARKETING_MANAGER"],
  media: ["SUPER_ADMIN", "ADMIN", "CONTENT_MANAGER", "PRODUCT_MANAGER"],
  reviews: ["SUPER_ADMIN", "ADMIN", "CONTENT_MANAGER"],
  seo: ["SUPER_ADMIN", "ADMIN", "CONTENT_MANAGER", "MARKETING_MANAGER"],
  settings: ["SUPER_ADMIN", "ADMIN"],
  staff: ["SUPER_ADMIN"],
};

export function canAccess(role: Role, area: keyof typeof AREA_ROLES): boolean {
  return AREA_ROLES[area]?.includes(role) ?? false;
}

export async function requireArea(area: keyof typeof AREA_ROLES) {
  const user = await requireStaff();
  if (!canAccess(user.role, area)) redirect("/admin");
  return user;
}
