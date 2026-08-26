import "server-only";

import { cache } from "react";

import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import type { Gender } from "@/generated/prisma/enums";

/**
 * Read-side catalogue queries.
 *
 * Every storefront page goes through this module rather than touching `db`
 * directly, so the shape a product card needs is defined once. `cache()` wraps
 * the per-request-stable lookups: React dedupes repeat calls within a single
 * render pass, which matters because the header, breadcrumbs and JSON-LD all
 * ask for the same category tree.
 */

/* -----------------------------------------------------------------------------
 * Selections
 * -------------------------------------------------------------------------- */

const productCardSelect = {
  id: true,
  slug: true,
  name: true,
  shortDescription: true,
  pricePaise: true,
  mrpPaise: true,
  ratingAverage: true,
  ratingCount: true,
  salesCount: true,
  publishedAt: true,
  isFeatured: true,
  silverPurity: true,
  category: { select: { name: true, slug: true } },
  images: {
    orderBy: { position: "asc" },
    take: 2,
    select: {
      alt: true,
      media: { select: { secureUrl: true, blurDataUrl: true } },
    },
  },
  variants: {
    where: { isActive: true },
    select: {
      id: true,
      stockQuantity: true,
      reservedQuantity: true,
      trackInventory: true,
      lowStockThreshold: true,
    },
  },
} satisfies Prisma.ProductSelect;

type ProductCardRow = Prisma.ProductGetPayload<{
  select: typeof productCardSelect;
}>;

export type ProductCardData = {
  id: string;
  slug: string;
  name: string;
  shortDescription: string | null;
  pricePaise: number;
  mrpPaise: number;
  ratingAverage: number;
  ratingCount: number;
  categoryName: string;
  categorySlug: string;
  silverPurity: string | null;
  image: { url: string; alt: string; blurDataUrl: string | null } | null;
  hoverImage: { url: string; alt: string } | null;
  inStock: boolean;
  isLowStock: boolean;
  isNew: boolean;
};

/** Products published within this window carry a "New" flag. */
const NEW_FOR_DAYS = 30;

export function toProductCard(row: ProductCardRow): ProductCardData {
  const available = row.variants.reduce(
    (total, v) =>
      total +
      (v.trackInventory
        ? Math.max(0, v.stockQuantity - v.reservedQuantity)
        : Number.MAX_SAFE_INTEGER),
    0,
  );

  const lowThreshold = Math.max(
    ...row.variants.map((v) => v.lowStockThreshold),
    0,
  );

  const [primary, secondary] = row.images;

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    shortDescription: row.shortDescription,
    pricePaise: row.pricePaise,
    mrpPaise: row.mrpPaise,
    ratingAverage: row.ratingAverage,
    ratingCount: row.ratingCount,
    categoryName: row.category.name,
    categorySlug: row.category.slug,
    silverPurity: row.silverPurity,
    image: primary
      ? {
          url: primary.media.secureUrl,
          alt: primary.alt || row.name,
          blurDataUrl: primary.media.blurDataUrl,
        }
      : null,
    hoverImage: secondary
      ? { url: secondary.media.secureUrl, alt: secondary.alt || row.name }
      : null,
    inStock: available > 0,
    isLowStock: available > 0 && available <= lowThreshold,
    isNew: row.publishedAt
      ? Date.now() - row.publishedAt.getTime() <
        NEW_FOR_DAYS * 24 * 60 * 60 * 1000
      : false,
  };
}

/* -----------------------------------------------------------------------------
 * Listing
 * -------------------------------------------------------------------------- */

export type SortKey =
  | "relevance"
  | "newest"
  | "price-asc"
  | "price-desc"
  | "popular"
  | "rating";

