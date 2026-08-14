import { AdminHeading, Panel } from "@/components/admin/ui";
import { CategoryManager } from "@/components/admin/category-manager";
import { db } from "@/lib/db";
import { requireArea } from "@/server/auth";

export const metadata = { title: "Categories" };

export default async function AdminCategoriesPage() {
  await requireArea("products");

  const categories = await db.category.findMany({
    orderBy: [{ position: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      parentId: true,
      description: true,
      isActive: true,
      isFeatured: true,
      seoTitle: true,
      seoDescription: true,
      _count: { select: { products: true, children: true } },
    },
  });

  return (
    <>
      <AdminHeading
        title="Categories"
        description="Featured categories appear in the header and the Shop by Category row. Order here controls order there."
      />

      <Panel>
        <CategoryManager categories={categories} />
      </Panel>
    </>
  );
}
