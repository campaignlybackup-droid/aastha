import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import {
  AlertCircle,
  CheckCircle2,
  Info,
  Loader2,
  Star,
  TriangleAlert,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { formatPrice, discountPercent } from "@/lib/money";

/* -----------------------------------------------------------------------------
 * Badge
 * -------------------------------------------------------------------------- */

const badgeVariants = cva(
  "inline-flex items-center gap-1 whitespace-nowrap rounded-xs font-medium",
  {
    variants: {
      variant: {
        neutral: "bg-sand-100 text-content-muted",
        accent: "bg-[var(--color-accent)] text-[var(--color-accent-contrast)]",
        gold: "bg-gold-100 text-gold-800",
        success: "bg-success-50 text-success-700",
        warning: "bg-warning-50 text-warning-700",
        danger: "bg-danger-50 text-danger-700",
        outline: "border border-line-strong text-content-muted",
        /** For "20% OFF" flags on product cards. */
        sale: "bg-sand-900 text-sand-50",
      },
      size: {
        sm: "px-1.5 py-0.5 text-[0.625rem] tracking-[0.08em] uppercase",
        md: "px-2.5 py-1 text-[0.6875rem] tracking-[0.08em] uppercase",
      },
    },
    defaultVariants: { variant: "neutral", size: "sm" },
  },
);

export function Badge({
  className,
  variant,
  size,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return (
    <span
      className={cn(badgeVariants({ variant, size, className }))}
      {...props}
    />
  );
}

/* -----------------------------------------------------------------------------
 * Card
 * -------------------------------------------------------------------------- */

export function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-md border border-line bg-surface-raised shadow-[var(--shadow-subtle)]",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("border-b border-line px-5 py-4", className)}
      {...props}
    />
  );
}

export function CardTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn("font-display text-xl leading-tight", className)}
      {...props}
    />
  );
}

export function CardBody({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-5 py-4", className)} {...props} />;
}

export function CardFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "border-t border-line bg-surface-sunken px-5 py-3.5",
        className,
      )}
      {...props}
    />
  );
}

/* -----------------------------------------------------------------------------
 * Section heading — the editorial kicker + title pattern used across the
 * storefront. Centralised so every section is typographically identical.
 * -------------------------------------------------------------------------- */

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "center",
  as: Heading = "h2",
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  as?: "h1" | "h2" | "h3";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3",
        align === "center" ? "items-center text-center" : "items-start",
        className,
      )}
    >
      {eyebrow ? (
        <span className="u-eyebrow text-[var(--color-highlight)]">
          {eyebrow}
        </span>
      ) : null}
      <Heading className="font-display text-display-sm md:text-display-md">{title}</Heading>
      {description ? (
        <p
          className={cn(
            "max-w-2xl text-sm leading-relaxed text-content-muted md:text-base",
          )}
        >
          {description}
        </p>
      ) : null}
    </div>
  );
}

/* -----------------------------------------------------------------------------
 * Price — the canonical way to render money anywhere in the storefront.
 * Renders MRP strikethrough and the discount flag only when actually on offer.
 * -------------------------------------------------------------------------- */

