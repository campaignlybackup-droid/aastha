"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/lib/db";
import { requireArea } from "@/server/auth";
import { slugify } from "@/lib/utils";
import type { Prisma } from "@/generated/prisma/client";

/**
 * Category, collection, coupon and customer administration.
 *
 * Slugs are generated once, on create, and never silently regenerated on
 * rename — an existing slug is a live URL that may be linked or indexed.
 * Changing it is an explicit action with a redirect consequence, so the form
 * exposes it as its own field.
 */

export type CatalogueResult =
  | { ok: true; message?: string; id?: string }
  | { ok: false; error: string };

/** Ensures a slug is unique by appending -2, -3 … as needed. */
async function uniqueSlug(
  base: string,
  table: "category" | "collection",
  excludeId?: string,
): Promise<string> {
  const root = slugify(base) || "item";

  for (let attempt = 0; attempt < 50; attempt += 1) {
    const candidate = attempt === 0 ? root : `${root}-${attempt + 1}`;
    const existing =
      table === "category"
        ? await db.category.findUnique({
            where: { slug: candidate },
            select: { id: true },
          })
        : await db.collection.findUnique({
            where: { slug: candidate },
            select: { id: true },
          });

    if (!existing || existing.id === excludeId) return candidate;
  }

  return `${root}-${Date.now().toString(36)}`;
}

/* -----------------------------------------------------------------------------
 * Categories
 * -------------------------------------------------------------------------- */

const categorySchema = z.object({
  id: z.string().max(40).optional(),
  name: z.string().trim().min(2, "Enter a name").max(80),
  slug: z.string().trim().max(96).optional(),
  parentId: z.string().max(40).nullable().optional(),
  description: z.string().trim().max(600).optional(),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  seoTitle: z.string().trim().max(120).optional(),
  seoDescription: z.string().trim().max(200).optional(),
});

export async function saveCategory(
  input: z.input<typeof categorySchema>,
): Promise<CatalogueResult> {
  await requireArea("products");

  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Please check the fields.",
    };
  }

  const data = parsed.data;

  // A category cannot be its own parent, nor a descendant of itself — that
  // would make the tree cyclic and hang every recursive render.
  if (data.id && data.parentId) {
    if (data.parentId === data.id) {
      return { ok: false, error: "A category cannot be its own parent." };
    }
    const child = await db.category.findFirst({
      where: { id: data.parentId, parentId: data.id },
      select: { id: true },
    });
    if (child) {
      return {
        ok: false,
        error: "That would create a loop — the chosen parent sits under this category.",
      };
    }
  }

  const payload = {
    name: data.name,
    parentId: data.parentId || null,
    description: data.description || null,
    isActive: data.isActive,
    isFeatured: data.isFeatured,
    seoTitle: data.seoTitle || null,
    seoDescription: data.seoDescription || null,
  };

  if (data.id) {
    const existing = await db.category.findUnique({
      where: { id: data.id },
      select: { slug: true },
    });
    if (!existing) return { ok: false, error: "Category not found." };

    const slug = data.slug
      ? await uniqueSlug(data.slug, "category", data.id)
      : existing.slug;

    await db.category.update({ where: { id: data.id }, data: { ...payload, slug } });
    revalidatePath(`/category/${slug}`);
  } else {
    const last = await db.category.findFirst({
      orderBy: { position: "desc" },
      select: { position: true },
    });

    const created = await db.category.create({
      data: {
        ...payload,
        slug: await uniqueSlug(data.slug || data.name, "category"),
        position: (last?.position ?? -1) + 1,
      },
      select: { id: true },
    });

    revalidatePath("/admin/categories");
    revalidatePath("/", "layout");
    return { ok: true, id: created.id, message: "Category created." };
  }

  revalidatePath("/admin/categories");
  revalidatePath("/", "layout");
  return { ok: true, message: "Category saved." };
}

export async function deleteCategory(id: string): Promise<CatalogueResult> {
  await requireArea("products");

  const [productCount, childCount] = await Promise.all([
    db.product.count({ where: { categoryId: id } }),
    db.category.count({ where: { parentId: id } }),
  ]);

  // Refuse rather than cascade. Deleting a category with products would orphan
  // them (categoryId is required), and a silent cascade would destroy
  // catalogue data from a single click.
  if (productCount > 0) {
    return {
      ok: false,
      error: `${productCount} product${productCount === 1 ? "" : "s"} still use this category. Move them first, or deactivate the category instead.`,
    };
  }
  if (childCount > 0) {
    return {
      ok: false,
      error: `This category has ${childCount} subcategor${childCount === 1 ? "y" : "ies"}. Remove or reassign them first.`,
    };
  }

  await db.category.delete({ where: { id } });

  revalidatePath("/admin/categories");
  revalidatePath("/", "layout");
  return { ok: true, message: "Category deleted." };
}

