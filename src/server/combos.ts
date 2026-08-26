"server-only";

import { cache } from "react";
import { db } from "@/lib/db";
import { getSetting } from "@/server/catalog";

export type ComboOfferDetail = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  comboPricePaise: number;
  originalTotalPaise: number;
  savingsPaise: number;
  savingsPercent: number;
  availableStock: number;
  startsAt: Date | null;
  endsAt: Date | null;
  isActive: boolean;
  isFeatured: boolean;
  imageUrl: string | null;
  items: Array<{
    id: string;
    productId: string;
    productName: string;
    productSlug: string;
    variantId: string | null;
    variantTitle: string | null;
    pricePaise: number;
    mrpPaise: number | null;
    imageUrl: string | null;
    stockQuantity: number;
    quantity: number;
  }>;
};

export const getComboOffers = cache(async (onlyActive = true): Promise<ComboOfferDetail[]> => {
  if (onlyActive) {
    const setting = await getSetting("combos").catch(() => ({ enabled: true }));
    if (!setting.enabled) return [];
  }

  const now = new Date();

  const rawCombos = await db.comboOffer.findMany({
    where: onlyActive
      ? {
          isActive: true,
          OR: [{ startsAt: null }, { startsAt: { lte: now } }],
          AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
        }
      : undefined,
    orderBy: [{ position: "asc" }, { createdAt: "desc" }],
    include: {
      image: { select: { secureUrl: true, url: true } },
      items: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
              pricePaise: true,
              mrpPaise: true,
              images: {
                where: { isPrimary: true },
                take: 1,
                include: { media: { select: { secureUrl: true, url: true } } },
              },
              variants: {
                select: {
                  id: true,
                  title: true,
                  pricePaise: true,
                  mrpPaise: true,
                  stockQuantity: true,
                  image: { select: { secureUrl: true, url: true } },
                },
              },
            },
          },
          variant: {
            select: {
              id: true,
              title: true,
              pricePaise: true,
              mrpPaise: true,
              stockQuantity: true,
              image: { select: { secureUrl: true, url: true } },
            },
          },
        },
      },
    },
  });

  return rawCombos.map((combo) => {
    let originalTotalPaise = 0;
    let availableStock = Infinity;

    const items = combo.items.map((item) => {
      const selectedVariant = item.variant || item.product.variants[0];
      const itemPricePaise = selectedVariant?.pricePaise ?? item.product.pricePaise;
      const itemMrpPaise = selectedVariant?.mrpPaise ?? item.product.mrpPaise;
      const itemStock = selectedVariant?.stockQuantity ?? 0;
      const primaryImage =
        selectedVariant?.image?.secureUrl ||
        selectedVariant?.image?.url ||
        item.product.images[0]?.media?.secureUrl ||
        item.product.images[0]?.media?.url ||
        null;

      originalTotalPaise += itemPricePaise * item.quantity;
      const maxComboUnitsPossible = Math.floor(itemStock / item.quantity);
      if (maxComboUnitsPossible < availableStock) {
        availableStock = maxComboUnitsPossible;
      }

      return {
        id: item.id,
        productId: item.product.id,
        productName: item.product.name,
        productSlug: item.product.slug,
        variantId: item.variantId,
        variantTitle: item.variant?.title ?? null,
        pricePaise: itemPricePaise,
        mrpPaise: itemMrpPaise,
        imageUrl: primaryImage,
        stockQuantity: itemStock,
        quantity: item.quantity,
      };
    });

    if (availableStock === Infinity) availableStock = 0;

    const savingsPaise = Math.max(0, originalTotalPaise - combo.comboPricePaise);
    const savingsPercent =
      originalTotalPaise > 0 ? Math.round((savingsPaise / originalTotalPaise) * 100) : 0;

    const customImage = combo.image?.secureUrl || combo.image?.url || null;

    return {
      id: combo.id,
      title: combo.title,
      slug: combo.slug,
      description: combo.description,
      comboPricePaise: combo.comboPricePaise,
      originalTotalPaise,
      savingsPaise,
      savingsPercent,
      availableStock,
      startsAt: combo.startsAt,
      endsAt: combo.endsAt,
      isActive: combo.isActive,
      isFeatured: combo.isFeatured,
      imageUrl: customImage,
      items,
    };
  });
});

export const getComboBySlug = cache(async (slug: string): Promise<ComboOfferDetail | null> => {
  const combos = await getComboOffers(false);
  return combos.find((c) => c.slug === slug) ?? null;
});

export const getCombosForProduct = cache(async (productId: string): Promise<ComboOfferDetail[]> => {
  const allCombos = await getComboOffers(true);
  return allCombos.filter((combo) =>
    combo.items.some((item) => item.productId === productId),
  );
});
