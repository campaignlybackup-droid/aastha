import { AnnouncementBar } from "@/components/storefront/announcement-bar";
import { Footer } from "@/components/storefront/footer";
import { Header } from "@/components/storefront/header";
import { WhatsAppFloat } from "@/components/storefront/whatsapp-float";
import { publicEnv } from "@/lib/env";
import { getSetting } from "@/server/catalog";
import { getComboOffers } from "@/server/combos";
import { campaignThemeStyle, getActiveCampaign } from "@/server/homepage";

/**
 * Storefront shell.
 *
 * A live campaign contributes two things here: its announcement text, and an
 * accent override applied as inline custom properties on the wrapper. Scoping
 * the override to this element rather than <html> keeps the admin area on the
 * default palette even while a festival campaign is running.
 */
export default async function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [campaign, announcement, contact, activeCombos] = await Promise.all([
    getActiveCampaign(),
    getSetting("announcement"),
    getSetting("contact"),
    getComboOffers(true),
  ]);

  const hasActiveCombos = activeCombos.length > 0;

  const announcementText = campaign?.announcementText || announcement.text;
  const announcementHref = campaign?.announcementLink || announcement.href;
  const showAnnouncement = Boolean(
    campaign?.announcementText || (announcement.enabled && announcement.text),
  );

  const whatsappNumber = contact.whatsapp || publicEnv.supportWhatsapp;

  return (
    <div
      style={campaignThemeStyle(campaign?.theme)}
      className="flex min-h-dvh flex-col overflow-x-hidden"
      data-campaign={campaign?.slug ?? undefined}
    >
      {/* Keyboard users land here first; the storefront nav is long. */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-sm focus:bg-[var(--color-accent)] focus:px-4 focus:py-2 focus:text-sm focus:text-[var(--color-accent-contrast)]"
      >
        Skip to content
      </a>

      {showAnnouncement ? (
        <AnnouncementBar text={announcementText} href={announcementHref} />
      ) : null}

      <Header hasActiveCombos={hasActiveCombos} />

      <main id="main" className="flex-1">
        {children}
      </main>

      <Footer />

      <WhatsAppFloat number={whatsappNumber} />
    </div>
  );
}
