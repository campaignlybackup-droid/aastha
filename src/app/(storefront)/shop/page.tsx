import type { Metadata } from "next";

import { ActiveFilterChips } from "@/components/storefront/filters";
import { PageHeader } from "@/components/storefront/page-header";
import { ProductListing } from "@/components/storefront/product-listing";
import { JsonLd, breadcrumbJsonLd } from "@/lib/seo/json-ld";
import type { RawSearchParams } from "@/lib/search-params";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}): Promise<Metadata> {
  const params = await searchParams;
  const sort = Array.isArray(params.sort) ? params.sort[0] : params.sort;
  const isBestSelling = sort === "popular";

  return {
    title: isBestSelling ? "Best Selling Jewellery" : "All Jewellery",
    description: isBestSelling
      ? "Shop Aastha Silver's best-selling 925 sterling silver jewellery."
      : "Browse the full Aastha Silver & Jewels catalogue — hallmarked 925 sterling silver rings, earrings, necklaces, bangles, anklets and chains.",
    alternates: {
      canonical: isBestSelling ? "/shop?sort=popular" : "/shop",
    },
  };
}

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const params = await searchParams;
  const sort = Array.isArray(params.sort) ? params.sort[0] : params.sort;
  const isBestSelling = sort === "popular";
  const pageName = isBestSelling ? "Best Selling" : "All Jewellery";
  const pageHref = isBestSelling ? "/shop?sort=popular" : "/shop";

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", href: "/" },
          { name: pageName, href: pageHref },
        ])}
      />

      <PageHeader
        crumbs={[
          { name: "Home", href: "/" },
          { name: pageName, href: pageHref },
        ]}
        eyebrow={isBestSelling ? "Most loved" : "The collection"}
        title={pageName}
        description={
          isBestSelling
            ? "The pieces our customers love most, ordered by popularity."
            : "Every piece is hallmarked 925 sterling silver and ships with a certificate of authenticity."
        }
      >
        <div className="mt-8">
          <ActiveFilterChips pathname="/shop" searchParams={params} />
        </div>
      </PageHeader>

      <ProductListing pathname="/shop" searchParams={params} />
    </>
  );
}
