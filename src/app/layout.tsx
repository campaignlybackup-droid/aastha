import type { Metadata, Viewport } from "next";

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
    "Hallmarked 925 sterling silver jewellery, handcrafted in India. Rings, earrings, necklaces, bangles and anklets with a lifetime authenticity guarantee.",
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
    { media: "(prefers-color-scheme: dark)", color: "#16302d" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-IN" className={fontVariables} suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
