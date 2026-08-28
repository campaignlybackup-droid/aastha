import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Sparkles, Package, ShieldCheck, Truck } from "lucide-react";

import { PageHeader } from "@/components/storefront/page-header";
import { ComboCard } from "@/components/storefront/combo-card";
import { getComboOffers } from "@/server/combos";
import { JsonLd } from "@/lib/seo/json-ld";

export const metadata: Metadata = {
  title: "Combo Offers & Sets | Aastha Silver & Jewels",
  description:
    "Explore exclusive silver jewellery combo offers and sets in 925 sterling silver. Bundle necklaces, rings, bracelets and earrings at special discounted prices with free shipping across India.",
  alternates: { canonical: "/combos" },
};

export const revalidate = 60; // Refresh dynamic timers every minute

export default async function CombosPage() {
  const combos = await getComboOffers(true);
  if (!combos || combos.length === 0) {
    notFound();
  }

  return (
    <div className="py-8 md:py-12 font-sans">
      <div className="u-container">
        <PageHeader
          eyebrow="Exclusive Bundles & Sets"
          title="Combo Offers"
          description="Handpicked 925 sterling silver jewellery sets bundled at special discounted prices. Limited time offers with free shipping across India."
        />

        {/* Feature Badges */}
        <div className="my-8 grid grid-cols-1 gap-3 sm:grid-cols-3 font-sans">
          <div className="flex items-center gap-3 rounded-lg border border-gold-200/80 bg-gold-50/40 p-3.5 text-xs text-brand-950 font-medium shadow-2xs">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-gold-200 text-gold-900">
              <Sparkles className="size-3.5" />
            </span>
            <span>Extra Savings on Bundles</span>
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-gold-200/80 bg-gold-50/40 p-3.5 text-xs text-brand-950 font-medium shadow-2xs">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-gold-200 text-gold-900">
              <Truck className="size-3.5" />
            </span>
            <span>Free Shipping Across India</span>
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-gold-200/80 bg-gold-50/40 p-3.5 text-xs text-brand-950 font-medium shadow-2xs">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-gold-200 text-gold-900">
              <ShieldCheck className="size-3.5" />
            </span>
            <span>100% Hallmarked 925 Silver</span>
          </div>
        </div>

        {/* Combos Grid */}
        {combos.length === 0 ? (
          <div className="my-12 rounded-xl border border-dashed border-line/80 bg-surface p-12 text-center space-y-3 font-sans">
            <Package className="mx-auto size-10 text-content-subtle" />
            <h2 className="font-sans text-xl font-semibold text-brand-950">No active combo offers right now</h2>
            <p className="mx-auto max-w-sm text-sm text-content-muted">
              Check back soon for new silver jewellery bundles, or explore our full catalogue.
            </p>
            <div className="pt-3">
              <Link
                href="/shop"
                className="inline-flex items-center justify-center rounded-md bg-brand-900 px-5 py-2.5 text-xs font-semibold text-white hover:bg-brand-950 uppercase tracking-wider font-sans"
              >
                Browse All Jewellery
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {combos.map((combo) => (
              <ComboCard key={combo.id} combo={combo} />
            ))}
          </div>
        )}
      </div>

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "Combo Offers & Sets | Aastha Silver & Jewels",
          description: "Exclusive 925 sterling silver jewellery combo offers and sets.",
          url: "https://aasthasilver.in/combos",
        }}
      />
    </div>
  );
}
