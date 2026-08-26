import type { Metadata } from "next";

import { RenderSection } from "@/components/sections/render";
import { TrustedCustomersBanner } from "@/components/storefront/trusted-customers-banner";
import { HomepageCombosSection } from "@/components/storefront/homepage-combos-section";
import { getHomepage } from "@/server/homepage";
import { getSetting } from "@/server/catalog";
import { getComboOffers } from "@/server/combos";
import { publicEnv } from "@/lib/env";
import { organizationJsonLd, websiteJsonLd, JsonLd } from "@/lib/seo/json-ld";

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const { campaign } = await getHomepage();

  const title = campaign
    ? `${campaign.name} — Aastha Silver & Jewels`
    : "Aastha Silver & Jewels — Handcrafted 925 Sterling Silver Jewellery";

  const description =
    "Hallmarked 925 sterling silver jewellery. Rings, earrings, necklaces, anklets and chains, with a certificate of authenticity on every order.";

  return {
    title: { absolute: title },
    description,
    alternates: { canonical: "/" },
    openGraph: {
      type: "website",
      url: publicEnv.siteUrl,
      title,
      description,
      siteName: "Aastha Silver & Jewels",
      locale: "en_IN",
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function HomePage() {
  const [{ sections }, contact, combos] = await Promise.all([
    getHomepage(),
    getSetting("contact"),
    getComboOffers(true),
  ]);

  return (
    <>
      <JsonLd data={organizationJsonLd(contact)} />
      <JsonLd data={websiteJsonLd()} />

      {sections.length === 0 ? (
        <div className="u-container py-32 text-center">
          <h1 className="text-display-md">Aastha Silver &amp; Jewels</h1>
          <p className="mx-auto mt-4 max-w-md text-sm text-content-muted">
            The homepage has no sections yet. Add them in the admin under
            Homepage.
          </p>
        </div>
      ) : (
        <>
          <section className="relative w-full aspect-[1078/800] md:aspect-auto md:h-[60vh] lg:h-[85vh] flex items-center justify-center overflow-hidden bg-sand-900">
            <picture className="absolute inset-0 size-full object-cover pointer-events-none">
              <source srcSet="/banner-poster-mobile.webp" media="(max-width: 767px)" type="image/webp" />
              <source srcSet="/banner-poster.jpg" media="(min-width: 768px)" />
              <img
                src="/banner-poster-mobile.webp"
                alt=""
                aria-hidden="true"
                className="size-full object-cover"
              />
            </picture>
            <video
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              aria-hidden="true"
              className="absolute inset-0 size-full object-cover"
            >
              <source src="/banner-final.mp4" type="video/mp4" media="(min-width: 768px)" />
              <source src="/banner-mobile.mp4" type="video/mp4" media="(max-width: 767px)" />
            </video>
            <div className="absolute inset-0 bg-sand-950/0 pointer-events-none" aria-hidden="true" />
          </section>

          <TrustedCustomersBanner />

          <HomepageCombosSection combos={combos} />

          {sections.map((section, index) => {
            // Skip the first CMS banner since we've hardcoded the video banner above
            if (index === 0 && (section.type === "HERO" || section.type === "VIDEO_HERO" || section.type === "IMAGE_BANNER")) {
              return null;
            }
            return <RenderSection key={section.id} section={section} />;
          })}
        </>
      )}
    </>
  );
}
