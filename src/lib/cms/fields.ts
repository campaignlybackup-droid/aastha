import type { SectionType } from "@/lib/cms/sections";

/**
 * Form field descriptions for the section editor.
 *
 * Zod tells us what is VALID; it does not tell us what a good form looks like
 * — which fields matter most, what to call them in plain English, or what
 * help text a shop owner needs. That is what this map is for.
 *
 * `path` is a dotted path into the section's settings object, so nested values
 * (`source.limit`) and array items (`slides.0.heading`) address the same way.
 * The editor writes through the path; Zod still validates on save, so a field
 * spec that drifts from its schema fails loudly rather than corrupting data.
 */

export type FieldKind =
  | "text"
  | "textarea"
  | "richtext"
  | "number"
  | "boolean"
  | "select"
  | "image"
  | "link"
  | "productSource";

export type FieldSpec = {
  path: string;
  label: string;
  kind: FieldKind;
  help?: string;
  placeholder?: string;
  options?: Array<{ value: string; label: string }>;
  min?: number;
  max?: number;
};

/** A repeatable group, e.g. hero slides or trust badges. */
export type RepeaterSpec = {
  path: string;
  label: string;
  itemLabel: string;
  /** Path within each item used as its heading in the editor. */
  titlePath: string;
  min: number;
  max: number;
  fields: FieldSpec[];
  /** Template for a newly added item. */
  blank: Record<string, unknown>;
};

export type SectionFormSpec = {
  fields: FieldSpec[];
  repeaters?: RepeaterSpec[];
  /** Types too free-form for a generated form fall back to raw JSON. */
  rawJson?: boolean;
};

const ALIGN_OPTIONS = [
  { value: "left", label: "Left" },
  { value: "center", label: "Centre" },
  { value: "right", label: "Right" },
];

const THEME_OPTIONS = [
  { value: "dark", label: "Dark image — light text" },
  { value: "light", label: "Light background — dark text" },
];

const HEIGHT_OPTIONS = [
  { value: "compact", label: "Compact" },
  { value: "standard", label: "Standard" },
  { value: "full", label: "Full screen" },
];

const heroSlideFields: FieldSpec[] = [
  { path: "desktopImage.url", label: "Desktop image", kind: "image", help: "Wide crop, at least 2000px across." },
  { path: "desktopImage.alt", label: "Image description", kind: "text", help: "Describes the image for screen readers and when it fails to load." },
  { path: "mobileImage.url", label: "Mobile image", kind: "image", help: "Optional. A tall crop; desktop images cut badly on a phone." },
  { path: "eyebrow", label: "Small label above the heading", kind: "text", placeholder: "Hallmarked 925 Silver" },
  { path: "heading", label: "Heading", kind: "text" },
  { path: "subheading", label: "Supporting line", kind: "textarea" },
  { path: "primaryCta.label", label: "Button text", kind: "text", placeholder: "Shop the collection" },
  { path: "primaryCta.href", label: "Button link", kind: "link", placeholder: "/shop" },
  { path: "secondaryCta.label", label: "Second button text", kind: "text" },
  { path: "secondaryCta.href", label: "Second button link", kind: "link" },
  { path: "align", label: "Text alignment", kind: "select", options: ALIGN_OPTIONS },
  { path: "position", label: "Vertical position", kind: "select", options: [
    { value: "top", label: "Top" },
    { value: "middle", label: "Middle" },
    { value: "bottom", label: "Bottom" },
  ] },
  { path: "overlayOpacity", label: "Image darkening (%)", kind: "number", min: 0, max: 100, help: "Higher makes text easier to read over a busy photo." },
  { path: "theme", label: "Text colour", kind: "select", options: THEME_OPTIONS },
];

