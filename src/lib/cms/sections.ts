import { z } from "zod";

/**
 * Homepage section contracts.
 *
 * Each section type owns a Zod schema describing its `settings` JSON. This one
 * module is the single source of truth for three consumers:
 *
 *   1. The admin editor — renders a form field per schema key.
 *   2. The write path   — validates before persisting, so malformed settings
 *                          can never reach the database.
 *   3. The renderer     — parses on read, so a section saved under an older
 *                          shape degrades to defaults instead of crashing the
 *                          homepage.
 *
 * Adding a section type means: add the enum member in schema.prisma, add a
 * schema here, and add a renderer case in components/sections/index.tsx.
 * Nothing else needs to change.
 */

/* -----------------------------------------------------------------------------
 * Shared fragments
 * -------------------------------------------------------------------------- */

const link = z.object({
  label: z.string().trim().min(1).max(60),
  href: z.string().trim().min(1).max(300),
});

const optionalLink = link.partial().optional();

/** A media reference. `mediaId` points at the Media table; `url` is the
 *  resolved delivery URL cached at write time so the renderer needs no join. */
const image = z.object({
  mediaId: z.string().optional(),
  url: z.string().min(1),
  alt: z.string().max(200).default(""),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
});

const textAlign = z.enum(["left", "center", "right"]).default("center");
const verticalPosition = z.enum(["top", "middle", "bottom"]).default("middle");
const theme = z.enum(["light", "dark"]).default("dark");

/** How many products/categories a carousel pulls, and from where. */
const productSource = z.object({
  mode: z
    .enum(["new", "bestsellers", "featured", "category", "collection", "manual"])
    .default("new"),
  categorySlug: z.string().optional(),
  collectionSlug: z.string().optional(),
  productIds: z.array(z.string()).default([]),
  limit: z.number().int().min(2).max(24).default(8),
});

/* -----------------------------------------------------------------------------
 * Per-type schemas
 * -------------------------------------------------------------------------- */

const heroSlide = z.object({
  desktopImage: image,
  /** Falls back to the desktop image when absent. Portrait crops matter: the
   *  hero occupies most of a phone's first viewport. */
  mobileImage: image.optional(),
  eyebrow: z.string().max(60).default(""),
  heading: z.string().max(120).default(""),
  subheading: z.string().max(240).default(""),
  primaryCta: optionalLink,
  secondaryCta: optionalLink,
  align: textAlign,
  position: verticalPosition,
  /** 0–100. Darkens the image so overlaid text keeps its contrast ratio. */
  overlayOpacity: z.number().min(0).max(100).default(35),
  theme,
});

