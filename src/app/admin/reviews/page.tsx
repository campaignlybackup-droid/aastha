import Link from "next/link";

import { AdminHeading, Panel } from "@/components/admin/ui";
import { ReviewModeration } from "@/components/admin/review-moderation";
import { InstagramReviewsManager } from "@/components/admin/instagram-reviews-manager";
import { db } from "@/lib/db";
import { getSetting } from "@/server/catalog";
import { requireArea } from "@/server/auth";
import type { ReviewStatus } from "@/generated/prisma/enums";

export const metadata = { title: "Reviews" };

const TABS: Array<{ value: string; label: string }> = [
  { value: "PENDING", label: "Awaiting moderation" },
  { value: "APPROVED", label: "Published" },
  { value: "REJECTED", label: "Rejected" },
  { value: "INSTAGRAM", label: "Instagram DM Screenshots" },
];

export default async function AdminReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireArea("reviews");
  const params = await searchParams;

  const currentTab = TABS.some((t) => t.value === params.status)
    ? params.status!
    : "PENDING";

  if (currentTab === "INSTAGRAM") {
    const [instagramSettings, media] = await Promise.all([
      getSetting("instagram_reviews"),
      db.media.findMany({
        where: { folder: { in: ["REVIEW", "OTHER", "BANNER", "HERO", "PRODUCT"] } },
        orderBy: { createdAt: "desc" },
        take: 100,
        select: { id: true, secureUrl: true, filename: true },
      }),
    ]);

    return (
      <>
        <AdminHeading
          title="Reviews"
          description="Manage customer product reviews and Instagram DM screenshot showcases."
        />

        <nav aria-label="Filter by status" className="mb-5 flex flex-wrap gap-1.5">
          {TABS.map((tab) => (
            <Link
              key={tab.value}
              href={`/admin/reviews?status=${tab.value}`}
              aria-current={tab.value === currentTab ? "page" : undefined}
              className={
                tab.value === currentTab
                  ? "rounded-xs bg-brand-800 px-3 py-1.5 text-xs text-sand-50"
                  : "rounded-xs border border-line-strong px-3 py-1.5 text-xs text-content-muted hover:border-[var(--color-accent)]"
              }
            >
              {tab.label}
            </Link>
          ))}
        </nav>

        <InstagramReviewsManager initial={instagramSettings} media={media} />
      </>
    );
  }

  const status = currentTab as ReviewStatus;

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
            {tab.label} {tab.value !== "INSTAGRAM" ? `(${countFor(tab.value)})` : ""}
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
