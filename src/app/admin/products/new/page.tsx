import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { AdminHeading } from "@/components/admin/ui";
import { BLANK_PRODUCT, ProductForm } from "@/components/admin/product-form";
import { db } from "@/lib/db";
import { requireArea } from "@/server/auth";

export const metadata = { title: "New product" };

export default async function NewProductPage() {
  await requireArea("products");

  const [categories, collections, media] = await Promise.all([
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
        title="New product"
        description="It saves as a draft unless you set the status to Active."
      />

      <ProductForm
        initial={BLANK_PRODUCT}
        categories={categories.map((c) => ({
          id: c.id,
          // Subcategories are ambiguous on their own — "Studs" could belong to
          // anything until you see the parent.
          name: c.parent ? `${c.parent.name} → ${c.name}` : c.name,
        }))}
        collections={collections}
        media={media.map((m) => ({
          id: m.id,
          url: m.secureUrl,
          label: `${m.folder.toLowerCase()} · ${m.filename ?? m.id}`,
        }))}
      />
    </>
  );
}
