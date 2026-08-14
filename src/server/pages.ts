import "server-only";

import { cache } from "react";

import { db } from "@/lib/db";

/**
 * Static content pages.
 *
 * Stored as Settings keyed `page:<slug>` rather than a new table — they are a
 * handful of singleton documents, and a model plus migration would buy nothing.
 *
 * They ship with an OUTLINE, not with text. Return windows, shipping terms and
 * privacy commitments are legally operative statements about a specific
 * business; inventing them would put words in the owner's mouth that a customer
 * could hold them to. Each page therefore renders its own placeholder notice
 * until it is filled in, and is excluded from the sitemap while empty.
 */

export type StaticPageSlug =
  | "about"
  | "contact"
  | "care-guide"
  | "privacy-policy"
  | "terms"
  | "shipping-policy"
  | "return-policy";

export type StaticPage = {
  slug: StaticPageSlug;
  title: string;
  /** Short line under the heading. */
  intro: string;
  /** Sanitised HTML body. Empty means "not written yet". */
  body: string;
  seoTitle: string;
  seoDescription: string;
};

/**
 * Prompts shown in the admin editor and, until the page is written, on the page
 * itself. They describe what the section should cover — they never assert it.
 */
export const PAGE_DEFINITIONS: Record<
  StaticPageSlug,
  { title: string; intro: string; prompts: string[] }
> = {
  about: {
    title: "Our Story",
    intro: "Who you are and how you work.",
    prompts: [
      "How the business started, and by whom",
      "Where the jewellery is made, and by whom",
      "What you will not compromise on",
      "Anything a customer would find reassuring and is true",
    ],
  },
  contact: {
    title: "Contact Us",
    intro: "How to reach you.",
    prompts: [
      "Anything beyond the phone, email and address already in Settings",
      "How quickly you typically reply",
      "Whether customers can visit in person, and when",
    ],
  },
  "care-guide": {
    title: "Silver Care Guide",
    intro: "How to keep silver looking new.",
    prompts: [
      "Day-to-day wear — perfume, water, swimming",
      "Cleaning polished silver",
      "Cleaning oxidised silver (chemical dips strip the finish)",
      "Storage",
      "What your warranty does and does not cover",
    ],
  },
  "privacy-policy": {
    title: "Privacy Policy",
    intro: "What data you collect and why.",
    prompts: [
      "What you collect: name, mobile, email, address, order history",
      "Who processes it: Razorpay for payment, your SMS and WhatsApp providers, your analytics tools",
      "How long you keep it",
      "How a customer requests deletion, and the address they write to",
      "Cookies and tracking, including Meta Pixel and Google Analytics",
      "Have a lawyer review this before launch",
    ],
  },
  terms: {
    title: "Terms of Service",
    intro: "The terms customers agree to when ordering.",
    prompts: [
      "Who you are as a legal entity, and your GSTIN",
      "Pricing, taxes and when a contract is formed",
      "Cancellation before dispatch",
      "Governing law and jurisdiction",
      "Have a lawyer review this before launch",
    ],
  },
  "shipping-policy": {
    title: "Shipping Policy",
    intro: "How and when orders arrive.",
    prompts: [
      "Dispatch time — must match the Settings → Shipping value",
      "Delivery estimates, and whether they differ by region",
      "Shipping charges and the free-shipping threshold",
      "Which courier partners you use",
      "What happens to a failed or refused delivery",
    ],
  },
  "return-policy": {
    title: "Returns & Exchanges",
    intro: "When and how a customer can return something.",
    prompts: [
      "The return window, and when it starts",
      "Condition required: unworn, original packaging, certificate included",
      "What cannot be returned — engraved, made-to-order, earrings for hygiene",
      "Who pays return shipping",
      "How long a refund takes and where it goes",
      "The exchange process for ring sizes",
    ],
  },
};

const KEY_PREFIX = "page:";

export const getStaticPage = cache(
  async (slug: StaticPageSlug): Promise<StaticPage> => {
    const definition = PAGE_DEFINITIONS[slug];
    const row = await db.setting.findUnique({ where: { key: `${KEY_PREFIX}${slug}` } });

    const stored =
      row && typeof row.value === "object" && row.value !== null
        ? (row.value as Partial<StaticPage>)
        : {};

    return {
      slug,
      title: stored.title?.trim() || definition.title,
      intro: stored.intro?.trim() || definition.intro,
      body: stored.body?.trim() || "",
      seoTitle: stored.seoTitle?.trim() || "",
      seoDescription: stored.seoDescription?.trim() || "",
    };
  },
);

export async function getAllStaticPages(): Promise<StaticPage[]> {
  const slugs = Object.keys(PAGE_DEFINITIONS) as StaticPageSlug[];
  return Promise.all(slugs.map((slug) => getStaticPage(slug)));
}

export function staticPageSettingKey(slug: StaticPageSlug) {
  return `${KEY_PREFIX}${slug}`;
}
