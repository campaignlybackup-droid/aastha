"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/lib/db";
import { requireArea } from "@/server/auth";
import { cancelOrder, confirmOrder } from "@/server/orders";
import type { AdminArea } from "@/lib/auth/roles";
import type { Prisma } from "@/generated/prisma/client";

/**
 * Admin mutations.
 *
 * Every action re-checks authorisation with `requireArea` — a server action is
 * a public HTTP endpoint, and the fact that the button rendering it was hidden
 * proves nothing about who is calling it.
 *
 * Every action also writes an AuditLog entry. For a store where several people
 * share admin access, "who changed this price" needs an answer.
 */

export type AdminResult =
  | { ok: true; message?: string }
  | { ok: false; error: string };

async function audit({
  userId,
  action,
  entityType,
  entityId,
  changes,
}: {
  userId: string;
  action: string;
  entityType: string;
  entityId?: string;
  changes?: Record<string, unknown>;
}) {
  const headerList = await headers();
  await db.auditLog.create({
    data: {
      userId,
      action,
      entityType,
      entityId,
      changes: (changes ?? undefined) as never,
      ip:
        headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        headerList.get("x-real-ip") ??
        null,
      userAgent: headerList.get("user-agent")?.slice(0, 300) ?? null,
    },
  });
}

/* -----------------------------------------------------------------------------
 * Orders
 * -------------------------------------------------------------------------- */

export async function adminCancelOrder(orderId: string): Promise<AdminResult> {
  const user = await requireArea("orders");

  const result = await cancelOrder({
    orderId,
    reason: `Cancelled by ${user.name ?? user.mobile} from the admin.`,
  });

  if (!result.ok) return { ok: false, error: result.error };

  await audit({
    userId: user.id,
    action: "order.cancel",
    entityType: "Order",
    entityId: orderId,
  });

  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/orders");

  return { ok: true, message: "Order cancelled and stock released." };
}

export async function adminUpdateOrderStatus({
  orderId,
  status,
  paymentStatus,
}: {
  orderId: string;
  status?: Prisma.EnumOrderStatusFieldUpdateOperationsInput["set"] | "PENDING" | "CONFIRMED" | "SHIPPED" | "DELIVERED" | "CANCELLED" | "REFUNDED";
  paymentStatus?: Prisma.EnumPaymentStatusFieldUpdateOperationsInput["set"] | "PENDING" | "AUTHORIZED" | "PAID" | "FAILED" | "REFUNDED";
}): Promise<AdminResult> {
  const user = await requireArea("orders");

  const order = await db.order.findUnique({
    where: { id: orderId },
    select: { id: true, status: true, paymentStatus: true, totalPaise: true, placedAt: true },
  });

  if (!order) return { ok: false, error: "Order not found." };

  if (paymentStatus === "PAID" || status === "CONFIRMED") {
    await confirmOrder({
      orderId: order.id,
      providerPaymentId: `manual_admin_${Date.now()}`,
      providerOrderId: null,
      method: "MANUAL_ADMIN",
      amountPaise: order.totalPaise,
    });
  }

  await db.order.update({
    where: { id: orderId },
    data: {
      ...(status ? { status } : {}),
      ...(paymentStatus ? { paymentStatus } : {}),
      ...(status === "CONFIRMED" && !order.placedAt ? { placedAt: new Date() } : {}),
    },
  });

  await audit({
    userId: user.id,
    action: "order.update_status",
    entityType: "Order",
    entityId: orderId,
    changes: { status, paymentStatus },
  });

  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/orders");
  revalidatePath(`/order/${orderId}`);

  return { ok: true, message: "Order & Payment status updated." };
}

/* -----------------------------------------------------------------------------
 * Inventory
 * -------------------------------------------------------------------------- */

const stockSchema = z.object({
  variantId: z.string().min(1).max(40),
  stockQuantity: z.number().int().min(0).max(100_000),
  lowStockThreshold: z.number().int().min(0).max(1000).optional(),
  note: z.string().max(200).optional(),
});

export async function adminSetStock(
  input: z.input<typeof stockSchema>,
): Promise<AdminResult> {
  const user = await requireArea("inventory");

  const parsed = stockSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid stock value." };

  const variant = await db.productVariant.findUnique({
    where: { id: parsed.data.variantId },
    select: { id: true, stockQuantity: true, productId: true },
  });
  if (!variant) return { ok: false, error: "Variant not found." };

  const delta = parsed.data.stockQuantity - variant.stockQuantity;

  await db.$transaction([
    db.productVariant.update({
      where: { id: variant.id },
      data: {
        stockQuantity: parsed.data.stockQuantity,
        ...(parsed.data.lowStockThreshold !== undefined
          ? { lowStockThreshold: parsed.data.lowStockThreshold }
          : {}),
      },
    }),
    // Manual adjustments belong in the same ledger as sales, so the history
    // of a variant's stock reads as one continuous story.
    db.stockMovement.create({
      data: {
        variantId: variant.id,
        delta,
        balance: parsed.data.stockQuantity,
        reason: "admin.adjustment",
        actorId: user.id,
        note: parsed.data.note,
      },
    }),
  ]);

  await audit({
    userId: user.id,
    action: "inventory.adjust",
    entityType: "ProductVariant",
    entityId: variant.id,
    changes: { from: variant.stockQuantity, to: parsed.data.stockQuantity },
  });

  revalidatePath("/admin/inventory");
  revalidatePath(`/admin/products/${variant.productId}`);

  return { ok: true, message: `Stock set to ${parsed.data.stockQuantity}.` };
}

/* -----------------------------------------------------------------------------
 * Products
 * -------------------------------------------------------------------------- */