export const SECTION_FORMS: Partial<Record<SectionType, SectionFormSpec>> = {
  HERO: {
    fields: [
      { path: "height", label: "Height", kind: "select", options: HEIGHT_OPTIONS },
      { path: "autoplay", label: "Rotate slides automatically", kind: "boolean", help: "Ignored when there is only one slide." },
      { path: "autoplayDelayMs", label: "Seconds per slide", kind: "number", min: 3000, max: 15000, help: "In milliseconds — 6000 is six seconds." },
    ],
    repeaters: [
      {
        path: "slides",
        label: "Slides",
        itemLabel: "Slide",
        titlePath: "heading",
        min: 1,
        max: 6,
        fields: heroSlideFields,
        blank: {
          desktopImage: { url: "", alt: "" },
          eyebrow: "",
          heading: "",
          subheading: "",
          align: "left",
          position: "middle",
          overlayOpacity: 35,
          theme: "dark",
        },
      },
    ],
  },

  PRODUCT_CAROUSEL: {
    fields: [
      { path: "eyebrow", label: "Small label", kind: "text" },
      { path: "title", label: "Heading", kind: "text" },
      { path: "description", label: "Supporting line", kind: "textarea" },
      { path: "source", label: "Which products", kind: "productSource" },
      { path: "viewAll.label", label: "“View all” text", kind: "text" },
      { path: "viewAll.href", label: "“View all” link", kind: "link" },
    ],
  },

  PRODUCT_GRID: {
    fields: [
      { path: "eyebrow", label: "Small label", kind: "text" },
      { path: "title", label: "Heading", kind: "text" },
      { path: "description", label: "Supporting line", kind: "textarea" },
      { path: "source", label: "Which products", kind: "productSource" },
      { path: "columns", label: "Columns on desktop", kind: "number", min: 2, max: 4 },
      { path: "viewAll.label", label: "“View all” text", kind: "text" },
      { path: "viewAll.href", label: "“View all” link", kind: "link" },
    ],
  },

  CATEGORY_CAROUSEL: {
    fields: [
      { path: "eyebrow", label: "Small label", kind: "text" },
      { path: "title", label: "Heading", kind: "text" },
      { path: "description", label: "Supporting line", kind: "textarea" },
      { path: "shape", label: "Tile shape", kind: "select", options: [
        { value: "portrait", label: "Portrait" },
        { value: "square", label: "Square" },
        { value: "circle", label: "Circle" },
      ] },
    ],
    // categorySlugs is left to the default (all featured categories), which is
    // managed on the Categories screen — two places to set it would drift.
  },

  COLLECTION_CAROUSEL: {
    fields: [
      { path: "eyebrow", label: "Small label", kind: "text" },
      { path: "title", label: "Heading", kind: "text" },
      { path: "description", label: "Supporting line", kind: "textarea" },
    ],
  },

  PROMO_BANNER: {
    fields: [
      { path: "eyebrow", label: "Small label", kind: "text" },
      { path: "heading", label: "Heading", kind: "text" },
      { path: "subheading", label: "Supporting line", kind: "textarea" },
      { path: "style", label: "Style", kind: "select", options: [
        { value: "solid", label: "Solid colour panel" },
        { value: "image", label: "Background image" },
        { value: "outline", label: "Outlined, no fill" },
      ] },
      { path: "image.url", label: "Background image", kind: "image", help: "Used only with the background image style." },
      { path: "cta.label", label: "Button text", kind: "text" },
      { path: "cta.href", label: "Button link", kind: "link" },
      { path: "theme", label: "Text colour", kind: "select", options: THEME_OPTIONS },
    ],
  },

  IMAGE_BANNER: {
    fields: [
      { path: "image.url", label: "Image", kind: "image" },
      { path: "mobileImage.url", label: "Mobile image", kind: "image", help: "Optional." },
      { path: "alt", label: "Image description", kind: "text" },
      { path: "href", label: "Links to", kind: "link" },
      { path: "fullBleed", label: "Stretch edge to edge", kind: "boolean" },
    ],
  },

  SPLIT_IMAGE_TEXT: {
    fields: [
      { path: "image.url", label: "Image", kind: "image" },
      { path: "image.alt", label: "Image description", kind: "text" },
      { path: "imageSide", label: "Image position", kind: "select", options: [
        { value: "left", label: "Left" },
        { value: "right", label: "Right" },
      ] },
      { path: "eyebrow", label: "Small label", kind: "text" },
      { path: "heading", label: "Heading", kind: "text" },
      { path: "body", label: "Body copy", kind: "richtext", help: "Basic HTML is allowed. Write only what is true of your business." },
      { path: "cta.label", label: "Button text", kind: "text" },
      { path: "cta.href", label: "Button link", kind: "link" },
    ],
    repeaters: [
      {
        path: "stats",
        label: "Figures",
        itemLabel: "Figure",
        titlePath: "label",
        min: 0,
        max: 4,
        fields: [
          { path: "value", label: "Figure", kind: "text", placeholder: "925" },
          { path: "label", label: "Caption", kind: "text", placeholder: "Hallmarked purity" },
        ],
        blank: { value: "", label: "" },
      },
    ],
  },

  CTA: {
    fields: [
      { path: "eyebrow", label: "Small label", kind: "text" },
      { path: "heading", label: "Heading", kind: "text" },
      { path: "subheading", label: "Supporting line", kind: "textarea" },
      { path: "primaryCta.label", label: "Button text", kind: "text" },
      { path: "primaryCta.href", label: "Button link", kind: "link" },
      { path: "secondaryCta.label", label: "Second button text", kind: "text" },
      { path: "secondaryCta.href", label: "Second button link", kind: "link" },
      { path: "theme", label: "Colour", kind: "select", options: THEME_OPTIONS },
    ],
  },

  NEWSLETTER: {
    fields: [
      { path: "eyebrow", label: "Small label", kind: "text" },
      { path: "heading", label: "Heading", kind: "text" },
      { path: "subheading", label: "Supporting line", kind: "textarea" },
      { path: "buttonLabel", label: "Button text", kind: "text" },
      { path: "disclaimer", label: "Small print", kind: "text", help: "Be honest about how often you will email." },
    ],
  },

  FAQ: {
    fields: [
      { path: "eyebrow", label: "Small label", kind: "text" },
      { path: "title", label: "Heading", kind: "text" },
      { path: "description", label: "Supporting line", kind: "textarea" },
      { path: "faqCategory", label: "Only show this FAQ category", kind: "text", help: "Leave blank for all. Questions are managed under FAQs." },
      { path: "limit", label: "How many to show", kind: "number", min: 3, max: 20 },
    ],
  },

  REVIEWS: {
    fields: [
      { path: "eyebrow", label: "Small label", kind: "text" },
      { path: "title", label: "Heading", kind: "text" },
      { path: "description", label: "Supporting line", kind: "textarea" },
      { path: "limit", label: "How many to show", kind: "number", min: 2, max: 12 },
      { path: "onlyFeatured", label: "Only featured reviews", kind: "boolean" },
    ],
  },

  TESTIMONIALS: {
    fields: [
      { path: "eyebrow", label: "Small label", kind: "text" },
      { path: "title", label: "Heading", kind: "text" },
    ],
    repeaters: [
      {
        path: "items",
        label: "Quotes",
        itemLabel: "Quote",
        titlePath: "author",
        min: 1,
        max: 12,
        fields: [
          { path: "quote", label: "Quote", kind: "textarea" },
          { path: "author", label: "Name", kind: "text" },
          { path: "location", label: "Location", kind: "text" },
          { path: "rating", label: "Stars", kind: "number", min: 1, max: 5 },
        ],
        blank: { quote: "", author: "", location: "", rating: 5 },
      },
    ],
  },

  TRUST_BADGES: {
    fields: [
      { path: "theme", label: "Colour", kind: "select", options: THEME_OPTIONS },
    ],
    repeaters: [
      {
        path: "items",
        label: "Badges",
        itemLabel: "Badge",
        titlePath: "title",
        min: 2,
        max: 6,
        fields: [
          { path: "icon", label: "Icon name", kind: "text", help: "A Lucide icon name, e.g. ShieldCheck, Truck, BadgeCheck." },
          { path: "title", label: "Title", kind: "text" },
          { path: "description", label: "Description", kind: "text" },
        ],
        blank: { icon: "Sparkles", title: "", description: "" },
      },
    ],
  },

  RICH_TEXT: {
    fields: [
      { path: "title", label: "Heading", kind: "text" },
      { path: "html", label: "Content", kind: "richtext" },
      { path: "width", label: "Width", kind: "select", options: [
        { value: "narrow", label: "Narrow" },
        { value: "wide", label: "Wide" },
      ] },
    ],
  },

  VIDEO_HERO: {
    fields: [
      { path: "videoUrl", label: "Video URL", kind: "text", help: "An .mp4 file. Keep it short and under a few MB." },
      { path: "posterImage.url", label: "Poster image", kind: "image", help: "Shown while the video loads." },
      { path: "eyebrow", label: "Small label", kind: "text" },
      { path: "heading", label: "Heading", kind: "text" },
      { path: "subheading", label: "Supporting line", kind: "textarea" },
      { path: "primaryCta.label", label: "Button text", kind: "text" },
      { path: "primaryCta.href", label: "Button link", kind: "link" },
      { path: "align", label: "Text alignment", kind: "select", options: ALIGN_OPTIONS },
      { path: "overlayOpacity", label: "Video darkening (%)", kind: "number", min: 0, max: 100 },
      { path: "height", label: "Height", kind: "select", options: HEIGHT_OPTIONS },
    ],
  },

  CUSTOM_HTML: {
    fields: [
      { path: "html", label: "HTML", kind: "richtext", help: "Sanitised before display — scripts, iframes and event handlers are stripped." },
      { path: "fullBleed", label: "Stretch edge to edge", kind: "boolean" },
    ],
  },
};

