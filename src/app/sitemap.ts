import type { MetadataRoute } from "next";

import { db } from "@/lib/db";
import { getAllStaticPages } from "@/server/pages";
import { publicEnv } from "@/lib/env";

/**
 * XML sitemap.
 *
 * Only indexable, canonical URLs belong here. Cart, checkout, account, order
 * and search pages are all noindex and are deliberately absent — listing a
 * noindex URL in a sitemap is a contradictory signal that Search Console
 * reports as an error.
 */
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = publicEnv.siteUrl;

  const [products, categories, collections] = await Promise.all([
    db.product.findMany({
      where: { status: "ACTIVE" },
      select: { slug: true, updatedAt: true },
    }),
    db.category.findMany({
      where: { isActive: true },
      select: { slug: true, updatedAt: true },
    }),
    db.collection.findMany({
      where: { isActive: true },
      select: { slug: true, updatedAt: true },
    }),
  ]);

  // Content pages are listed only once written. An unwritten page is noindex,
  // and listing a noindex URL in a sitemap is a contradictory signal that
  // Search Console reports as an error.
  const contentPages = (await getAllStaticPages())
    .filter((page) => page.body)
    .map((page) => ({
      url: `${base}/${page.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.5,
    }));

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: "daily", priority: 1 },
    { url: `${base}/shop`, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/combos`, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/category/measure-ring-size`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/faq`, changeFrequency: "monthly", priority: 0.6 },
    ...contentPages,
  ];

  return [
    ...staticPages,
    ...categories.map((category) => ({
      url: `${base}/category/${category.slug}`,
      lastModified: category.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...collections.map((collection) => ({
      url: `${base}/collections/${collection.slug}`,
      lastModified: collection.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...products.map((product) => ({
      url: `${base}/product/${product.slug}`,
      lastModified: product.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
