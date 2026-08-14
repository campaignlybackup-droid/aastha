import Link from "next/link";

import { AdminHeading, Panel } from "@/components/admin/ui";
import { CampaignStatusControl } from "@/components/admin/campaign-status-control";
import { Alert, Badge } from "@/components/ui/primitives";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/utils";
import { requireArea } from "@/server/auth";
import { getActiveCampaign } from "@/server/homepage";

export const metadata = { title: "Campaigns" };

type WindowLabel = {
  text: string;
  variant: "success" | "warning" | "accent" | "neutral";
};

/**
 * Loads campaigns with their window state already resolved.
 *
 * The clock is read here rather than during render: a component body must be
 * pure, and "is this campaign live" is a fact about the moment the data was
 * fetched.
 */
async function loadCampaigns() {
  const rows = await db.campaign.findMany({
    orderBy: [{ startsAt: "desc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      status: true,
      startsAt: true,
      endsAt: true,
      priority: true,
      announcementText: true,
      _count: { select: { sections: true } },
    },
  });

  const now = Date.now();

  return rows.map((campaign) => {
    const starts = campaign.startsAt.getTime();
    const ends = campaign.endsAt.getTime();
    const inWindow = starts <= now && ends >= now;

    const window: WindowLabel = inWindow
      ? { text: "In window", variant: "warning" }
      : starts > now
        ? { text: "Upcoming", variant: "accent" }
        : { text: "Past", variant: "neutral" };

    return { ...campaign, inWindow, window };
  });
}


/**
 * Campaigns.
 *
 * A campaign is live when its window contains now AND its status is SCHEDULED
 * or ACTIVE. There is no "go live" button by design — the dates decide, so a
 * festival cannot be left switched on after it ends.
 */
export default async function AdminCampaignsPage() {
  await requireArea("campaigns");

  const [campaigns, live] = await Promise.all([loadCampaigns(), getActiveCampaign()]);

  return (
    <>
      <AdminHeading
        title="Campaigns"
        description="A campaign replaces the homepage and announcement bar for the length of its window, then hands back automatically."
      />

      {live ? (
        <Alert variant="success" title={`${live.name} is live now`} className="mb-6">
          The storefront is currently showing this campaign&rsquo;s homepage.
        </Alert>
      ) : (
        <Alert variant="info" className="mb-6">
          No campaign is live. The storefront is showing the default homepage.
        </Alert>
      )}

      <Panel>
        {campaigns.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-content-muted">
            No campaigns yet. They are created in the database or seeded; the
            homepage builder edits their sections.
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {campaigns.map((campaign) => {
              const isLive = live?.id === campaign.id;
              const windowLabel: WindowLabel = isLive
                ? { text: "Live now", variant: "success" }
                : campaign.inWindow
                  ? { text: "In window but not eligible", variant: "warning" }
                  : campaign.window;

              return (
                <li key={campaign.id} className="px-5 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium">{campaign.name}</span>
                        <Badge variant={windowLabel.variant}>{windowLabel.text}</Badge>
                        <Badge variant="outline">{campaign.status.toLowerCase()}</Badge>
                        {campaign.priority > 0 ? (
                          <Badge variant="neutral">priority {campaign.priority}</Badge>
                        ) : null}
                      </div>

                      {campaign.description ? (
                        <p className="mt-1 text-xs text-content-muted">
                          {campaign.description}
                        </p>
                      ) : null}

                      <p className="mt-1 text-xs text-content-subtle">
                        {formatDateTime(campaign.startsAt)} →{" "}
                        {formatDateTime(campaign.endsAt)} ·{" "}
                        {campaign._count.sections} section
                        {campaign._count.sections === 1 ? "" : "s"}
                      </p>

                      {campaign.announcementText ? (
                        <p className="mt-1 text-xs text-content-subtle">
                          Bar: &ldquo;{campaign.announcementText}&rdquo;
                        </p>
                      ) : null}

                      {campaign._count.sections === 0 ? (
                        <p className="mt-1.5 text-xs text-warning-700">
                          No sections of its own — the default homepage will show
                          instead while this campaign runs.
                        </p>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/admin/homepage?campaign=${campaign.id}`}
                        className="rounded-xs border border-line-strong px-2.5 py-1.5 text-xs text-content-muted hover:border-[var(--color-accent)]"
                      >
                        Edit sections
                      </Link>
                      <CampaignStatusControl
                        campaignId={campaign.id}
                        status={campaign.status}
                      />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </>
  );
}
