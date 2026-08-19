import Link from "next/link";
import * as Icons from "lucide-react";

import { Carousel } from "@/components/storefront/carousel";
import { NewsletterForm } from "@/components/storefront/newsletter-form";
import { ProductCard, ProductGrid } from "@/components/storefront/product-card";
import { MediaImage } from "@/components/ui/media-image";
import { Button } from "@/components/ui/button";
import { Rating, SectionHeading } from "@/components/ui/primitives";
import { FaqAccordion } from "@/components/storefront/faq-accordion";
import { sanitizeCustomHtml, sanitizeRichText } from "@/lib/cms/sanitize";
import { cn } from "@/lib/utils";
import type { SectionSettings } from "@/lib/cms/sections";
import type { ProductCardData } from "@/server/catalog";

/* -----------------------------------------------------------------------------
 * Shared section wrapper — one definition of vertical rhythm.
 * -------------------------------------------------------------------------- */

export function SectionShell({
  children,
  className,
  contained = true,
  tone = "default",
}: {
  children: React.ReactNode;
  className?: string;
  contained?: boolean;
  tone?: "default" | "sunken" | "inverse";
}) {
  return (
    <section
      className={cn(
        "py-14 md:py-20",
        tone === "sunken" && "bg-surface-sunken",
        tone === "inverse" && "bg-brand-900 text-sand-100",
        className,
      )}
    >
      <div className={contained ? "u-container" : undefined}>{children}</div>
    </section>
  );
}

/* -----------------------------------------------------------------------------
 * Product carousel / grid
 * -------------------------------------------------------------------------- */

export function ProductCarouselSection({
  settings,
  products,
}: {
  settings: SectionSettings["PRODUCT_CAROUSEL"];
  products: ProductCardData[];
}) {
  if (!products.length) return null;

  return (
    <SectionShell>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4 md:mb-10">
        <SectionHeading
          eyebrow={settings.eyebrow || undefined}
          title={settings.title}
          description={settings.description || undefined}
          align="left"
        />
        {settings.viewAll?.href && settings.viewAll.label ? (
          <Link
            href={settings.viewAll.href}
            className="u-eyebrow shrink-0 border-b border-line-strong pb-1 text-content transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
          >
            {settings.viewAll.label}
          </Link>
        ) : null}
      </div>

      <Carousel ariaLabel={settings.title}>
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            sizes="(min-width: 1280px) 24vw, (min-width: 768px) 32vw, 70vw"
          />
        ))}
      </Carousel>
    </SectionShell>
  );
}

export function ProductGridSection({
  settings,
  products,
}: {
  settings: SectionSettings["PRODUCT_GRID"];
  products: ProductCardData[];
}) {
  if (!products.length) return null;

  return (
    <SectionShell>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4 md:mb-10">
        <SectionHeading
          eyebrow={settings.eyebrow || undefined}
          title={settings.title}
          description={settings.description || undefined}
          align="left"
        />
        {settings.viewAll?.href && settings.viewAll.label ? (
          <Link
            href={settings.viewAll.href}
            className="u-eyebrow shrink-0 border-b border-line-strong pb-1 text-content hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
          >
            {settings.viewAll.label}
          </Link>
        ) : null}
      </div>

      <ProductGrid columns={settings.columns as 2 | 3 | 4}>
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </ProductGrid>
    </SectionShell>
  );
}

/* -----------------------------------------------------------------------------
 * Category / collection tiles
 * -------------------------------------------------------------------------- */

type Tile = {
  name: string;
  slug: string;
  href: string;
  imageUrl: string | null;
  count?: number;
};

