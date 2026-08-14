"use client";

import * as React from "react";
import Link from "next/link";
import { Check, Copy } from "lucide-react";

import { MediaImage } from "@/components/ui/media-image";
import { Badge } from "@/components/ui/primitives";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

type MediaItem = {
  id: string;
  publicId: string;
  secureUrl: string;
  folder: string;
  alt: string | null;
  filename: string | null;
  width: number | null;
  height: number | null;
  bytes: number | null;
  createdAt: string;
  usageCount: number;
};

function formatBytes(bytes: number | null): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Media library.
 *
 * Browse, filter and copy URLs. Deletion is intentionally absent: a file can
 * be referenced by a product image, a category, a hero slide or a campaign,
 * and removing one out from under a live page is not recoverable from this
 * screen. Files are managed in Cloudinary, which keeps its own history.
 */
export function MediaLibrary({
  media,
  folders,
  activeFolder,
  query,
  uploadsEnabled,
}: {
  media: MediaItem[];
  folders: string[];
  activeFolder?: string;
  query: string;
  uploadsEnabled: boolean;
}) {
  const [copied, setCopied] = React.useState<string | null>(null);

  async function copyUrl(item: MediaItem) {
    try {
      await navigator.clipboard.writeText(item.secureUrl);
      setCopied(item.id);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      // Clipboard needs a secure context; nothing useful to do if it is absent.
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-4">
        <nav aria-label="Filter by folder" className="flex flex-wrap gap-1.5">
          <Link
            href="/admin/media"
            aria-current={!activeFolder ? "page" : undefined}
            className={
              !activeFolder
                ? "rounded-xs bg-brand-800 px-2.5 py-1 text-xs text-sand-50"
                : "rounded-xs border border-line-strong px-2.5 py-1 text-xs text-content-muted hover:border-[var(--color-accent)]"
            }
          >
            All
          </Link>
          {folders.map((folder) => (
            <Link
              key={folder}
              href={`/admin/media?folder=${folder}`}
              aria-current={activeFolder === folder ? "page" : undefined}
              className={
                activeFolder === folder
                  ? "rounded-xs bg-brand-800 px-2.5 py-1 text-xs text-sand-50"
                  : "rounded-xs border border-line-strong px-2.5 py-1 text-xs text-content-muted hover:border-[var(--color-accent)]"
              }
            >
              {folder.charAt(0) + folder.slice(1).toLowerCase()}
            </Link>
          ))}
        </nav>

        <form method="GET" action="/admin/media" className="ml-auto flex gap-2">
          {activeFolder ? (
            <input type="hidden" name="folder" value={activeFolder} />
          ) : null}
          <label htmlFor="media-search" className="sr-only">
            Search media
          </label>
          <input
            id="media-search"
            name="q"
            defaultValue={query}
            placeholder="Filename, alt text or tag"
            className="h-8 w-52 rounded-xs border border-line-strong bg-surface-raised px-2 text-sm outline-none focus:border-[var(--color-accent)]"
          />
          <button
            type="submit"
            className="rounded-xs border border-line-strong px-2.5 text-xs hover:border-[var(--color-accent)]"
          >
            Search
          </button>
        </form>
      </div>

      {uploadsEnabled ? (
        <p className="border-b border-line bg-surface-sunken px-5 py-3 text-xs text-content-muted">
          Upload new photography in Cloudinary under the{" "}
          <code>aastha</code> folder; it appears here once attached to a
          product.
        </p>
      ) : null}

      {media.length === 0 ? (
        <p className="px-5 py-16 text-center text-sm text-content-muted">
          No media in this view.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {media.map((item) => (
            <li key={item.id} className="group">
              <div className="relative aspect-square overflow-hidden rounded-sm border border-line bg-sand-100">
                <MediaImage
                  src={item.secureUrl}
                  alt={item.alt ?? ""}
                  fill
                  sizes="(min-width: 1280px) 18vw, (min-width: 640px) 30vw, 45vw"
                  className="object-cover"
                />

                <button
                  type="button"
                  onClick={() => copyUrl(item)}
                  aria-label={`Copy URL for ${item.filename ?? item.publicId}`}
                  className={cn(
                    "absolute right-2 top-2 inline-flex size-8 items-center justify-center rounded-xs bg-surface-raised/90 text-content-muted transition-opacity",
                    "opacity-0 group-hover:opacity-100 focus-visible:opacity-100",
                  )}
                >
                  {copied === item.id ? (
                    <Check className="size-3.5 text-success-700" aria-hidden="true" />
                  ) : (
                    <Copy className="size-3.5" aria-hidden="true" />
                  )}
                </button>
              </div>

              <div className="mt-2 space-y-1">
                <p className="truncate text-xs text-content" title={item.filename ?? ""}>
                  {item.filename ?? item.publicId}
                </p>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant="outline">{item.folder.toLowerCase()}</Badge>
                  {item.usageCount > 0 ? (
                    <Badge variant="neutral">
                      used {item.usageCount}×
                    </Badge>
                  ) : (
                    <Badge variant="warning">unused</Badge>
                  )}
                </div>
                <p className="text-xs text-content-subtle">
                  {item.width && item.height
                    ? `${item.width}×${item.height} · `
                    : ""}
                  {formatBytes(item.bytes)} · {formatDate(item.createdAt)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
