import "server-only";

import { HeroSection } from "@/components/sections/hero";
import {
  CtaSection,
  CustomHtmlSection,
  FaqSection,
  ImageBannerSection,
  NewsletterSection,
  ProductCarouselSection,
  ProductGridSection,
  PromoBannerSection,
  ReviewsSection,
  RichTextSection,
  SplitImageTextSection,
  TestimonialsSection,
  TileCarouselSection,
  TrustBadgesSection,
  VideoHeroSection,
} from "@/components/sections/blocks";
import { db } from "@/lib/db";
import type { ParsedSection, SectionSettings } from "@/lib/cms/sections";
import {
  getActiveFaqs,
  getBestSellers,
  getCategoryTree,
  getCollections,
  getFeaturedProducts,
  getNewArrivals,
  getProductsByCategory,
  getProductsByCollection,
  getProductsByIds,
  type ProductCardData,
} from "@/server/catalog";

/**
 * Renders a CMS section.
 *
 * Each section fetches its own data. That is intentional: sections are
 * independent, so a homepage with three product rows issues three small
 * queries in parallel rather than one query that has to know about every
 * section type. React's request-level cache dedupes the shared lookups
 * (categories, collections) across sections.
 */

async function resolveProducts(
  source: SectionSettings["PRODUCT_CAROUSEL"]["source"],
): Promise<ProductCardData[]> {
  switch (source.mode) {
    case "bestsellers":
      if (source.productIds && source.productIds.length > 0) {
        const manual = await getProductsByIds(source.productIds.slice(0, source.limit));
        if (manual.length >= source.limit) return manual;
        const auto = await getBestSellers(source.limit);
        const manualSet = new Set(manual.map((m) => m.id));
        return [...manual, ...auto.filter((a) => !manualSet.has(a.id))].slice(0, source.limit);
      }
      return getBestSellers(source.limit);
    case "featured":
      return getFeaturedProducts(source.limit);
    case "category":
      return source.categorySlug
        ? getProductsByCategory(source.categorySlug, source.limit)
        : [];
    case "collection":
      return source.collectionSlug
        ? getProductsByCollection(source.collectionSlug, source.limit)
        : [];
    case "manual":
      return getProductsByIds(source.productIds.slice(0, source.limit));
    case "new":
    default:
      return getNewArrivals(source.limit);
  }
}

export async function RenderSection({ section }: { section: ParsedSection }) {
  switch (section.type) {
    case "HERO":
      return <HeroSection settings={section.settings} />;

    case "VIDEO_HERO":
      return <VideoHeroSection settings={section.settings} />;

    case "IMAGE_BANNER":
      return <ImageBannerSection settings={section.settings} />;

    case "PRODUCT_CAROUSEL": {
      const products = await resolveProducts(section.settings.source);
      return (
        <ProductCarouselSection settings={section.settings} products={products} />
      );
    }

    case "PRODUCT_GRID": {
      const products = await resolveProducts(section.settings.source);
      return <ProductGridSection settings={section.settings} products={products} />;
    }

    case "CATEGORY_CAROUSEL": {
      const tree = await getCategoryTree();
      const selected = section.settings.categorySlugs.length
        ? section.settings.categorySlugs
            .map((slug) => tree.find((c) => c.slug === slug))
            .filter((c): c is (typeof tree)[number] => Boolean(c))
        : tree.filter((c) => c.isFeatured);

      return (
        <TileCarouselSection
          eyebrow={section.settings.eyebrow || undefined}
          title={section.settings.title}
          description={section.settings.description || undefined}
          shape={section.settings.shape}
          tiles={selected.map((c) => ({
            name: c.name,
            slug: c.slug,
            href: `/category/${c.slug}`,
            imageUrl: c.image?.secureUrl ?? null,
          }))}
        />
      );
    }

    case "COLLECTION_CAROUSEL": {
      const all = await getCollections(
        section.settings.collectionSlugs.length === 0,
      );
      const selected = section.settings.collectionSlugs.length
        ? section.settings.collectionSlugs
            .map((slug) => all.find((c) => c.slug === slug))
            .filter((c): c is (typeof all)[number] => Boolean(c))
        : all;

      return (
        <TileCarouselSection
          eyebrow={section.settings.eyebrow || undefined}
          title={section.settings.title}
          description={section.settings.description || undefined}
          shape="portrait"
          tiles={selected.map((c) => ({
            name: c.name,
            slug: c.slug,
            href: `/collections/${c.slug}`,
            imageUrl: c.image?.secureUrl ?? null,
            count: c._count.products,
          }))}
        />
      );
    }

    case "PROMO_BANNER":
      return <PromoBannerSection settings={section.settings} />;

    case "SPLIT_IMAGE_TEXT":
      return <SplitImageTextSection settings={section.settings} />;

    case "TESTIMONIALS":
      return <TestimonialsSection settings={section.settings} />;

    case "REVIEWS": {
      const reviews = await db.review.findMany({
        where: {
          status: "APPROVED",
          ...(section.settings.onlyFeatured ? { isFeatured: true } : {}),
        },
        orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
        take: section.settings.limit,
        select: {
          id: true,
          rating: true,
          title: true,
          body: true,
          isVerified: true,
          user: { select: { name: true } },
          product: { select: { name: true, slug: true } },
        },
      });

      return (
        <ReviewsSection
          eyebrow={section.settings.eyebrow || undefined}
          title={section.settings.title}
          description={section.settings.description || undefined}
          reviews={reviews.map((r) => ({
            id: r.id,
            rating: r.rating,
            title: r.title,
            body: r.body,
            // Reviewers are shown by first name only — a full name plus a
            // purchase history is more personal data than a homepage needs.
            authorName: r.user.name?.split(" ")[0] ?? "Verified customer",
            isVerified: r.isVerified,
            productName: r.product.name,
            productSlug: r.product.slug,
          }))}
        />
      );
    }

    case "FAQ": {
      const faqs = await getActiveFaqs(
        section.settings.faqCategory,
        section.settings.limit,
      );
      return (
        <FaqSection
          eyebrow={section.settings.eyebrow || undefined}
          title={section.settings.title}
          description={section.settings.description || undefined}
          faqs={faqs.map((f) => ({
            id: f.id,
            question: f.question,
            answer: f.answer,
          }))}
        />
      );
    }

    case "RICH_TEXT":
      return <RichTextSection settings={section.settings} />;

    case "CTA":
      return <CtaSection settings={section.settings} />;

    case "NEWSLETTER":
      return <NewsletterSection settings={section.settings} />;

    case "TRUST_BADGES":
      return <TrustBadgesSection settings={section.settings} />;

    case "CUSTOM_HTML":
      return <CustomHtmlSection settings={section.settings} />;

    default: {
      // Exhaustiveness check: adding a SectionType without a case here is a
      // compile error, not a silently blank homepage.
      const _never: never = section;
      void _never;
      return null;
    }
  }
}