export function TileCarouselSection({
  eyebrow,
  title,
  description,
  tiles,
  shape = "portrait",
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  tiles: Tile[];
  shape?: "circle" | "portrait" | "square";
}) {
  if (!tiles.length) return null;

  return (
    <SectionShell tone="sunken">
      <SectionHeading
        eyebrow={eyebrow}
        title={title}
        description={description}
        className="mb-10"
      />

      <Carousel
        ariaLabel={title}
        itemClassName={
          shape === "circle"
            ? "flex-[0_0_38%] sm:flex-[0_0_26%] md:flex-[0_0_18%] xl:flex-[0_0_13%]"
            : "flex-[0_0_60%] sm:flex-[0_0_38%] md:flex-[0_0_26%] xl:flex-[0_0_19%]"
        }
      >
        {tiles.map((tile) => (
          <Link
            key={tile.slug}
            href={tile.href}
            className="group block text-center focus-visible:outline-2 focus-visible:outline-offset-4"
          >
            <div
              className={cn(
                "relative overflow-hidden bg-sand-200",
                shape === "circle" && "aspect-square rounded-full",
                shape === "square" && "aspect-square",
                shape === "portrait" && "aspect-[4/5]",
              )}
            >
              {tile.imageUrl ? (
                <MediaImage
                  src={tile.imageUrl}
                  alt=""
                  fill
                  sizes="(min-width: 1280px) 15vw, (min-width: 768px) 26vw, 55vw"
                  className="object-cover transition-transform duration-700 ease-[var(--ease-out-quart)] group-hover:scale-105"
                />
              ) : null}
            </div>
            <p className="mt-3.5 text-sm text-content transition-colors group-hover:text-[var(--color-accent)]">
              {tile.name}
            </p>
            {typeof tile.count === "number" ? (
              <p className="mt-0.5 text-xs text-content-subtle">
                {tile.count} {tile.count === 1 ? "piece" : "pieces"}
              </p>
            ) : null}
          </Link>
        ))}
      </Carousel>
    </SectionShell>
  );
}

/* -----------------------------------------------------------------------------
 * Promo banner
 * -------------------------------------------------------------------------- */

