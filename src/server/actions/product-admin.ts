"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/lib/db";
import { requireArea } from "@/server/auth";
import { slugify } from "@/lib/utils";
import type { Prisma } from "@/generated/prisma/client";

/**
 * Product authoring.
 *
 * Three invariants this file exists to protect:
 *
 *  1. EVERY PRODUCT HAS AT LEAST ONE VARIANT. Inventory, cart lines and order
 *     items all hang off a variant, so a product without one is unsellable and
 *     would need a special case in five other places. A product sold in a
 *     single configuration gets an implicit "Standard" variant.
 *
 *  2. THE PRODUCT'S PRICE MIRRORS ITS CHEAPEST VARIANT. Listing pages sort and
 *     filter on `Product.pricePaise` to avoid joining every variant; that
 *     denormalisation is only safe if it is recomputed on every write.
 *
 *  3. A VARIANT THAT HAS BEEN ORDERED IS NEVER DELETED. Order items reference
 *     it for the customer's history. Removing one deactivates it instead.
 */

export type ProductResult =
  | { ok: true; id: string; slug: string; message?: string }
  | { ok: false; error: string };

/* -----------------------------------------------------------------------------
 * Schema
 * -------------------------------------------------------------------------- */

const variantInput = z.object({
  /** Present when editing an existing variant. */
  id: z.string().max(40).optional(),
  title: z.string().trim().min(1, "Every variant needs a name").max(80),
  sku: z.string().trim().max(60).optional(),
  /** Values aligned to the product's option names, e.g. ["14"] for Size. */
  optionValues: z.array(z.string().trim().max(40)).max(2).default([]),
  priceRupees: z.number().min(0).max(10_000_000),
  mrpRupees: z.number().min(0).max(10_000_000),
  stockQuantity: z.number().int().min(0).max(100_000),
  lowStockThreshold: z.number().int().min(0).max(1000).default(3),
  trackInventory: z.boolean().default(true),
  isActive: z.boolean().default(true),
});

const productInput = z.object({
  id: z.string().max(40).optional(),

  // --- Basics --------------------------------------------------------------
  name: z.string().trim().min(2, "Enter a product name").max(160),
  slug: z.string().trim().max(96).optional(),
  sku: z.string().trim().max(60).optional(),
  categoryId: z.string().min(1, "Choose a category").max(40),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]).default("DRAFT"),
  isFeatured: z.boolean().default(false),
  shortDescription: z.string().trim().max(300).optional(),
  description: z.string().max(20_000).optional(),
  tags: z.array(z.string().trim().max(40)).max(30).default([]),

  // --- Pricing -------------------------------------------------------------
  taxPercent: z.number().min(0).max(50).default(3),

  // --- Jewellery attributes ------------------------------------------------
  silverPurity: z.string().trim().max(80).optional(),
  silverWeightGram: z.number().min(0).max(100_000).nullable().optional(),
  dimensions: z.string().trim().max(120).optional(),
  finish: z.string().trim().max(80).optional(),
  plating: z.string().trim().max(80).optional(),
  stoneType: z.string().trim().max(80).optional(),
  stoneColour: z.string().trim().max(80).optional(),
  stoneCount: z.number().int().min(0).max(10_000).nullable().optional(),
  occasion: z.array(z.string().trim().max(40)).max(20).default([]),
  gender: z.enum(["WOMEN", "MEN", "UNISEX", "KIDS"]).nullable().optional(),
  isAdjustable: z.boolean().default(false),

  careInstructions: z.string().trim().max(2000).optional(),
  warrantyInfo: z.string().trim().max(2000).optional(),
  authenticityInfo: z.string().trim().max(2000).optional(),
  whatsIncluded: z.string().trim().max(2000).optional(),

  // --- Relations -----------------------------------------------------------
  /** Media ids, in display order. First is the primary image. */
  imageIds: z.array(z.string().max(40)).max(12).default([]),
  collectionIds: z.array(z.string().max(40)).max(20).default([]),

  /** 0–2 option dimensions, e.g. ["Size"] or ["Size", "Finish"]. */
  optionNames: z.array(z.string().trim().max(40)).max(2).default([]),
  variants: z.array(variantInput).min(1, "Add at least one variant"),

  // --- SEO -----------------------------------------------------------------
  seoTitle: z.string().trim().max(140).optional(),
  seoDescription: z.string().trim().max(300).optional(),
  canonicalUrl: z.string().trim().max(300).optional(),
});

