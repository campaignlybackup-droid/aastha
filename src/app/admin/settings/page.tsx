import { AdminHeading } from "@/components/admin/ui";
import { SettingsForm } from "@/components/admin/settings-form";
import { requireArea } from "@/server/auth";
import { getSetting } from "@/server/catalog";

export const metadata = { title: "Settings" };

export default async function AdminSettingsPage() {
  await requireArea("settings");

  const [contact, shipping, announcement, social, brand] = await Promise.all([
    getSetting("contact"),
    getSetting("shipping"),
    getSetting("announcement"),
    getSetting("social"),
    getSetting("brand"),
  ]);

  return (
    <>
      <AdminHeading
        title="Settings"
        description="These values appear across the storefront. Anything left blank is hidden rather than shown empty."
      />

      <SettingsForm
        initial={{ contact, shipping, announcement, social, brand }}
      />
    </>
  );
}
