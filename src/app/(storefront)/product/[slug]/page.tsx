import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeCheck, CircleOff, Sparkles, Truck } from "lucide-react";

import { Carousel } from "@/components/storefront/carousel";
import { FaqAccordion } from "@/components/storefront/faq-accordion";
import { Breadcrumbs } from "@/components/storefront/page-header";
import { ProductCard } from "@/components/storefront/product-card";
import { ProductGallery } from "@/components/storefront/product-gallery";
import { ProductViewTracker } from "@/components/storefront/product-view-tracker";
import { PurchasePanel } from "@/components/storefront/purchase-panel";
import { RecentlyViewed } from "@/components/storefront/recently-viewed";
import { SpecTable } from "@/components/storefront/spec-table";
import { WishlistButton } from "@/components/storefront/wishlist-button";
import { Rating, SectionHeading } from "@/components/ui/primitives";
import { ORDER_POLICY_SUMMARY, PLATED_ITEMS_COPY } from "@/content/brand";
import { db } from "@/lib/db";
import { sanitizeRichText, toPlainText } from "@/lib/cms/sanitize";
import { publicEnv } from "@/lib/env";
import {
  JsonLd,
  breadcrumbJsonLd,
  faqJsonLd,
  productJsonLd,
} from "@/lib/seo/json-ld";
import { formatDate } from "@/lib/utils";
import {
  getProductBySlug,
  getRelatedProducts,
  getSetting,
} from "@/server/catalog";
import { getCombosForProduct } from "@/server/combos";
import { ProductComboBanner } from "@/components/storefront/product-combo-banner";

type Props = { params: Promise<{ slug: string }> };

