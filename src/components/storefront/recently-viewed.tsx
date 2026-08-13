"use client";

import * as React from "react";

import { Carousel } from "@/components/storefront/carousel";
import { ProductCard } from "@/components/storefront/product-card";
import { SectionHeading } from "@/components/ui/primitives";
import type { ProductCardData } from "@/server/catalog";

const RECENT_KEY = "asj.recentlyViewed";

/**
 * Recently viewed products.
 *
 * The slug list lives in localStorage, so the section can only be assembled in
 * the browser. It fetches the card data for those slugs after mount and
 * renders nothing until it has something real — no skeleton, because an empty
 * placeholder at the bottom of the page is worse than no section.
 */
export function RecentlyViewed({ currentSlug }: { currentSlug: string }) {
  const [products, setProducts] = React.useState<ProductCardData[]>([]);

  React.useEffect(() => {
    let cancelled = false;

    async function load() {
      let slugs: string[] = [];
      try {
        const raw = window.localStorage.getItem(RECENT_KEY);
        const parsed: unknown = raw ? JSON.parse(raw) : [];
        slugs = Array.isArray(parsed)
          ? parsed.filter((s): s is string => typeof s === "string")
          : [];
      } catch {
        return;
      }

      const wanted = slugs.filter((s) => s !== currentSlug).slice(0, 6);
      if (!wanted.length) return;

      try {
        const res = await fetch(
          `/api/products/by-slug?slugs=${encodeURIComponent(wanted.join(","))}`,
        );
        if (!res.ok) return;
        const data = (await res.json()) as { products: ProductCardData[] };
        if (!cancelled) setProducts(data.products);
      } catch {
        /* Non-critical section — fail silently. */
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [currentSlug]);

  if (products.length === 0) return null;

  return (
    <section className="border-t border-line py-14 md:py-20">
      <div className="u-container">
        <SectionHeading
          eyebrow="Pick up where you left off"
          title="Recently viewed"
          align="left"
          className="mb-8"
        />
        <Carousel ariaLabel="Recently viewed pieces">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </Carousel>
      </div>
    </section>
  );
}
