import { publicEnv } from "@/lib/env";

/**
 * Structured data helpers.
 *
 * Schema.org markup is how Google builds rich results and how AI answer
 * engines extract facts (price, availability, purity, policies) without
 * guessing from prose. Every value emitted here must be true and must match
 * what the page visibly says — mismatches get manual actions, not just ignored.
 */

export type JsonLdObject = Record<string, unknown>;

/** Renders a JSON-LD script tag. */
export function JsonLd({ data }: { data: JsonLdObject | JsonLdObject[] }) {
  return (
    <script
      type="application/ld+json"
      // JSON.stringify output is not HTML; the only injection vector is a
      // literal "</script>" inside a string value, which we escape.
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}

const ORG_ID = `${publicEnv.siteUrl}/#organization`;
const SITE_ID = `${publicEnv.siteUrl}/#website`;

export function organizationJsonLd(contact: {
  email?: string;
  phone?: string;
  addressLines?: string[];
}): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "JewelryStore",
    "@id": ORG_ID,
    name: "Aastha Silver & Jewels",
    url: publicEnv.siteUrl,
    description:
      "Handcrafted hallmarked 925 sterling silver jewellery, made in Jaipur, India.",
    priceRange: "₹₹",
    currenciesAccepted: "INR",
    ...(contact.email ? { email: contact.email } : {}),
    ...(contact.phone ? { telephone: contact.phone } : {}),
    ...(contact.addressLines?.length
      ? {
          address: {
            "@type": "PostalAddress",
            streetAddress: contact.addressLines.slice(1, -1).join(", ") || contact.addressLines[0],
            addressLocality: "Jaipur",
            addressRegion: "Rajasthan",
            addressCountry: "IN",
          },
        }
      : {}),
  };
}

export function websiteJsonLd(): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": SITE_ID,
    url: publicEnv.siteUrl,
    name: "Aastha Silver & Jewels",
    publisher: { "@id": ORG_ID },
    inLanguage: "en-IN",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${publicEnv.siteUrl}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export function breadcrumbJsonLd(
  crumbs: Array<{ name: string; href: string }>,
): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: `${publicEnv.siteUrl}${crumb.href}`,
    })),
  };
}

export function faqJsonLd(
  faqs: Array<{ question: string; answer: string }>,
): JsonLdObject | null {
  if (!faqs.length) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };
}

export function productJsonLd({
  name,
  description,
  sku,
  slug,
  brand,
  images,
  pricePaise,
  inStock,
  ratingAverage,
  ratingCount,
  silverPurity,
  silverWeightGram,
  category,
}: {
  name: string;
  description: string;
  sku: string;
  slug: string;
  brand: string;
  images: string[];
  pricePaise: number;
  inStock: boolean;
  ratingAverage: number;
  ratingCount: number;
  silverPurity?: string | null;
  silverWeightGram?: number | null;
  category?: string;
}): JsonLdObject {
  const url = `${publicEnv.siteUrl}/product/${slug}`;

  // Absolute URLs are required; relative ones are silently ignored by Google.
  const absoluteImages = images.map((src) =>
    src.startsWith("http") ? src : `${publicEnv.siteUrl}${src}`,
  );

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${url}#product`,
    name,
    description,
    sku,
    mpn: sku,
    url,
    image: absoluteImages,
    brand: { "@type": "Brand", name: brand },
    ...(category ? { category } : {}),
    material: silverPurity ?? "Sterling Silver",
    ...(silverWeightGram
      ? {
          weight: {
            "@type": "QuantitativeValue",
            value: silverWeightGram,
            unitCode: "GRM",
          },
        }
      : {}),
    offers: {
      "@type": "Offer",
      url,
      priceCurrency: "INR",
      // Schema.org wants a decimal string, not paise.
      price: (pricePaise / 100).toFixed(2),
      availability: inStock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
      seller: { "@id": ORG_ID },
      hasMerchantReturnPolicy: {
        "@type": "MerchantReturnPolicy",
        applicableCountry: "IN",
        returnPolicyCategory:
          "https://schema.org/MerchantReturnFiniteReturnWindow",
        merchantReturnDays: 7,
        returnMethod: "https://schema.org/ReturnByMail",
        returnFees: "https://schema.org/FreeReturn",
      },
    },
    // Only emit a rating when one genuinely exists — a fabricated
    // aggregateRating is a policy violation, and zero reviews is not "0 stars".
    ...(ratingCount > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: ratingAverage.toFixed(1),
            reviewCount: ratingCount,
            bestRating: 5,
            worstRating: 1,
          },
        }
      : {}),
  };
}
