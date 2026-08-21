import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ActiveFilterChips } from "@/components/storefront/filters";
import { PageHeader } from "@/components/storefront/page-header";
import { ProductListing } from "@/components/storefront/product-listing";
import { JsonLd, breadcrumbJsonLd } from "@/lib/seo/json-ld";
import { getCategoryBySlug } from "@/server/catalog";
import { db } from "@/lib/db";
import type { RawSearchParams } from "@/lib/search-params";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<RawSearchParams>;
};

/** Pre-render every category at build time; they change rarely. */
export async function generateStaticParams() {
  try {
    const categories = await db.category.findMany({
      where: { isActive: true },
      select: { slug: true },
    });
    return categories.map((c) => ({ slug: c.slug }));
  } catch (error) {
    console.warn("[build] generateStaticParams failed for categories, deferring to dynamic rendering:", error);
    return [];
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category) return { title: "Category not found" };

  return {
    title: category.seoTitle ?? category.name,
    description:
      category.seoDescription ??
      category.description ??
      `Shop ${category.name.toLowerCase()} in hallmarked 925 sterling silver.`,
    alternates: { canonical: `/category/${category.slug}` },
    openGraph: {
      title: category.seoTitle ?? category.name,
      description: category.seoDescription ?? category.description ?? undefined,
      type: "website",
      ...(category.image?.secureUrl
        ? { images: [{ url: category.image.secureUrl }] }
        : {}),
    },
  };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);

  const category = await getCategoryBySlug(slug);
  if (!category) notFound();

  const pathname = `/category/${category.slug}`;

  const crumbs = [
    { name: "Home", href: "/" },
    { name: "All Jewellery", href: "/shop" },
    ...(category.parent
      ? [
          {
            name: category.parent.name,
            href: `/category/${category.parent.slug}`,
          },
        ]
      : []),
    { name: category.name, href: pathname },
  ];

  return (
    <>
      <JsonLd data={breadcrumbJsonLd(crumbs)} />

      <PageHeader
        crumbs={crumbs}
        eyebrow="Category"
        title={category.name}
        description={category.description}
      >
        {category.children.length ? (
          <nav aria-label="Subcategories" className="mt-8">
            <ul className="flex flex-wrap gap-2">
              {category.children.map((child) => (
                <li key={child.slug}>
                  <Link
                    href={`/category/${child.slug}`}
                    className="inline-flex items-center rounded-xs border border-line-strong px-3.5 py-1.5 text-xs transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                  >
                    {child.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}

        <div className="mt-8">
          <ActiveFilterChips pathname={pathname} searchParams={query} />
        </div>
      </PageHeader>

      <ProductListing
        pathname={pathname}
        searchParams={query}
        lockedFilters={{ categorySlugs: [category.slug] }}
        hideFacets={["category"]}
        emptyMessage={`There are no ${category.name.toLowerCase()} in stock right now.`}
      />
    </>
  );
}
