"use server";

import { z } from "zod";

import { db } from "@/lib/db";
import { requireArea } from "@/server/auth";
import { uniqueSlug } from "@/server/actions/catalogue-admin";

export type ComboResult = { ok: true; message?: string } | { ok: false; error: string };

const comboItemSchema = z.object({
  productId: z.string().min(1, "Select a product"),
  variantId: z.string().nullable().optional(),
  quantity: z.number().int().min(1).default(1),
});

const comboOfferSchema = z.object({
  id: z.string().max(40).optional(),
  title: z.string().trim().min(2, "Title is required").max(120),
  slug: z.string().trim().max(96).optional(),
  description: z.string().trim().max(1000).optional(),
  comboPricePaise: z.number().int().min(100, "Price must be at least ₹1"),
  imageId: z.string().max(40).nullable().optional(),
  startsAt: z.string().nullable().optional(),
  endsAt: z.string().nullable().optional(),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  items: z.array(comboItemSchema).min(2, "Select at least 2 products for a combo offer"),
});

export async function saveComboOffer(
  input: z.input<typeof comboOfferSchema>,
): Promise<ComboResult> {
  await requireArea("products");

  const parsed = comboOfferSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Please check the form fields.",
    };
  }

  const data = parsed.data;

  // Auto-generate unique slug
  const baseSlug = data.slug
    ? data.slug
    : data.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

  const slug = await uniqueSlug(baseSlug, "collection", data.id);

  const startsAt = data.startsAt ? new Date(data.startsAt) : null;
  const endsAt = data.endsAt ? new Date(data.endsAt) : null;

  if (startsAt && endsAt && endsAt <= startsAt) {
    return { ok: false, error: "End date must be after start date." };
  }

  if (data.id) {
    const existing = await db.comboOffer.findUnique({
      where: { id: data.id },
      select: { id: true },
    });
    if (!existing) return { ok: false, error: "Combo offer not found." };

    await db.$transaction([
      db.comboItem.deleteMany({ where: { comboOfferId: data.id } }),
      db.comboOffer.update({
        where: { id: data.id },
        data: {
          title: data.title,
          slug,
          description: data.description || null,
          comboPricePaise: data.comboPricePaise,
          imageId: data.imageId || null,
          startsAt,
          endsAt,
          isActive: data.isActive,
          isFeatured: data.isFeatured,
          items: {
            create: data.items.map((item) => ({
              productId: item.productId,
              variantId: item.variantId || null,
              quantity: item.quantity,
            })),
          },
        },
      }),
    ]);

    return { ok: true, message: "Combo offer updated successfully." };
  } else {
    await db.comboOffer.create({
      data: {
        title: data.title,
        slug,
        description: data.description || null,
        comboPricePaise: data.comboPricePaise,
        imageId: data.imageId || null,
        startsAt,
        endsAt,
        isActive: data.isActive,
        isFeatured: data.isFeatured,
        items: {
          create: data.items.map((item) => ({
            productId: item.productId,
            variantId: item.variantId || null,
            quantity: item.quantity,
          })),
        },
      },
    });

    return { ok: true, message: "Combo offer created successfully." };
  }
}

export async function deleteComboOffer(id: string): Promise<ComboResult> {
  await requireArea("products");

  const existing = await db.comboOffer.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) return { ok: false, error: "Combo offer not found." };

  await db.comboOffer.delete({ where: { id } });
  return { ok: true, message: "Combo offer deleted." };
}

export async function toggleComboOfferStatus(
  id: string,
  isActive: boolean,
): Promise<ComboResult> {
  await requireArea("products");

  await db.comboOffer.update({
    where: { id },
    data: { isActive },
  });

  return { ok: true, message: isActive ? "Combo activated." : "Combo hidden." };
}