export type ProductInput = z.input<typeof productInput>;

/* -----------------------------------------------------------------------------
 * Helpers
 * -------------------------------------------------------------------------- */

async function uniqueProductSlug(base: string, excludeId?: string) {
  const root = slugify(base) || "product";

  for (let attempt = 0; attempt < 50; attempt += 1) {
    const candidate = attempt === 0 ? root : `${root}-${attempt + 1}`;
    const clash = await db.product.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!clash || clash.id === excludeId) return candidate;
  }

  return `${root}-${Date.now().toString(36)}`;
}

/**
 * SKUs must be unique across BOTH products and variants — they are printed on
 * certificates and read back over the phone, so a collision is a real-world
 * mix-up, not just a constraint violation.
 */
async function uniqueSku(
  base: string,
  {
    excludeProductId,
    excludeVariantId,
    taken,
  }: {
    excludeProductId?: string;
    excludeVariantId?: string;
    /** SKUs already claimed earlier in this same submission. */
    taken?: Set<string>;
  } = {},
) {
  const root =
    base
      .toUpperCase()
      .replace(/[^A-Z0-9-]/g, "")
      .slice(0, 40) || "ASJ";

  for (let attempt = 0; attempt < 60; attempt += 1) {
    const candidate = attempt === 0 ? root : `${root}-${attempt + 1}`;
    if (taken?.has(candidate)) continue;

    const [productClash, variantClash] = await Promise.all([
      db.product.findUnique({ where: { sku: candidate }, select: { id: true } }),
      db.productVariant.findUnique({
        where: { sku: candidate },
        select: { id: true },
      }),
    ]);

    const productOk = !productClash || productClash.id === excludeProductId;
    const variantOk = !variantClash || variantClash.id === excludeVariantId;

    if (productOk && variantOk) return candidate;
  }

  return `${root}-${Date.now().toString(36).toUpperCase()}`;
}

const rupeesToPaise = (rupees: number) => Math.round(rupees * 100);

/* -----------------------------------------------------------------------------
 * Save
 * -------------------------------------------------------------------------- */

