import Link from "next/link";

import { cn } from "@/lib/utils";

/**
 * Admin building blocks.
 *
 * The admin has different priorities from the storefront — density and
 * scanability over editorial polish — so it gets its own small set of
 * primitives rather than bending the storefront ones.
 */

export function AdminHeading({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="font-display text-3xl">{title}</h1>
        {description ? (
          <p className="mt-1 text-sm text-content-muted">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  href,
}: {
  label: string;
  value: string;
  hint?: string;
  href?: string;
}) {
  const content = (
    <>
      <p className="u-eyebrow text-content-subtle">{label}</p>
      <p className="mt-2 font-display text-3xl">{value}</p>
      {hint ? (
        <p className="mt-1 text-xs text-content-subtle">{hint}</p>
      ) : null}
    </>
  );

  const className =
    "block rounded-md border border-line bg-surface-raised p-5 transition-colors";

  return href ? (
    <Link href={href} className={cn(className, "hover:border-[var(--color-accent)]")}>
      {content}
    </Link>
  ) : (
    <div className={className}>{content}</div>
  );
}

export function Panel({
  title,
  description,
  action,
  children,
  className,
}: {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-md border border-line bg-surface-raised",
        className,
      )}
    >
      {title ? (
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
          <div>
            <h2 className="font-display text-lg">{title}</h2>
            {description ? (
              <p className="mt-0.5 text-xs text-content-subtle">{description}</p>
            ) : null}
          </div>
          {action}
        </header>
      ) : null}
      {children}
    </section>
  );
}

/** Horizontally scrollable table wrapper — admin tables are wide by nature. */
export function TableWrap({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[44rem] text-sm">{children}</table>
    </div>
  );
}

export function Th({
  children,
  className,
  align = "left",
}: {
  children?: React.ReactNode;
  className?: string;
  align?: "left" | "right" | "center";
}) {
  return (
    <th
      scope="col"
      className={cn(
        "border-b border-line px-4 py-2.5 text-xs font-medium uppercase tracking-[0.08em] text-content-subtle",
        align === "right" && "text-right",
        align === "center" && "text-center",
        align === "left" && "text-left",
        className,
      )}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  className,
  align = "left",
}: {
  children?: React.ReactNode;
  className?: string;
  align?: "left" | "right" | "center";
}) {
  return (
    <td
      className={cn(
        "border-b border-line/70 px-4 py-3 align-middle",
        align === "right" && "text-right",
        align === "center" && "text-center",
        className,
      )}
    >
      {children}
    </td>
  );
}

export function EmptyRow({
  colSpan,
  message,
}: {
  colSpan: number;
  message: string;
}) {
  return (
    <tr>
      <td
        colSpan={colSpan}
        className="px-4 py-12 text-center text-sm text-content-muted"
      >
        {message}
      </td>
    </tr>
  );
}

/** Simple offset pagination for admin tables. */
export function AdminPagination({
  page,
  pageCount,
  buildHref,
}: {
  page: number;
  pageCount: number;
  buildHref: (page: number) => string;
}) {
  if (pageCount <= 1) return null;

  return (
    <nav
      aria-label="Pagination"
      className="flex items-center justify-between gap-3 border-t border-line px-5 py-3 text-sm"
    >
      <p className="text-content-subtle">
        Page {page} of {pageCount}
      </p>
      <div className="flex gap-2">
        {page > 1 ? (
          <Link
            href={buildHref(page - 1)}
            className="rounded-xs border border-line-strong px-3 py-1.5 text-xs hover:border-[var(--color-accent)]"
          >
            Previous
          </Link>
        ) : null}
        {page < pageCount ? (
          <Link
            href={buildHref(page + 1)}
            className="rounded-xs border border-line-strong px-3 py-1.5 text-xs hover:border-[var(--color-accent)]"
          >
            Next
          </Link>
        ) : null}
      </div>
    </nav>
  );
}