export function PromoBannerSection({
  settings,
}: {
  settings: SectionSettings["PROMO_BANNER"];
}) {
  const light = settings.theme === "dark";
  const isTrustBanner =
    settings.heading?.toLowerCase().includes("2000+") ||
    settings.heading?.toLowerCase().includes("2,000+") ||
    settings.eyebrow?.toLowerCase().includes("trusted");

  if (isTrustBanner) {
    return (
      <SectionShell>
        <div className="relative overflow-hidden rounded-2xl border border-gold-400/25 bg-gradient-to-br from-brand-950 via-brand-900 to-brand-950 px-6 py-16 text-center text-sand-50 shadow-2xl md:px-16 md:py-24">
          <div className="pointer-events-none absolute -top-24 -left-24 size-96 rounded-full bg-gold-400/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -right-24 size-96 rounded-full bg-gold-400/10 blur-3xl" />

          <div className="relative mx-auto max-w-4xl space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-gold-400/30 bg-gold-400/10 px-4 py-1.5 backdrop-blur-md">
              <div className="flex gap-1 text-gold-400 text-sm">
                {"★★★★★"}
              </div>
              <span className="text-xs font-medium tracking-wide text-sand-200">
                4.9/5 Rating from 1,500+ Verified Reviews
              </span>
            </div>

            {settings.eyebrow ? (
              <p className="u-eyebrow font-bold tracking-[0.25em] text-gold-300 uppercase">
                {settings.eyebrow}
              </p>
            ) : null}

            <h2 className="font-display text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight text-sand-50 leading-tight">
              {settings.heading}
            </h2>

            {settings.subheading ? (
              <p className="mx-auto max-w-2xl text-base sm:text-lg leading-relaxed text-sand-200/90 font-light">
                {settings.subheading}
              </p>
            ) : null}

            <div className="pt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto text-left">
              <div className="rounded-xl border border-sand-50/10 bg-sand-50/5 p-4 backdrop-blur-xs">
                <p className="font-display text-2xl font-bold text-gold-300">2,000+</p>
                <p className="text-xs text-sand-300 mt-1">Delighted Customers Across India</p>
              </div>
              <div className="rounded-xl border border-sand-50/10 bg-sand-50/5 p-4 backdrop-blur-xs">
                <p className="font-display text-2xl font-bold text-gold-300">925 Pure</p>
                <p className="text-xs text-sand-300 mt-1">Certified Hallmarked Sterling Silver</p>
              </div>
              <div className="rounded-xl border border-sand-50/10 bg-sand-50/5 p-4 backdrop-blur-xs">
                <p className="font-display text-2xl font-bold text-gold-300">4.9 ★★★★★</p>
                <p className="text-xs text-sand-300 mt-1">Average Customer Satisfaction Score</p>
              </div>
            </div>

            {settings.cta?.href && settings.cta.label ? (
              <div className="pt-6">
                <Button
                  asChild
                  size="lg"
                  className="bg-gold-400 text-brand-950 hover:bg-gold-300 font-semibold px-8 py-3 rounded-full shadow-lg transition-all transform hover:-translate-y-0.5"
                >
                  <Link href={settings.cta.href}>{settings.cta.label}</Link>
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      </SectionShell>
    );
  }

  return (
    <SectionShell>
      <div
        className={cn(
          "relative overflow-hidden rounded-md px-6 py-14 text-center md:px-16 md:py-20",
          settings.style === "solid" && "bg-brand-800",
          settings.style === "outline" && "border border-line-strong bg-transparent",
          settings.style === "image" && "bg-brand-900",
        )}
      >
        {settings.style === "image" && settings.image ? (
          <>
            <MediaImage
              src={settings.image.url}
              alt=""
              fill
              sizes="100vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-sand-950/55" aria-hidden="true" />
          </>
        ) : null}

        <div className="relative mx-auto max-w-2xl space-y-4">
          {settings.eyebrow ? (
            <p
              className={cn(
                "u-eyebrow",
                light || settings.style === "image"
                  ? "text-gold-300"
                  : "text-[var(--color-highlight)]",
              )}
            >
              {settings.eyebrow}
            </p>
          ) : null}

          <h2
            className={cn(
              "text-display-sm md:text-display-md",
              settings.style === "outline" ? "text-content" : "text-sand-50",
            )}
          >
            {settings.heading}
          </h2>

          {settings.subheading ? (
            <p
              className={cn(
                "text-sm leading-relaxed md:text-base",
                settings.style === "outline"
                  ? "text-content-muted"
                  : "text-sand-200",
              )}
            >
              {settings.subheading}
            </p>
          ) : null}

          {settings.cta?.href && settings.cta.label ? (
            <div className="pt-2">
              <Button
                asChild
                size="lg"
                variant={settings.style === "outline" ? "primary" : "inverse"}
              >
                <Link href={settings.cta.href}>{settings.cta.label}</Link>
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </SectionShell>
  );
}

/* -----------------------------------------------------------------------------
 * Image banner
 * -------------------------------------------------------------------------- */

export function ImageBannerSection({
  settings,
}: {
  settings: SectionSettings["IMAGE_BANNER"];
}) {
  const image = (
    <div className="relative aspect-[3/2] w-full overflow-hidden md:aspect-[21/9]">
      {settings.mobileImage ? (
        <>
          <MediaImage
            src={settings.mobileImage.url}
            alt={settings.alt}
            fill
            sizes="100vw"
            className="object-cover md:hidden"
          />
          <MediaImage
            src={settings.image.url}
            alt={settings.alt}
            fill
            sizes="100vw"
            className="hidden object-cover md:block"
          />
        </>
      ) : (
        <MediaImage
          src={settings.image.url}
          alt={settings.alt}
          fill
          sizes="100vw"
          className="object-cover"
        />
      )}
    </div>
  );

  return (
    <SectionShell contained={!settings.fullBleed}>
      {settings.href ? <Link href={settings.href}>{image}</Link> : image}
    </SectionShell>
  );
}

/* -----------------------------------------------------------------------------
 * Split image + text
 * -------------------------------------------------------------------------- */

export function SplitImageTextSection({
  settings,
}: {
  settings: SectionSettings["SPLIT_IMAGE_TEXT"];
}) {
  return (
    <SectionShell>
      <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
        <div
          className={cn(
            "relative aspect-[4/5] overflow-hidden bg-sand-100",
            settings.imageSide === "right" && "lg:order-2",
          )}
        >
          <MediaImage
            src={settings.image.url}
            alt={settings.image.alt}
            fill
            sizes="(min-width: 1024px) 45vw, 92vw"
            className="object-cover"
          />
        </div>

        <div className="space-y-5">
          {settings.eyebrow ? (
            <p className="u-eyebrow text-[var(--color-highlight)]">
              {settings.eyebrow}
            </p>
          ) : null}

          <h2 className="text-display-sm md:text-display-md">
            {settings.heading}
          </h2>

          {settings.body ? (
            <div
              className="space-y-4 text-sm leading-relaxed text-content-muted md:text-base [&_p]:leading-relaxed"
              dangerouslySetInnerHTML={{ __html: sanitizeRichText(settings.body) }}
            />
          ) : null}

          {settings.stats.length ? (
            <dl className="flex flex-wrap gap-x-10 gap-y-5 border-t border-line pt-6">
              {/* flex-col-reverse keeps <dt> before <dd> in the DOM, as the
                  spec requires, while showing the value above the label. */}
              {settings.stats.map((stat) => (
                <div key={stat.label} className="flex flex-col-reverse">
                  <dt className="mt-1 text-xs tracking-[0.06em] text-content-subtle">
                    {stat.label}
                  </dt>
                  <dd className="font-display text-3xl text-[var(--color-accent)]">
                    {stat.value}
                  </dd>
                </div>
              ))}
            </dl>
          ) : null}

          {settings.cta?.href && settings.cta.label ? (
            <div className="pt-1">
              <Button asChild variant="outline">
                <Link href={settings.cta.href}>{settings.cta.label}</Link>
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </SectionShell>
  );
}

/* -----------------------------------------------------------------------------
 * Testimonials / reviews
 * -------------------------------------------------------------------------- */

type ReviewItem = {
  id: string;
  rating: number;
  title: string | null;
  body: string | null;
  authorName: string;
  productName?: string;
  productSlug?: string;
  isVerified?: boolean;
};

export function ReviewsSection({
  eyebrow,
  title,
  description,
  reviews,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  reviews: ReviewItem[];
}) {
  if (!reviews.length) return null;

  return (
    <SectionShell tone="sunken">
      <SectionHeading
        eyebrow={eyebrow}
        title={title}
        description={description}
        className="mb-10"
      />

      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {reviews.map((review) => (
          <figure
            key={review.id}
            className="flex flex-col gap-3 border border-line bg-surface-raised p-6"
          >
            <Rating value={review.rating} />
            {review.title ? (
              <figcaption className="font-display text-lg leading-snug">
                {review.title}
              </figcaption>
            ) : null}
            {review.body ? (
              <blockquote className="flex-1 text-sm leading-relaxed text-content-muted">
                {review.body}
              </blockquote>
            ) : null}
            <div className="mt-auto border-t border-line pt-3 text-xs text-content-subtle">
              <span className="text-content">{review.authorName}</span>
              {review.isVerified ? (
                <span className="ml-2 text-success-700">Verified purchase</span>
              ) : null}
              {review.productName && review.productSlug ? (
                <p className="mt-1">
                  on{" "}
                  <Link
                    href={`/product/${review.productSlug}`}
                    className="underline underline-offset-2 hover:text-[var(--color-accent)]"
                  >
                    {review.productName}
                  </Link>
                </p>
              ) : null}
            </div>
          </figure>
        ))}
      </div>
    </SectionShell>
  );
}

export function TestimonialsSection({
  settings,
}: {
  settings: SectionSettings["TESTIMONIALS"];
}) {
  return (
    <ReviewsSection
      eyebrow={settings.eyebrow || undefined}
      title={settings.title}
      reviews={settings.items.map((item, index) => ({
        id: `testimonial-${index}`,
        rating: item.rating,
        title: null,
        body: item.quote,
        authorName: item.location
          ? `${item.author}, ${item.location}`
          : item.author,
      }))}
    />
  );
}

/* -----------------------------------------------------------------------------
 * FAQ
 * -------------------------------------------------------------------------- */

export function FaqSection({
  eyebrow,
  title,
  description,
  faqs,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  faqs: Array<{ id: string; question: string; answer: string }>;
}) {
  if (!faqs.length) return null;

  return (
    <SectionShell>
      <div className="mx-auto max-w-3xl">
        <SectionHeading
          eyebrow={eyebrow}
          title={title}
          description={description}
          className="mb-10"
        />
        <FaqAccordion faqs={faqs} />
      </div>
    </SectionShell>
  );
}

/* -----------------------------------------------------------------------------
 * CTA / newsletter / trust badges / rich text / custom HTML
 * -------------------------------------------------------------------------- */

export function CtaSection({ settings }: { settings: SectionSettings["CTA"] }) {
  const light = settings.theme === "dark";

  return (
    <SectionShell tone={light ? "inverse" : "default"}>
      <div className="mx-auto max-w-2xl space-y-5 text-center">
        {settings.eyebrow ? (
          <p className={cn("u-eyebrow", light ? "text-gold-300" : "text-[var(--color-highlight)]")}>
            {settings.eyebrow}
          </p>
        ) : null}
        <h2 className="text-display-sm md:text-display-md">{settings.heading}</h2>
        {settings.subheading ? (
          <p
            className={cn(
              "text-sm leading-relaxed md:text-base",
              light ? "text-sand-300" : "text-content-muted",
            )}
          >
            {settings.subheading}
          </p>
        ) : null}
        <div className="flex flex-wrap justify-center gap-3 pt-2">
          <Button asChild size="lg" variant={light ? "inverse" : "primary"}>
            <Link href={settings.primaryCta.href}>
              {settings.primaryCta.label}
            </Link>
          </Button>
          {settings.secondaryCta?.href && settings.secondaryCta.label ? (
            <Button
              asChild
              size="lg"
              variant="outline"
              className={light ? "border-sand-50/40 text-sand-50" : undefined}
            >
              <Link href={settings.secondaryCta.href}>
                {settings.secondaryCta.label}
              </Link>
            </Button>
          ) : null}
        </div>
      </div>
    </SectionShell>
  );
}

export function NewsletterSection({
  settings,
}: {
  settings: SectionSettings["NEWSLETTER"];
}) {
  return null;
}

export function TrustBadgesSection({
  settings,
}: {
  settings: SectionSettings["TRUST_BADGES"];
}) {
  const light = settings.theme === "dark";

  return (
    <SectionShell tone={light ? "inverse" : "default"} className="py-10 md:py-14">
      <ul className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {settings.items.map((item) => {
          // Unknown icon names must not crash the homepage.
          const Icon =
            (Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[
              item.icon
            ] ?? Icons.Sparkles;

          return (
            <li key={item.title} className="flex gap-3.5">
              <Icon
                className={cn(
                  "mt-0.5 size-5 shrink-0",
                  light ? "text-gold-400" : "text-[var(--color-accent)]",
                )}
              />
              <div>
                <p className="text-sm font-medium">{item.title}</p>
                {item.description ? (
                  <p
                    className={cn(
                      "mt-1 text-xs leading-relaxed",
                      light ? "text-sand-300" : "text-content-muted",
                    )}
                  >
                    {item.description}
                  </p>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </SectionShell>
  );
}

export function RichTextSection({
  settings,
}: {
  settings: SectionSettings["RICH_TEXT"];
}) {
  return (
    <SectionShell>
      <div
        className={cn(
          "mx-auto",
          settings.width === "narrow" ? "max-w-2xl" : "max-w-4xl",
        )}
      >
        {settings.title ? (
          <h2 className="mb-6 text-display-sm md:text-display-md">
            {settings.title}
          </h2>
        ) : null}
        <div
          className="space-y-4 text-sm leading-relaxed text-content-muted md:text-base [&_a]:underline [&_a]:underline-offset-4 [&_h2]:font-display [&_h2]:text-2xl [&_h2]:text-content [&_h3]:font-display [&_h3]:text-xl [&_h3]:text-content [&_li]:ml-5 [&_ol]:list-decimal [&_ul]:list-disc"
          dangerouslySetInnerHTML={{ __html: sanitizeRichText(settings.html) }}
        />
      </div>
    </SectionShell>
  );
}

export function CustomHtmlSection({
  settings,
}: {
  settings: SectionSettings["CUSTOM_HTML"];
}) {
  return (
    <SectionShell contained={!settings.fullBleed}>
      <div
        dangerouslySetInnerHTML={{ __html: sanitizeCustomHtml(settings.html) }}
      />
    </SectionShell>
  );
}

export function VideoHeroSection({
  settings,
}: {
  settings: SectionSettings["VIDEO_HERO"];
}) {
  const heights = {
    compact: "h-[58dvh] min-h-[380px]",
    standard: "h-[76dvh] min-h-[480px]",
    full: "h-[calc(100dvh-var(--header-height))] min-h-[540px]",
  } as const;

  return (
    <section className={cn("relative overflow-hidden bg-brand-900", heights[settings.height])}>
      {/* Muted + playsInline are required for iOS to autoplay at all. The
          poster carries the first paint so LCP does not wait on the video. */}
      <video
        autoPlay
        muted
        loop
        playsInline
        preload="none"
        poster={settings.posterImage.url}
        aria-hidden="true"
        className="absolute inset-0 size-full object-cover"
      >
        <source src={settings.videoUrl} />
      </video>

      <div
        className="absolute inset-0 bg-sand-950"
        style={{ opacity: settings.overlayOpacity / 100 }}
        aria-hidden="true"
      />

      <div className="u-container relative flex h-full items-center">
        <div
          className={cn(
            "max-w-xl space-y-4",
            settings.align === "center" && "mx-auto text-center",
            settings.align === "right" && "ml-auto text-right",
          )}
        >
          {settings.eyebrow ? (
            <p className="u-eyebrow text-gold-300">{settings.eyebrow}</p>
          ) : null}
          {settings.heading ? (
            <h1 className="text-display-md text-sand-50 md:text-display-lg">
              {settings.heading}
            </h1>
          ) : null}
          {settings.subheading ? (
            <p className="text-sm leading-relaxed text-sand-200 md:text-base">
              {settings.subheading}
            </p>
          ) : null}
          {settings.primaryCta?.href && settings.primaryCta.label ? (
            <div className="pt-2">
              <Button asChild size="lg" variant="inverse">
                <Link href={settings.primaryCta.href}>
                  {settings.primaryCta.label}
                </Link>
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
