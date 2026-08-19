/**
 * Seeds a realistic Aastha Silver & Jewels catalogue.
 *
 *   npm run db:seed
 *
 * Idempotent: every write is an upsert keyed on a natural unique column, so
 * running it repeatedly converges rather than duplicating. Safe to re-run after
 * a schema change.
 *
 * Product imagery points at the generated SVG placeholders in
 * public/placeholders. Real photography replaces these through the admin media
 * library — nothing here assumes local files once Cloudinary is configured.
 */

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
import type { Gender, SectionType } from "../src/generated/prisma/enums.js";

const connectionString =
  process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set — cannot seed.");
}

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

/** Rupees → paise. Kept local so the seed has no dependency on src/. */
const rs = (rupees: number) => Math.round(rupees * 100);

const slugify = (input: string) =>
  input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

/* =============================================================================
 * MEDIA
 * ========================================================================== */

type ArtKind =
  | "ring"
  | "earring"
  | "necklace"
  | "pendant"
  | "bracelet"
  | "bangle"
  | "anklet"
  | "chain"
  | "set";

/**
 * Hero art uses a dark ground so the light overlay text keeps its contrast.
 * `shape` picks the desktop (wide) or mobile (tall) crop.
 */
async function upsertHeroMedia(shape: "wide" | "tall", index: number) {
  const publicId = `placeholder/hero-${shape}-${index}`;
  const url = `/placeholders/hero-${shape}-${index}.svg`;
  return db.media.upsert({
    where: { publicId },
    update: {},
    create: {
      publicId,
      url,
      secureUrl: url,
      folder: "HERO",
      format: "svg",
      width: shape === "wide" ? 2400 : 1200,
      height: shape === "wide" ? 1200 : 1600,
      alt: "Hero placeholder artwork",
      filename: `hero-${shape}-${index}.svg`,
      tags: ["placeholder", "hero"],
    },
  });
}

async function upsertPlaceholderMedia(kind: ArtKind, index: number) {
  const publicId = `placeholder/${kind}-${index}`;
  const url = `/placeholders/${kind}-${index}.svg`;
  return db.media.upsert({
    where: { publicId },
    update: {},
    create: {
      publicId,
      url,
      secureUrl: url,
      folder: "PRODUCT",
      format: "svg",
      width: 1200,
      height: 1500,
      alt: `${kind} placeholder artwork`,
      filename: `${kind}-${index}.svg`,
      tags: ["placeholder", kind],
    },
  });
}

/* =============================================================================
 * CATEGORIES
 * ========================================================================== */

const CATEGORIES: Array<{
  name: string;
  slug?: string;
  art: ArtKind;
  featured?: boolean;
  children?: string[];
  description: string;
}> = [
  {
    name: "Chains",
    art: "chain",
    featured: true,
    description: "Box, rope and Cuban chains in multiple lengths and gauges.",
  },
  {
    name: "Rings",
    art: "ring",
    featured: true,
    children: ["Statement Rings", "Stackable Bands", "Solitaire Rings"],
    description:
      "Hand-finished 925 sterling silver rings — from everyday stackable bands to occasion-worthy statement pieces.",
  },
  {
    name: "Anklets",
    art: "anklet",
    featured: true,
    description: "Payals with hand-set ghungroos, sold as pairs.",
  },
  {
    name: "Bracelets",
    art: "bracelet",
    featured: true,
    description: "Link, cuff and charm bracelets in solid 925 silver.",
  },
  {
    name: "Pendants & Charms",
    slug: "pendants",
    art: "pendant",
    featured: true,
    description: "Symbolic pendants and charms in genuine 925 sterling silver.",
  },
  {
    name: "Earrings",
    art: "earring",
    children: ["Studs", "Jhumkas", "Hoops", "Drop Earrings"],
    description:
      "Studs, jhumkas and drops in hallmarked sterling silver, weighted for all-day comfort.",
  },
  {
    name: "Necklaces",
    art: "necklace",
    description:
      "Temple-inspired and contemporary silver necklaces, finished with secure lobster clasps.",
  },
  {
    name: "Bangles",
    art: "bangle",
    description:
      "Traditional kadas and slim bangles, sized to standard Indian measurements.",
  },
  {
    name: "Jewellery Sets",
    art: "set",
    description:
      "Coordinated necklace and earring sets for weddings and festivals.",
  },
  {
    name: "Men's Jewellery",
    art: "bracelet",
    description: "Substantial silver kadas, chains and rings designed for men.",
  },
  {
    name: "Kids' Jewellery",
    art: "anklet",
    description: "Lightweight, skin-safe silver pieces sized for children.",
  },
  {
    name: "Gifting",
    art: "set",
    description: "Ready-to-gift silver, boxed and finished with a care card.",
  },
];

/* =============================================================================
 * PRODUCTS
 * ========================================================================== */

type VariantSpec = {
  title: string;
  options: Record<string, string>;
  stock: number;
};

type ProductSpec = {
  name: string;
  category: string;
  art: ArtKind;
  mrp: number;
  price: number;
  short: string;
  description: string;
  purity: string;
  weight: number;
  gender: Gender;
  occasion: string[];
  tags: string[];
  finish?: string;
  plating?: string;
  stoneType?: string;
  stoneColour?: string;
  stoneCount?: number;
  dimensions?: string;
  adjustable?: boolean;
  featured?: boolean;
  variants?: VariantSpec[];
  collections?: string[];
  salesCount?: number;
};

const RING_SIZES: VariantSpec[] = [
  { title: "Size 12", options: { Size: "12" }, stock: 8 },
  { title: "Size 14", options: { Size: "14" }, stock: 12 },
  { title: "Size 16", options: { Size: "16" }, stock: 10 },
  { title: "Size 18", options: { Size: "18" }, stock: 4 },
];

const CHAIN_LENGTHS: VariantSpec[] = [
  { title: '16"', options: { Length: '16"' }, stock: 9 },
  { title: '18"', options: { Length: '18"' }, stock: 14 },
  { title: '20"', options: { Length: '20"' }, stock: 11 },
  { title: '22"', options: { Length: '22"' }, stock: 5 },
];

const BANGLE_SIZES: VariantSpec[] = [
  { title: "2.4", options: { Size: "2.4" }, stock: 6 },
  { title: "2.6", options: { Size: "2.6" }, stock: 9 },
  { title: "2.8", options: { Size: "2.8" }, stock: 7 },
];