export const sectionSchemas = {
  HERO: z.object({
    slides: z.array(heroSlide).min(1).max(6),
    /** Ignored when there is only one slide. */
    autoplay: z.boolean().default(true),
    autoplayDelayMs: z.number().int().min(3000).max(15000).default(6000),
    height: z.enum(["compact", "standard", "full"]).default("standard"),
  }),

  VIDEO_HERO: z.object({
    videoUrl: z.string().min(1),
    posterImage: image,
    eyebrow: z.string().max(60).default(""),
    heading: z.string().max(120).default(""),
    subheading: z.string().max(240).default(""),
    primaryCta: optionalLink,
    align: textAlign,
    overlayOpacity: z.number().min(0).max(100).default(40),
    height: z.enum(["compact", "standard", "full"]).default("standard"),
  }),

  IMAGE_BANNER: z.object({
    image,
    mobileImage: image.optional(),
    href: z.string().optional(),
    alt: z.string().max(200).default(""),
    /** Full-bleed banners break the page gutter; contained ones respect it. */
    fullBleed: z.boolean().default(false),
  }),

  PRODUCT_CAROUSEL: z.object({
    eyebrow: z.string().max(60).default(""),
    title: z.string().max(120),
    description: z.string().max(240).default(""),
    source: productSource,
    viewAll: optionalLink,
  }),

  PRODUCT_GRID: z.object({
    eyebrow: z.string().max(60).default(""),
    title: z.string().max(120),
    description: z.string().max(240).default(""),
    source: productSource,
    columns: z.number().int().min(2).max(4).default(4),
    viewAll: optionalLink,
  }),

  CATEGORY_CAROUSEL: z.object({
    eyebrow: z.string().max(60).default(""),
    title: z.string().max(120),
    description: z.string().max(240).default(""),
    /** Empty means "all featured categories, in admin order". */
    categorySlugs: z.array(z.string()).default([]),
    shape: z.enum(["circle", "portrait", "square"]).default("portrait"),
  }),

  COLLECTION_CAROUSEL: z.object({
    eyebrow: z.string().max(60).default(""),
    title: z.string().max(120),
    description: z.string().max(240).default(""),
    collectionSlugs: z.array(z.string()).default([]),
  }),

  PROMO_BANNER: z.object({
    eyebrow: z.string().max(60).default(""),
    heading: z.string().max(140),
    subheading: z.string().max(280).default(""),
    image: image.optional(),
    cta: optionalLink,
    /** Solid brand panel vs. image background. */
    style: z.enum(["solid", "image", "outline"]).default("solid"),
    theme,
  }),

  SPLIT_IMAGE_TEXT: z.object({
    image,
    imageSide: z.enum(["left", "right"]).default("left"),
    eyebrow: z.string().max(60).default(""),
    heading: z.string().max(140),
    body: z.string().max(1200).default(""),
    cta: optionalLink,
    /** Optional stat strip, e.g. "925 · Hallmarked". */
    stats: z
      .array(z.object({ value: z.string().max(24), label: z.string().max(48) }))
      .max(4)
      .default([]),
  }),

  TESTIMONIALS: z.object({
    eyebrow: z.string().max(60).default(""),
    title: z.string().max(120),
    items: z
      .array(
        z.object({
          quote: z.string().max(600),
          author: z.string().max(80),
          location: z.string().max(80).default(""),
          rating: z.number().int().min(1).max(5).default(5),
        }),
      )
      .min(1)
      .max(12),
  }),

  REVIEWS: z.object({
    eyebrow: z.string().max(60).default(""),
    title: z.string().max(120),
    description: z.string().max(240).default(""),
    /** Pulls approved, featured reviews from the database. */
    limit: z.number().int().min(2).max(12).default(6),
    onlyFeatured: z.boolean().default(true),
  }),

  FAQ: z.object({
    eyebrow: z.string().max(60).default(""),
    title: z.string().max(120),
    description: z.string().max(240).default(""),
    /** Empty means "all active FAQs". */
    faqCategory: z.string().optional(),
    limit: z.number().int().min(3).max(20).default(6),
  }),

  RICH_TEXT: z.object({
    title: z.string().max(140).default(""),
    /** Sanitised on write; see src/lib/cms/sanitize.ts. */
    html: z.string().max(20000),
    width: z.enum(["narrow", "wide"]).default("narrow"),
  }),

  CTA: z.object({
    eyebrow: z.string().max(60).default(""),
    heading: z.string().max(140),
    subheading: z.string().max(280).default(""),
    primaryCta: link,
    secondaryCta: optionalLink,
    theme,
  }),

  NEWSLETTER: z.object({
    eyebrow: z.string().max(60).default(""),
    heading: z.string().max(140),
    subheading: z.string().max(280).default(""),
    buttonLabel: z.string().max(40).default("Subscribe"),
    /** Shown under the form; keep it honest about frequency. */
    disclaimer: z.string().max(200).default(""),
  }),

  TRUST_BADGES: z.object({
    items: z
      .array(
        z.object({
          /** A lucide icon name, e.g. "ShieldCheck". Unknown names fall back. */
          icon: z.string().max(40).default("Sparkles"),
          title: z.string().max(60),
          description: z.string().max(160).default(""),
        }),
      )
      .min(2)
      .max(6),
    theme,
  }),

  CUSTOM_HTML: z.object({
    /** Sanitised through a strict allow-list before render. Script tags, event
     *  handlers and javascript: URLs are stripped — this is an admin
     *  convenience, not an escape hatch for arbitrary JavaScript. */
    html: z.string().max(20000),
    fullBleed: z.boolean().default(false),
  }),
} as const;

