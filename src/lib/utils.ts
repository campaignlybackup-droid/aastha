import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * tailwind-merge has to be told about our custom font sizes.
 *
 * Its default config only knows Tailwind's built-in scale, so it parses an
 * unrecognised `text-*` as a COLOUR. That made `cn("text-display-md",
 * "text-sand-50")` silently drop the size — the two looked like competing
 * colours — and every display heading combined with a colour rendered at the
 * 16px base instead. Registering them as font sizes fixes the whole class.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        { text: ["display-sm", "display-md", "display-lg", "display-xl"] },
      ],
    },
  },
});

/** Merge Tailwind classes with conflict resolution. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Convert arbitrary text into a URL-safe slug.
 * Used for products, categories, collections and campaigns.
 */
export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);
}

/** Truncate to a character budget on a word boundary, appending an ellipsis. */
export function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

/** Strip HTML tags — used to derive meta descriptions from rich text. */
export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function formatDate(
  date: Date | string,
  style: "short" | "long" = "short",
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: style === "long" ? "long" : "medium",
    timeZone: "Asia/Kolkata",
  }).format(d);
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(d);
}

/**
 * Normalise an Indian mobile number to E.164 digits without the "+".
 * Accepts "9876543210", "+91 98765 43210", "09876543210".
 * Returns null when the input is not a plausible Indian mobile number.
 */
export function normaliseMobile(input: string): string | null {
  let digits = input.replace(/\D/g, "");

  // Strip a leading STD "0" first, so "09876543210" and "0919876543210" both
  // reduce to the cases below. Every spelling of one number must normalise to
  // the same string — this is the identity key for a customer account, and a
  // miss here creates a duplicate account instead of signing them in.
  if (digits.length > 10 && digits.startsWith("0")) {
    digits = digits.replace(/^0+/, "");
  }

  // Country code, with or without it.
  if (digits.length === 12 && digits.startsWith("91")) {
    digits = digits.slice(2);
  }

  return digits.length === 10 && /^[6-9]/.test(digits) ? `91${digits}` : null;
}

/** Render a stored E.164 mobile for display: "919876543210" → "+91 98765 43210". */
export function formatMobile(e164: string): string {
  if (e164.length === 12 && e164.startsWith("91")) {
    const n = e164.slice(2);
    return `+91 ${n.slice(0, 5)} ${n.slice(5)}`;
  }
  return `+${e164}`;
}

/** Mask a mobile for confirmation screens: "919876543210" → "+91 ***** 43210". */
export function maskMobile(e164: string): string {
  if (e164.length === 12 && e164.startsWith("91")) {
    return `+91 ***** ${e164.slice(-5)}`;
  }
  return `+${e164.slice(0, 2)}*****${e164.slice(-4)}`;
}

/** Stable, dependency-free array chunking for batch operations. */
export function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

/** Remove null/undefined entries so objects can be spread into Prisma calls. */
export function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined && v !== null),
  ) as Partial<T>;
}
