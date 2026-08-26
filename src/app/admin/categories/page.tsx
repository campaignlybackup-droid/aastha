import { AdminHeading, Panel } from "@/components/admin/ui";
import { CategoryManager } from "@/components/admin/category-manager";
import { db } from "@/lib/db";
import { requireArea } from "@/server/auth";

export const metadata = { title: "Categories" };

export default async function AdminCategoriesPage() {
  await requireArea("products");

  const [categories, media] = await Promise.all([
    db.category.findMany({
      orderBy: [{ position: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        slug: true,
        parentId: true,
        description: true,
        imageId: true,
        image: { select: { id: true, url: true, secureUrl: true } },
        isActive: true,
        isFeatured: true,
        seoTitle: true,
        seoDescription: true,
        _count: { select: { products: true, children: true } },
      },
    }),
    db.media.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, url: true, filename: true, alt: true },
    }),
  ]);

  const mediaOptions = media.map((m) => ({
    id: m.id,
    url: m.url,
    label: m.alt || m.filename || m.id,
  }));

  return (
    <>
      <AdminHeading
        title="Categories"
        description="Featured categories appear in the header and the Shop by Category row. Order here controls order there."
      />

      <Panel>
        <CategoryManager categories={categories} media={mediaOptions} />
      </Panel>
    </>
  );
}
