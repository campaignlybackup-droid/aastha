import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";

import { AdminHeading, Panel } from "@/components/admin/ui";
import { SectionEditor } from "@/components/admin/section-editor";
import { Badge } from "@/components/ui/primitives";
import { db } from "@/lib/db";
import { SECTION_LABELS, type SectionType } from "@/lib/cms/sections";
import { requireArea } from "@/server/auth";

export const metadata = { title: "Edit section" };

export default async function EditSectionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireArea("homepage");
  const { id } = await params;

  const section = await db.homepageSection.findUnique({
    where: { id },
    select: {
      id: true,
      type: true,
      label: true,
      isActive: true,
      settings: true,
      campaign: { select: { name: true } },
    },
  });

  if (!section) notFound();

  // Offer the media library as a picker rather than making the owner paste
  // URLs. Heroes and banners are the images most often swapped.
  const media = await db.media.findMany({
    where: { folder: { in: ["HERO", "BANNER", "CAMPAIGN", "PRODUCT", "CATEGORY"] } },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: { id: true, secureUrl: true, filename: true, folder: true },
  });

  return (
    <>
      <Link
        href="/admin/homepage"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-content-muted hover:text-[var(--color-accent)]"
      >
        <ArrowLeft className="size-3.5" aria-hidden="true" />
        Homepage sections
      </Link>

      <AdminHeading
        title={section.label}
        description={
          section.campaign
            ? `Part of the “${section.campaign.name}” campaign.`
            : "Part of the default homepage."
        }
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

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <Badge variant="outline">
          {SECTION_LABELS[section.type as SectionType] ?? section.type}
        </Badge>
        {section.isActive ? (
          <Badge variant="success">Live</Badge>
        ) : (
          <Badge variant="neutral">Hidden — publish it from the section list</Badge>
        )}
      </div>

      <Panel>
        <div className="px-5 py-5">
          <SectionEditor
            sectionId={section.id}
            type={section.type as SectionType}
            initialSettings={
              (section.settings as Record<string, unknown>) ?? {}
            }
            media={media.map((item) => ({
              id: item.id,
              url: item.secureUrl,
              label: `${item.folder.toLowerCase()} · ${item.filename ?? item.id}`,
            }))}
          />
        </div>
      </Panel>
    </>
  );
}