/* -----------------------------------------------------------------------------
 * Dotted-path access
 * -------------------------------------------------------------------------- */

export function getAtPath(source: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((value, key) => {
    if (value === null || value === undefined) return undefined;
    if (Array.isArray(value)) return value[Number(key)];
    if (typeof value === "object") return (value as Record<string, unknown>)[key];
    return undefined;
  }, source);
}

/**
 * Immutably writes `value` at `path`, creating intermediate objects/arrays.
 * Returns a new object so React sees a changed reference.
 */
export function setAtPath<T extends Record<string, unknown>>(
  source: T,
  path: string,
  value: unknown,
): T {
  const keys = path.split(".");

  const write = (node: unknown, index: number): unknown => {
    const key = keys[index];
    const isLast = index === keys.length - 1;
    const nextKeyIsIndex = !isLast && /^\d+$/.test(keys[index + 1]);

    if (/^\d+$/.test(key)) {
      const array = Array.isArray(node) ? [...node] : [];
      array[Number(key)] = isLast
        ? value
        : write(array[Number(key)] ?? (nextKeyIsIndex ? [] : {}), index + 1);
      return array;
    }

    const object =
      node && typeof node === "object" && !Array.isArray(node)
        ? { ...(node as Record<string, unknown>) }
        : {};
    object[key] = isLast
      ? value
      : write(object[key] ?? (nextKeyIsIndex ? [] : {}), index + 1);
    return object;
  };

  return write(source, 0) as T;
}
