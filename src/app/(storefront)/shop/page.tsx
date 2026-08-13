import type { Metadata } from "next";

import { ActiveFilterChips } from "@/components/storefront/filters";
import { PageHeader } from "@/components/storefront/page-header";
import { ProductListing } from "@/components/storefront/product-listing";
import { JsonLd, breadcrumbJsonLd } from "@/lib/seo/json-ld";
import type { RawSearchParams } from "@/lib/search-params";

export const metadata: Metadata = {
  title: "All Jewellery",
  description:
    "Browse the full Aastha Silver & Jewels catalogue — hallmarked 925 sterling silver rings, earrings, necklaces, bangles, anklets and chains.",
  alternates: { canonical: "/shop" },
};

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const params = await searchParams;

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", href: "/" },
          { name: "All Jewellery", href: "/shop" },
        ])}
      />

      <PageHeader
        crumbs={[
          { name: "Home", href: "/" },
          { name: "All Jewellery", href: "/shop" },
        ]}
        eyebrow="The collection"
        title="All Jewellery"
        description="Every piece is hallmarked 925 sterling silver, finished by hand in our Jaipur workshop, and ships with a certificate of authenticity."
      >
        <div className="mt-8">
          <ActiveFilterChips pathname="/shop" searchParams={params} />
        </div>
      </PageHeader>

      <ProductListing pathname="/shop" searchParams={params} />
    </>
  );
}
