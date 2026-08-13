import type { Metadata } from "next";

import { ActiveFilterChips } from "@/components/storefront/filters";
import { PageHeader } from "@/components/storefront/page-header";
import { ProductListing } from "@/components/storefront/product-listing";
import type { RawSearchParams } from "@/lib/search-params";

type Props = { searchParams: Promise<RawSearchParams> };

export async function generateMetadata({
  searchParams,
}: Props): Promise<Metadata> {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q : "";

  return {
    title: q ? `Search: ${q}` : "Search",
    // Search result pages carry no unique value for the index and would
    // otherwise generate unlimited thin URLs.
    robots: { index: false, follow: true },
  };
}

export default async function SearchPage({ searchParams }: Props) {
  const params = await searchParams;
  const query = (typeof params.q === "string" ? params.q : "").trim();

  return (
    <>
      <PageHeader
        crumbs={[
          { name: "Home", href: "/" },
          { name: "Search", href: "/search" },
        ]}
        eyebrow="Search"
        title={query ? `Results for “${query}”` : "Search"}
        description={
          query
            ? null
            : "Search by product name, category, stone, purity or SKU."
        }
      >
        <div className="mt-8">
          <ActiveFilterChips pathname="/search" searchParams={params} />
        </div>
      </PageHeader>

      <ProductListing
        pathname="/search"
        searchParams={params}
        emptyMessage={
          query
            ? `Nothing matched “${query}”. Try a broader term, or browse by category.`
            : "Enter a search term to begin."
        }
      />
    </>
  );
}
