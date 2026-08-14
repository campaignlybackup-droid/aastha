import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { publicEnv } from "@/lib/env";
import { paiseToRupees } from "@/lib/money";
import { toPlainText } from "@/lib/cms/sanitize";

/**
 * Meta Commerce Manager product feed (CSV).
 *
 * Point a scheduled feed at this URL in Commerce Manager → Catalogue → Data
 * Sources → Scheduled feed. It also satisfies Google Merchant Center's core
 * columns, which use the same names.
 *
 * One row per VARIANT, not per product. Meta matches ads to a specific
 * purchasable item, and a ring in four sizes has four different availabilities
 * — collapsing them to one row advertises sizes that are out of stock.
 * Variants share `item_group_id` so Meta groups them.
 */
export const revalidate = 3600;

const CSV_COLUMNS = [
  "id",
  "item_group_id",
  "title",
  "description",
  "availability",
  "condition",
  "price",
  "sale_price",
  "link",
  "image_link",
  "additional_image_link",
  "brand",
  "google_product_category",
  "product_type",
  "material",
  "custom_label_0",
] as const;

/** RFC 4180: wrap in quotes and double any internal quote. */
function csvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const text = String(value).replace(/\r?\n/g, " ").trim();
  return `"${text.replace(/"/g, '""')}"`;
}

export async function GET() {
  const products = await db.product.findMany({
    where: { status: "ACTIVE" },
    select: {
      id: true,
      name: true,
      slug: true,
      brand: true,
      description: true,
      shortDescription: true,
      silverPurity: true,
      category: { select: { name: true, parent: { select: { name: true } } } },
      images: {
        orderBy: { position: "asc" },
        take: 3,
        select: { media: { select: { secureUrl: true } } },
      },
      variants: {
        where: { isActive: true },
        orderBy: { position: "asc" },
        select: {
          id: true,
          sku: true,
          title: true,
          pricePaise: true,
          mrpPaise: true,
          trackInventory: true,
          stockQuantity: true,
          reservedQuantity: true,
          image: { select: { secureUrl: true } },
        },
      },
    },
  });

  const rows: string[] = [CSV_COLUMNS.join(",")];

  for (const product of products) {
    const images = product.images.map((i) => i.media.secureUrl);

    // Meta rejects relative URLs. Placeholder images are local files, so make
    // them absolute against the public origin.
    const absolute = (url: string) =>
      url.startsWith("http") ? url : `${publicEnv.siteUrl}${url}`;

    const description =
      product.shortDescription?.trim() ||
      toPlainText(product.description ?? "").slice(0, 500) ||
      product.name;

    const productType = [product.category.parent?.name, product.category.name]
      .filter(Boolean)
      .join(" > ");

    for (const variant of product.variants) {
      const available = variant.trackInventory
        ? Math.max(0, variant.stockQuantity - variant.reservedQuantity)
        : 1;

      const primaryImage = variant.image?.secureUrl ?? images[0];
      if (!primaryImage) continue; // Meta requires an image; skip rather than send an invalid row.

      const title =
        variant.title && variant.title !== "Standard"
          ? `${product.name} — ${variant.title}`
          : product.name;

      rows.push(
        [
          csvCell(variant.sku),
          csvCell(product.id),
          csvCell(title.slice(0, 150)),
          csvCell(description.slice(0, 5000)),
          csvCell(available > 0 ? "in stock" : "out of stock"),
          csvCell("new"),
          // Meta wants "<amount> <currency>". List price goes in `price`;
          // the discounted price goes in `sale_price`.
          csvCell(`${paiseToRupees(variant.mrpPaise).toFixed(2)} INR`),
          csvCell(
            variant.pricePaise < variant.mrpPaise
              ? `${paiseToRupees(variant.pricePaise).toFixed(2)} INR`
              : "",
          ),
          csvCell(`${publicEnv.siteUrl}/product/${product.slug}`),
          csvCell(absolute(primaryImage)),
          csvCell(images.slice(1).map(absolute).join(",")),
          csvCell(product.brand),
          // Google's taxonomy id for Jewelry.
          csvCell("188"),
          csvCell(productType),
          csvCell(product.silverPurity ?? "Sterling Silver"),
          csvCell(product.category.name),
        ].join(","),
      );
    }
  }

  return new NextResponse(rows.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'inline; filename="aastha-meta-catalog.csv"',
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