const PRODUCTS: ProductSpec[] = [
  // --- Rings ---------------------------------------------------------------
  {
    name: "Anaya Floral Band Ring",
    category: "Rings",
    art: "ring",
    mrp: 2890,
    price: 1999,
    short: "A slim band with hand-engraved marigold detailing.",
    description:
      "<p>The Anaya band takes its motif from the marigold garlands strung across doorways during festival season. Each flower is engraved by hand, then the recesses are oxidised and the raised surface polished back — so the pattern reads clearly even at this scale.</p><p>At 2.4mm the band is slim enough to stack with two or three others, and comfortable enough to wear daily.</p>",
    purity: "925 Sterling Silver",
    weight: 2.8,
    gender: "WOMEN",
    occasion: ["Everyday", "Gifting"],
    tags: ["floral", "stackable", "engraved", "everyday"],
    finish: "Oxidised & Polished",
    dimensions: "2.4mm band width",
    variants: RING_SIZES,
    collections: ["everyday-silver", "under-2000"],
    featured: true,
    salesCount: 148,
  },
  {
    name: "Meher Oxidised Statement Ring",
    category: "Rings",
    art: "ring",
    mrp: 3450,
    price: 2599,
    short: "An architectural oxidised ring with a raised dome.",
    description:
      "<p>A deliberately bold silhouette — the domed face sits 9mm proud of the finger and catches light from across a room. The oxidised finish is sealed with a micro-lacquer so it keeps its depth rather than rubbing bright within weeks.</p>",
    purity: "925 Sterling Silver",
    weight: 6.2,
    gender: "WOMEN",
    occasion: ["Party", "Festive"],
    tags: ["oxidised", "statement", "bold"],
    finish: "Oxidised",
    dimensions: "18mm face diameter",
    variants: RING_SIZES,
    collections: ["oxidised-heritage"],
    salesCount: 62,
  },
  {
    name: "Kiara Solitaire Zircon Ring",
    category: "Rings",
    art: "ring",
    mrp: 4290,
    price: 3199,
    short: "A six-prong solitaire set with a brilliant-cut zircon.",
    description:
      "<p>Cut and set the way a diamond solitaire would be: six prongs, a raised gallery, and a cathedral shoulder that tapers into the band. The 6mm zircon is hand-set and graded for clarity before it leaves the workshop.</p>",
    purity: "925 Sterling Silver",
    weight: 3.4,
    gender: "WOMEN",
    occasion: ["Engagement", "Anniversary", "Gifting"],
    tags: ["solitaire", "zircon", "bridal"],
    finish: "Rhodium Polished",
    plating: "Rhodium",
    stoneType: "Cubic Zircon",
    stoneColour: "White",
    stoneCount: 1,
    dimensions: "6mm stone",
    variants: RING_SIZES,
    collections: ["bridal-edit", "gifting-favourites"],
    featured: true,
    salesCount: 97,
  },

  // --- Earrings ------------------------------------------------------------
  {
    name: "Rukmini Temple Jhumka Earrings",
    category: "Earrings",
    art: "earring",
    mrp: 5490,
    price: 3899,
    short: "Domed jhumkas with a fringe of hand-strung ghungroos.",
    description:
      "<p>Modelled on the jhumkas of South Indian temple jewellery, the dome is raised from a single sheet rather than cast, which keeps them light — 11 grams for the pair, so they sit comfortably through a full wedding day.</p><p>Twenty-four ghungroos are strung by hand along the rim. They ring softly when you move.</p>",
    purity: "925 Sterling Silver",
    weight: 11.0,
    gender: "WOMEN",
    occasion: ["Wedding", "Festive", "Party"],
    tags: ["jhumka", "temple", "traditional", "bridal"],
    finish: "Antique Oxidised",
    dimensions: "32mm drop x 22mm dome",
    collections: ["bridal-edit", "oxidised-heritage"],
    featured: true,
    salesCount: 213,
  },
  {
    name: "Ira Zircon Stud Earrings",
    category: "Earrings",
    art: "earring",
    mrp: 1990,
    price: 1299,
    short: "4mm zircon studs with secure screw-backs.",
    description:
      "<p>The pair most customers buy first. Screw-back fittings rather than push-backs, because studs that fall out are studs that get lost.</p>",
    purity: "925 Sterling Silver",
    weight: 1.6,
    gender: "WOMEN",
    occasion: ["Everyday", "Office", "Gifting"],
    tags: ["studs", "zircon", "minimal", "everyday"],
    finish: "Rhodium Polished",
    plating: "Rhodium",
    stoneType: "Cubic Zircon",
    stoneColour: "White",
    stoneCount: 2,
    dimensions: "4mm",
    collections: ["everyday-silver", "under-2000", "gifting-favourites"],
    featured: true,
    salesCount: 386,
  },
  {
    name: "Mira Threader Drop Earrings",
    category: "Earrings",
    art: "earring",
    mrp: 2450,
    price: 1799,
    short: "A fluid chain threader that slips through the lobe.",
    description:
      "<p>No back, no clasp — the fine box chain threads through the piercing and hangs at whatever length you set it to. Deceptively simple to make well: the chain has to be flexible enough to drape and stiff enough to feed through.</p>",
    purity: "925 Sterling Silver",
    weight: 2.2,
    gender: "WOMEN",
    occasion: ["Everyday", "Party"],
    tags: ["threader", "minimal", "modern"],
    finish: "High Polish",
    dimensions: "70mm total length",
    collections: ["everyday-silver", "under-2000"],
    salesCount: 74,
  },
  {
    name: "Saanjh Chandbali Earrings",
    category: "Earrings",
    art: "earring",
    mrp: 6890,
    price: 4999,
    short: "Crescent chandbalis with filigree and pearl drops.",
    description:
      "<p>The crescent is pierced with filigree fine enough to see light through, and finished with a row of freshwater pearl drops. A Mughal form that has stayed in fashion for four centuries.</p>",
    purity: "925 Sterling Silver",
    weight: 14.5,
    gender: "WOMEN",
    occasion: ["Wedding", "Festive"],
    tags: ["chandbali", "filigree", "pearl", "bridal"],
    finish: "Antique Oxidised",
    stoneType: "Freshwater Pearl",
    stoneColour: "Ivory",
    stoneCount: 10,
    dimensions: "48mm drop",
    collections: ["bridal-edit", "oxidised-heritage"],
    salesCount: 41,
  },

  // --- Necklaces -----------------------------------------------------------
  {
    name: "Vaidehi Temple Necklace",
    category: "Necklaces",
    art: "necklace",
    mrp: 12900,
    price: 9499,
    short: "A temple-motif collar with a detachable pendant.",
    description:
      "<p>Our most involved piece. The collar is built from eleven cast panels, each depicting a lotus, linked so the whole necklace curves to the neck instead of standing away from it. The central pendant unclips and can be worn on a plain chain.</p>",
    purity: "925 Sterling Silver",
    weight: 42.0,
    gender: "WOMEN",
    occasion: ["Wedding", "Festive"],
    tags: ["temple", "bridal", "heritage", "statement"],
    finish: "Antique Oxidised",
    dimensions: '15" collar, adjustable to 17"',
    adjustable: true,
    collections: ["bridal-edit", "oxidised-heritage"],
    featured: true,
    salesCount: 28,
  },
  {
    name: "Noor Layered Rope Necklace",
    category: "Necklaces",
    art: "necklace",
    mrp: 4290,
    price: 3299,
    short: "Three rope chains at graduated lengths on one clasp.",
    description:
      "<p>The layered look without the tangling. Three rope chains at 16, 18 and 20 inches share a single clasp, so they always hang in the same order and never knot against each other.</p>",
    purity: "925 Sterling Silver",
    weight: 16.8,
    gender: "WOMEN",
    occasion: ["Everyday", "Party"],
    tags: ["layered", "rope", "modern"],
    finish: "High Polish",
    dimensions: '16" / 18" / 20"',
    collections: ["everyday-silver"],
    salesCount: 88,
  },

  // --- Pendants ------------------------------------------------------------
  {
    name: "Om Engraved Pendant",
    category: "Pendants",
    art: "pendant",
    mrp: 1690,
    price: 1199,
    short: "A hand-engraved Om on a brushed silver disc.",
    description:
      "<p>Engraved rather than stamped, so the strokes have the slight variation of a hand-cut line. Sold as the pendant only; pair it with any of our chains.</p>",
    purity: "925 Sterling Silver",
    weight: 3.1,
    gender: "UNISEX",
    occasion: ["Everyday", "Gifting", "Religious"],
    tags: ["om", "spiritual", "engraved", "unisex"],
    finish: "Brushed",
    dimensions: "18mm disc",
    collections: ["everyday-silver", "under-2000", "gifting-favourites"],
    salesCount: 167,
  },
  {
    name: "Nazar Evil Eye Pendant",
    category: "Pendants",
    art: "pendant",
    mrp: 2190,
    price: 1599,
    short: "A blue enamel nazar set in a silver bezel.",
    description:
      "<p>Vitreous enamel, kiln-fired rather than painted, so the blue will not chip or fade. Set in a hand-formed bezel with a small bail sized for chains up to 2mm.</p>",
    purity: "925 Sterling Silver",
    weight: 2.7,
    gender: "UNISEX",
    occasion: ["Everyday", "Gifting"],
    tags: ["evil-eye", "nazar", "enamel", "protection"],
    finish: "High Polish",
    stoneType: "Enamel",
    stoneColour: "Blue",
    stoneCount: 1,
    dimensions: "14mm",
    collections: ["everyday-silver", "under-2000"],
    featured: true,
    salesCount: 204,
  },

  // --- Bracelets -----------------------------------------------------------
  {
    name: "Tara Cuban Link Bracelet",
    category: "Bracelets",
    art: "bracelet",
    mrp: 5490,
    price: 4199,
    short: "A solid 7mm Cuban link with a box clasp.",
    description:
      "<p>Solid links, not hollow — this weighs 28 grams and feels it. The box clasp has a safety catch, which on a bracelet this heavy is not optional.</p>",
    purity: "925 Sterling Silver",
    weight: 28.0,
    gender: "UNISEX",
    occasion: ["Everyday", "Party"],
    tags: ["cuban", "link", "unisex", "heavy"],
    finish: "High Polish",
    dimensions: '7mm width, 8" length',
    collections: ["everyday-silver"],
    salesCount: 59,
  },
  {
    name: "Riya Charm Bracelet",
    category: "Bracelets",
    art: "bracelet",
    mrp: 3290,
    price: 2399,
    short: "An adjustable chain hung with five silver charms.",
    description:
      "<p>Five charms — lotus, moon, evil eye, heart and a plain disc that can be engraved on request. The slider clasp adjusts from 6 to 8 inches, so it fits without resizing.</p>",
    purity: "925 Sterling Silver",
    weight: 9.4,
    gender: "WOMEN",
    occasion: ["Everyday", "Gifting"],
    tags: ["charm", "adjustable", "gifting"],
    finish: "High Polish",
    adjustable: true,
    dimensions: 'Adjustable 6"–8"',
    collections: ["gifting-favourites", "everyday-silver"],
    salesCount: 112,
  },

  // --- Bangles -------------------------------------------------------------
  {
    name: "Kanika Textured Kada",
    category: "Bangles",
    art: "bangle",
    mrp: 7890,
    price: 5999,
    short: "A broad hammered kada with an open cuff back.",
    description:
      "<p>Hammered by hand, so no two are identical — the facets catch light differently across the surface. The back is open by 14mm, letting it slip over the wrist and then close to fit.</p>",
    purity: "925 Sterling Silver",
    weight: 34.0,
    gender: "WOMEN",
    occasion: ["Festive", "Wedding"],
    tags: ["kada", "hammered", "cuff", "traditional"],
    finish: "Hammered Matte",
    dimensions: "18mm width",
    variants: BANGLE_SIZES,
    collections: ["oxidised-heritage", "bridal-edit"],
    salesCount: 47,
  },
  {
    name: "Suhani Slim Bangle Set of 4",
    category: "Bangles",
    art: "bangle",
    mrp: 4490,
    price: 3299,
    short: "Four 3mm bangles designed to be worn stacked.",
    description:
      "<p>Sold as a set of four. Two are polished, two are matte — stacked together the contrast reads as intentional rather than mismatched.</p>",
    purity: "925 Sterling Silver",
    weight: 22.0,
    gender: "WOMEN",
    occasion: ["Everyday", "Festive"],
    tags: ["bangle", "stackable", "set"],
    finish: "Mixed Polish & Matte",
    dimensions: "3mm each",
    variants: BANGLE_SIZES,
    collections: ["everyday-silver"],
    salesCount: 93,
  },

  // --- Anklets -------------------------------------------------------------
  {
    name: "Payal Ghungroo Anklets",
    category: "Anklets",
    art: "anklet",
    mrp: 3890,
    price: 2799,
    short: "A classic payal pair with 48 hand-strung ghungroos.",
    description:
      "<p>Sold as a pair. Forty-eight ghungroos per anklet, each strung and closed by hand — the sound is the point, and machine-set bells do not ring the same way.</p>",
    purity: "925 Sterling Silver",
    weight: 26.0,
    gender: "WOMEN",
    occasion: ["Festive", "Wedding", "Everyday"],
    tags: ["payal", "ghungroo", "traditional", "pair"],
    finish: "Antique Oxidised",
    dimensions: '10" adjustable to 11"',
    adjustable: true,
    collections: ["oxidised-heritage"],
    featured: true,
    salesCount: 131,
  },
  {
    name: "Meenal Minimal Chain Anklet",
    category: "Anklets",
    art: "anklet",
    mrp: 1490,
    price: 999,
    short: "A single fine chain anklet, sold individually.",
    description:
      "<p>1.2mm rolo chain with an extender. Quiet, flat against the ankle, and fine enough to wear under socks.</p>",
    purity: "925 Sterling Silver",
    weight: 2.4,
    gender: "WOMEN",
    occasion: ["Everyday"],
    tags: ["anklet", "minimal", "chain"],
    finish: "High Polish",
    adjustable: true,
    dimensions: '9" adjustable to 10.5"',
    collections: ["everyday-silver", "under-2000"],
    salesCount: 156,
  },

  // --- Chains --------------------------------------------------------------
  {
    name: "Classic Box Chain",
    category: "Chains",
    art: "chain",
    mrp: 2690,
    price: 1899,
    short: "A 1.8mm box chain with a lobster clasp.",
    description:
      "<p>The chain we recommend for any of our pendants. Box links resist kinking better than rope or snake chains, which matters when a chain lives in a jewellery box rather than on a stand.</p>",
    purity: "925 Sterling Silver",
    weight: 6.5,
    gender: "UNISEX",
    occasion: ["Everyday"],
    tags: ["chain", "box", "unisex", "basic"],
    finish: "High Polish",
    dimensions: "1.8mm gauge",
    variants: CHAIN_LENGTHS,
    collections: ["everyday-silver", "under-2000"],
    salesCount: 241,
  },
  {
    name: "Rope Chain 3mm",
    category: "Chains",
    art: "chain",
    mrp: 4990,
    price: 3699,
    short: "A twisted rope chain with real weight to it.",
    description:
      "<p>Twisted rather than woven, which gives the chain its spiral catch of light. At 3mm it is substantial enough to wear on its own.</p>",
    purity: "925 Sterling Silver",
    weight: 18.2,
    gender: "MEN",
    occasion: ["Everyday", "Party"],
    tags: ["chain", "rope", "mens"],
    finish: "High Polish",
    dimensions: "3mm gauge",
    variants: CHAIN_LENGTHS,
    salesCount: 76,
  },

  // --- Sets ----------------------------------------------------------------
  {
    name: "Aarohi Bridal Necklace Set",
    category: "Jewellery Sets",
    art: "set",
    mrp: 18900,
    price: 13999,
    short: "A temple necklace with matching jhumkas and maang tikka.",
    description:
      "<p>Three pieces designed together: the collar, a pair of matched jhumkas, and a maang tikka that repeats the central lotus. Supplied in a lined presentation box.</p><p>This is a made-to-order piece. Allow 7–10 days for dispatch.</p>",
    purity: "925 Sterling Silver",
    weight: 78.0,
    gender: "WOMEN",
    occasion: ["Wedding"],
    tags: ["bridal", "set", "temple", "made-to-order"],
    finish: "Antique Oxidised",
    dimensions: "Necklace 16in, jhumka 38mm drop",
    collections: ["bridal-edit", "gifting-favourites"],
    featured: true,
    salesCount: 19,
  },
  {
    name: "Nitya Pearl Necklace Set",
    category: "Jewellery Sets",
    art: "set",
    mrp: 8990,
    price: 6799,
    short: "Freshwater pearls with silver spacers, plus studs.",
    description:
      "<p>A quieter alternative to a full bridal set. Graduated freshwater pearls with hand-turned silver spacers, matched with a pair of pearl studs.</p>",
    purity: "925 Sterling Silver",
    weight: 32.0,
    gender: "WOMEN",
    occasion: ["Wedding", "Party", "Anniversary"],
    tags: ["pearl", "set", "elegant"],
    finish: "Rhodium Polished",
    plating: "Rhodium",
    stoneType: "Freshwater Pearl",
    stoneColour: "Ivory",
    stoneCount: 42,
    dimensions: '17" necklace',
    collections: ["bridal-edit", "gifting-favourites"],
    salesCount: 34,
  },

  // --- Men's ---------------------------------------------------------------
  {
    name: "Veer Oxidised Kada",
    category: "Men's Jewellery",
    art: "bracelet",
    mrp: 6490,
    price: 4899,
    short: "A heavy oxidised kada with an engraved trishul.",
    description:
      "<p>Forty-two grams of solid silver. The trishul is engraved into the face and oxidised to sit dark against the polished surround.</p>",
    purity: "925 Sterling Silver",
    weight: 42.0,
    gender: "MEN",
    occasion: ["Everyday", "Festive"],
    tags: ["kada", "mens", "oxidised", "heavy"],
    finish: "Oxidised",
    dimensions: "12mm width",
    variants: BANGLE_SIZES,
    collections: ["oxidised-heritage"],
    salesCount: 68,
  },
  {
    name: "Arjun Signet Ring",
    category: "Men's Jewellery",
    art: "ring",
    mrp: 4290,
    price: 3299,
    short: "A flat-faced signet ring, engravable on request.",
    description:
      "<p>A 14mm flat face on a squared shank. Left plain by default; we can engrave initials before dispatch at no extra cost — add a note at checkout.</p>",
    purity: "925 Sterling Silver",
    weight: 9.8,
    gender: "MEN",
    occasion: ["Everyday", "Gifting"],
    tags: ["signet", "mens", "engravable"],
    finish: "High Polish",
    dimensions: "14mm face",
    variants: RING_SIZES,
    collections: ["gifting-favourites"],
    salesCount: 52,
  },

  // --- Kids ----------------------------------------------------------------
  {
    name: "Nanhi Kids Anklet Pair",
    category: "Kids' Jewellery",
    art: "anklet",
    mrp: 1890,
    price: 1399,
    short: "Lightweight ghungroo anklets sized for toddlers.",
    description:
      "<p>Sized for one to four years, with a screw clasp that a child cannot open. Nickel-free and hypoallergenic — an ordinary requirement for adult jewellery, an essential one here.</p>",
    purity: "925 Sterling Silver",
    weight: 8.0,
    gender: "KIDS",
    occasion: ["Gifting", "Festive"],
    tags: ["kids", "anklet", "hypoallergenic", "pair"],
    finish: "High Polish",
    dimensions: '5.5" adjustable',
    adjustable: true,
    collections: ["gifting-favourites"],
    salesCount: 84,
  },
];