export async function saveProduct(
  input: ProductInput,
): Promise<ProductResult> {
  const staff = await requireArea("products");

  const parsed = productInput.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return {
      ok: false,
      error: issue
        ? `${issue.path.filter((p) => typeof p === "string").join(" → ") || "Form"}: ${issue.message}`
        : "Please check the form.",
    };
  }

  const data = parsed.data;

  // --- Cross-field validation ----------------------------------------------
  for (const variant of data.variants) {
    if (variant.priceRupees > variant.mrpRupees) {
      return {
        ok: false,
        error: `“${variant.title}”: the selling price cannot be above the MRP.`,
      };
    }
  }

  if (data.optionNames.length > 0) {
    // Two variants offering the same combination make the PDP selector
    // ambiguous — it cannot know which one a click means.
    const seen = new Set<string>();
    for (const variant of data.variants) {
      const key = variant.optionValues.join("|").toLowerCase();
      if (seen.has(key)) {
        return {
          ok: false,
          error: `Two variants share the same ${data.optionNames.join(" / ")} combination.`,
        };
      }
      seen.add(key);
    }
  }

  const category = await db.category.findUnique({
    where: { id: data.categoryId },
    select: { id: true },
  });
  if (!category) return { ok: false, error: "That category no longer exists." };

  // Product-level price mirrors the cheapest active variant.
  const activeVariants = data.variants.filter((v) => v.isActive);
  const pricingSource = (activeVariants.length ? activeVariants : data.variants)
    .slice()
    .sort((a, b) => a.priceRupees - b.priceRupees)[0];

  const productPricePaise = rupeesToPaise(pricingSource.priceRupees);
  const productMrpPaise = rupeesToPaise(pricingSource.mrpRupees);

  const optionsFor = (values: string[]) =>
    Object.fromEntries(
      data.optionNames
        .map((name, index) => [name, values[index] ?? ""])
        .filter(([, value]) => value !== ""),
    );

  const scalars = {
    name: data.name,
    categoryId: data.categoryId,
    status: data.status,
    isFeatured: data.isFeatured,
    shortDescription: data.shortDescription || null,
    description: data.description || null,
    tags: data.tags.map((t) => t.toLowerCase()),
    mrpPaise: productMrpPaise,
    pricePaise: productPricePaise,
    taxPercent: data.taxPercent,
    silverPurity: data.silverPurity || null,
    silverWeightGram: data.silverWeightGram ?? null,
    dimensions: data.dimensions || null,
    finish: data.finish || null,
    plating: data.plating || null,
    stoneType: data.stoneType || null,
    stoneColour: data.stoneColour || null,
    stoneCount: data.stoneCount ?? null,
    occasion: data.occasion,
    gender: data.gender ?? null,
    isAdjustable: data.isAdjustable,
    careInstructions: data.careInstructions || null,
    warrantyInfo: data.warrantyInfo || null,
    authenticityInfo: data.authenticityInfo || null,
    whatsIncluded: data.whatsIncluded || null,
    seoTitle: data.seoTitle || null,
    seoDescription: data.seoDescription || null,
    canonicalUrl: data.canonicalUrl || null,
    ogImageId: data.imageIds[0] ?? null,
  } satisfies Partial<Prisma.ProductUncheckedCreateInput>;

  // Resolve slug and SKUs BEFORE opening the transaction. Each probe is a
  // sequential round trip, and dozens of them inside an interactive
  // transaction blows Prisma's 5s limit. Uniqueness is guaranteed by the
  // database constraint regardless — these probes only pick a nice value.
  const existing = data.id
    ? await db.product.findUnique({
        where: { id: data.id },
        select: { slug: true, sku: true, publishedAt: true },
      })
    : null;

  if (data.id && !existing) return { ok: false, error: "Product not found." };

  const slug = data.id
    ? data.slug
      ? await uniqueProductSlug(data.slug, data.id)
      : existing!.slug
    : await uniqueProductSlug(data.slug || data.name);

  const productSku =
    existing?.sku ?? (await uniqueSku(data.sku || `ASJ-${slugify(data.name)}`));

  const existingVariants = data.id
    ? await db.productVariant.findMany({
        where: { productId: data.id },
        select: { id: true, sku: true },
      })
    : [];

  // Pre-resolve every variant SKU, tracking what we have already handed out so
  // two new variants in the same submission cannot claim the same value.
  const claimedSkus = new Set<string>([productSku]);
  const variantSkus: string[] = [];

  for (const variant of data.variants) {
    const inherited = variant.id
      ? existingVariants.find((v) => v.id === variant.id)?.sku
      : undefined;

    let sku = variant.sku?.trim().toUpperCase() || inherited;

    if (!sku || claimedSkus.has(sku)) {
      sku = await uniqueSku(
        `${data.sku || slugify(data.name)}-${variant.title || "STD"}`,
        { excludeVariantId: variant.id, taken: claimedSkus },
      );
    }

    claimedSkus.add(sku);
    variantSkus.push(sku);
  }

  try {
    const result = await db.$transaction(async (tx) => {
      let productId = data.id;

      if (productId) {
        await tx.product.update({
          where: { id: productId },
          data: {
            ...scalars,
            slug,
            // First publish stamps the date; re-publishing must not reset it,
            // or the product reappears in "New arrivals".
            ...(data.status === "ACTIVE" && !existing!.publishedAt
              ? { publishedAt: new Date() }
              : {}),
          },
        });
      } else {
        const created = await tx.product.create({
          data: {
            ...scalars,
            slug,
            sku: productSku,
            ...(data.status === "ACTIVE" ? { publishedAt: new Date() } : {}),
          },
          select: { id: true },
        });
        productId = created.id;
      }

      // --- Variants ---------------------------------------------------------
      const keptIds = new Set(
        data.variants.map((v) => v.id).filter(Boolean) as string[],
      );

      for (const [index, variant] of data.variants.entries()) {
        const payload = {
          title: variant.title,
          sku: variantSkus[index],
          options: optionsFor(variant.optionValues),
          mrpPaise: rupeesToPaise(variant.mrpRupees),
          pricePaise: rupeesToPaise(variant.priceRupees),
          stockQuantity: variant.stockQuantity,
          lowStockThreshold: variant.lowStockThreshold,
          trackInventory: variant.trackInventory,
          isActive: variant.isActive,
          position: index,
        };

        if (variant.id) {
          await tx.productVariant.update({
            where: { id: variant.id },
            data: payload,
          });
        } else {
          await tx.productVariant.create({
            data: { ...payload, productId: productId! },
          });
        }
      }

      // Variants the editor removed. Ones with order history are deactivated
      // rather than deleted — an order item points at them.
      for (const existing of existingVariants) {
        if (keptIds.has(existing.id)) continue;

        const ordered = await tx.orderItem.count({
          where: { variantId: existing.id },
        });

        if (ordered > 0) {
          await tx.productVariant.update({
            where: { id: existing.id },
            data: { isActive: false },
          });
        } else {
          await tx.productVariant.delete({ where: { id: existing.id } });
        }
      }

      // --- Images -----------------------------------------------------------
      await tx.productImage.deleteMany({ where: { productId } });
      if (data.imageIds.length) {
        await tx.productImage.createMany({
          data: data.imageIds.map((mediaId, index) => ({
            productId: productId!,
            mediaId,
            position: index,
            isPrimary: index === 0,
            alt: data.name,
          })),
          skipDuplicates: true,
        });
      }

      // --- Collections ------------------------------------------------------
      await tx.productOnCollection.deleteMany({ where: { productId } });
      if (data.collectionIds.length) {
        await tx.productOnCollection.createMany({
          data: data.collectionIds.map((collectionId, index) => ({
            productId: productId!,
            collectionId,
            position: index,
          })),
          skipDuplicates: true,
        });
      }

      await tx.auditLog.create({
        data: {
          userId: staff.id,
          action: data.id ? "product.update" : "product.create",
          entityType: "Product",
          entityId: productId,
          changes: { name: data.name, status: data.status },
        },
      });

      return { id: productId!, slug };
    });

    revalidatePath("/admin/products");
    revalidatePath(`/admin/products/${result.id}`);
    revalidatePath(`/product/${result.slug}`);
    revalidatePath("/");

    return {
      ok: true,
      id: result.id,
      slug: result.slug,
      message: data.id ? "Product saved." : "Product created.",
    };
  } catch (error) {
    if (error instanceof NotFoundError) {
      return { ok: false, error: error.message };
    }
    console.error("[admin] saveProduct failed", error);
    return {
      ok: false,
      error: "Could not save the product. Please try again.",
    };
  }
}

