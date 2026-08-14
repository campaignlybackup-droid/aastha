import Link from "next/link";

import { AccountNav } from "@/components/storefront/account-nav";
import { PageHeader } from "@/components/storefront/page-header";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/server/auth";

export const dynamic = "force-dynamic";

export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser("/account");

  return (
    <>
      <PageHeader
        crumbs={[
          { name: "Home", href: "/" },
          { name: "My Account", href: "/account" },
        ]}
        eyebrow={user.name ? `Hello, ${user.name.split(" ")[0]}` : "Welcome"}
        title="My Account"
      >
        {/* Staff get a way back to the admin without typing the URL. */}
        {user.role !== "CUSTOMER" ? (
          <div className="mt-6">
            <Button asChild variant="outline" size="sm">
              <Link href="/admin">Go to admin dashboard</Link>
            </Button>
          </div>
        ) : null}
      </PageHeader>

      <div className="u-container pb-24">
        <div className="grid gap-10 lg:grid-cols-[14rem_1fr] lg:gap-14">
          <AccountNav />
          <div className="min-w-0">{children}</div>
        </div>
      </div>
    </>
  );
}
