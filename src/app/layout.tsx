import type { Metadata, Viewport } from "next";

import {
  AnalyticsScripts,
  GtmNoScript,
} from "@/components/analytics/scripts";
import { fontVariables } from "@/lib/fonts";
import { publicEnv } from "@/lib/env";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(publicEnv.siteUrl),
  title: {
    default: "Aastha Silver & Jewels — 925 Sterling Silver Jewellery",
    template: "%s | Aastha Silver & Jewels",
  },
  description:
    "Hallmarked 925 sterling silver jewellery. Rings, earrings, necklaces, anklets and chains, with a certificate of authenticity on every order.",
  applicationName: "Aastha Silver & Jewels",
  referrer: "strict-origin-when-cross-origin",
  formatDetection: { telephone: false, address: false, email: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5, // Never below 5 — pinch-zoom is an accessibility requirement.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf8f5" },
    { media: "(prefers-color-scheme: dark)", color: "#143537" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-IN" className={fontVariables} suppressHydrationWarning>
      <head>
        <link rel="icon" type="image/svg+xml" href="/aastha-logo-monogram.svg" />
        <link rel="preload" as="image" href="/banner-poster-mobile.webp" media="(max-width: 767px)" fetchPriority="high" />
        <link rel="preload" as="image" href="/banner-poster.jpg" media="(min-width: 768px)" fetchPriority="high" />
        <link rel="preconnect" href="https://res.cloudinary.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://res.cloudinary.com" />
      </head>
      <body>
        {/* GTM's noscript iframe must be the first element inside <body>. */}
        <GtmNoScript />
        {children}
        <AnalyticsScripts />
      </body>
    </html>
  );
}
