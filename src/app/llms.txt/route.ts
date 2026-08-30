import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { publicEnv } from "@/lib/env";

export const revalidate = 3600; // Automatically updates hourly

export async function GET() {
  const base = publicEnv.siteUrl;

  const [categories, products, collections] = await Promise.all([
    db.category.findMany({
      where: { isActive: true },
      select: { name: true, slug: true, description: true },
      orderBy: { position: "asc" },
    }),
    db.product.findMany({
      where: { status: "ACTIVE" },
      select: {
        name: true,
        slug: true,
        pricePaise: true,
        mrpPaise: true,
        shortDescription: true,
        category: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    db.collection.findMany({
      where: { isActive: true },
      select: { name: true, slug: true, description: true },
    }),
  ]);

  const categoryLines = categories
    .map((c) => `- [${c.name}](${base}/category/${c.slug}): ${c.description || `${c.name} in hallmarked 925 sterling silver.`}`)
    .join("\n");

  const ringGuideLine = `- [Measure Ring Size](${base}/category/measure-ring-size): Step-by-step Indian & US ring size measurement guide and conversion chart.`;
  const comboLine = `- [Combo Offers](${base}/combos): Special curated 925 sterling silver jewellery combo sets.`;

  const productLines = products
    .map(
      (p) =>
        `- [${p.name}](${base}/product/${p.slug}) - ₹${(p.pricePaise / 100).toLocaleString("en-IN")} (${p.category.name}): ${
          p.shortDescription || "Made with pure 925 Sterling Silver."
        }`,
    )
    .join("\n");

  const collectionLines = collections
    .map((col) => `- [${col.name}](${base}/collections/${col.slug}): ${col.description || `${col.name} collection.`}`)
    .join("\n");

  const markdown = `# Aastha Silver & Jewels

> Hallmarked 925 Sterling Silver Jewellery Store in India.

## About Aastha Silver & Jewels
Aastha Silver & Jewels crafts authentic, BIS-hallmarked 925 sterling silver jewellery including rings, chains, anklets, bracelets, earrings, pendants, and curated combo sets. Every purchase includes an official Certificate of Authenticity.

## Core Jewellery Categories
${categoryLines}
${ringGuideLine}
${comboLine}

## Collections
${collectionLines || "- [All Jewellery](" + base + "/shop): Browse our full range of 925 sterling silver jewellery."}

## Active Catalogue
${productLines}

## Quality Guarantees & Policy
- **Purity**: Guaranteed genuine 925 sterling silver with authenticity certificate on every order.
- **Dispatch & Delivery**: Dispatched within 3–4 business days with free nationwide shipping across India.
- **Support**: WhatsApp assistance available at +91 9116662871 or via email at aasthasilverandjewels@gmail.com.
`;

  return new NextResponse(markdown, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
