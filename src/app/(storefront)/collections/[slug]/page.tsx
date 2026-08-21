import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ActiveFilterChips } from "@/components/storefront/filters";
import { PageHeader } from "@/components/storefront/page-header";
import { ProductListing } from "@/components/storefront/product-listing";
import { JsonLd, breadcrumbJsonLd } from "@/lib/seo/json-ld";
import { getCollectionBySlug } from "@/server/catalog";
import { db } from "@/lib/db";
import type { RawSearchParams } from "@/lib/search-params";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<RawSearchParams>;
};

export async function generateStaticParams() {
  try {
    const collections = await db.collection.findMany({
      where: { isActive: true },
      select: { slug: true },
    });
    return collections.map((c) => ({ slug: c.slug }));
  } catch (error) {
    console.warn("[build] generateStaticParams failed for collections, deferring to dynamic rendering:", error);
    return [];
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const { slug } = await params;
    const collection = await getCollectionBySlug(slug);
    if (!collection) return { title: "Collection not found" };

    return {
      title: collection.seoTitle ?? collection.name,
      description:
        collection.seoDescription ??
        collection.description ??
        `Explore ${collection.name.toLowerCase()} jewellery pieces in 925 sterling silver.`,
      alternates: { canonical: `/collections/${collection.slug}` },
    };
  } catch (error) {
    return { title: "Collection | Aastha Silver & Jewels" };
  }
}

export default async function CollectionPage({ params, searchParams }: Props) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);

  const collection = await getCollectionBySlug(slug);
  if (!collection) notFound();

  const pathname = `/collections/${collection.slug}`;
  const crumbs = [
    { name: "Home", href: "/" },
    { name: "Collections", href: "/shop" },
    { name: collection.name, href: pathname },
  ];

  return (
    <>
      <JsonLd data={breadcrumbJsonLd(crumbs)} />

      <PageHeader
        crumbs={crumbs}
        eyebrow="Collection"
        title={collection.name}
        description={collection.description}
      >
        <div className="mt-8">
          <ActiveFilterChips pathname={pathname} searchParams={query} />
        </div>
      </PageHeader>

      <ProductListing
        pathname={pathname}
        searchParams={query}
        lockedFilters={{ collectionSlug: collection.slug }}
        emptyMessage="This collection is empty right now."
      />
    </>
  );
}