/* =============================================================================
 * COLLECTIONS
 * ========================================================================== */

const COLLECTIONS = [
  {
    slug: "bridal-edit",
    name: "The Bridal Edit",
    art: "set" as ArtKind,
    featured: true,
    description:
      "Temple collars, chandbalis and matched sets for the wedding calendar — the pieces we make the most of between October and February.",
  },
  {
    slug: "everyday-silver",
    name: "Everyday Silver",
    art: "chain" as ArtKind,
    featured: true,
    description:
      "Light enough to forget you are wearing it. Sealed finishes that survive being worn daily.",
  },
  {
    slug: "oxidised-heritage",
    name: "Oxidised Heritage",
    art: "earring" as ArtKind,
    featured: true,
    description:
      "Traditional forms in an antique finish — jhumkas, kadas and payals made the way they have been for generations.",
  },
  {
    slug: "under-2000",
    name: "Under ₹2,000",
    art: "pendant" as ArtKind,
    featured: true,
    description:
      "Real 925 silver that does not need an occasion to justify it.",
  },
  {
    slug: "gifting-favourites",
    name: "Gifting Favourites",
    art: "ring" as ArtKind,
    featured: true,
    description:
      "The pieces customers buy for other people. All arrive boxed with a care card.",
  },
];

/* =============================================================================
 * SEED
 * ========================================================================== */