export const SORT_OPTIONS: Array<{ value: SortKey; label: string }> = [
  { value: "relevance", label: "Relevance" },
  { value: "newest", label: "Newest first" },
  { value: "popular", label: "Most popular" },
  { value: "rating", label: "Highest rated" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
];

export type CatalogFilters = {
  categorySlugs?: string[];
  collectionSlug?: string;
  minPricePaise?: number;
  maxPricePaise?: number;
  purities?: string[];
  genders?: Gender[];
  occasions?: string[];
  stoneTypes?: string[];
  tags?: string[];
  inStockOnly?: boolean;
  query?: string;
};

function orderByFor(sort: SortKey): Prisma.ProductOrderByWithRelationInput[] {
  switch (sort) {
    case "newest":
      return [{ publishedAt: "desc" }, { createdAt: "desc" }];
    case "price-asc":
      return [{ pricePaise: "asc" }];
    case "price-desc":
      return [{ pricePaise: "desc" }];
    case "popular":
      return [{ salesCount: "desc" }, { ratingCount: "desc" }];
    case "rating":
      return [{ ratingAverage: "desc" }, { ratingCount: "desc" }];
    case "relevance":
    default:
      // Without a search engine, "relevance" is a merchandising order:
      // featured first, then what actually sells.
      return [
        { isFeatured: "desc" },
        { salesCount: "desc" },
        { publishedAt: "desc" },
      ];
  }
}

export async function buildProductWhere(
  filters: CatalogFilters,
): Promise<Prisma.ProductWhereInput> {
  const where: Prisma.ProductWhereInput = { status: "ACTIVE" };
  const and: Prisma.ProductWhereInput[] = [];

  if (filters.categorySlugs?.length) {
    // Include descendants so selecting category also returns child items.
    const roots = await db.category.findMany({
      where: { slug: { in: filters.categorySlugs } },
      select: { id: true },
    });
    const children = await db.category.findMany({
      where: { parentId: { in: roots.map((r) => r.id) } },
      select: { id: true },
    });
    and.push({
      categoryId: { in: [...roots, ...children].map((c) => c.id) },
    });
  }

  if (filters.collectionSlug) {
    and.push({
      collections: { some: { collection: { slug: filters.collectionSlug } } },
    });
  }

  if (filters.minPricePaise != null || filters.maxPricePaise != null) {
    and.push({
      pricePaise: {
        ...(filters.minPricePaise != null ? { gte: filters.minPricePaise } : {}),
        ...(filters.maxPricePaise != null ? { lte: filters.maxPricePaise } : {}),
      },
    });
  }

  if (filters.purities?.length) {
    and.push({ silverPurity: { in: filters.purities } });
  }
  if (filters.genders?.length) {
    and.push({ gender: { in: filters.genders } });
  }
  if (filters.occasions?.length) {
    and.push({ occasion: { hasSome: filters.occasions } });
  }
  if (filters.stoneTypes?.length) {
    and.push({ stoneType: { in: filters.stoneTypes } });
  }
  if (filters.tags?.length) {
    and.push({ tags: { hasSome: filters.tags } });
  }

  if (filters.inStockOnly) {
    and.push({ variants: { some: { isActive: true, stockQuantity: { gt: 0 } } } });
  }

  if (filters.query?.trim()) {
    const q = filters.query.trim();
    and.push({
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { shortDescription: { contains: q, mode: "insensitive" } },
        { sku: { contains: q, mode: "insensitive" } },
        { brand: { contains: q, mode: "insensitive" } },
        { tags: { has: q.toLowerCase() } },
        { category: { name: { contains: q, mode: "insensitive" } } },
        { stoneType: { contains: q, mode: "insensitive" } },
        { silverPurity: { contains: q, mode: "insensitive" } },
      ],
    });
  }

  if (and.length) where.AND = and;
  return where;
}

