/** Apply owner-approved brand, care and policy content to an existing database. */
import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";

import {
  AUTHENTICITY_COPY,
  FOUNDER_SPEAK_HTML,
  HOMEPAGE_STORY_HTML,
  HOMEPAGE_TRUST_BADGES,
  ORDER_POLICY_SUMMARY,
  PLATED_ITEMS_COPY,
  PRODUCT_CARE_COPY,
  SHIPPING_COPY,
  STATIC_PAGE_CONTENT,
} from "../src/content/brand.js";
import { PrismaClient } from "../src/generated/prisma/client.js";

const connectionString =
  process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL is not set — cannot update storefront content.",
  );
}

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const requestedCategories = [
  {
    slug: "chains",
    name: "Chains",
    description: "Box, rope and Cuban chains in multiple lengths and gauges.",
    mediaPublicId: "placeholder/chain-2",
  },
  {
    slug: "rings",
    name: "Rings",
    description:
      "Hand-finished 925 sterling silver rings — from everyday stackable bands to occasion-worthy statement pieces.",
    mediaPublicId: "placeholder/ring-1",
  },
  {
    slug: "anklets",
    name: "Anklets",
    description: "Payals with hand-set ghungroos, sold as pairs.",
    mediaPublicId: "placeholder/anklet-1",
  },
  {
    slug: "bracelets",
    name: "Bracelets",
    description: "Link, cuff and charm bracelets in solid 925 silver.",
    mediaPublicId: "placeholder/bracelet-2",
  },
  {
    slug: "pendants",
    name: "Pendants & Charms",
    description: "Symbolic pendants and charms in genuine 925 sterling silver.",
    mediaPublicId: "placeholder/pendant-1",
  },
] as const;

async function applySettings() {
  const currentShipping = await db.setting.findUnique({
    where: { key: "shipping" },
  });
  const shippingValue =
    currentShipping &&
    typeof currentShipping.value === "object" &&
    currentShipping.value !== null &&
    !Array.isArray(currentShipping.value)
      ? currentShipping.value
      : {};

  await db.setting.upsert({
    where: { key: "shipping" },
    update: {
      value: {
        ...shippingValue,
        dispatchCopy: SHIPPING_COPY.dispatch,
        deliveryCopy: SHIPPING_COPY.delivery,
      } as never,
    },
    create: {
      key: "shipping",
      value: {
        freeAbovePaise: 150_000,
        flatRatePaise: 7_900,
        dispatchCopy: SHIPPING_COPY.dispatch,
        deliveryCopy: SHIPPING_COPY.delivery,
      },
    },
  });

  for (const [slug, content] of Object.entries(STATIC_PAGE_CONTENT)) {
    await db.setting.upsert({
      where: { key: `page:${slug}` },
      update: { value: { ...content } as never },
      create: { key: `page:${slug}`, value: { ...content } as never },
    });
  }
}

async function applyProductCopy() {
  await db.product.updateMany({
    data: {
      careInstructions: PRODUCT_CARE_COPY,
      warrantyInfo: null,
      authenticityInfo: AUTHENTICITY_COPY,
    },
  });

  const productFaqs = [
    {
      question: "Is this real silver?",
      answer: `Yes. ${AUTHENTICITY_COPY}`,
    },
    {
      question: "Will it tarnish?",
      answer: `Yes, natural oxidation can occur with real sterling silver. It is not a defect, and the shine can be restored with proper care. ${PRODUCT_CARE_COPY}`,
    },
    {
      question: "Can I return it if the size is wrong?",
      answer: ORDER_POLICY_SUMMARY,
    },
  ];

  for (const faq of productFaqs) {
    await db.productFaq.updateMany({
      where: { question: faq.question },
      data: { answer: faq.answer },
    });
  }

  const globalFaqs = [
    {
      question: "Is Aastha jewellery real 925 sterling silver?",
      answer: AUTHENTICITY_COPY,
    },
    {
      question: "How do I stop my silver from tarnishing?",
      answer: PRODUCT_CARE_COPY,
    },
    {
      question: "How long does delivery take?",
      answer: `${SHIPPING_COPY.dispatch} ${SHIPPING_COPY.delivery} ${PLATED_ITEMS_COPY}`,
    },
    {
      question: "Do you offer free shipping?",
      answer:
        "Shipping is complimentary on orders above ₹1,500. Below that a flat ₹79 applies.",
    },
    {
      question: "What is your return policy?",
      answer: ORDER_POLICY_SUMMARY,
    },
    {
      question: "Can I exchange a ring for a different size?",
      answer:
        "No. We do not accept exchanges, returns or refunds for sizing issues. Please review the size guide and product measurements carefully before ordering.",
    },
  ];

  for (const faq of globalFaqs) {
    await db.faq.updateMany({
      where: { question: faq.question },
      data: { answer: faq.answer },
    });
  }

  await db.review.updateMany({
    where: { body: { contains: "Support arranged the exchange" } },
    data: {
      body: "The marigold detail is genuinely hand-done — you can see slight variation between the flowers, which I like. The size guide helped me choose the right fit before ordering.",
    },
  });
}