export async function adminSetProductStatus(
  productId: string,
  status: "DRAFT" | "ACTIVE" | "ARCHIVED",
): Promise<AdminResult> {
  const user = await requireArea("products");

  const product = await db.product.findUnique({
    where: { id: productId },
    select: { status: true, publishedAt: true, slug: true },
  });
  if (!product) return { ok: false, error: "Product not found." };

  await db.product.update({
    where: { id: productId },
    data: {
      status,
      // First publish stamps the date; re-publishing later must not reset it,
      // or the product would reappear as "New".
      ...(status === "ACTIVE" && !product.publishedAt
        ? { publishedAt: new Date() }
        : {}),
    },
  });

  await audit({
    userId: user.id,
    action: "product.status",
    entityType: "Product",
    entityId: productId,
    changes: { from: product.status, to: status },
  });

  revalidatePath("/admin/products");
  revalidatePath("/");
  revalidatePath(`/product/${product.slug}`);

  return { ok: true, message: `Product is now ${status.toLowerCase()}.` };
}

const productPricingSchema = z.object({
  productId: z.string().min(1).max(40),
  mrpRupees: z.number().min(0).max(10_000_000),
  priceRupees: z.number().min(0).max(10_000_000),
});

export async function adminSetProductPricing(
  input: z.input<typeof productPricingSchema>,
): Promise<AdminResult> {
  const user = await requireArea("products");

  const parsed = productPricingSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Enter valid prices." };

  if (parsed.data.priceRupees > parsed.data.mrpRupees) {
    return { ok: false, error: "Selling price cannot exceed MRP." };
  }

  const mrpPaise = Math.round(parsed.data.mrpRupees * 100);
  const pricePaise = Math.round(parsed.data.priceRupees * 100);

  const product = await db.product.findUnique({
    where: { id: parsed.data.productId },
    select: { mrpPaise: true, pricePaise: true, slug: true },
  });
  if (!product) return { ok: false, error: "Product not found." };

  // Product-level price is denormalised from its variants for sorting and
  // filtering, so both must move together.
  await db.$transaction([
    db.product.update({
      where: { id: parsed.data.productId },
      data: { mrpPaise, pricePaise },
    }),
    db.productVariant.updateMany({
      where: { productId: parsed.data.productId },
      data: { mrpPaise, pricePaise },
    }),
  ]);

  await audit({
    userId: user.id,
    action: "product.pricing",
    entityType: "Product",
    entityId: parsed.data.productId,
    changes: {
      from: { mrpPaise: product.mrpPaise, pricePaise: product.pricePaise },
      to: { mrpPaise, pricePaise },
    },
  });

  revalidatePath("/admin/products");
  revalidatePath(`/product/${product.slug}`);
  revalidatePath("/");

  return { ok: true, message: "Pricing updated." };
}

/* -----------------------------------------------------------------------------
 * Reviews
 * -------------------------------------------------------------------------- */

export async function adminModerateReview(
  reviewId: string,
  decision: "APPROVED" | "REJECTED",
): Promise<AdminResult> {
  const user = await requireArea("reviews");

  const review = await db.review.findUnique({
    where: { id: reviewId },
    select: { productId: true, status: true },
  });
  if (!review) return { ok: false, error: "Review not found." };

  await db.review.update({
    where: { id: reviewId },
    data: {
      status: decision,
      moderatedAt: new Date(),
      moderatedById: user.id,
    },
  });

  // Recompute the product's denormalised rating from approved reviews only.
  const aggregate = await db.review.aggregate({
    where: { productId: review.productId, status: "APPROVED" },
    _avg: { rating: true },
    _count: true,
  });

  await db.product.update({
    where: { id: review.productId },
    data: {
      ratingAverage: aggregate._avg.rating ?? 0,
      ratingCount: aggregate._count,
    },
  });

  await audit({
    userId: user.id,
    action: "review.moderate",
    entityType: "Review",
    entityId: reviewId,
    changes: { from: review.status, to: decision },
  });

  revalidatePath("/admin/reviews");

  return { ok: true, message: `Review ${decision.toLowerCase()}.` };
}

/* -----------------------------------------------------------------------------
 * Settings
 * -------------------------------------------------------------------------- */

export async function adminSaveSetting(
  key: string,
  value: unknown,
): Promise<AdminResult> {
  const user = await requireArea("settings");

  const safeKey = z.string().min(1).max(60).safeParse(key);
  if (!safeKey.success) return { ok: false, error: "Invalid setting key." };

  await db.setting.upsert({
    where: { key: safeKey.data },
    update: { value: value as Prisma.InputJsonValue },
    create: { key: safeKey.data, value: value as Prisma.InputJsonValue },
  });

  await audit({
    userId: user.id,
    action: "setting.update",
    entityType: "Setting",
    entityId: safeKey.data,
  });

  // Settings feed the header, footer and every page's shipping copy.
  revalidatePath("/", "layout");

  return { ok: true, message: "Settings saved." };
}

export async function adminDeleteMediaItems(ids: string[]): Promise<AdminResult> {
  const user = await requireArea("media");

  if (!ids || ids.length === 0) {
    return { ok: false, error: "No media items selected." };
  }

  const result = await db.media.deleteMany({
    where: { id: { in: ids } },
  });

  await audit({
    userId: user.id,
    action: "media.delete",
    entityType: "Media",
    changes: { count: result.count, ids },
  });

  revalidatePath("/admin/media");
  revalidatePath("/admin/products");

  return {
    ok: true,
    message: `Successfully deleted ${result.count} media ${result.count === 1 ? "item" : "items"} from database.`,
  };
}

/** Shared guard for admin pages that need a specific area. */
export async function assertArea(area: AdminArea) {
  return requireArea(area);
}