export async function reorderCategories(
  orderedIds: string[],
): Promise<CatalogueResult> {
  await requireArea("products");

  const parsed = z.array(z.string().max(40)).max(200).safeParse(orderedIds);
  if (!parsed.success) return { ok: false, error: "Invalid ordering." };

  await db.$transaction(
    parsed.data.map((id, index) =>
      db.category.update({ where: { id }, data: { position: index } }),
    ),
  );

  revalidatePath("/admin/categories");
  revalidatePath("/", "layout");
  return { ok: true, message: "Order saved." };
}

/* -----------------------------------------------------------------------------
 * Collections
 * -------------------------------------------------------------------------- */

const collectionSchema = z.object({
  id: z.string().max(40).optional(),
  name: z.string().trim().min(2, "Enter a name").max(80),
  slug: z.string().trim().max(96).optional(),
  description: z.string().trim().max(600).optional(),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
});

export async function saveCollection(
  input: z.input<typeof collectionSchema>,
): Promise<CatalogueResult> {
  await requireArea("products");

  const parsed = collectionSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Please check the fields.",
    };
  }

  const data = parsed.data;
  const payload = {
    name: data.name,
    description: data.description || null,
    isActive: data.isActive,
    isFeatured: data.isFeatured,
  };

  if (data.id) {
    const existing = await db.collection.findUnique({
      where: { id: data.id },
      select: { slug: true },
    });
    if (!existing) return { ok: false, error: "Collection not found." };

    const slug = data.slug
      ? await uniqueSlug(data.slug, "collection", data.id)
      : existing.slug;

    await db.collection.update({
      where: { id: data.id },
      data: { ...payload, slug },
    });
    revalidatePath(`/collections/${slug}`);
  } else {
    const last = await db.collection.findFirst({
      orderBy: { position: "desc" },
      select: { position: true },
    });

    const created = await db.collection.create({
      data: {
        ...payload,
        slug: await uniqueSlug(data.slug || data.name, "collection"),
        position: (last?.position ?? -1) + 1,
      },
      select: { id: true },
    });

    revalidatePath("/admin/collections");
    revalidatePath("/", "layout");
    return { ok: true, id: created.id, message: "Collection created." };
  }

  revalidatePath("/admin/collections");
  revalidatePath("/", "layout");
  return { ok: true, message: "Collection saved." };
}

export async function deleteCollection(id: string): Promise<CatalogueResult> {
  await requireArea("products");

  // Safe to cascade: ProductOnCollection is a join row, so removing it drops
  // the grouping without touching a single product.
  await db.collection.delete({ where: { id } });

  revalidatePath("/admin/collections");
  revalidatePath("/", "layout");
  return { ok: true, message: "Collection deleted. Products were not affected." };
}

/** Adds or removes a product from a collection. */
export async function toggleProductInCollection({
  productId,
  collectionId,
  include,
}: {
  productId: string;
  collectionId: string;
  include: boolean;
}): Promise<CatalogueResult> {
  await requireArea("products");

  if (include) {
    const last = await db.productOnCollection.findFirst({
      where: { collectionId },
      orderBy: { position: "desc" },
      select: { position: true },
    });

    await db.productOnCollection.upsert({
      where: { productId_collectionId: { productId, collectionId } },
      update: {},
      create: {
        productId,
        collectionId,
        position: (last?.position ?? -1) + 1,
      },
    });
  } else {
    await db.productOnCollection
      .delete({
        where: { productId_collectionId: { productId, collectionId } },
      })
      // Already absent is the desired end state, not an error.
      .catch(() => undefined);
  }

  revalidatePath("/admin/collections");
  revalidatePath("/", "layout");
  return { ok: true };
}

/* -----------------------------------------------------------------------------
 * Coupons
 * -------------------------------------------------------------------------- */

const couponSchema = z
  .object({
    id: z.string().max(40).optional(),
    code: z
      .string()
      .trim()
      .min(3, "Codes need at least 3 characters")
      .max(40)
      .regex(/^[A-Za-z0-9_-]+$/, "Use letters, numbers, hyphens and underscores only"),
    description: z.string().trim().max(200).optional(),
    type: z.enum(["PERCENTAGE", "FLAT"]),
    /** Percent when PERCENTAGE, rupees when FLAT. */
    value: z.number().min(0),
    minOrderRupees: z.number().min(0).max(10_000_000).default(0),
    maxDiscountRupees: z.number().min(0).max(10_000_000).nullable().optional(),
    startsAt: z.string().datetime().nullable().optional(),
    endsAt: z.string().datetime().nullable().optional(),
    usageLimit: z.number().int().min(1).max(1_000_000).nullable().optional(),
    perCustomerLimit: z.number().int().min(1).max(100).default(1),
    isActive: z.boolean().default(true),
  })
  .refine(
    (data) => data.type !== "PERCENTAGE" || data.value <= 100,
    { message: "A percentage discount cannot exceed 100%", path: ["value"] },
  )
  .refine(
    (data) =>
      !data.startsAt || !data.endsAt || new Date(data.endsAt) > new Date(data.startsAt),
    { message: "The end date must be after the start date", path: ["endsAt"] },
  );

