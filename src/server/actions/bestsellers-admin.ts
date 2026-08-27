"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/lib/db";
import { requireArea } from "@/server/auth";

export type BestSellersActionResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

const bestSellersSchema = z.array(z.string().min(1));

export async function saveBestSellersAction(
  productIds: string[],
): Promise<BestSellersActionResult> {
  await requireArea("products");

  const parsed = bestSellersSchema.safeParse(productIds);
  if (!parsed.success) {
    return { ok: false, error: "Invalid product IDs selection." };
  }

  const cleanIds = parsed.data;

  // 1. Save to global settings table key "bestsellers"
  await db.setting.upsert({
    where: { key: "bestsellers" },
    update: { value: { productIds: cleanIds } },
    create: { key: "bestsellers", value: { productIds: cleanIds } },
  });

  // 2. Also sync to HomepageSection labeled "Best sellers" or PRODUCT_CAROUSEL
  const homepageBestSellerSection = await db.homepageSection.findFirst({
    where: {
      OR: [{ label: "Best sellers" }, { label: { contains: "best", mode: "insensitive" } }],
    },
  });

  if (homepageBestSellerSection) {
    const currentSettings = (homepageBestSellerSection.settings as Record<string, any>) || {};
    const updatedSource = {
      ...(currentSettings.source || {}),
      mode: "bestsellers",
      productIds: cleanIds,
    };

    await db.homepageSection.update({
      where: { id: homepageBestSellerSection.id },
      data: {
        settings: {
          ...currentSettings,
          source: updatedSource,
        },
      },
    });
  }

  revalidatePath("/", "layout");
  revalidatePath("/admin/homepage");
  revalidatePath("/admin/bestsellers");

  return {
    ok: true,
    message: `Successfully saved ${cleanIds.length} product(s) as Best Sellers.`,
  };
}
