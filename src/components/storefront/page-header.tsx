import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

export type Crumb = { name: string; href: string };

export function Breadcrumbs({
  crumbs,
  className,
}: {
  crumbs: Crumb[];
  className?: string;
}) {
  return (
    <nav aria-label="Breadcrumb" className={cn("mb-5", className)}>
      <ol className="flex flex-wrap items-center gap-1.5 text-xs text-content-subtle">
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1;
          return (
            <li key={crumb.href} className="flex items-center gap-1.5">
              {index > 0 ? (
                <ChevronRight className="size-3" aria-hidden="true" />
              ) : null}
              {isLast ? (
                <span aria-current="page" className="text-content-muted">
                  {crumb.name}
                </span>
              ) : (
                <Link
                  href={crumb.href}
                  className="transition-colors hover:text-[var(--color-accent)]"
                >
                  {crumb.name}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/** Standard heading block for listing pages. */
export function PageHeader({
  crumbs,
  eyebrow,
  title,
  description,
  children,
}: {
  crumbs?: Crumb[];
  eyebrow?: string;
  title: string;
  description?: string | null;
  children?: React.ReactNode;
}) {
  return (
    <header className="u-container pb-10 pt-8 md:pb-12 md:pt-10">
      {crumbs?.length ? <Breadcrumbs crumbs={crumbs} /> : null}

      <div className="max-w-2xl space-y-3">
        {eyebrow ? (
          <p className="u-eyebrow text-[var(--color-highlight)]">{eyebrow}</p>
        ) : null}
        <h1 className="text-display-sm md:text-display-md">{title}</h1>
        {description ? (
          <p className="text-sm leading-relaxed text-content-muted md:text-base">
            {description}
          </p>
        ) : null}
      </div>

      {children}
    </header>
  );
}
