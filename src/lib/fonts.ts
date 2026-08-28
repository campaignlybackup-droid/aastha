import { Playfair_Display, Plus_Jakarta_Sans } from "next/font/google";

/**
 * Premium typography suite for Aastha Silver & Jewels:
 * - Plus Jakarta Sans: Modern luxury sans-serif for UI, body, FAQs, cards & controls.
 * - Playfair Display: Refined high-contrast serif for editorial headlines & brand titles.
 */

export const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-playfair",
  display: "swap",
  adjustFontFallback: true,
});

export const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-jakarta",
  display: "swap",
});

export const fontVariables = `${playfair.variable} ${jakarta.variable}`;
