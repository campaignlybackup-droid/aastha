import Link from "next/link";
import { ExternalLink } from "lucide-react";

import { AdminHeading, Panel, TableWrap, Td, Th, EmptyRow } from "@/components/admin/ui";
import { Alert, Badge } from "@/components/ui/primitives";
import { db } from "@/lib/db";
import { publicEnv } from "@/lib/env";
import { requireArea } from "@/server/auth";

export const metadata = { title: "SEO" };

const RECOMMENDED_TITLE = 60;
const RECOMMENDED_DESCRIPTION = 155;

/**
 * SEO health.
 *
 * Rather than a form for editing every meta tag in one place — which drifts
 * from where the content actually lives — this reports what is missing or
 * out of bounds and links to the record that owns it.
 */
export default async function AdminSeoPage() {
  await requireArea("seo");

  const [products, categories, collections, counts] = await Promise.all([
    db.product.findMany({
      where: { status: "ACTIVE" },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        seoTitle: true,
        seoDescription: true,
        shortDescription: true,
        images: { take: 1, select: { id: true } },
      },
    }),
    db.category.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, slug: true, seoTitle: true, seoDescription: true },
    }),
    db.collection.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, slug: true, seoTitle: true, seoDescription: true },
    }),
    db.product.count({ where: { status: "ACTIVE" } }),
  ]);

  type Issue = { label: string; href: string; problems: string[]; editHref: string };
  const issues: Issue[] = [];

  for (const product of products) {
    const problems: string[] = [];
    const description = product.seoDescription ?? product.shortDescription ?? "";

    if (!product.seoTitle) problems.push("No SEO title (falls back to the name)");
    else if (product.seoTitle.length > RECOMMENDED_TITLE) {
      problems.push(`Title is ${product.seoTitle.length} chars — Google truncates past ~${RECOMMENDED_TITLE}`);
    }

    if (!description) problems.push("No meta description");
    else if (description.length > RECOMMENDED_DESCRIPTION) {
      problems.push(`Description is ${description.length} chars — trimmed past ~${RECOMMENDED_DESCRIPTION}`);
    }

    if (product.images.length === 0) {
      problems.push("No image — Product schema requires one, and social shares will be blank");
    }

    if (problems.length) {
      issues.push({
        label: product.name,
        href: `/product/${product.slug}`,
        editHref: `/admin/products/${product.id}`,
        problems,
      });
    }
  }

  for (const category of categories) {
    const problems: string[] = [];
    if (!category.seoTitle) problems.push("No SEO title");
    if (!category.seoDescription) problems.push("No meta description");
    if (problems.length) {
      issues.push({
        label: `Category: ${category.name}`,
        href: `/category/${category.slug}`,
        editHref: "/admin/categories",
        problems,
      });
    }
  }

  for (const collection of collections) {
    const problems: string[] = [];
    if (!collection.seoTitle) problems.push("No SEO title");
    if (!collection.seoDescription) problems.push("No meta description");
    if (problems.length) {
      issues.push({
        label: `Collection: ${collection.name}`,
        href: `/collections/${collection.slug}`,
        editHref: "/admin/collections",
        problems,
      });
    }
  }

  const healthy = counts + categories.length + collections.length - issues.length;

  return (
    <>
      <AdminHeading
        title="SEO"
        description="Titles, descriptions and structured data are set on each record. This page reports what is missing."
      />

      <div className="mb-6 flex flex-wrap gap-3">
        <Link
          href="/sitemap.xml"
          target="_blank"
          className="inline-flex items-center gap-1.5 rounded-sm border border-line-strong px-3 py-2 text-xs hover:border-[var(--color-accent)]"
        >
          <ExternalLink className="size-3.5" aria-hidden="true" />
          sitemap.xml
        </Link>
        <Link
          href="/robots.txt"
          target="_blank"
          className="inline-flex items-center gap-1.5 rounded-sm border border-line-strong px-3 py-2 text-xs hover:border-[var(--color-accent)]"
        >
          <ExternalLink className="size-3.5" aria-hidden="true" />
          robots.txt
        </Link>
        <Link
          href="/api/feeds/meta-catalog"
          target="_blank"
          className="inline-flex items-center gap-1.5 rounded-sm border border-line-strong px-3 py-2 text-xs hover:border-[var(--color-accent)]"
        >
          <ExternalLink className="size-3.5" aria-hidden="true" />
          Meta product feed
        </Link>
      </div>

      {publicEnv.siteUrl.includes("localhost") ? (
        <Alert variant="warning" className="mb-6">
          <code>NEXT_PUBLIC_SITE_URL</code> is still localhost. Canonical URLs,
          the sitemap and the product feed will all point at localhost until it
          is set to the live domain.
        </Alert>
      ) : null}

      <Panel
        title={issues.length === 0 ? "No issues found" : `${issues.length} record${issues.length === 1 ? "" : "s"} need attention`}
        description={`${healthy} record${healthy === 1 ? "" : "s"} look fine`}
      >
        <TableWrap>
          <thead>
            <tr>
              <Th>Record</Th>
              <Th>Issues</Th>
              <Th align="right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {issues.length === 0 ? (
              <EmptyRow
                colSpan={3}
                message="Every active product, category and collection has a title, description and image."
              />
            ) : (
              issues.slice(0, 100).map((issue) => (
                <tr key={issue.href} className="hover:bg-sand-50">
                  <Td>
                    <span className="block">{issue.label}</span>
                    <span className="block text-xs text-content-subtle">
                      {issue.href}
                    </span>
                  </Td>
                  <Td>
                    <ul className="space-y-0.5">
                      {issue.problems.map((problem) => (
                        <li key={problem}>
                          <Badge variant="warning">{problem}</Badge>
                        </li>
                      ))}
                    </ul>
                  </Td>
                  <Td align="right">
                    <div className="flex justify-end gap-1.5">
                      <Link
                        href={issue.editHref}
                        className="rounded-xs border border-line-strong px-2.5 py-1 text-xs hover:border-[var(--color-accent)]"
                      >
                        Edit
                      </Link>
                      <Link
                        href={issue.href}
                        target="_blank"
                        className="rounded-xs border border-line-strong px-2.5 py-1 text-xs hover:border-[var(--color-accent)]"
                      >
                        View
                      </Link>
                    </div>
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </TableWrap>
      </Panel>
    </>
  );
}
