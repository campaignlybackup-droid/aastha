import type { Role } from "@/generated/prisma/enums";

/**
 * Role capabilities.
 *
 * Deliberately NOT in src/server/auth.ts: the admin sidebar is a client
 * component and needs `canAccess` to decide which links to render. Importing a
 * `server-only` module from the client is a build error, so the pure predicate
 * lives here and both sides share it.
 *
 * This is presentation-level gating. It decides what is SHOWN. Enforcement
 * happens server-side in `requireArea`, because hiding a link is not security.
 */

/** Roles permitted to reach /admin at all. */
export const STAFF_ROLES: Role[] = [
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

/**
 * Which roles may use each admin area.
 * SUPER_ADMIN and ADMIN appear everywhere; the rest are scoped to their job.
 */
export const AREA_ROLES = {
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
} as const satisfies Record<string, readonly Role[]>;

export type AdminArea = keyof typeof AREA_ROLES;

export function canAccess(role: Role, area: AdminArea): boolean {
  return (AREA_ROLES[area] as readonly Role[]).includes(role);
}
