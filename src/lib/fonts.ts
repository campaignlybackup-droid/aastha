import { Cormorant_Garamond, Inter } from "next/font/google";

/**
 * Both faces are self-hosted by next/font at build time, so there is no
 * render-blocking request to fonts.googleapis.com and no layout shift from a
 * late-arriving webfont.
 */

export const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
  display: "swap",
  // Metric-matched fallback so the swap does not reflow headings.
  adjustFontFallback: true,
});

export const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const fontVariables = `${cormorant.variable} ${inter.variable}`;
