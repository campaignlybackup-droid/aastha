"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/lib/db";
import { env, integrations, publicEnv } from "@/lib/env";
import { requireArea } from "@/server/auth";
import type { MediaFolder } from "@/generated/prisma/enums";

/**
 * Media uploads.
 *
 * Files go BROWSER → CLOUDINARY directly, never through this server. Proxying
 * a 5 MB photograph through a serverless function wastes the request budget
 * and risks the body-size limit for no benefit.
 *
 * The upload is signed rather than unsigned: an unsigned preset is a public
 * write endpoint into your media library that anyone who views source can
 * abuse. The signature is minted here, is valid for one upload, and pins the
 * folder so a caller cannot write outside it.
 */

export type MediaResult =
  | { ok: true; message?: string }
  | { ok: false; error: string };

export type UploadSignature = {
  ok: true;
  cloudName: string;
  apiKey: string;
  timestamp: number;
  folder: string;
  signature: string;
};

const FOLDERS = [
  "PRODUCT",
  "HERO",
  "BANNER",
  "CATEGORY",
  "CAMPAIGN",
  "REVIEW",
  "OTHER",
] as const;

/**
 * Cloudinary signs the SHA-1 of the alphabetically-sorted parameter string
 * plus the API secret. Only the parameters included here may be sent with the
 * upload; anything extra invalidates it.
 */
export async function createUploadSignature(
  folder: string,
): Promise<UploadSignature | { ok: false; error: string }> {
  await requireArea("media");

  if (!integrations.cloudinary()) {
    return {
      ok: false,
      error:
        "Cloudinary is not configured. Add NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET.",
    };
  }

  const chosen = (FOLDERS as readonly string[]).includes(folder)
    ? folder
    : "OTHER";

  const scopedFolder = `${env().CLOUDINARY_FOLDER}/${chosen.toLowerCase()}`;
  const timestamp = Math.floor(Date.now() / 1000);

  const signature = createHash("sha1")
    .update(`folder=${scopedFolder}&timestamp=${timestamp}${env().CLOUDINARY_API_SECRET}`)
    .digest("hex");

  return {
    ok: true,
    cloudName: publicEnv.cloudinaryCloudName,
    apiKey: env().CLOUDINARY_API_KEY,
    timestamp,
    folder: scopedFolder,
    signature,
  };
}

const registerSchema = z.object({
  publicId: z.string().min(1).max(300),
  url: z.string().min(1).max(1000),
  secureUrl: z.string().min(1).max(1000),
  format: z.string().max(20).optional(),
  width: z.number().int().positive().max(20_000).optional(),
  height: z.number().int().positive().max(20_000).optional(),
  bytes: z.number().int().positive().max(50_000_000).optional(),
  filename: z.string().max(200).optional(),
  folder: z.enum(FOLDERS),
  alt: z.string().max(200).optional(),
});

/**
 * Records an uploaded file.
 *
 * The URLs are validated against the configured Cloudinary cloud before being
 * stored — otherwise this endpoint would let a staff account point a product
 * image at any host on the internet.
 */
export async function registerUploadedMedia(
  input: z.input<typeof registerSchema>,
): Promise<MediaResult> {
  const staff = await requireArea("media");

  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "That upload could not be recorded." };
  }

  const data = parsed.data;
  const expectedPrefix = `https://res.cloudinary.com/${publicEnv.cloudinaryCloudName}/`;

  if (!data.secureUrl.startsWith(expectedPrefix)) {
    return {
      ok: false,
      error: "That file did not come from this store's Cloudinary account.",
    };
  }

  await db.media.upsert({
    where: { publicId: data.publicId },
    update: {
      url: data.url,
      secureUrl: data.secureUrl,
      format: data.format ?? null,
      width: data.width ?? null,
      height: data.height ?? null,
      bytes: data.bytes ?? null,
    },
    create: {
      publicId: data.publicId,
      url: data.url,
      secureUrl: data.secureUrl,
      format: data.format ?? null,
      width: data.width ?? null,
      height: data.height ?? null,
      bytes: data.bytes ?? null,
      filename: data.filename ?? null,
      folder: data.folder as MediaFolder,
      alt: data.alt ?? null,
      uploadedById: staff.id,
    },
  });

  revalidatePath("/admin/media");

  return { ok: true, message: "Uploaded." };
}

/** Updates the alt text on an existing file. */
export async function updateMediaAlt(
  id: string,
  alt: string,
): Promise<MediaResult> {
  await requireArea("media");

  await db.media.update({
    where: { id },
    data: { alt: alt.trim().slice(0, 200) || null },
  });

  revalidatePath("/admin/media");
  return { ok: true, message: "Description saved." };
}