class NotFoundError extends Error {}

/* -----------------------------------------------------------------------------
 * Delete
 * -------------------------------------------------------------------------- */

export async function deleteProduct(id: string): Promise<ProductResult> {
  const staff = await requireArea("products");

  const product = await db.product.findUnique({
    where: { id },
    select: { slug: true, name: true },
  });
  if (!product) return { ok: false, error: "Product not found." };

  const ordered = await db.orderItem.count({ where: { productId: id } });
  if (ordered > 0) {
    // Order items keep a snapshot, so history survives — but the product row
    // is still referenced, and losing it breaks the "view product" link on
    // past orders. Archiving keeps everything intact.
    return {
      ok: false,
      error: `This product appears in ${ordered} order${ordered === 1 ? "" : "s"}. Set it to Archived instead of deleting.`,
    };
  }

  await db.product.delete({ where: { id } });

  await db.auditLog.create({
    data: {
      userId: staff.id,
      action: "product.delete",
      entityType: "Product",
      entityId: id,
      changes: { name: product.name },
    },
  });

  revalidatePath("/admin/products");
  revalidatePath("/");

  return { ok: true, id, slug: product.slug, message: "Product deleted." };
}

/* -----------------------------------------------------------------------------
 * Product FAQs
 * -------------------------------------------------------------------------- */

const faqInput = z.object({
  productId: z.string().min(1).max(40),
  faqs: z
    .array(
      z.object({
        question: z.string().trim().min(3).max(300),
        answer: z.string().trim().min(3).max(2000),
      }),
    )
    .max(20),
});

export async function saveProductFaqs(
  input: z.input<typeof faqInput>,
): Promise<ProductResult> {
  await requireArea("products");

  const parsed = faqInput.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Every question needs a question and an answer." };
  }

  const product = await db.product.findUnique({
    where: { id: parsed.data.productId },
    select: { slug: true },
  });
  if (!product) return { ok: false, error: "Product not found." };

  await db.$transaction([
    db.productFaq.deleteMany({ where: { productId: parsed.data.productId } }),
    db.productFaq.createMany({
      data: parsed.data.faqs.map((faq, index) => ({
        ...faq,
        productId: parsed.data.productId,
        position: index,
      })),
    }),
  ]);

  revalidatePath(`/product/${product.slug}`);
  revalidatePath(`/admin/products/${parsed.data.productId}`);

  return {
    ok: true,
    id: parsed.data.productId,
    slug: product.slug,
    message: "Questions saved.",
  };
}
