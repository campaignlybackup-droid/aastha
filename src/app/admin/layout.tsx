import type { Metadata } from "next";

import { AdminSidebar } from "@/components/admin/sidebar";
import { requireStaff } from "@/server/auth";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Aastha Admin" },
  // The admin must never be indexed, even if a URL leaks.
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

/**
 * Admin shell.
 *
 * `requireStaff` runs here, so every nested route is gated by the layout
 * rather than by each page remembering to check. Non-staff are redirected to
 * the storefront rather than shown a 403 — an unauthorised visitor should not
 * learn that this area exists.
 *
 * The admin deliberately does NOT sit inside the storefront layout: no
 * campaign theming, no announcement bar, no customer chrome.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireStaff();

  return (
    <div className="flex min-h-dvh flex-col bg-surface-sunken lg:flex-row">
      <AdminSidebar
        role={user.role}
        user={{ name: user.name, mobile: user.mobile }}
      />

      <main className="min-w-0 flex-1">
        <div className="mx-auto w-full max-w-7xl px-5 py-8 lg:px-10 lg:py-12">
          {children}
        </div>
      </main>
    </div>
  );
}
