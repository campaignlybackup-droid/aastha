import type { Metadata } from "next";

import { RenderSection } from "@/components/sections/render";
import { getHomepage } from "@/server/homepage";
import { getSetting } from "@/server/catalog";
import { publicEnv } from "@/lib/env";
import { organizationJsonLd, websiteJsonLd, JsonLd } from "@/lib/seo/json-ld";

/**
 * The homepage is entirely CMS-driven — there is no hard-coded section order
 * here. What renders is whatever the admin has configured, or whatever the
 * currently-live campaign overrides it with.
 *
 * Revalidated rather than fully dynamic: the content changes when an admin
 * saves, not per-request. Admin mutations call `revalidatePath("/")` so an
 * edit is visible immediately instead of waiting out the window.
 */
export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const { campaign } = await getHomepage();

  const title = campaign
    ? `${campaign.name} — Aastha Silver & Jewels`
    : "Aastha Silver & Jewels — Handcrafted 925 Sterling Silver Jewellery";

  const description =
    "Hallmarked 925 sterling silver jewellery. Rings, jhumkas, necklaces, bangles and anklets, with a certificate of authenticity on every order.";

  return {
    // `absolute` opts out of the root layout's "%s | Aastha Silver & Jewels"
    // template — the homepage title already carries the brand name.
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
        sections.map((section) => (
          <RenderSection key={section.id} section={section} />
        ))
      )}
    </>
  );
}