export type SectionType = keyof typeof sectionSchemas;

export type SectionSettings = {
  [K in SectionType]: z.infer<(typeof sectionSchemas)[K]>;
};

/** Discriminated union of a fully-parsed section, ready to render. */
export type ParsedSection = {
  [K in SectionType]: {
    id: string;
    type: K;
    label: string;
    settings: SectionSettings[K];
  };
}[SectionType];

export const SECTION_TYPES = Object.keys(sectionSchemas) as SectionType[];

/** Human labels for the admin section picker. */
export const SECTION_LABELS: Record<SectionType, string> = {
  HERO: "Hero",
  VIDEO_HERO: "Video hero",
  IMAGE_BANNER: "Image banner",
  PRODUCT_CAROUSEL: "Product carousel",
  PRODUCT_GRID: "Product grid",
  CATEGORY_CAROUSEL: "Category carousel",
  COLLECTION_CAROUSEL: "Collection carousel",
  PROMO_BANNER: "Promotional banner",
  SPLIT_IMAGE_TEXT: "Split image + text",
  TESTIMONIALS: "Testimonials",
  REVIEWS: "Customer reviews",
  FAQ: "FAQ",
  RICH_TEXT: "Rich text",
  CTA: "Call to action",
  NEWSLETTER: "Newsletter",
  TRUST_BADGES: "Trust badges",
  CUSTOM_HTML: "Custom HTML",
};

/** One-line descriptions shown beside each option when adding a section. */
export const SECTION_DESCRIPTIONS: Record<SectionType, string> = {
  HERO: "Full-width image slides with headline and buttons.",
  VIDEO_HERO: "Looping background video with overlaid copy.",
  IMAGE_BANNER: "A single clickable image strip.",
  PRODUCT_CAROUSEL: "Horizontally scrolling row of products.",
  PRODUCT_GRID: "Products laid out in a grid.",
  CATEGORY_CAROUSEL: "Shop-by-category tiles.",
  COLLECTION_CAROUSEL: "Curated collection tiles.",
  PROMO_BANNER: "Offer or announcement panel.",
  SPLIT_IMAGE_TEXT: "Image beside a block of copy — good for brand story.",
  TESTIMONIALS: "Hand-written customer quotes.",
  REVIEWS: "Live product reviews pulled from the database.",
  FAQ: "Expandable question list. Also emits FAQ schema for Google.",
  RICH_TEXT: "A formatted block of text.",
  CTA: "Headline with one or two buttons.",
  NEWSLETTER: "Email capture form.",
  TRUST_BADGES: "Icon row for hallmarking, returns, shipping.",
  CUSTOM_HTML: "Raw HTML for one-off needs. Sanitised before display.",
};

/**
 * Validate settings for a section type. Returns a typed result rather than
 * throwing so the admin can surface field-level errors.
 */
export function parseSectionSettings<T extends SectionType>(
  type: T,
  settings: unknown,
): z.ZodSafeParseResult<SectionSettings[T]> {
  return sectionSchemas[type].safeParse(settings) as z.ZodSafeParseResult<
    SectionSettings[T]
  >;
}

/**
 * Parse for rendering. A section whose stored settings no longer satisfy its
 * schema is dropped rather than allowed to throw — one bad section must never
 * take down the whole homepage.
 */
export function parseSectionForRender(section: {
  id: string;
  type: string;
  label: string;
  settings: unknown;
}): ParsedSection | null {
  const type = section.type as SectionType;
  if (!(type in sectionSchemas)) return null;

  const result = sectionSchemas[type].safeParse(section.settings);
  if (!result.success) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        `[cms] Section "${section.label}" (${section.id}, ${type}) has invalid settings and was skipped:`,
        result.error.issues,
      );
    }
    return null;
  }

  return {
    id: section.id,
    type,
    label: section.label,
    settings: result.data,
  } as ParsedSection;
}