export async function listProducts({
  filters = {},
  sort = "relevance",
  page = 1,
  perPage = 24,
}: {
  filters?: CatalogFilters;
  sort?: SortKey;
  page?: number;
  perPage?: number;
}) {
  const where = await buildProductWhere(filters);

  const [rows, total] = await Promise.all([
    db.product.findMany({
      where,
      select: productCardSelect,
      orderBy: orderByFor(sort),
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    db.product.count({ where }),
  ]);

  return {
    products: rows.map(toProductCard),
    total,
    page,
    perPage,
    pageCount: Math.max(1, Math.ceil(total / perPage)),
  };
}

/**
 * Facet values available for the current result set, with counts.
 * Computed from the filtered set so a filter never offers a dead end.
 */
export async function getFacets(filters: CatalogFilters) {
  const where = await buildProductWhere(filters);

  const rows = await db.product.findMany({
    where,
    select: {
      silverPurity: true,
      gender: true,
      occasion: true,
      stoneType: true,
      pricePaise: true,
      category: { select: { name: true, slug: true } },
    },
  });

  const tally = <T extends string>(values: (T | null | undefined)[]) => {
    const map = new Map<T, number>();
    for (const v of values) {
      if (!v) continue;
      map.set(v, (map.get(v) ?? 0) + 1);
    }
    return [...map.entries()]
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
  };

  const prices = rows.map((r) => r.pricePaise);

  return {
    categories: tally(rows.map((r) => r.category.slug)).map((entry) => ({
      ...entry,
      label:
        rows.find((r) => r.category.slug === entry.value)?.category.name ??
        entry.value,
    })),
    purities: tally(rows.map((r) => r.silverPurity)),
    genders: tally(rows.map((r) => r.gender)),
    occasions: tally(rows.flatMap((r) => r.occasion)),
    stoneTypes: tally(rows.map((r) => r.stoneType)),
    priceRange: {
      min: prices.length ? Math.min(...prices) : 0,
      max: prices.length ? Math.max(...prices) : 0,
    },
    total: rows.length,
  };
}

/* -----------------------------------------------------------------------------
 * Merchandising shortcuts — used by the homepage section renderers.
 * -------------------------------------------------------------------------- */

export async function getNewArrivals(limit = 8) {
  const rows = await db.product.findMany({
    where: { status: "ACTIVE" },
    select: productCardSelect,
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    take: limit,
  });
  return rows.map(toProductCard);
}

export async function getBestSellers(limit = 8) {
  const pinnedSetting = await getSetting("bestsellers").catch(() => null);
  const pinnedIds: string[] =
    pinnedSetting && Array.isArray((pinnedSetting as any).productIds)
      ? (pinnedSetting as any).productIds
      : [];

  if (pinnedIds.length > 0) {
    const pinned = await getProductsByIds(pinnedIds.slice(0, limit));
    if (pinned.length >= limit) return pinned;
    const pinnedSet = new Set(pinned.map((p) => p.id));
    const automaticRows = await db.product.findMany({
      where: { status: "ACTIVE", id: { notIn: Array.from(pinnedSet) } },
      select: productCardSelect,
      orderBy: [{ salesCount: "desc" }, { ratingCount: "desc" }],
      take: limit - pinned.length,
    });
    return [...pinned, ...automaticRows.map(toProductCard)];
  }

  const rows = await db.product.findMany({
    where: { status: "ACTIVE" },
    select: productCardSelect,
    orderBy: [{ salesCount: "desc" }, { ratingCount: "desc" }],
    take: limit,
  });
  return rows.map(toProductCard);
}

export async function getFeaturedProducts(limit = 8) {
  const rows = await db.product.findMany({
    where: { status: "ACTIVE", isFeatured: true },
    select: productCardSelect,
    orderBy: [{ salesCount: "desc" }],
    take: limit,
  });
  return rows.map(toProductCard);
}

export async function getProductsByIds(ids: string[]) {
  if (!ids.length) return [];
  const rows = await db.product.findMany({
    where: { id: { in: ids }, status: "ACTIVE" },
    select: productCardSelect,
  });
  // Preserve the admin's hand-picked order.
  const byId = new Map(rows.map((r) => [r.id, r]));
  return ids
    .map((id) => byId.get(id))
    .filter((r): r is ProductCardRow => Boolean(r))
    .map(toProductCard);
}

export async function getProductsByCategory(slug: string, limit = 8) {
  const rows = await db.product.findMany({
    where: { status: "ACTIVE", category: { slug } },
    select: productCardSelect,
    orderBy: [{ salesCount: "desc" }],
    take: limit,
  });
  return rows.map(toProductCard);
}

export async function getProductsByCollection(slug: string, limit = 8) {
  const rows = await db.product.findMany({
    where: {
      status: "ACTIVE",
      collections: { some: { collection: { slug } } },
    },
    select: productCardSelect,
    orderBy: [{ salesCount: "desc" }],
    take: limit,
  });
  return rows.map(toProductCard);
}

/**
 * Related products: same category first, topped up with the same collection so
 * a thin category still fills the row.
 */
export async function getRelatedProducts(
  productId: string,
  categoryId: string,
  limit = 8,
) {
  const sameCategory = await db.product.findMany({
    where: { status: "ACTIVE", categoryId, id: { not: productId } },
    select: productCardSelect,
    orderBy: [{ salesCount: "desc" }],
    take: limit,
  });

  if (sameCategory.length >= limit) return sameCategory.map(toProductCard);

  const topUp = await db.product.findMany({
    where: {
      status: "ACTIVE",
      id: { notIn: [productId, ...sameCategory.map((p) => p.id)] },
      collections: {
        some: { collection: { products: { some: { productId } } } },
      },
    },
    select: productCardSelect,
    orderBy: [{ salesCount: "desc" }],
    take: limit - sameCategory.length,
  });

  return [...sameCategory, ...topUp].map(toProductCard);
}

/* -----------------------------------------------------------------------------
 * Single records
 * -------------------------------------------------------------------------- */

export const getProductBySlug = cache(async (slug: string) => {
  return db.product.findFirst({
    where: { slug, status: "ACTIVE" },
    include: {
      category: { select: { id: true, name: true, slug: true, parentId: true } },
      images: {
        orderBy: { position: "asc" },
        include: { media: true },
      },
      variants: {
        where: { isActive: true },
        orderBy: { position: "asc" },
        include: { image: true },
      },
      collections: { include: { collection: true } },
      faqs: { orderBy: { position: "asc" } },
      ogImage: true,
      reviews: {
        where: { status: "APPROVED" },
        orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
        take: 12,
        include: { user: { select: { name: true } } },
      },
    },
  });
});

export type ProductDetail = NonNullable<
  Awaited<ReturnType<typeof getProductBySlug>>
>;

export const getCategoryTree = cache(async () => {
  const categories = await db.category.findMany({
    where: { isActive: true },
    orderBy: [{ position: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      parentId: true,
      isFeatured: true,
      description: true,
      image: { select: { secureUrl: true } },
    },
  });

  const roots = categories.filter((c) => !c.parentId);
  return roots.map((root) => ({
    ...root,
    children: categories.filter((c) => c.parentId === root.id),
  }));
});

export type CategoryNode = Awaited<ReturnType<typeof getCategoryTree>>[number];

export const getCategoryBySlug = cache(async (slug: string) => {
  return db.category.findFirst({
    where: { slug, isActive: true },
    include: {
      image: true,
      parent: { select: { name: true, slug: true } },
      children: {
        where: { isActive: true },
        orderBy: { position: "asc" },
        select: { name: true, slug: true },
      },
    },
  });
});

export const getCollections = cache(async (onlyFeatured = false) => {
  return db.collection.findMany({
    where: { isActive: true, ...(onlyFeatured ? { isFeatured: true } : {}) },
    orderBy: [{ position: "asc" }, { name: "asc" }],
    include: { image: { select: { secureUrl: true } }, _count: { select: { products: true } } },
  });
});

export const getCollectionBySlug = cache(async (slug: string) => {
  return db.collection.findFirst({
    where: { slug, isActive: true },
    include: { image: true },
  });
});

/* -----------------------------------------------------------------------------
 * Search suggestions — powers the header's type-ahead.
 * -------------------------------------------------------------------------- */

export async function getSearchSuggestions(query: string, limit = 6) {
  const q = query.trim();
  if (q.length < 2) {
    return { products: [], categories: [], collections: [] };
  }

  const [products, categories, collections] = await Promise.all([
    db.product.findMany({
      where: {
        status: "ACTIVE",
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { tags: { has: q.toLowerCase() } },
          { sku: { contains: q, mode: "insensitive" } },
        ],
      },
      select: {
        slug: true,
        name: true,
        pricePaise: true,
        images: {
          orderBy: { position: "asc" },
          take: 1,
          select: { alt: true, media: { select: { secureUrl: true } } },
        },
      },
      orderBy: [{ salesCount: "desc" }],
      take: limit,
    }),
    db.category.findMany({
      where: { isActive: true, name: { contains: q, mode: "insensitive" } },
      select: { name: true, slug: true },
      take: 4,
    }),
    db.collection.findMany({
      where: { isActive: true, name: { contains: q, mode: "insensitive" } },
      select: { name: true, slug: true },
      take: 3,
    }),
  ]);

  return {
    products: products.map((p) => ({
      slug: p.slug,
      name: p.name,
      pricePaise: p.pricePaise,
      image: p.images[0]
        ? { url: p.images[0].media.secureUrl, alt: p.images[0].alt || p.name }
        : null,
    })),
    categories,
    collections,
  };
}

/* -----------------------------------------------------------------------------
 * Site settings
 * -------------------------------------------------------------------------- */

export type ContactSettings = {
  email: string;
  phone: string;
  whatsapp: string;
  addressLines: string[];
  city: string;
  state: string;
  hours: string;
};

export type ShippingSettings = {
  freeAbovePaise: number;
  flatRatePaise: number;
  dispatchCopy: string;
  deliveryCopy: string;
};

export type AnnouncementSettings = {
  enabled: boolean;
  text: string;
  href?: string;
};

export type SocialSettings = {
  instagram?: string;
  facebook?: string;
  youtube?: string;
};

/**
 * Editable brand copy.
 *
 * Everything here is a claim about the business — where it is based, who makes
 * the jewellery, how fast it ships. None of it can be invented on the owner's
 * behalf: a wrong dispatch promise is a consumer-law problem, and a wrong
 * address is worse. Defaults are deliberately generic and true of any
 * hallmarked-silver seller; the owner replaces them in Settings.
 */
export type BrandSettings = {
  /** One-line footer tagline. */
  tagline: string;
  /** Locality for schema.org and the "made in" line. Blank = omit entirely. */
  city: string;
  state: string;
};

export type BestSellersSettings = {
  productIds: string[];
};

export type ComboSettings = {
  enabled: boolean;
};

type SettingMap = {
  contact: ContactSettings;
  shipping: ShippingSettings;
  announcement: AnnouncementSettings;
  social: SocialSettings;
  brand: BrandSettings;
  bestsellers: BestSellersSettings;
  combos: ComboSettings;
};

// Annotated with SettingMap rather than `satisfies` on each entry: `satisfies`
// would narrow `enabled: false` to the literal `false` and drop optional keys
// that the defaults omit, so callers could not read `announcement.href`.
const SETTING_DEFAULTS: SettingMap = {
  contact: {
    email: "aasthasilverandjewels@gmail.com",
    phone: "+91 9116662871",
    whatsapp: "919116662871",
    addressLines: [],
    city: "",
    state: "",
    hours: "",
  },
  shipping: {
    freeAbovePaise: 0,
    flatRatePaise: 0,
    dispatchCopy: "",
    deliveryCopy: "",
  },
  announcement: { enabled: false, text: "" },
  social: {},
  brand: {
    tagline: "Hallmarked 925 sterling silver jewellery.",
    city: "",
    state: "",
  },
  bestsellers: { productIds: [] },
  combos: { enabled: true },
};

/**
 * Reads a typed setting, falling back to a safe default when the row is absent
 * or malformed. Settings must never be able to break a page render.
 */
export const getSetting = cache(
  async <K extends keyof SettingMap>(key: K): Promise<SettingMap[K]> => {
    try {
      const row = await db.setting.findUnique({ where: { key } });
      if (!row || typeof row.value !== "object" || row.value === null) {
        return SETTING_DEFAULTS[key];
      }
      return {
        ...SETTING_DEFAULTS[key],
        ...(row.value as object),
      } as SettingMap[K];
    } catch (error) {
      return SETTING_DEFAULTS[key];
    }
  },
);

export const getActiveFaqs = cache(async (category?: string, limit = 20) => {
  return db.faq.findMany({
    where: { isActive: true, ...(category ? { category } : {}) },
    orderBy: [{ position: "asc" }],
    take: limit,
  });
});
