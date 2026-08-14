import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { AdminHeading, Panel } from "@/components/admin/ui";
import {
  ProductForm,
  type ProductFormValues,
} from "@/components/admin/product-form";
import { DeleteProductButton } from "@/components/admin/delete-product-button";
import { Badge } from "@/components/ui/primitives";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/utils";
import { requireArea } from "@/server/auth";

export const metadata = { title: "Edit product" };

/** Rupee string for a form field, without trailing ".00" noise. */
const paiseToInput = (paise: number) => String(paise / 100);

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireArea("products");
  const { id } = await params;

  const [product, categories, collections, media] = await Promise.all([
    db.product.findUnique({
      where: { id },
      include: {
        images: { orderBy: { position: "asc" }, select: { mediaId: true } },
        variants: { orderBy: { position: "asc" } },
        collections: { select: { collectionId: true } },
      },
    }),
    db.category.findMany({
      where: { isActive: true },
      orderBy: [{ position: "asc" }, { name: "asc" }],
      select: { id: true, name: true, parent: { select: { name: true } } },
    }),
    db.collection.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    db.media.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      select: { id: true, secureUrl: true, filename: true, folder: true },
    }),
  ]);

  if (!product) notFound();

  const stockMovements = await db.stockMovement.findMany({
    where: { variant: { productId: id } },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: {
      id: true,
      delta: true,
      balance: true,
      reason: true,
      createdAt: true,
      variant: { select: { title: true } },
    },
  });

  // Option names are stored per variant; the union across variants, in first
  // -seen order, is the product's dimension list.
  const optionNames: string[] = [];
  for (const variant of product.variants) {
    for (const key of Object.keys((variant.options ?? {}) as object)) {
      if (!optionNames.includes(key)) optionNames.push(key);
    }
  }

  const initial: ProductFormValues = {
    id: product.id,
    name: product.name,
    slug: product.slug,
    sku: product.sku,
    categoryId: product.categoryId,
    status: product.status,
    isFeatured: product.isFeatured,
    shortDescription: product.shortDescription ?? "",
    description: product.description ?? "",
    tags: product.tags,
    taxPercent: String(product.taxPercent),
    silverPurity: product.silverPurity ?? "",
    silverWeightGram: product.silverWeightGram
      ? String(product.silverWeightGram)
      : "",
    dimensions: product.dimensions ?? "",
    finish: product.finish ?? "",
    plating: product.plating ?? "",
    stoneType: product.stoneType ?? "",
    stoneColour: product.stoneColour ?? "",
    stoneCount: product.stoneCount ? String(product.stoneCount) : "",
    occasion: product.occasion,
    gender: product.gender ?? "",
    isAdjustable: product.isAdjustable,
    careInstructions: product.careInstructions ?? "",
    warrantyInfo: product.warrantyInfo ?? "",
    authenticityInfo: product.authenticityInfo ?? "",
    whatsIncluded: product.whatsIncluded ?? "",
    imageIds: product.images.map((image) => image.mediaId),
    collectionIds: product.collections.map((c) => c.collectionId),
    optionNames,
    variants: product.variants.map((variant) => {
      const options = (variant.options ?? {}) as Record<string, string>;
      return {
        id: variant.id,
        title: variant.title,
        sku: variant.sku,
        optionValues: optionNames.map((name) => options[name] ?? ""),
        priceRupees: paiseToInput(variant.pricePaise),
        mrpRupees: paiseToInput(variant.mrpPaise),
        stockQuantity: String(variant.stockQuantity),
        lowStockThreshold: String(variant.lowStockThreshold),
        trackInventory: variant.trackInventory,
        isActive: variant.isActive,
      };
    }),
    seoTitle: product.seoTitle ?? "",
    seoDescription: product.seoDescription ?? "",
    canonicalUrl: product.canonicalUrl ?? "",
  };

  return (
    <>
      <Link
        href="/admin/products"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-content-muted hover:text-[var(--color-accent)]"
      >
        <ArrowLeft className="size-3.5" aria-hidden="true" />
        All products
      </Link>

      <AdminHeading
        title={product.name}
        description={`${product.sku} · ${product.salesCount} sold`}
        action={<DeleteProductButton productId={product.id} />}
      />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <Badge
          variant={
            product.status === "ACTIVE"
              ? "success"
              : product.status === "DRAFT"
                ? "warning"
                : "neutral"
          }
          size="md"
        >
          {product.status.toLowerCase()}
        </Badge>
        {product.isFeatured ? <Badge variant="gold" size="md">Featured</Badge> : null}
        {product.ratingCount > 0 ? (
          <Badge variant="outline" size="md">
            {product.ratingAverage.toFixed(1)} from {product.ratingCount} reviews
          </Badge>
        ) : null}
      </div>

      <ProductForm
        initial={initial}
        categories={categories.map((c) => ({
          id: c.id,
          name: c.parent ? `${c.parent.name} → ${c.name}` : c.name,
        }))}
        collections={collections}
        media={media.map((m) => ({
          id: m.id,
          url: m.secureUrl,
          label: `${m.folder.toLowerCase()} · ${m.filename ?? m.id}`,
        }))}
      />

      {stockMovements.length ? (
        <Panel
          title="Stock history"
          description="Every change to this product's stock, including sales."
          className="mt-6"
        >
          <ul className="divide-y divide-line text-sm">
            {stockMovements.map((movement) => (
              <li
                key={movement.id}
                className="flex flex-wrap items-center gap-3 px-5 py-2.5"
              >
                <span
                  className={
                    movement.delta < 0 ? "text-danger-700" : "text-success-700"
                  }
                >
                  {movement.delta > 0 ? "+" : ""}
                  {movement.delta}
                </span>
                <span className="text-content-muted">
                  {movement.variant.title} → {movement.balance} in stock
                </span>
                <span className="text-xs text-content-subtle">
                  {movement.reason}
                </span>
                <span className="ml-auto text-xs text-content-subtle">
                  {formatDateTime(movement.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}
    </>
  );
}