export function Price({
  pricePaise,
  mrpPaise,
  size = "md",
  showDiscount = true,
  className,
}: {
  pricePaise: number;
  mrpPaise?: number | null;
  size?: "sm" | "md" | "lg";
  showDiscount?: boolean;
  className?: string;
}) {
  const off =
    mrpPaise && mrpPaise > pricePaise
      ? discountPercent(mrpPaise, pricePaise)
      : 0;

  const sizes = {
    sm: { price: "text-sm", mrp: "text-xs" },
    md: { price: "text-base", mrp: "text-sm" },
    lg: { price: "text-2xl", mrp: "text-base" },
  }[size];

  return (
    <div className={cn("flex flex-wrap items-baseline gap-x-2 gap-y-1", className)}>
      <span className={cn("font-medium text-content", sizes.price)}>
        {formatPrice(pricePaise)}
      </span>
      {off > 0 ? (
        <>
          <span
            className={cn("text-content-subtle line-through", sizes.mrp)}
            // The strikethrough price is decorative context; announce the real
            // price only, plus an explicit label below.
            aria-label={`Original price ${formatPrice(mrpPaise!)}`}
          >
            {formatPrice(mrpPaise!)}
          </span>
          {showDiscount ? (
            <span className={cn("font-medium text-success-700", sizes.mrp)}>
              {off}% off
            </span>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

/* -----------------------------------------------------------------------------
 * Rating
 * -------------------------------------------------------------------------- */

export function Rating({
  value,
  count,
  size = "sm",
  className,
}: {
  value: number;
  count?: number;
  size?: "sm" | "md";
  className?: string;
}) {
  const starSize = size === "sm" ? "size-3.5" : "size-4";
  const rounded = Math.round(value * 2) / 2;

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <div
        className="flex items-center gap-0.5"
        role="img"
        aria-label={`Rated ${value.toFixed(1)} out of 5`}
      >
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            aria-hidden="true"
            className={cn(
              starSize,
              i <= rounded
                ? "fill-gold-400 text-gold-400"
                : "fill-transparent text-sand-300",
            )}
          />
        ))}
      </div>
      {typeof count === "number" ? (
        <span className="text-xs text-content-muted">({count})</span>
      ) : null}
    </div>
  );
}

/* -----------------------------------------------------------------------------
 * Alert
 * -------------------------------------------------------------------------- */

const alertIcons = {
  info: Info,
  success: CheckCircle2,
  warning: TriangleAlert,
  danger: AlertCircle,
} as const;

const alertVariants = cva("flex gap-3 rounded-sm border p-3.5 text-sm", {
  variants: {
    variant: {
      info: "border-info-500/25 bg-info-50 text-info-700",
      success: "border-success-500/25 bg-success-50 text-success-700",
      warning: "border-warning-500/25 bg-warning-50 text-warning-700",
      danger: "border-danger-500/25 bg-danger-50 text-danger-700",
    },
  },
  defaultVariants: { variant: "info" },
});

export function Alert({
  variant = "info",
  title,
  children,
  className,
}: {
  variant?: keyof typeof alertIcons;
  title?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  const Icon = alertIcons[variant];
  return (
    <div
      className={cn(alertVariants({ variant }), className)}
      // Errors and warnings should interrupt; info and success should not.
      role={variant === "danger" ? "alert" : "status"}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div className="space-y-1">
        {title ? <p className="font-medium">{title}</p> : null}
        {children ? (
          <div className="leading-relaxed [&_a]:underline [&_a]:underline-offset-2">
            {children}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/* -----------------------------------------------------------------------------
 * Loading + empty + error states
 * -------------------------------------------------------------------------- */

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={cn("u-skeleton rounded-sm", className)}
      {...props}
    />
  );
}

export function Spinner({
  className,
  label = "Loading",
}: {
  className?: string;
  label?: string;
}) {
  return (
    <span role="status" aria-live="polite" className="inline-flex">
      <Loader2 className={cn("size-5 animate-spin", className)} aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </span>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 px-6 py-16 text-center",
        className,
      )}
    >
      {Icon ? (
        <span className="flex size-14 items-center justify-center rounded-full bg-sand-100">
          <Icon className="size-6 text-content-subtle" />
        </span>
      ) : null}
      <div className="space-y-1.5">
        <h3 className="font-display text-2xl">{title}</h3>
        {description ? (
          <p className="mx-auto max-w-sm text-sm leading-relaxed text-content-muted">
            {description}
          </p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

/* -----------------------------------------------------------------------------
 * Separator
 * -------------------------------------------------------------------------- */

export function Divider({
  className,
  gold = false,
}: {
  className?: string;
  gold?: boolean;
}) {
  return (
    <hr
      className={cn(
        gold ? "u-rule-gold border-0" : "border-t border-line",
        className,
      )}
    />
  );
}
