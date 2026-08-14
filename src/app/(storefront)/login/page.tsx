import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/storefront/login-form";
import { Logo } from "@/components/storefront/logo";
import { getCurrentUser } from "@/server/auth";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to Aastha Silver & Jewels with your mobile number.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const [{ next }, user] = await Promise.all([searchParams, getCurrentUser()]);

  // Already signed in — no reason to show the form.
  if (user) redirect(next && next.startsWith("/") ? next : "/account");

  return (
    <div className="u-container flex min-h-[70dvh] items-center justify-center py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-4 text-center">
          <Logo size="lg" asLink={false} />
          <div className="space-y-1.5">
            <h1 className="font-display text-2xl">Sign in</h1>
            <p className="text-sm text-content-muted">
              Enter your mobile number to sign in or create an account.
            </p>
          </div>
        </div>

        <LoginForm next={next} />
      </div>
    </div>
  );
}