export async function saveCoupon(
  input: z.input<typeof couponSchema>,
): Promise<CatalogueResult> {
  await requireArea("coupons");

  const parsed = couponSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Please check the fields.",
    };
  }

  const data = parsed.data;
  const code = data.code.toUpperCase();

  const payload = {
    code,
    description: data.description || null,
    type: data.type,
    // Percent stays a percent; a flat discount is stored in paise like every
    // other amount in the system.
    value: data.type === "PERCENTAGE" ? Math.round(data.value) : Math.round(data.value * 100),
    minOrderPaise: Math.round(data.minOrderRupees * 100),
    maxDiscountPaise: data.maxDiscountRupees
      ? Math.round(data.maxDiscountRupees * 100)
      : null,
    startsAt: data.startsAt ? new Date(data.startsAt) : null,
    endsAt: data.endsAt ? new Date(data.endsAt) : null,
    usageLimit: data.usageLimit ?? null,
    perCustomerLimit: data.perCustomerLimit,
    isActive: data.isActive,
  } satisfies Prisma.CouponUncheckedCreateInput;

  const clash = await db.coupon.findFirst({
    where: { code, ...(data.id ? { id: { not: data.id } } : {}) },
    select: { id: true },
  });
  if (clash) return { ok: false, error: `${code} is already in use.` };

  if (data.id) {
    await db.coupon.update({ where: { id: data.id }, data: payload });
  } else {
    const created = await db.coupon.create({ data: payload, select: { id: true } });
    revalidatePath("/admin/coupons");
    return { ok: true, id: created.id, message: `${code} created.` };
  }

  revalidatePath("/admin/coupons");
  return { ok: true, message: `${code} saved.` };
}

export async function setCouponActive(
  id: string,
  isActive: boolean,
): Promise<CatalogueResult> {
  await requireArea("coupons");
  await db.coupon.update({ where: { id }, data: { isActive } });
  revalidatePath("/admin/coupons");
  return { ok: true, message: isActive ? "Coupon enabled." : "Coupon disabled." };
}

export async function deleteCoupon(id: string): Promise<CatalogueResult> {
  await requireArea("coupons");

  const used = await db.couponUsage.count({ where: { couponId: id } });
  if (used > 0) {
    // Orders reference the coupon for their discount history. Disable instead.
    return {
      ok: false,
      error: `This coupon has been redeemed ${used} time${used === 1 ? "" : "s"} and is part of those order records. Disable it instead of deleting.`,
    };
  }

  await db.coupon.delete({ where: { id } });
  revalidatePath("/admin/coupons");
  return { ok: true, message: "Coupon deleted." };
}

/* -----------------------------------------------------------------------------
 * Customers
 * -------------------------------------------------------------------------- */

export async function setCustomerStatus(
  userId: string,
  status: "ACTIVE" | "BLOCKED",
): Promise<CatalogueResult> {
  const staff = await requireArea("customers");

  const target = await db.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  if (!target) return { ok: false, error: "Customer not found." };

  // Only a super admin may block staff, and nobody may block themselves out
  // of their own session.
  if (userId === staff.id) {
    return { ok: false, error: "You cannot block your own account." };
  }
  if (target.role !== "CUSTOMER" && staff.role !== "SUPER_ADMIN") {
    return { ok: false, error: "Only a super admin can block a staff account." };
  }

  await db.user.update({ where: { id: userId }, data: { status } });

  // Blocking must take effect now, not whenever their token expires.
  if (status === "BLOCKED") {
    await db.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  revalidatePath("/admin/customers");
  return {
    ok: true,
    message:
      status === "BLOCKED"
        ? "Customer blocked and signed out of all devices."
        : "Customer unblocked.",
  };
}

export async function setCustomerRole(
  userId: string,
  role:
    | "CUSTOMER"
    | "CONTENT_MANAGER"
    | "MARKETING_MANAGER"
    | "ORDER_MANAGER"
    | "PRODUCT_MANAGER"
    | "ADMIN"
    | "SUPER_ADMIN",
): Promise<CatalogueResult> {
  // Only a super admin can change roles — otherwise an admin could promote
  // themselves and the role system would be decorative.
  const staff = await requireArea("staff");

  if (userId === staff.id) {
    return { ok: false, error: "You cannot change your own role." };
  }

  await db.user.update({ where: { id: userId }, data: { role } });

  await db.auditLog.create({
    data: {
      userId: staff.id,
      action: "user.role",
      entityType: "User",
      entityId: userId,
      changes: { to: role },
    },
  });

  revalidatePath("/admin/customers");
  return { ok: true, message: `Role set to ${role.replace(/_/g, " ").toLowerCase()}.` };
}