/** Pre-render the best sellers; the long tail renders on demand and is cached. */
export async function generateStaticParams() {
  try {
    const products = await db.product.findMany({
      where: { status: "ACTIVE" },
      orderBy: { salesCount: "desc" },
      take: 5,
      select: { slug: true },
    });
    return products.map((p) => ({ slug: p.slug }));
  } catch (error) {
    console.warn("[build] generateStaticParams failed for products, deferring to dynamic rendering:", error);
    return [];
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const { slug } = await params;
    const product = await getProductBySlug(slug);
    if (!product) return { title: "Product not found" };

    const description =
      product.seoDescription ||
      product.shortDescription ||
      toPlainText(product.description ?? "").slice(0, 155);

    const image =
      product.ogImage?.secureUrl ?? product.images[0]?.media.secureUrl;

    return {
      title: product.seoTitle ?? product.name,
      description,
      alternates: {
        canonical: product.canonicalUrl ?? `/product/${product.slug}`,
      },
      openGraph: {
        type: "website",
        title: product.ogTitle ?? product.seoTitle ?? product.name,
        description: product.ogDescription ?? description,
        url: `${publicEnv.siteUrl}/product/${product.slug}`,
        ...(image ? { images: [{ url: image }] } : {}),
      },
      twitter: {
        card: "summary_large_image",
        title: product.ogTitle ?? product.name,
        description: product.ogDescription ?? description,
        ...(image ? { images: [image] } : {}),
      },
    };
  } catch (error) {
    return { title: "Product | Aastha Silver & Jewels" };
  }
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;

  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const [related, shipping, productCombos] = await Promise.all([
    getRelatedProducts(product.id, product.category.id, 8),
    getSetting("shipping"),
    getCombosForProduct(product.id),
  ]);

  const images = product.images.map((image) => ({
    url: image.media.secureUrl,
    alt: image.alt || product.name,
    blurDataUrl: image.media.blurDataUrl,
  }));

  const variants = product.variants.map((variant) => {
    const available = variant.trackInventory
      ? Math.max(0, variant.stockQuantity - variant.reservedQuantity)
      : 99;
    return {
      id: variant.id,
      title: variant.title,
      options: (variant.options ?? {}) as Record<string, string>,
      pricePaise: variant.pricePaise,
      mrpPaise: variant.mrpPaise,
      available,
      isLowStock: available > 0 && available <= variant.lowStockThreshold,
    };
  });

  const inStock = variants.some((v) => v.available > 0);

  const crumbs = [
    { name: "Home", href: "/" },
    { name: "All Jewellery", href: "/shop" },
    { name: product.category.name, href: `/category/${product.category.slug}` },
    { name: product.name, href: `/product/${product.slug}` },
  ];

  const productFaqs = product.faqs.map((f) => ({
    id: f.id,
    question: f.question,
    answer: f.answer,
  }));

  return (
    <>
      <JsonLd
        data={[
          productJsonLd({
            name: product.name,
            description:
              product.shortDescription ??
              toPlainText(product.description ?? "").slice(0, 300),
            sku: product.sku,
            slug: product.slug,
            brand: product.brand,
            images: images.map((i) => i.url),
            pricePaise: product.pricePaise,
            inStock,
            ratingAverage: product.ratingAverage,
            ratingCount: product.ratingCount,
            silverPurity: product.silverPurity,
            silverWeightGram: product.silverWeightGram,
            category: product.category.name,
          }),
          breadcrumbJsonLd(crumbs),
          ...(faqJsonLd(productFaqs) ? [faqJsonLd(productFaqs)!] : []),
        ]}
      />

      <ProductViewTracker
        product={{
          productId: product.id,
          productName: product.name,
          categoryName: product.category.name,
          pricePaise: product.pricePaise,
          slug: product.slug,
        }}
      />

      <div className="u-container pt-6">
        <Breadcrumbs crumbs={crumbs} />
      </div>

      {/* ---------------- Buy box ---------------- */}
      <div className="u-container pb-16">
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
          <div className="min-w-0">
            <ProductGallery images={images} productName={product.name} />
          </div>

          <div className="min-w-0 space-y-7">
            <div className="space-y-3">
              <Link
                href={`/category/${product.category.slug}`}
                className="u-eyebrow text-content-subtle transition-colors hover:text-[var(--color-accent)]"
              >
                {product.category.name}
              </Link>

              <h1 className="text-display-sm md:text-display-md">
                {product.name}
              </h1>

              {product.ratingCount > 0 ? (
                <a
                  href="#reviews"
                  className="inline-flex items-center gap-2 text-sm text-content-muted hover:text-[var(--color-accent)]"
                >
                  <Rating
                    value={product.ratingAverage}
                    count={product.ratingCount}
                  />
                  <span className="underline underline-offset-4">
                    Read reviews
                  </span>
                </a>
              ) : null}

              {product.shortDescription ? (
                <p className="text-sm leading-relaxed text-content-muted">
                  {product.shortDescription}
                </p>
              ) : null}
            </div>

            <PurchasePanel
              productId={product.id}
              productName={product.name}
              categoryName={product.category.name}
              variants={variants}
              freeShippingAbovePaise={shipping.freeAbovePaise}
              dispatchCopy={shipping.dispatchCopy}
            />

            {/* Resolves its own saved state after hydration — reading the
                session here would make every product page dynamic. */}
            <WishlistButton productId={product.id} productSlug={product.slug} />

            {/* Trust strip ------------------------------------------------- */}
            <ul className="grid grid-cols-2 gap-4 border-y border-line py-5">
              {[
                {
                  icon: BadgeCheck,
                  label: "Guaranteed genuine 925 sterling silver",
                },
                {
                  icon: Truck,
                  label:
                    shipping.dispatchCopy ||
                    "Free Shipping on all orders. Dispatched within 3–4 business days.",
                },
                { icon: Sparkles, label: "Natural tarnishing can be cleaned" },
                { icon: CircleOff, label: "No warranty, returns or exchanges" },
              ].map((item) => (
                <li key={item.label} className="flex items-start gap-2.5">
                  <item.icon
                    className="mt-0.5 size-4 shrink-0 text-[var(--color-accent)]"
                    aria-hidden="true"
                  />
                  <span className="text-xs leading-relaxed text-content-muted">
                    {item.label}
                  </span>
                </li>
              ))}
            </ul>

            {/* Interlink: Combo Offer Banner */}
            <ProductComboBanner
              combos={productCombos}
              currentProductId={product.id}
            />

            {/* Detail accordions ------------------------------------------- */}
            <ProductDetails product={product} shipping={shipping} />
          </div>
        </div>
      </div>

      {/* ---------------- Description ---------------- */}
      {product.description ? (
        <section className="border-t border-line bg-surface-sunken py-14 md:py-20">
          <div className="u-container">
            <div className="mx-auto max-w-3xl">
              <h2 className="mb-6 text-display-sm">About this piece</h2>
              <div
                className="space-y-4 text-sm leading-relaxed text-content-muted md:text-base"
                dangerouslySetInnerHTML={{
                  __html: sanitizeRichText(product.description),
                }}
              />
            </div>
          </div>
        </section>
      ) : null}

      {/* ---------------- FAQs ---------------- */}
      {productFaqs.length ? (
        <section className="py-14 md:py-20">
          <div className="u-container">
            <div className="mx-auto max-w-3xl">
              <SectionHeading
                eyebrow="Good to know"
                title="Questions about this piece"
                align="left"
                className="mb-8"
              />
              <FaqAccordion faqs={productFaqs} />
            </div>
          </div>
        </section>
      ) : null}

      {/* ---------------- Reviews ---------------- */}
      <section id="reviews" className="border-t border-line py-14 md:py-20">
        <div className="u-container">
          <div className="mx-auto max-w-3xl">
            <SectionHeading
              eyebrow="Customer reviews"
              title={
                product.ratingCount > 0
                  ? `${product.ratingAverage.toFixed(1)} out of 5`
                  : "No reviews yet"
              }
              description={
                product.ratingCount > 0
                  ? `Based on ${product.ratingCount} verified ${
                      product.ratingCount === 1 ? "review" : "reviews"
                    }.`
                  : "Be the first to review this piece after your order arrives."
              }
              align="left"
              className="mb-8"
            />

            {product.reviews.length ? (
              <ul className="divide-y divide-line border-y border-line">
                {product.reviews.map((review) => (
                  <li key={review.id} className="py-6">
                    <div className="mb-2 flex flex-wrap items-center gap-3">
                      <Rating value={review.rating} />
                      <span className="text-sm text-content">
                        {review.user.name?.split(" ")[0] ?? "Customer"}
                      </span>
                      {review.isVerified ? (
                        <span className="text-xs text-success-700">
                          Verified purchase
                        </span>
                      ) : null}
                      <span className="ml-auto text-xs text-content-subtle">
                        {formatDate(review.createdAt)}
                      </span>
                    </div>
                    {review.title ? (
                      <p className="font-display text-lg">{review.title}</p>
                    ) : null}
                    {review.body ? (
                      <p className="mt-1 text-sm leading-relaxed text-content-muted">
                        {review.body}
                      </p>
                    ) : null}
                    {review.adminResponse ? (
                      <div className="mt-3 border-l-2 border-[var(--color-accent)] bg-surface-sunken p-3 text-sm">
                        <p className="u-eyebrow mb-1 text-content-subtle">
                          Aastha replied
                        </p>
                        <p className="leading-relaxed text-content-muted">
                          {review.adminResponse}
                        </p>
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      </section>

      {/* ---------------- Related ---------------- */}
      {related.length ? (
        <section className="border-t border-line py-14 md:py-20">
          <div className="u-container">
            <SectionHeading
              eyebrow="You may also like"
              title="Related pieces"
              align="left"
              className="mb-8"
            />
            <Carousel ariaLabel="Related pieces">
              {related.map((item) => (
                <ProductCard key={item.id} product={item} />
              ))}
            </Carousel>
          </div>
        </section>
      ) : null}

      <RecentlyViewed currentSlug={product.slug} />
    </>
  );
}

/** Collapsible specification and policy sections. */
function ProductDetails({
  product,
  shipping,
}: {
  product: NonNullable<Awaited<ReturnType<typeof getProductBySlug>>>;
  shipping: { dispatchCopy: string; deliveryCopy: string };
}) {
  const sections = [
    {
      id: "specs",
      question: "Details & specification",
      answer: "",
      content: <SpecTable product={product} />,
    },
    product.careInstructions
      ? {
          id: "care",
          question: "Care instructions",
          answer: product.careInstructions,
        }
      : null,
    {
      id: "shipping",
      question: "Shipping & order policy",
      answer: [
        shipping.dispatchCopy,
        shipping.deliveryCopy,
        PLATED_ITEMS_COPY,
        ORDER_POLICY_SUMMARY,
      ]
        .filter(Boolean)
        .join(" "),
    },
    product.authenticityInfo
      ? {
          id: "authenticity",
          question: "Authenticity",
          answer: product.authenticityInfo,
        }
      : null,
    product.whatsIncluded
      ? {
          id: "included",
          question: "What's included",
          answer: product.whatsIncluded,
        }
      : null,
  ].filter(Boolean) as Array<{
    id: string;
    question: string;
    answer: string;
    content?: React.ReactNode;
  }>;

  return (
    <div>
      {/* The spec table is markup, not a string, so it renders outside the
          plain-text accordion. */}
      <details className="group border-t border-line py-4" open>
        <summary className="flex cursor-pointer items-center justify-between text-sm font-medium">
          Details &amp; specification
          <span className="text-content-muted transition-transform group-open:rotate-45">
            +
          </span>
        </summary>
        <div className="pt-4">
          <SpecTable product={product} />
        </div>
      </details>

      {sections
        .filter((s) => s.id !== "specs")
        .map((section) => (
          <details key={section.id} className="group border-t border-line py-4">
            <summary className="flex cursor-pointer items-center justify-between text-sm font-medium">
              {section.question}
              <span className="text-content-muted transition-transform group-open:rotate-45">
                +
              </span>
            </summary>
            <p className="pt-3 text-sm leading-relaxed text-content-muted">
              {section.answer}
            </p>
          </details>
        ))}
    </div>
  );
}
