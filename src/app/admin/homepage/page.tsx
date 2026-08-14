import Link from "next/link";
import { ExternalLink } from "lucide-react";

import { AdminHeading, Panel } from "@/components/admin/ui";
import { SectionManager } from "@/components/admin/section-manager";
import { Alert } from "@/components/ui/primitives";
import { db } from "@/lib/db";
import { SECTION_LABELS, type SectionType } from "@/lib/cms/sections";
import { requireArea } from "@/server/auth";
import { getActiveCampaign } from "@/server/homepage";

export const metadata = { title: "Homepage" };

/**
 * Homepage builder.
 *
 * Manages the DEFAULT homepage. When a campaign is live it replaces this
 * layout on the storefront, so the page says so plainly — otherwise an admin
 * edits here, sees no change on the site, and concludes it is broken.
 */
export default async function AdminHomepagePage() {
  await requireArea("homepage");

  const [sections, activeCampaign] = await Promise.all([
    db.homepageSection.findMany({
      where: { campaignId: null },
      orderBy: { position: "asc" },
      select: {
        id: true,
        type: true,
        label: true,
        position: true,
        isActive: true,
        startsAt: true,
        endsAt: true,
      },
    }),
    getActiveCampaign(),
  ]);

  return (
    <>
      <AdminHeading
        title="Homepage"
        description="Sections render top to bottom. Changes go live as soon as you save."
        action={
          <Link
            href="/"
            target="_blank"
            className="inline-flex items-center gap-1.5 rounded-sm border border-line-strong px-3 py-2 text-xs hover:border-[var(--color-accent)]"
          >
            <ExternalLink className="size-3.5" aria-hidden="true" />
            View storefront
          </Link>
        }
      />

      {activeCampaign ? (
        <Alert variant="warning" title="A campaign is live right now" className="mb-6">
          <p>
            <strong>{activeCampaign.name}</strong> is currently overriding the
            homepage. Edits made here apply to the default layout and will be
            visible again when the campaign ends.{" "}
            <Link
              href="/admin/campaigns"
              className="underline underline-offset-4"
            >
              Manage campaigns
            </Link>
            .
          </p>
        </Alert>
      ) : null}

      <Panel
        title="Sections"
        description={`${sections.length} section${sections.length === 1 ? "" : "s"} on the default homepage`}
      >
        <SectionManager
          sections={sections.map((section) => ({
            ...section,
            typeLabel:
              SECTION_LABELS[section.type as SectionType] ?? section.type,
            startsAt: section.startsAt?.toISOString() ?? null,
            endsAt: section.endsAt?.toISOString() ?? null,
          }))}
        />
      </Panel>
    </>
  );
}
