"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/lib/db";
import { requireArea } from "@/server/auth";
import {
  parseSectionSettings,
  sectionSchemas,
  type SectionType,
} from "@/lib/cms/sections";

/**
 * Homepage and campaign management.
 *
 * Section `settings` are validated against the per-type Zod schema on the way
 * in, so the renderer can trust what it reads. Malformed settings can never be
 * persisted, which is what makes the renderer's "skip invalid sections"
 * fallback a genuine last resort rather than a routine occurrence.
 */

export type CmsResult =
  | { ok: true; message?: string; id?: string }
  | { ok: false; error: string };

/** The homepage is cached; every mutation must bust it or edits look lost. */
function revalidateStorefront() {
  revalidatePath("/");
  revalidatePath("/admin/homepage");
}

export async function reorderSections(
  orderedIds: string[],
): Promise<CmsResult> {
  await requireArea("homepage");

  const parsed = z.array(z.string().min(1).max(40)).max(60).safeParse(orderedIds);
  if (!parsed.success) return { ok: false, error: "Invalid ordering." };

  // One transaction: a partially-applied reorder would leave duplicate
  // positions and a visibly scrambled homepage.
  await db.$transaction(
    parsed.data.map((id, index) =>
      db.homepageSection.update({
        where: { id },
        data: { position: index },
      }),
    ),
  );

  revalidateStorefront();
  return { ok: true, message: "Order saved." };
}

export async function toggleSection(
  id: string,
  isActive: boolean,
): Promise<CmsResult> {
  await requireArea("homepage");

  const section = await db.homepageSection.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!section) return { ok: false, error: "Section not found." };

  await db.homepageSection.update({ where: { id }, data: { isActive } });

  revalidateStorefront();
  return {
    ok: true,
    message: isActive ? "Section is now live." : "Section hidden.",
  };
}

export async function deleteSection(id: string): Promise<CmsResult> {
  await requireArea("homepage");

  const section = await db.homepageSection.findUnique({
    where: { id },
    select: { campaignId: true, position: true },
  });
  if (!section) return { ok: false, error: "Section not found." };

  await db.$transaction([
    db.homepageSection.delete({ where: { id } }),
    // Close the gap so positions stay contiguous.
    db.homepageSection.updateMany({
      where: {
        campaignId: section.campaignId,
        position: { gt: section.position },
      },
      data: { position: { decrement: 1 } },
    }),
  ]);

  revalidateStorefront();
  return { ok: true, message: "Section removed." };
}

export async function duplicateSection(id: string): Promise<CmsResult> {
  await requireArea("homepage");

  const section = await db.homepageSection.findUnique({ where: { id } });
  if (!section) return { ok: false, error: "Section not found." };

  // Insert directly beneath the original rather than at the end — that is
  // where someone duplicating a section expects the copy to appear.
  await db.homepageSection.updateMany({
    where: {
      campaignId: section.campaignId,
      position: { gt: section.position },
    },
    data: { position: { increment: 1 } },
  });

  const copy = await db.homepageSection.create({
    data: {
      campaignId: section.campaignId,
      type: section.type,
      label: `${section.label} (copy)`,
      position: section.position + 1,
      // Copies start hidden so a duplicate never goes live unreviewed.
      isActive: false,
      startsAt: section.startsAt,
      endsAt: section.endsAt,
      settings: section.settings as never,
    },
    select: { id: true },
  });

  revalidateStorefront();
  return { ok: true, id: copy.id, message: "Section duplicated (hidden)." };
}

const scheduleSchema = z.object({
  id: z.string().min(1).max(40),
  startsAt: z.string().datetime().nullable().optional(),
  endsAt: z.string().datetime().nullable().optional(),
});

export async function scheduleSection(
  input: z.input<typeof scheduleSchema>,
): Promise<CmsResult> {
  await requireArea("homepage");

  const parsed = scheduleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid dates." };

  const startsAt = parsed.data.startsAt ? new Date(parsed.data.startsAt) : null;
  const endsAt = parsed.data.endsAt ? new Date(parsed.data.endsAt) : null;

  if (startsAt && endsAt && endsAt <= startsAt) {
    return { ok: false, error: "The end date must be after the start date." };
  }

  await db.homepageSection.update({
    where: { id: parsed.data.id },
    data: { startsAt, endsAt },
  });

  revalidateStorefront();
  return { ok: true, message: "Schedule saved." };
}

