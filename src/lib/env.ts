import "server-only";

import { z } from "zod";

/**
 * Server-side environment contract.
 *
 * Importing this module from a client component is a build error by design
 * (`server-only`), so secrets cannot leak into the browser bundle.
 *
 * Validation is lazy: `env()` parses on first access rather than at module
 * load. That keeps `next build` working in CI without production secrets while
 * still failing loudly the moment a route actually needs a missing value.
 */

const optional = z.string().trim().optional().default("");

const schema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),

  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  DIRECT_DATABASE_URL: optional,

  SESSION_SECRET: z
    .string()
    .min(32, "SESSION_SECRET must be at least 32 characters"),
  OTP_PEPPER: z.string().min(16, "OTP_PEPPER must be at least 16 characters"),
  ADMIN_BOOTSTRAP_MOBILES: optional,

  SMS_DRIVER: z.enum(["console", "msg91"]).default("console"),
  MSG91_AUTH_KEY: optional,
  MSG91_SENDER_ID: optional,
  MSG91_OTP_TEMPLATE_ID: optional,

  RAZORPAY_KEY_SECRET: z.string().trim().optional().default("4jm8Ub7r3PHp5FZy8Bu3mQ6V"),
  RAZORPAY_WEBHOOK_SECRET: z.string().trim().optional().default("whsec_test_b67d6a3532448c5b755de112f41450cd"),

  CLOUDINARY_API_KEY: optional,
  CLOUDINARY_API_SECRET: optional,
  CLOUDINARY_FOLDER: z.string().trim().default("aastha"),

  WHATSAPP_DRIVER: z.enum(["console", "cloud"]).default("console"),
  WHATSAPP_ACCESS_TOKEN: optional,
  WHATSAPP_PHONE_NUMBER_ID: optional,
  WHATSAPP_BUSINESS_ACCOUNT_ID: optional,

  EMAIL_DRIVER: z.enum(["console", "resend"]).default("console"),
  RESEND_API_KEY: optional,
  EMAIL_FROM: z.string().trim().default("Aastha Silver & Jewels <aasthasilverandjewels@gmail.com>"),

  META_CAPI_ACCESS_TOKEN: optional,
  META_CAPI_TEST_EVENT_CODE: optional,

  CRON_SECRET: optional,
});

export type ServerEnv = z.infer<typeof schema>;

let cached: ServerEnv | null = null;

export function env(): ServerEnv {
  if (cached) return cached;

  const parsed = schema.safeParse(process.env);

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `  • ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(
      `Invalid server environment configuration:\n${details}\n\n` +
        `Copy .env.example to .env and fill in the missing values.`,
    );
  }

  cached = parsed.data;
  return cached;
}

/**
 * Whether a given integration has enough configuration to run for real.
 * Routes use this to degrade gracefully instead of throwing at the customer.
 */
export const integrations = {
  razorpay: () => Boolean(env().RAZORPAY_KEY_SECRET && publicEnv.razorpayKeyId),
  razorpayWebhook: () => Boolean(env().RAZORPAY_WEBHOOK_SECRET),
  cloudinary: () =>
    Boolean(
      env().CLOUDINARY_API_KEY &&
        env().CLOUDINARY_API_SECRET &&
        publicEnv.cloudinaryCloudName,
    ),
  whatsapp: () =>
    env().WHATSAPP_DRIVER === "cloud" &&
    Boolean(env().WHATSAPP_ACCESS_TOKEN && env().WHATSAPP_PHONE_NUMBER_ID),
  metaCapi: () =>
    Boolean(env().META_CAPI_ACCESS_TOKEN && publicEnv.metaPixelId),
  email: () => env().EMAIL_DRIVER === "resend" && Boolean(env().RESEND_API_KEY),
  sms: () => env().SMS_DRIVER === "msg91" && Boolean(env().MSG91_AUTH_KEY),
};

/**
 * Public values, safe for the browser.
 *
 * These are read as literal `process.env.NEXT_PUBLIC_*` member expressions
 * because Next.js inlines them at build time only when written that way —
 * dynamic lookups like `process.env[key]` are NOT replaced and would be
 * `undefined` in the browser.
 */
export const publicEnv = {
  siteUrl: (() => {
    const raw = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000")
      .trim()
      .replace(/\/$/, "");
    if (!raw.startsWith("http://") && !raw.startsWith("https://")) {
      return `https://${raw}`;
    }
    return raw;
  })(),
  razorpayKeyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "rzp_live_TSrlBSoTbyjL4f",
  cloudinaryCloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "",
  supportWhatsapp: process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP || "919116662871",
  metaPixelId: process.env.NEXT_PUBLIC_META_PIXEL_ID || "846146745157978",
  ga4MeasurementId: process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID || "G-QJ90CG4PQM",
  gtmContainerId: process.env.NEXT_PUBLIC_GTM_CONTAINER_ID || "",
} as const;
