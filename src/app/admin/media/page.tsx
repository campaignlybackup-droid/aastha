import { AdminHeading, Panel } from "@/components/admin/ui";
import { MediaLibrary } from "@/components/admin/media-library";
import { Alert } from "@/components/ui/primitives";
import { db } from "@/lib/db";
import { publicEnv } from "@/lib/env";
import { requireArea } from "@/server/auth";
import type { MediaFolder } from "@/generated/prisma/enums";

export const metadata = { title: "Media" };

const FOLDERS: MediaFolder[] = [
  "PRODUCT",
  "HERO",
  "BANNER",
  "CATEGORY",
  "CAMPAIGN",
  "REVIEW",
  "OTHER",
];

export default async function AdminMediaPage({
  searchParams,
}: {
  searchParams: Promise<{ folder?: string; q?: string }>;
}) {
  await requireArea("media");
  
  let folder: MediaFolder | undefined = undefined;
  let query = "";
  let mediaList: Array<{
    id: string;
    publicId: string;
    secureUrl: string;
    folder: string;
    alt: string | null;
    filename: string | null;
    width: number | null;
    height: number | null;
    bytes: number | null;
    createdAt: Date | string;
    _count?: { productImages: number };
  }> = [];
  let dbError: string | null = null;

  try {
    const rawParams = searchParams ? await searchParams : {};
    const params = rawParams || {};

    folder = FOLDERS.includes(params.folder as MediaFolder)
      ? (params.folder as MediaFolder)
      : undefined;
    query = params.q?.trim() ?? "";

    mediaList = await db.media.findMany({
      where: {
        ...(folder ? { folder } : {}),
        ...(query
          ? {
              OR: [
                { filename: { contains: query, mode: "insensitive" } },
                { alt: { contains: query, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 120,
      select: {
        id: true,
        publicId: true,
        secureUrl: true,
        folder: true,
        alt: true,
        filename: true,
        width: true,
        height: true,
        bytes: true,
        createdAt: true,
        _count: { select: { productImages: true } },
      },
    });
  } catch (err) {
    console.error("[admin/media] Error fetching media files:", err);
    dbError = err instanceof Error ? err.message : "Failed to query database for media files.";
  }

  const cloudinaryReady = Boolean(publicEnv.cloudinaryCloudName);

  return (
    <>
      <AdminHeading
        title="Media Library"
        description={`${mediaList.length} file${mediaList.length === 1 ? "" : "s"}`}
      />

      {dbError ? (
        <Alert variant="danger" title="Database Notice" className="mb-6">
          {dbError}
        </Alert>
      ) : null}

      {!cloudinaryReady ? (
        <Alert variant="warning" title="Cloudinary Configuration Required" className="mb-6">
          To upload media files to Cloudinary, add <code>NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME</code>,{" "}
          <code>CLOUDINARY_API_KEY</code> and <code>CLOUDINARY_API_SECRET</code> to your environment settings.
        </Alert>
      ) : null}

      <Panel>
        <MediaLibrary
          media={mediaList.map((item) => ({
            ...item,
            createdAt:
              typeof item.createdAt === "string"
                ? item.createdAt
                : item.createdAt?.toISOString() ?? new Date().toISOString(),
            usageCount: item._count?.productImages ?? 0,
          }))}
          folders={FOLDERS}
          activeFolder={folder}
          query={query}
          uploadsEnabled={true}
        />
      </Panel>
    </>
  );
}