async function seedSettings() {
  const settings: Array<[string, unknown]> = [
    [
      "contact",
      // Placeholders. These are claims about a real business, so the seed
      // must not invent them — the owner fills these in under Settings and
      // every surface hides the field until they do.
      {
        email: "",
        phone: "",
        whatsapp: process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP || "",
        addressLines: [],
        city: "",
        state: "",
        hours: "",
      },
    ],
    [
      "shipping",
      {
        // Free shipping above ₹1,500; ₹79 flat below that.
        freeAbovePaise: rs(1500),
        flatRatePaise: rs(79),
        dispatchCopy: SHIPPING_COPY.dispatch,
        deliveryCopy: SHIPPING_COPY.delivery,
      },
    ],
    [
      "brand",
      {
        tagline: "Hallmarked 925 sterling silver jewellery.",
        city: "",
        state: "",
      },
    ],
    [
      "social",
      // Left blank: guessed social URLs could point at someone else's account.
      { instagram: "", facebook: "", youtube: "" },
    ],
    [
      "announcement",
      {
        enabled: true,
        text: "Complimentary shipping on orders above ₹1,500 · Hallmarked 925 silver",
        href: "/shop",
      },
    ],
    ["page:about", STATIC_PAGE_CONTENT.about],
    ["page:care-guide", STATIC_PAGE_CONTENT["care-guide"]],
    ["page:shipping-policy", STATIC_PAGE_CONTENT["shipping-policy"]],
    ["page:return-policy", STATIC_PAGE_CONTENT["return-policy"]],
  ];

  for (const [key, value] of settings) {
    await db.setting.upsert({
      where: { key },
      update: { value: value as never },
      create: { key, value: value as never },
    });
  }
  console.log(`  ✓ ${settings.length} settings`);
}

