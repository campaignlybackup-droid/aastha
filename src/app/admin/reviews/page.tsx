import Link from "next/link";

import { AdminHeading, Panel } from "@/components/admin/ui";
import { ReviewModeration } from "@/components/admin/review-moderation";
import { db } from "@/lib/db";
import { requireArea } from "@/server/auth";
import type { ReviewStatus } from "@/generated/prisma/enums";

export const metadata = { title: "Reviews" };

const TABS: Array<{ value: string; label: string }> = [
  { value: "PENDING", label: "Awaiting moderation" },
  { value: "APPROVED", label: "Published" },
  { value: "REJECTED", label: "Rejected" },
];

export default async function AdminReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireArea("reviews");
  const params = await searchParams;

  const status = TABS.some((t) => t.value === params.status)
    ? (params.status as ReviewStatus)
    : "PENDING";

  const [reviews, counts] = await Promise.all([
    db.review.findMany({
      where: { status },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        rating: true,
        title: true,
        body: true,
        status: true,
        isVerified: true,
        createdAt: true,
        user: { select: { name: true, mobile: true } },
        product: { select: { name: true, slug: true } },
      },
    }),
    db.review.groupBy({ by: ["status"], _count: true }),
  ]);

  const countFor = (value: string) =>
    counts.find((c) => c.status === value)?._count ?? 0;

  return (
    <>
      <AdminHeading
        title="Reviews"
        description="Moderation is mandatory — nothing appears on the storefront until it is approved here."
      />

      <nav aria-label="Filter by status" className="mb-5 flex flex-wrap gap-1.5">
        {TABS.map((tab) => (
          <Link
            key={tab.value}
            href={`/admin/reviews?status=${tab.value}`}
            aria-current={tab.value === status ? "page" : undefined}
            className={
              tab.value === status
                ? "rounded-xs bg-brand-800 px-3 py-1.5 text-xs text-sand-50"
                : "rounded-xs border border-line-strong px-3 py-1.5 text-xs text-content-muted hover:border-[var(--color-accent)]"
            }
          >
            {tab.label} ({countFor(tab.value)})
          </Link>
        ))}
      </nav>

      <Panel>
        <ReviewModeration
          reviews={reviews.map((review) => ({
            ...review,
            createdAt: review.createdAt.toISOString(),
            authorName: review.user.name ?? review.user.mobile,
          }))}
        />
      </Panel>
    </>
  );
}
