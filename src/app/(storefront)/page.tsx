import type { Metadata } from "next";

import { RenderSection } from "@/components/sections/render";
import { TrustedCustomersBanner } from "@/components/storefront/trusted-customers-banner";
import { getHomepage } from "@/server/homepage";
import { getSetting } from "@/server/catalog";
import { publicEnv } from "@/lib/env";
import { organizationJsonLd, websiteJsonLd, JsonLd } from "@/lib/seo/json-ld";

import { HeroVideoPlayer } from "@/components/storefront/hero-video-player";

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
  const [{ sections }, contact] = await Promise.all([
    getHomepage(),
    getSetting("contact"),
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
          <HeroVideoPlayer />

          <TrustedCustomersBanner />

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
