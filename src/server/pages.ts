import "server-only";

import { cache } from "react";

import { db } from "@/lib/db";

/**
 * Static content pages.
 *
 * Stored as Settings keyed `page:<slug>` rather than a new table — they are a
 * handful of singleton documents, and a model plus migration would buy nothing.
 *
 * Pages without owner-approved copy ship with an outline rather than invented
 * claims. Completed pages are stored in Settings and included in the sitemap.
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
    title: "Jewellery Care",
    intro: "How to store, clean and protect genuine sterling silver.",
    prompts: [
      "Day-to-day wear — perfume, water, swimming",
      "Cleaning polished silver",
      "Cleaning oxidised silver (chemical dips strip the finish)",
      "Storage",
      "Why natural tarnishing is not a defect and how to restore the shine",
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
      "Orders cannot be cancelled once placed",
      "Governing law and jurisdiction",
      "Have a lawyer review this before launch",
    ],
  },
  "shipping-policy": {
    title: "Shipping Policy",
    intro: "How and when orders arrive.",
    prompts: [
      "Dispatch in 3–4 business days",
      "Delivery in 5–6 business days",
      "Additional dispatch time and natural wear for plated items",
      "Orders cannot be cancelled once placed",
      "Raw unboxing-video requirements for defect or wrong-item claims",
    ],
  },
  "return-policy": {
    title: "Returns & Exchanges",
    intro: "When and how a customer can return something.",
    prompts: [
      "No exchanges, returns or refunds for sizing or other non-defect reasons",
      "Orders cannot be cancelled once placed",
      "Raw unboxing-video requirements for defect or wrong-item claims",
    ],
  },
};

const KEY_PREFIX = "page:";

export const getStaticPage = cache(
  async (slug: StaticPageSlug): Promise<StaticPage> => {
    const definition = PAGE_DEFINITIONS[slug];
    const row = await db.setting.findUnique({
      where: { key: `${KEY_PREFIX}${slug}` },
    });

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
