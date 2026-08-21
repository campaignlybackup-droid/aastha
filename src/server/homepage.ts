import "server-only";

import { cache } from "react";

import { db } from "@/lib/db";
import { parseSectionForRender, type ParsedSection } from "@/lib/cms/sections";

/**
 * Resolves what the homepage should look like right now.
 *
 * Campaign takeover works entirely on dates — there is no cron job that
 * "activates" a campaign and no manual switch to flip. A campaign is live when
 * its window contains the current instant and its status is not DRAFT or
 * ARCHIVED. When the window closes, this resolver stops selecting it and the
 * default sections return on the next request. That is the whole mechanism.
 *
 * Overlapping campaigns resolve by `priority`, then by the later start date.
 */

export type ResolvedHomepage = {
  sections: ParsedSection[];
  campaign: {
    id: string;
    name: string;
    slug: string;
    theme: Record<string, string> | null;
    announcementText: string | null;
    announcementLink: string | null;
  } | null;
};

/** Campaign statuses that are eligible to take over, given a matching window. */
const LIVE_STATUSES = ["SCHEDULED", "ACTIVE"] as const;

export const getActiveCampaign = cache(async (now: Date = new Date()) => {
  return db.campaign.findFirst({
    where: {
      status: { in: [...LIVE_STATUSES] },
      startsAt: { lte: now },
      endsAt: { gte: now },
    },
    orderBy: [{ priority: "desc" }, { startsAt: "desc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      theme: true,
      announcementText: true,
      announcementLink: true,
    },
  });
});

/**
 * A section is visible when it is enabled and, if it carries its own schedule,
 * the current time falls inside it. Per-section scheduling is independent of
 * campaigns so a single banner can be timed without building a whole campaign.
 */
function isVisible(section: {
  isActive: boolean;
  startsAt: Date | null;
  endsAt: Date | null;
}, now: Date) {
  if (!section.isActive) return false;
  if (section.startsAt && section.startsAt > now) return false;
  if (section.endsAt && section.endsAt < now) return false;
  return true;
}

export async function getHomepage({
  now = new Date(),
  /** Preview mode includes disabled and out-of-window sections. */
  preview = false,
  /** Force a specific campaign's layout, for admin preview. */
  campaignId,
}: {
  now?: Date;
  preview?: boolean;
  campaignId?: string;
} = {}): Promise<ResolvedHomepage> {
  try {
    let campaign = null as Awaited<ReturnType<typeof getActiveCampaign>>;

    if (campaignId) {
      campaign = await db.campaign.findUnique({
        where: { id: campaignId },
        select: {
          id: true,
          name: true,
          slug: true,
          theme: true,
          announcementText: true,
          announcementLink: true,
        },
      });
    } else {
      campaign = await getActiveCampaign(now);
    }

    const rows = await db.homepageSection.findMany({
      where: { campaignId: campaign?.id ?? null },
      orderBy: { position: "asc" },
      select: {
        id: true,
        type: true,
        label: true,
        settings: true,
        isActive: true,
        startsAt: true,
        endsAt: true,
      },
    });

    // A campaign with no sections of its own would render an empty homepage,
    // which is worse than showing the default. Fall back rather than break.
    const source =
      campaign && rows.length === 0
        ? await db.homepageSection.findMany({
            where: { campaignId: null },
            orderBy: { position: "asc" },
            select: {
              id: true,
              type: true,
              label: true,
              settings: true,
              isActive: true,
              startsAt: true,
              endsAt: true,
            },
          })
        : rows;

    const sections = source
      .filter((s) => preview || isVisible(s, now))
      .map(parseSectionForRender)
      .filter((s): s is ParsedSection => s !== null);

    return {
      sections,
      campaign: campaign
        ? {
            ...campaign,
            theme:
              campaign.theme && typeof campaign.theme === "object"
                ? (campaign.theme as Record<string, string>)
                : null,
          }
        : null,
    };
  } catch (error) {
    console.warn("[getHomepage] Database read failed, returning default fallback layout:", error);
    return { sections: [], campaign: null };
  }
}

/**
 * Maps a campaign's theme JSON onto the CSS custom properties the design system
 * reads. Only the accent triplet is themeable — letting a campaign restyle
 * surfaces and text would risk shipping an unreadable storefront.
 */
export function campaignThemeStyle(
  theme: unknown,
): React.CSSProperties | undefined {
  if (!theme || typeof theme !== "object" || Array.isArray(theme)) {
    return undefined;
  }

  const source = theme as Record<string, unknown>;
  const style: Record<string, string> = {};

  // Only CSS colour values reach the DOM. A campaign is admin-authored, but a
  // stray value here would land in a style attribute — validate the shape.
  const colour = (value: unknown) =>
    typeof value === "string" && /^#[0-9a-f]{3,8}$/i.test(value.trim())
      ? value.trim()
      : null;

  const accent = colour(source.accent);
  const accentHover = colour(source.accentHover);
  const accentContrast = colour(source.accentContrast);

  if (accent) style["--color-accent"] = accent;
  if (accentHover) style["--color-accent-hover"] = accentHover;
  if (accentContrast) style["--color-accent-contrast"] = accentContrast;

  return Object.keys(style).length ? (style as React.CSSProperties) : undefined;
}