async function applyHomepage() {
  const story = await db.homepageSection.findFirst({
    where: { campaignId: null, label: "Craftsmanship story" },
  });

  if (story) {
    const current =
      typeof story.settings === "object" &&
      story.settings !== null &&
      !Array.isArray(story.settings)
        ? story.settings
        : {};
    await db.homepageSection.update({
      where: { id: story.id },
      data: {
        settings: {
          ...current,
          eyebrow: "Our legacy",
          heading: "The Story of Aastha Silver",
          body: HOMEPAGE_STORY_HTML,
          cta: { label: "Read our story", href: "/about" },
          stats: [
            { value: "40+ years", label: "Family legacy" },
            { value: "21", label: "Founder age" },
          ],
        } as never,
      },
    });
  }

  const founder = await db.homepageSection.findFirst({
    where: { campaignId: null, label: "Founder Speak" },
  });
  if (founder) {
    await db.homepageSection.update({
      where: { id: founder.id },
      data: {
        type: "RICH_TEXT",
        settings: {
          title: "Founder Speak",
          html: FOUNDER_SPEAK_HTML,
          width: "narrow",
        },
      },
    });
  } else {
    await db.homepageSection.updateMany({
      where: { campaignId: null, position: { gte: 6 } },
      data: { position: { increment: 1 } },
    });
    await db.homepageSection.create({
      data: {
        type: "RICH_TEXT",
        label: "Founder Speak",
        position: 6,
        isActive: true,
        settings: {
          title: "Founder Speak",
          html: FOUNDER_SPEAK_HTML,
          width: "narrow",
        },
      },
    });
  }

  const trust = await db.homepageSection.findFirst({
    where: { campaignId: null, label: "Trust badges" },
  });
  if (trust) {
    await db.homepageSection.update({
      where: { id: trust.id },
      data: {
        settings: {
          theme: "light",
          items: HOMEPAGE_TRUST_BADGES.map((item) => ({ ...item })),
        },
      },
    });
  }

  const homepageFaq = await db.homepageSection.findFirst({
    where: { campaignId: null, label: "Homepage FAQ" },
  });
  if (homepageFaq) {
    const current =
      typeof homepageFaq.settings === "object" &&
      homepageFaq.settings !== null &&
      !Array.isArray(homepageFaq.settings)
        ? homepageFaq.settings
        : {};
    await db.homepageSection.update({
      where: { id: homepageFaq.id },
      data: { settings: { ...current, limit: 8 } as never },
    });
  }
}

async function applyCategories() {
  await db.category.deleteMany({
    where: { slug: { in: ["women", "men", "unisex"] } },
  });

  await db.category.updateMany({
    where: { parentId: null },
    data: { isFeatured: false },
  });

  for (const [position, category] of requestedCategories.entries()) {
    const media = await db.media.findUnique({
      where: { publicId: category.mediaPublicId },
      select: { id: true },
    });
    await db.category.upsert({
      where: { slug: category.slug },
      update: {
        name: category.name,
        description: category.description,
        position,
        isActive: true,
        isFeatured: true,
        ...(media ? { imageId: media.id } : {}),
        seoTitle: `${category.name} — 925 Sterling Silver`,
        seoDescription: category.description.slice(0, 155),
      },
      create: {
        slug: category.slug,
        name: category.name,
        description: category.description,
        position,
        isActive: true,
        isFeatured: true,
        imageId: media?.id,
        seoTitle: `${category.name} — 925 Sterling Silver`,
        seoDescription: category.description.slice(0, 155),
      },
    });
  }

  const requestedSlugs = requestedCategories.map((category) => category.slug);
  const otherCategories = await db.category.findMany({
    where: { parentId: null, slug: { notIn: requestedSlugs } },
    orderBy: [{ position: "asc" }, { name: "asc" }],
    select: { id: true },
  });
  for (const [index, category] of otherCategories.entries()) {
    await db.category.update({
      where: { id: category.id },
      data: { position: requestedCategories.length + index },
    });
  }
}

async function main() {
  await applySettings();
  await applyProductCopy();
  await applyHomepage();
  await applyCategories();

  const [products, categories, pages] = await Promise.all([
    db.product.count(),
    db.category.count({ where: { isFeatured: true, parentId: null } }),
    db.setting.count({ where: { key: { startsWith: "page:" } } }),
  ]);

  console.log(
    `Updated ${products} products, ${categories} featured categories and ${pages} static pages.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