export async function createSection({
  type,
  label,
  campaignId,
}: {
  type: SectionType;
  label: string;
  campaignId?: string | null;
}): Promise<CmsResult> {
  await requireArea("homepage");

  if (!(type in sectionSchemas)) {
    return { ok: false, error: "Unknown section type." };
  }

  const last = await db.homepageSection.findFirst({
    where: { campaignId: campaignId ?? null },
    orderBy: { position: "desc" },
    select: { position: true },
  });

  // Seed with schema defaults where the type allows it. Types with required
  // fields (a hero needs an image) are created hidden and invalid-by-design
  // until edited — better than inventing placeholder content that could go
  // live by accident.
  const defaults = sectionSchemas[type].safeParse({});

  const created = await db.homepageSection.create({
    data: {
      campaignId: campaignId ?? null,
      type,
      label: label.trim().slice(0, 80) || type,
      position: (last?.position ?? -1) + 1,
      isActive: false,
      settings: (defaults.success ? defaults.data : {}) as never,
    },
    select: { id: true },
  });

  revalidateStorefront();
  return {
    ok: true,
    id: created.id,
    message: "Section added. It stays hidden until you publish it.",
  };
}

export async function updateSectionSettings({
  id,
  settings,
}: {
  id: string;
  settings: unknown;
}): Promise<CmsResult> {
  await requireArea("homepage");

  const section = await db.homepageSection.findUnique({
    where: { id },
    select: { type: true },
  });
  if (!section) return { ok: false, error: "Section not found." };

  const parsed = parseSectionSettings(section.type as SectionType, settings);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return {
      ok: false,
      error: issue
        ? `${issue.path.join(".") || "settings"}: ${issue.message}`
        : "Those settings aren't valid.",
    };
  }

  await db.homepageSection.update({
    where: { id },
    data: { settings: parsed.data as never },
  });

  revalidateStorefront();
  return { ok: true, message: "Section saved." };
}

export async function renameSection(
  id: string,
  label: string,
): Promise<CmsResult> {
  await requireArea("homepage");

  const trimmed = label.trim().slice(0, 80);
  if (!trimmed) return { ok: false, error: "Enter a name." };

  await db.homepageSection.update({ where: { id }, data: { label: trimmed } });

  revalidatePath("/admin/homepage");
  return { ok: true, message: "Renamed." };
}

/* -----------------------------------------------------------------------------
 * Campaigns
 * -------------------------------------------------------------------------- */

export async function setCampaignStatus(
  id: string,
  status: "DRAFT" | "SCHEDULED" | "ARCHIVED",
): Promise<CmsResult> {
  await requireArea("campaigns");

  const campaign = await db.campaign.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!campaign) return { ok: false, error: "Campaign not found." };

  await db.campaign.update({ where: { id }, data: { status } });

  // Whether a campaign is LIVE is decided by its dates at read time; status
  // only controls eligibility. Setting SCHEDULED on a campaign whose window is
  // open right now makes it live immediately, by design.
  revalidatePath("/", "layout");
  revalidatePath("/admin/campaigns");

  return { ok: true, message: `Campaign set to ${status.toLowerCase()}.` };
}

/* -----------------------------------------------------------------------------
 * Static content pages
 * -------------------------------------------------------------------------- */

const staticPageSchema = z.object({
  slug: z.string().min(1).max(40),
  title: z.string().trim().min(2).max(120),
  intro: z.string().trim().max(300),
  body: z.string().max(40_000),
  seoTitle: z.string().trim().max(120),
  seoDescription: z.string().trim().max(300),
});

export async function saveStaticPage(
  input: z.input<typeof staticPageSchema>,
): Promise<CmsResult> {
  await requireArea("seo");

  const parsed = staticPageSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Please check the fields.",
    };
  }

  const { slug, ...content } = parsed.data;

  await db.setting.upsert({
    where: { key: `page:${slug}` },
    update: { value: content as never },
    create: { key: `page:${slug}`, value: content as never },
  });

  // A page moves from noindex to indexable the moment it has a body, so its
  // metadata has to be regenerated, not just its markup.
  revalidatePath(`/${slug}`);
  revalidatePath("/sitemap.xml");
  revalidatePath("/admin/pages");

  return { ok: true, message: "Page saved." };
}
