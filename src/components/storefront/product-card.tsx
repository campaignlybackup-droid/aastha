import Link from "next/link";

import { MediaImage } from "@/components/ui/media-image";
import { Badge, Price, Rating } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";
import type { ProductCardData } from "@/server/catalog";

/**
 * The product card.
 *
 * The whole card is one link with an absolutely-positioned overlay rather than
 * nested anchors — nested interactive elements are invalid and break keyboard
 * navigation. Badges and the hover image sit beneath that overlay.
 */
export function ProductCard({
  product,
  priority = false,
  sizes = "(min-width: 1280px) 22vw, (min-width: 768px) 30vw, 45vw",
  className,
}: {
  product: ProductCardData;
  /** Set on the first row of above-the-fold grids only. */
  priority?: boolean;
  sizes?: string;
  className?: string;
}) {
  const soldOut = !product.inStock;

  return (
    <article className={cn("group relative flex flex-col", className)}>
      <div className="relative overflow-hidden bg-sand-100">
        <div className="aspect-[4/5] relative">
          {product.image ? (
            <MediaImage
              src={product.image.url}
              alt={product.image.alt}
              fill
              sizes={sizes}
              priority={priority}
              className={cn(
                "object-cover transition-[opacity,transform] duration-700 ease-[var(--ease-out-quart)]",
                "group-hover:scale-[1.03]",
                product.hoverImage && "group-hover:opacity-0",
                soldOut && "opacity-60",
              )}
            />
          ) : (
            <div className="flex size-full items-center justify-center text-xs text-content-subtle">
              No image
            </div>
          )}

          {/* Second image cross-fades in on hover. Hidden from assistive tech —
              it is the same product, and announcing it twice is noise. */}
          {product.hoverImage ? (
            <MediaImage
              src={product.hoverImage.url}
              alt=""
              aria-hidden="true"
              fill
              sizes={sizes}
              className="object-cover opacity-0 transition-opacity duration-700 ease-[var(--ease-out-quart)] group-hover:opacity-100"
            />
          ) : null}
        </div>

        <div className="pointer-events-none absolute left-3 top-3 flex flex-col items-start gap-1.5">
          {soldOut ? (
            <Badge variant="neutral">Sold out</Badge>
          ) : (
            <>
              {product.mrpPaise > product.pricePaise ? (
                <Badge variant="sale">
                  {Math.round(
                    ((product.mrpPaise - product.pricePaise) /
                      product.mrpPaise) *
                      100,
                  )}
                  % off
                </Badge>
              ) : null}
              {product.isNew ? <Badge variant="gold">New</Badge> : null}
              {product.isLowStock ? (
                <Badge variant="warning">Low stock</Badge>
              ) : null}
            </>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-1.5 pt-3.5">
        <p className="u-eyebrow text-content-subtle">{product.categoryName}</p>

        <h3 className="font-sans text-sm leading-snug font-normal text-content">
          <Link
            href={`/product/${product.slug}`}
            className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none"
          >
            {product.name}
          </Link>
        </h3>

        {product.ratingCount > 0 ? (
          <Rating value={product.ratingAverage} count={product.ratingCount} />
        ) : null}

        <Price
          pricePaise={product.pricePaise}
          mrpPaise={product.mrpPaise}
          size="sm"
          className="mt-auto pt-1"
        />
      </div>
    </article>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <div className="u-skeleton aspect-[4/5] w-full" />
      <div className="space-y-2 pt-1">
        <div className="u-skeleton h-2.5 w-1/3" />
        <div className="u-skeleton h-3.5 w-4/5" />
        <div className="u-skeleton h-3.5 w-1/3" />
      </div>
    </div>
  );
}

/** Shared grid wrapper so every product listing has identical column behaviour. */
export function ProductGrid({
  children,
  columns = 4,
  className,
}: {
  children: React.ReactNode;
  columns?: 2 | 3 | 4;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid gap-x-4 gap-y-10 sm:gap-x-6",
        // Two columns on phones: jewellery is small, and a single-column feed
        // makes browsing a 24-product category interminable.
        "grid-cols-2",
        columns === 2 && "md:grid-cols-2",
        columns === 3 && "md:grid-cols-3",
        columns === 4 && "md:grid-cols-3 xl:grid-cols-4",
        className,
      )}
    >
      {children}
    </div>
  );
}