async function seedCategories() {
  const bySlug = new Map<string, string>();

  for (const [index, spec] of CATEGORIES.entries()) {
    const media = await upsertPlaceholderMedia(spec.art, (index % 4) + 1);
    const slug = spec.slug ?? slugify(spec.name);

    const category = await db.category.upsert({
      where: { slug },
      update: {
        name: spec.name,
        description: spec.description,
        imageId: media.id,
        position: index,
        isFeatured: spec.featured ?? false,
        seoTitle: spec.name,
        seoDescription: spec.description.slice(0, 155),
      },
      create: {
        name: spec.name,
        slug,
        description: spec.description,
        imageId: media.id,
        position: index,
        isActive: true,
        isFeatured: spec.featured ?? false,
        seoTitle: `${spec.name} — 925 Sterling Silver`,
        seoDescription: spec.description.slice(0, 155),
      },
    });
    bySlug.set(slug, category.id);

    for (const [childIndex, childName] of (spec.children ?? []).entries()) {
      const childSlug = slugify(childName);
      const child = await db.category.upsert({
        where: { slug: childSlug },
        update: { parentId: category.id, position: childIndex },
        create: {
          name: childName,
          slug: childSlug,
          parentId: category.id,
          position: childIndex,
          isActive: true,
          description: `${childName} in hallmarked 925 sterling silver.`,
        },
      });
      bySlug.set(childSlug, child.id);
    }
  }

  console.log(`  ✓ ${bySlug.size} categories`);
  return bySlug;
}

async function seedCollections() {
  const bySlug = new Map<string, string>();

  for (const [index, spec] of COLLECTIONS.entries()) {
    const media = await upsertPlaceholderMedia(spec.art, (index % 4) + 1);
    const collection = await db.collection.upsert({
      where: { slug: spec.slug },
      update: {
        name: spec.name,
        description: spec.description,
        position: index,
        seoTitle: spec.name,
        seoDescription: spec.description.slice(0, 155),
      },
      create: {
        name: spec.name,
        slug: spec.slug,
        description: spec.description,
        imageId: media.id,
        position: index,
        isActive: true,
        isFeatured: spec.featured,
        seoTitle: spec.name,
        seoDescription: spec.description.slice(0, 155),
      },
    });
    bySlug.set(spec.slug, collection.id);
  }

  console.log(`  ✓ ${bySlug.size} collections`);
  return bySlug;
}

function skuFor(name: string, suffix?: string) {
  const base = `ASJ-${slugify(name).toUpperCase().replace(/-/g, "").slice(0, 12)}`;
  return suffix ? `${base}-${suffix}` : base;
}

