"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";

export function RouteTracker({ gaId }: { gaId: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const url = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : "");

    // Track GA4 page views
    if (typeof window !== "undefined" && typeof (window as any).gtag === "function") {
      (window as any).gtag("config", gaId, {
        page_path: url,
      });
    }

    // Track GTM page views if GTM is configured
    if (typeof window !== "undefined" && typeof (window as any).dataLayer !== "undefined") {
      (window as any).dataLayer.push({
        event: "page_view",
        page: url,
      });
    }

    // Track Meta Pixel page views
    if (typeof window !== "undefined" && typeof (window as any).fbq === "function") {
      (window as any).fbq("track", "PageView");
    }
  }, [pathname, searchParams, gaId]);

  return null;
}
