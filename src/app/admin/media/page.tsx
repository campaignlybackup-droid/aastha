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
  const rawParams = searchParams ? await searchParams : {};
  const params = rawParams || {};

  const folder = FOLDERS.includes(params.folder as MediaFolder)
    ? (params.folder as MediaFolder)
    : undefined;
  const query = params.q?.trim() ?? "";

  const media = await db.media.findMany({
    where: {
      ...(folder ? { folder } : {}),
      ...(query
        ? {
            OR: [
              { filename: { contains: query, mode: "insensitive" } },
              { alt: { contains: query, mode: "insensitive" } },
              { tags: { has: query.toLowerCase() } },
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

  const cloudinaryReady = Boolean(publicEnv.cloudinaryCloudName);

  return (
    <>
      <AdminHeading
        title="Media"
        description={`${media.length} file${media.length === 1 ? "" : "s"}`}
      />

      {!cloudinaryReady ? (
        <Alert variant="warning" title="Uploads are not enabled yet" className="mb-6">
          Set <code>NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME</code>,{" "}
          <code>CLOUDINARY_API_KEY</code> and <code>CLOUDINARY_API_SECRET</code>{" "}
          to upload real photography. The files below are the generated
          placeholders that ship with the seed.
        </Alert>
      ) : null}

      <Panel>
        <MediaLibrary
          media={media.map((item) => ({
            ...item,
            createdAt:
              typeof item.createdAt === "string"
                ? item.createdAt
                : item.createdAt?.toISOString() ?? new Date().toISOString(),
            usageCount: item._count.productImages,
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