async function seedProducts(
  categoryIds: Map<string, string>,
  collectionIds: Map<string, string>,
) {
  let count = 0;

  for (const [index, spec] of PRODUCTS.entries()) {
    const categoryId = categoryIds.get(slugify(spec.category));
    if (!categoryId) {
      throw new Error(`Unknown category "${spec.category}" for ${spec.name}`);
    }

    const slug = slugify(spec.name);
    const sku = skuFor(spec.name);

    // Two or three images per product, cycling through the art variants.
    const imageCount = 2 + (index % 2);
    const media = [];

    if (spec.art === "chain") {
      const realImg1 = await db.media.upsert({
        where: { publicId: "product/silver-beaded-snake-chain-1" },
        update: {
          url: "/uploads/silver-beaded-snake-chain-1.jpg",
          secureUrl: "/uploads/silver-beaded-snake-chain-1.jpg",
        },
        create: {
          publicId: "product/silver-beaded-snake-chain-1",
          url: "/uploads/silver-beaded-snake-chain-1.jpg",
          secureUrl: "/uploads/silver-beaded-snake-chain-1.jpg",
          folder: "PRODUCT",
          format: "jpg",
          width: 1200,
          height: 1500,
          bytes: 246051,
          alt: "Aastha 925 Sterling Silver Beaded Snake Chain",
          filename: "silver-beaded-snake-chain-1.jpg",
          tags: ["product", "chain", "silver", "snake-chain"],
        },
      });

      const realImg2 = await db.media.upsert({
        where: { publicId: "product/silver-beaded-snake-chain-2" },
        update: {
          url: "/uploads/silver-beaded-snake-chain-2.jpg",
          secureUrl: "/uploads/silver-beaded-snake-chain-2.jpg",
        },
        create: {
          publicId: "product/silver-beaded-snake-chain-2",
          url: "/uploads/silver-beaded-snake-chain-2.jpg",
          secureUrl: "/uploads/silver-beaded-snake-chain-2.jpg",
          folder: "PRODUCT",
          format: "jpg",
          width: 1200,
          height: 1500,
          bytes: 246051,
          alt: "Aastha 925 Sterling Silver Beaded Snake Chain Detail View",
          filename: "silver-beaded-snake-chain-2.jpg",
          tags: ["product", "chain", "silver", "snake-chain"],
        },
      });

      media.push(realImg1, realImg2);
    } else {
      for (let i = 0; i < imageCount; i += 1) {
        media.push(await upsertPlaceholderMedia(spec.art, ((index + i) % 4) + 1));
      }
    }

    const product = await db.product.upsert({
      where: { slug },
      update: {
        name: spec.name,
        categoryId,
        mrpPaise: rs(spec.mrp),
        pricePaise: rs(spec.price),
        salesCount: spec.salesCount ?? 0,
        isFeatured: spec.featured ?? false,
        publishedAt: new Date(Date.now() - index * 9 * 24 * 60 * 60 * 1000),
        careInstructions: PRODUCT_CARE_COPY,
        warrantyInfo: null,
        authenticityInfo: AUTHENTICITY_COPY,
        seoTitle: `${spec.name} — 925 Sterling Silver`,
        seoDescription: spec.short,
      },
      create: {
        name: spec.name,
        slug,
        sku,
        categoryId,
        shortDescription: spec.short,
        description: spec.description,
        tags: spec.tags,
        status: "ACTIVE",
        isFeatured: spec.featured ?? false,
        // Staggered ~9 days apart so only the first few fall inside the
        // 30-day "New" window. Publishing everything today would badge the
        // entire catalogue as new, which tells the customer nothing.
        publishedAt: new Date(Date.now() - index * 9 * 24 * 60 * 60 * 1000),
        mrpPaise: rs(spec.mrp),
        pricePaise: rs(spec.price),
        taxPercent: 3,
        silverPurity: spec.purity,
        silverWeightGram: spec.weight,
        dimensions: spec.dimensions,
        finish: spec.finish,
        plating: spec.plating,
        stoneType: spec.stoneType,
        stoneColour: spec.stoneColour,
        stoneCount: spec.stoneCount,
        occasion: spec.occasion,
        gender: spec.gender,
        isAdjustable: spec.adjustable ?? false,
        careInstructions: PRODUCT_CARE_COPY,
        warrantyInfo: null,
        authenticityInfo: AUTHENTICITY_COPY,
        whatsIncluded:
          "Jewellery piece, anti-tarnish pouch, polishing cloth, authenticity certificate, gift box.",
        salesCount: spec.salesCount ?? 0,
        seoTitle: `${spec.name} — 925 Silver`,
        seoDescription: spec.short,
        ogImageId: media[0].id,
      },
    });

    // --- Images ------------------------------------------------------------
    for (const [imgIndex, m] of media.entries()) {
      await db.productImage.upsert({
        where: { productId_mediaId: { productId: product.id, mediaId: m.id } },
        update: { position: imgIndex, isPrimary: imgIndex === 0 },
        create: {
          productId: product.id,
          mediaId: m.id,
          position: imgIndex,
          isPrimary: imgIndex === 0,
          alt: `${spec.name} — view ${imgIndex + 1}`,
        },
      });
    }

    // --- Variants ----------------------------------------------------------
    // Products without explicit variants still get one, so inventory and cart
    // logic never needs a special case for "simple" products.
    const variants: VariantSpec[] = spec.variants ?? [
      { title: "Standard", options: {}, stock: 15 },
    ];

    for (const [vIndex, v] of variants.entries()) {
      const variantSku = skuFor(
        spec.name,
        v.title === "Standard" ? "STD" : slugify(v.title).toUpperCase(),
      );
      await db.productVariant.upsert({
        where: { sku: variantSku },
        update: { stockQuantity: v.stock, pricePaise: rs(spec.price) },
        create: {
          productId: product.id,
          sku: variantSku,
          title: v.title,
          options: v.options,
          mrpPaise: rs(spec.mrp),
          pricePaise: rs(spec.price),
          silverWeightGram: spec.weight,
          stockQuantity: v.stock,
          lowStockThreshold: 3,
          position: vIndex,
          imageId: media[0].id,
        },
      });
    }

    // --- Collections -------------------------------------------------------
    for (const [cIndex, collectionSlug] of (spec.collections ?? []).entries()) {
      const collectionId = collectionIds.get(collectionSlug);
      if (!collectionId) continue;
      await db.productOnCollection.upsert({
        where: {
          productId_collectionId: { productId: product.id, collectionId },
        },
        update: { position: cIndex },
        create: { productId: product.id, collectionId, position: cIndex },
      });
    }

    // --- Product FAQs ------------------------------------------------------
    const faqs = [
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

    for (const [faqIndex, faq] of faqs.entries()) {
      const existingFaq = await db.productFaq.findFirst({
        where: { productId: product.id, question: faq.question },
      });
      if (existingFaq) {
        await db.productFaq.update({
          where: { id: existingFaq.id },
          data: { ...faq, position: faqIndex },
        });
      } else {
        await db.productFaq.create({
          data: { ...faq, productId: product.id, position: faqIndex },
        });
      }
    }

    count += 1;
  }

  console.log(`  ✓ ${count} products`);
}

async function seedCoupons() {
  const coupons = [
    {
      code: "WELCOME10",
      description: "10% off your first order",
      type: "PERCENTAGE" as const,
      value: 10,
      minOrderPaise: rs(1500),
      maxDiscountPaise: rs(500),
      perCustomerLimit: 1,
    },
    {
      code: "SILVER500",
      description: "₹500 off orders above ₹4,000",
      type: "FLAT" as const,
      value: rs(500),
      minOrderPaise: rs(4000),
      maxDiscountPaise: null,
      perCustomerLimit: 3,
    },
    {
      code: "FESTIVE15",
      description: "15% off during the festive season",
      type: "PERCENTAGE" as const,
      value: 15,
      minOrderPaise: rs(2500),
      maxDiscountPaise: rs(2000),
      perCustomerLimit: 2,
    },
  ];

  for (const c of coupons) {
    await db.coupon.upsert({
      where: { code: c.code },
      update: { description: c.description },
      create: { ...c, isActive: true },
    });
  }
  console.log(`  ✓ ${coupons.length} coupons`);
}

async function seedFaqs() {
  const faqs = [
    {
      category: "Authenticity",
      question: "Is Aastha jewellery real 925 sterling silver?",
      answer: AUTHENTICITY_COPY,
    },
    {
      category: "Authenticity",
      question: "What does the 925 hallmark mean?",
      answer:
        "The 925 stamp certifies the silver content as 92.5%. Pure silver is too soft to hold a setting or a clasp, so it is alloyed. You will find the stamp on the inner band of rings, on the clasp of chains, and on the post of earrings.",
    },
    {
      category: "Care",
      question: "How do I stop my silver from tarnishing?",
      answer: PRODUCT_CARE_COPY,
    },
    {
      category: "Care",
      question: "Can I clean oxidised jewellery the same way?",
      answer:
        "No — this is the one important exception. Oxidised pieces get their depth from a deliberately darkened finish, and chemical silver dips will strip it. Wipe oxidised jewellery with a dry soft cloth only.",
    },
    {
      category: "Shipping",
      question: "How long does delivery take?",
      answer: `${SHIPPING_COPY.dispatch} ${SHIPPING_COPY.delivery} ${PLATED_ITEMS_COPY}`,
    },
    {
      category: "Shipping",
      question: "Do you offer free shipping?",
      answer:
        "Shipping is complimentary on orders above ₹1,500. Below that a flat ₹79 applies.",
    },
    {
      category: "Returns",
      question: "What is your return policy?",
      answer: ORDER_POLICY_SUMMARY,
    },
    {
      category: "Returns",
      question: "Can I exchange a ring for a different size?",
      answer:
        "No. We do not accept exchanges, returns or refunds for sizing issues. Please review the size guide and product measurements carefully before ordering.",
    },
    {
      category: "Orders",
      question: "How do I track my order?",
      answer:
        "You will receive a WhatsApp message when your order is confirmed and again when it is dispatched. Order details are always available under My Account → Orders.",
    },
    {
      category: "Orders",
      question: "What payment methods do you accept?",
      answer:
        "UPI, credit and debit cards, net banking and popular wallets, all processed securely through Razorpay. We never see or store your card details.",
    },
  ];

  for (const [index, f] of faqs.entries()) {
    const existing = await db.faq.findFirst({
      where: { question: f.question },
    });
    if (existing) {
      await db.faq.update({
        where: { id: existing.id },
        data: { ...f, position: index },
      });
    } else {
      await db.faq.create({ data: { ...f, position: index, isActive: true } });
    }
  }
  console.log(`  ✓ ${faqs.length} FAQs`);
}

async function seedHomepage() {
  const existingCount = await db.homepageSection.count({
    where: { campaignId: null },
  });

  if (existingCount > 0) {
    console.log(
      `  ✓ ${existingCount} homepage sections (preserved existing CMS database configuration)`,
    );
    return;
  }

  const heroImage = await upsertHeroMedia("wide", 1);
  const heroImageMobile = await upsertHeroMedia("tall", 1);
  const heroImage2 = await upsertHeroMedia("wide", 2);
  const heroImage2Mobile = await upsertHeroMedia("tall", 2);
  const splitImage = await upsertPlaceholderMedia("bangle", 3);
  const promoImage = await upsertPlaceholderMedia("set", 4);

  const sections: Array<{
    type: SectionType;
    label: string;
    settings: Record<string, unknown>;
  }> = [
    {
      type: "HERO",
      label: "Homepage hero",
      settings: {
        height: "standard",
        autoplay: true,
        autoplayDelayMs: 7000,
        slides: [
          {
            desktopImage: {
              mediaId: heroImage.id,
              url: heroImage.secureUrl,
              alt: "A silver pendant lit against a deep green ground",
              width: 2400,
              height: 1200,
            },
            mobileImage: {
              mediaId: heroImageMobile.id,
              url: heroImageMobile.secureUrl,
              alt: "A silver pendant lit against a deep green ground",
              width: 1200,
              height: 1600,
            },
            eyebrow: "Hallmarked 925 Silver",
            heading: "Silver worth keeping",
            subheading:
              "Hallmarked 925 sterling silver, finished by hand and made to be worn — not stored away for an occasion that never comes.",
            primaryCta: { label: "Shop the collection", href: "/shop" },
            secondaryCta: {
              label: "The Bridal Edit",
              href: "/collections/bridal-edit",
            },
            align: "left",
            position: "middle",
            overlayOpacity: 30,
            theme: "dark",
          },
          {
            desktopImage: {
              mediaId: heroImage2.id,
              url: heroImage2.secureUrl,
              alt: "A silver bangle catching light against a dark ground",
              width: 2400,
              height: 1200,
            },
            mobileImage: {
              mediaId: heroImage2Mobile.id,
              url: heroImage2Mobile.secureUrl,
              alt: "A silver bangle catching light against a dark ground",
              width: 1200,
              height: 1600,
            },
            eyebrow: "Oxidised Heritage",
            heading: "Traditional forms, made properly",
            subheading:
              "Jhumkas raised from a single sheet. Ghungroos strung by hand. The old methods, because they still produce the better piece.",
            primaryCta: {
              label: "Explore oxidised silver",
              href: "/collections/oxidised-heritage",
            },
            align: "left",
            position: "middle",
            overlayOpacity: 34,
            theme: "dark",
          },
        ],
      },
    },
    {
      type: "CATEGORY_CAROUSEL",
      label: "Shop by category",
      settings: {
        eyebrow: "Browse",
        title: "Shop by category",
        description: "",
        categorySlugs: [],
        shape: "portrait",
      },
    },
    {
      type: "PRODUCT_CAROUSEL",
      label: "New arrivals",
      settings: {
        eyebrow: "Just in",
        title: "New arrivals",
        description: "The most recent additions to the workshop's output.",
        source: { mode: "new", limit: 8, productIds: [] },
        viewAll: { label: "View all", href: "/shop?sort=newest" },
      },
    },
    {
      type: "PROMO_BANNER",
      label: "Free shipping promo",
      settings: {
        eyebrow: "Complimentary shipping",
        heading: "Free delivery on orders above ₹1,500",
        subheading:
          "Every order ships with an anti-tarnish pouch, a polishing cloth and a stamped authenticity certificate.",
        style: "solid",
        theme: "dark",
        cta: { label: "Start shopping", href: "/shop" },
        image: {
          mediaId: promoImage.id,
          url: promoImage.secureUrl,
          alt: "",
          width: 1200,
          height: 1500,
        },
      },
    },
    {
      type: "PROMO_BANNER",
      label: "Trusted by 2000+ Customers",
      settings: {
        eyebrow: "TRUSTED & LOVED",
        heading: "Trusted by 2,000+ Customers Across India",
        subheading:
          "Join thousands of satisfied jewelry connoisseurs who trust Aastha Silver for hallmarked 925 sterling silver, timeless designs, and unmatched craftsmanship.",
        style: "solid",
        theme: "dark",
        cta: { label: "Explore Best Sellers", href: "/shop?sort=popular" },
      },
    },
    {
      type: "PRODUCT_CAROUSEL",
      label: "Best sellers",
      settings: {
        eyebrow: "Most loved",
        title: "Best sellers",
        description: "What customers keep coming back for.",
        source: { mode: "bestsellers", limit: 8, productIds: [] },
        viewAll: { label: "View all", href: "/shop?sort=popular" },
      },
    },
    {
      type: "SPLIT_IMAGE_TEXT",
      label: "Craftsmanship story",
      settings: {
        image: {
          mediaId: splitImage.id,
          url: splitImage.secureUrl,
          alt: "A hammered silver kada",
          width: 1200,
          height: 1500,
        },
        imageSide: "left",
        eyebrow: "Our legacy",
        heading: "The Story of Aastha Silver",
        body: HOMEPAGE_STORY_HTML,
        cta: { label: "Read our story", href: "/about" },
        stats: [
          { value: "40+ years", label: "Family legacy" },
          { value: "21", label: "Founder age" },
        ],
      },
    },
    {
      type: "RICH_TEXT",
      label: "Founder Speak",
      settings: {
        title: "Founder Speak",
        html: FOUNDER_SPEAK_HTML,
        width: "narrow",
      },
    },
    {
      type: "COLLECTION_CAROUSEL",
      label: "Shop by occasion",
      settings: {
        eyebrow: "Curated",
        title: "Shop by occasion",
        description: "Edits built around when you will actually wear it.",
        collectionSlugs: [],
      },
    },
    {
      type: "TRUST_BADGES",
      label: "Trust badges",
      settings: {
        theme: "light",
        items: HOMEPAGE_TRUST_BADGES.map((item) => ({ ...item })),
      },
    },
    {
      type: "REVIEWS",
      label: "Customer reviews",
      settings: {
        eyebrow: "In their words",
        title: "What customers say",
        description: "",
        limit: 6,
        onlyFeatured: true,
      },
    },
    {
      type: "FAQ",
      label: "Homepage FAQ",
      settings: {
        eyebrow: "Good to know",
        title: "Frequently asked questions",
        description: "",
        limit: 8,
      },
    },
    {
      type: "NEWSLETTER",
      label: "Newsletter signup",
      settings: {
        eyebrow: "Stay in touch",
        heading: "New pieces, first",
        subheading:
          "One email a month when a new collection leaves the workshop. Nothing else.",
        buttonLabel: "Subscribe",
        disclaimer: "Unsubscribe any time. We never share your address.",
      },
    },
  ];

  for (const [index, section] of sections.entries()) {
    await db.homepageSection.create({
      data: {
        type: section.type,
        label: section.label,
        position: index,
        isActive: true,
        settings: section.settings as never,
      },
    });
  }

  console.log(`  ✓ ${sections.length} homepage sections`);
}

async function seedCampaign() {
  // A Diwali campaign, pre-built and SCHEDULED. It demonstrates the automatic
  // takeover without altering today's storefront.
  const year = new Date().getFullYear();
  const startsAt = new Date(`${year}-10-25T00:00:00+05:30`);
  const endsAt = new Date(`${year}-11-05T23:59:59+05:30`);

  const campaign = await db.campaign.upsert({
    where: { slug: "diwali" },
    update: { startsAt, endsAt },
    create: {
      name: "Diwali Festive Edit",
      slug: "diwali",
      description:
        "Festive homepage takeover with a warmer accent, gifting-led hero and a 15% coupon.",
      status: "SCHEDULED",
      startsAt,
      endsAt,
      priority: 10,
      announcementText: "Diwali Edit is live · 15% off with FESTIVE15",
      announcementLink: "/collections/gifting-favourites",
      theme: {
        accent: "#855d26",
        accentHover: "#6e4c25",
        accentContrast: "#ffffff",
      },
      featuredCategoryIds: [],
      featuredProductIds: [],
    },
  });

  const existing = await db.homepageSection.count({
    where: { campaignId: campaign.id },
  });
  if (existing === 0) {
    const heroMedia = await upsertHeroMedia("wide", 3);
    await db.homepageSection.create({
      data: {
        campaignId: campaign.id,
        type: "HERO",
        label: "Diwali hero",
        position: 0,
        isActive: true,
        settings: {
          height: "standard",
          autoplay: false,
          autoplayDelayMs: 6000,
          slides: [
            {
              desktopImage: {
                mediaId: heroMedia.id,
                url: heroMedia.secureUrl,
                alt: "Silver jewellery set for Diwali gifting",
                width: 2400,
                height: 1200,
              },
              eyebrow: "Diwali Edit",
              heading: "Gift something that lasts",
              subheading:
                "Boxed silver, dispatched in 3–4 business days, with 15% off using FESTIVE15.",
              primaryCta: {
                label: "Shop gifting",
                href: "/collections/gifting-favourites",
              },
              align: "center",
              position: "middle",
              overlayOpacity: 42,
              theme: "dark",
            },
          ],
        } as never,
      },
    });

    await db.homepageSection.create({
      data: {
        campaignId: campaign.id,
        type: "PRODUCT_CAROUSEL",
        label: "Diwali picks",
        position: 1,
        isActive: true,
        settings: {
          eyebrow: "Festive",
          title: "Diwali picks",
          description: "",
          source: {
            mode: "collection",
            collectionSlug: "gifting-favourites",
            limit: 8,
            productIds: [],
          },
          viewAll: {
            label: "View all",
            href: "/collections/gifting-favourites",
          },
        } as never,
      },
    });
  }

  console.log("  ✓ Diwali campaign (scheduled)");
}

async function seedUsersAndReviews() {
  const bootstrapMobiles = (
    process.env.ADMIN_BOOTSTRAP_MOBILES || "919999999999"
  )
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean);

  for (const mobile of bootstrapMobiles) {
    await db.user.upsert({
      where: { mobile },
      update: { role: "SUPER_ADMIN" },
      create: {
        mobile,
        name: "Store Admin",
        role: "SUPER_ADMIN",
        mobileVerifiedAt: new Date(),
      },
    });
  }

  const demoCustomers = [
    { mobile: "919812345601", name: "Priya Sharma" },
    { mobile: "919812345602", name: "Ananya Iyer" },
    { mobile: "919812345603", name: "Ritu Malhotra" },
    { mobile: "919812345604", name: "Sneha Kulkarni" },
    { mobile: "919812345605", name: "Kavya Reddy" },
    { mobile: "919812345606", name: "Divya Nair" },
  ];

  const users = [];
  for (const c of demoCustomers) {
    users.push(
      await db.user.upsert({
        where: { mobile: c.mobile },
        update: {},
        create: { ...c, role: "CUSTOMER", mobileVerifiedAt: new Date() },
      }),
    );
  }

  const reviewSeeds = [
    {
      slug: slugify("Rukmini Temple Jhumka Earrings"),
      rating: 5,
      title: "Lighter than they look",
      body: "I wore these through an entire wedding — ceremony, photos, reception — and my ears were fine. I expected jhumkas this size to be painful by evening. The oxidised finish still looks exactly like the photos three months on.",
    },
    {
      slug: slugify("Ira Zircon Stud Earrings"),
      rating: 5,
      title: "The screw-backs make the difference",
      body: "I have lost so many studs to push-backs. These have not moved once. Bought a second pair for my sister.",
    },
    {
      slug: slugify("Anaya Floral Band Ring"),
      rating: 4,
      title: "Beautiful engraving, sizing runs slightly small",
      body: "The marigold detail is genuinely hand-done — you can see slight variation between the flowers, which I like. The size guide helped me choose the right fit before ordering.",
    },
    {
      slug: slugify("Payal Ghungroo Anklets"),
      rating: 5,
      title: "The sound is right",
      body: "My mother wore payals like these. Most versions sold now have flat-sounding machine bells. These actually ring properly.",
    },
    {
      slug: slugify("Nazar Evil Eye Pendant"),
      rating: 5,
      title: "Enamel is properly fired",
      body: "Bought one for each of my daughters. The blue has real depth to it, not a painted-on look. Arrived boxed and ready to give.",
    },
    {
      slug: slugify("Vaidehi Temple Necklace"),
      rating: 5,
      title: "Worth the price",
      body: "Expensive, and I hesitated. It sits properly against the neck instead of standing off the way cheaper collars do, and the detachable pendant means I actually wear part of it on ordinary days.",
    },
  ];

  let reviewCount = 0;
  for (const [index, r] of reviewSeeds.entries()) {
    const product = await db.product.findUnique({ where: { slug: r.slug } });
    if (!product) continue;
    const user = users[index % users.length];

    await db.review.upsert({
      where: { productId_userId: { productId: product.id, userId: user.id } },
      update: {},
      create: {
        productId: product.id,
        userId: user.id,
        rating: r.rating,
        title: r.title,
        body: r.body,
        status: "APPROVED",
        isFeatured: true,
        isVerified: true,
        moderatedAt: new Date(),
      },
    });
    reviewCount += 1;
  }

  // Recompute the denormalised rating columns from the approved reviews.
  const products = await db.product.findMany({ select: { id: true } });
  for (const p of products) {
    const agg = await db.review.aggregate({
      where: { productId: p.id, status: "APPROVED" },
      _avg: { rating: true },
      _count: true,
    });
    await db.product.update({
      where: { id: p.id },
      data: {
        ratingAverage: agg._avg.rating ?? 0,
        ratingCount: agg._count,
      },
    });
  }

  console.log(
    `  ✓ ${bootstrapMobiles.length} admin(s), ${users.length} customers, ${reviewCount} reviews`,
  );
}

async function main() {
  console.log("\nSeeding Aastha Silver & Jewels…\n");

  await seedSettings();
  const categoryIds = await seedCategories();
  const collectionIds = await seedCollections();
  await seedProducts(categoryIds, collectionIds);
  await seedCoupons();
  await seedFaqs();
  await seedHomepage();
  await seedCampaign();
  await seedUsersAndReviews();

  console.log("\nDone.\n");
}

main()
  .catch((error) => {
    console.error("\nSeed failed:\n", error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
