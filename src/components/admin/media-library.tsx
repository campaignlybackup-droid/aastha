"use client";

import * as React from "react";
import Link from "next/link";
import { Check, Copy, Eye, Trash2, X, CheckSquare, Square, ExternalLink } from "lucide-react";

import { MediaUpload } from "@/components/admin/media-upload";
import { MediaImage } from "@/components/ui/media-image";
import { Badge, Alert } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { formatDate, cn } from "@/lib/utils";
import { adminDeleteMediaItems } from "@/server/actions/admin";

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
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [viewingItem, setViewingItem] = React.useState<MediaItem | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [feedback, setFeedback] = React.useState<{ message: string; isError: boolean } | null>(null);

  async function copyUrl(url: string, id: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(id);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      // Ignore if clipboard unallowed
    }
  }

  function toggleSelect(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  }

  function toggleSelectAll() {
    if (selectedIds.length === media.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(media.map((m) => m.id));
    }
  }

  async function handleDeleteSelected() {
    if (selectedIds.length === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedIds.length} item(s) from database?`)) {
      return;
    }

    setIsDeleting(true);
    setFeedback(null);

    const res = await adminDeleteMediaItems(selectedIds);
    setIsDeleting(false);

    if (!res.ok) {
      setFeedback({ message: res.error, isError: true });
      return;
    }

    setSelectedIds([]);
    if (viewingItem && selectedIds.includes(viewingItem.id)) {
      setViewingItem(null);
    }
    setFeedback({ message: res.message || "Deleted successfully.", isError: false });
  }

  async function handleDeleteSingle(id: string) {
    if (!confirm("Are you sure you want to delete this media item from database?")) return;

    setIsDeleting(true);
    setFeedback(null);

    const res = await adminDeleteMediaItems([id]);
    setIsDeleting(false);

    if (!res.ok) {
      setFeedback({ message: res.error, isError: true });
      return;
    }

    if (viewingItem?.id === id) {
      setViewingItem(null);
    }
    setSelectedIds((prev) => prev.filter((i) => i !== id));
    setFeedback({ message: "Media deleted from database.", isError: false });
  }

  return (
    <div>
      <MediaUpload enabled={uploadsEnabled} />

      {/* --- Filter & Search Header ------------------------------------ */}
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
            All ({media.length})
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

      {/* --- Batch Selection Toolbar ------------------------------------ */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-sand-50 px-5 py-2.5 border-b border-line text-xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggleSelectAll}
            className="flex items-center gap-1.5 font-medium text-content hover:text-[var(--color-accent)]"
          >
            {selectedIds.length > 0 && selectedIds.length === media.length ? (
              <CheckSquare className="size-4 text-[var(--color-accent)]" />
            ) : (
              <Square className="size-4 text-content-muted" />
            )}
            {selectedIds.length === media.length ? "Deselect All" : "Select All"}
          </button>

          {selectedIds.length > 0 ? (
            <span className="font-semibold text-brand-900">
              {selectedIds.length} item(s) selected
            </span>
          ) : null}
        </div>

        {selectedIds.length > 0 ? (
          <Button
            size="sm"
            variant="danger"
            onClick={handleDeleteSelected}
            loading={isDeleting}
            className="h-7 text-xs px-2.5"
          >
            <Trash2 className="mr-1 size-3.5" />
            Delete Selected ({selectedIds.length})
          </Button>
        ) : null}
      </div>

      {feedback ? (
        <div className="p-4">
          <Alert variant={feedback.isError ? "danger" : "success"}>
            {feedback.message}
          </Alert>
        </div>
      ) : null}

      {/* --- Media Grid ------------------------------------------------ */}
      {media.length === 0 ? (
        <p className="px-5 py-16 text-center text-sm text-content-muted">
          No media in this view.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {media.map((item) => {
            const isSelected = selectedIds.includes(item.id);
            return (
              <li
                key={item.id}
                className={cn(
                  "group relative rounded-sm border p-1.5 transition-all bg-surface-raised",
                  isSelected
                    ? "border-[var(--color-accent)] ring-2 ring-[var(--color-accent)]/20"
                    : "border-line hover:border-line-strong",
                )}
              >
                <div
                  className="relative aspect-square overflow-hidden rounded-xs bg-sand-100 cursor-pointer"
                  onClick={() => setViewingItem(item)}
                >
                  <MediaImage
                    src={item.secureUrl}
                    alt={item.alt ?? ""}
                    fill
                    sizes="(min-width: 1280px) 18vw, (min-width: 640px) 30vw, 45vw"
                    className="object-cover transition-transform duration-200 group-hover:scale-105"
                  />

                  {/* Select Checkbox Button */}
                  <button
                    type="button"
                    onClick={(e) => toggleSelect(item.id, e)}
                    className="absolute left-2 top-2 z-10 flex size-6 items-center justify-center rounded-xs bg-surface-raised/90 shadow-2xs transition-opacity"
                    title={isSelected ? "Deselect" : "Select"}
                  >
                    {isSelected ? (
                      <CheckSquare className="size-4 text-[var(--color-accent)]" />
                    ) : (
                      <Square className="size-4 text-content-subtle" />
                    )}
                  </button>

                  {/* Quick Action Overlay */}
                  <div className="absolute inset-0 bg-sand-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => setViewingItem(item)}
                      aria-label="View photo details"
                      className="flex size-8 items-center justify-center rounded-full bg-white text-content shadow-md hover:bg-sand-100"
                    >
                      <Eye className="size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        copyUrl(item.secureUrl, item.id);
                      }}
                      aria-label="Copy URL"
                      className="flex size-8 items-center justify-center rounded-full bg-white text-content shadow-md hover:bg-sand-100"
                    >
                      {copied === item.id ? (
                        <Check className="size-4 text-emerald-600" />
                      ) : (
                        <Copy className="size-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Info Metadata Footer */}
                <div className="mt-2 space-y-1">
                  <p
                    className="truncate text-xs font-medium text-content cursor-pointer hover:text-[var(--color-accent)]"
                    title={item.filename ?? ""}
                    onClick={() => setViewingItem(item)}
                  >
                    {item.filename ?? item.publicId}
                  </p>
                  <div className="flex flex-wrap items-center justify-between gap-1">
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      {item.folder.toLowerCase()}
                    </Badge>
                    {item.usageCount > 0 ? (
                      <Badge variant="neutral" className="text-[10px] px-1.5 py-0">
                        used {item.usageCount}×
                      </Badge>
                    ) : (
                      <Badge variant="warning" className="text-[10px] px-1.5 py-0">
                        unused
                      </Badge>
                    )}
                  </div>
                  <p className="text-[10px] text-content-subtle">
                    {item.width && item.height ? `${item.width}×${item.height} · ` : ""}
                    {formatBytes(item.bytes)}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* --- Full-Screen Lightbox & Details Modal ------------------------ */}
      {viewingItem ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-sand-950/80 p-4 backdrop-blur-sm">
          <div className="relative flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-surface-raised shadow-2xl md:flex-row">
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setViewingItem(null)}
              className="absolute right-3 top-3 z-10 flex size-9 items-center justify-center rounded-full bg-sand-900/60 text-white hover:bg-sand-900"
            >
              <X className="size-5" />
            </button>

            {/* Image Preview Box */}
            <div className="relative min-h-[280px] w-full bg-sand-950 md:w-3/5 flex items-center justify-center p-4">
              <MediaImage
                src={viewingItem.secureUrl}
                alt={viewingItem.alt ?? ""}
                width={viewingItem.width || 800}
                height={viewingItem.height || 800}
                className="max-h-[70vh] max-w-full object-contain"
              />
            </div>

            {/* Photo Metadata & Actions Drawer */}
            <div className="flex w-full flex-col justify-between p-6 md:w-2/5 border-t md:border-t-0 md:border-l border-line overflow-y-auto">
              <div className="space-y-4">
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-content-subtle">
                    Media Details
                  </span>
                  <h3 className="mt-1 break-all font-display text-lg font-semibold text-sand-950">
                    {viewingItem.filename ?? viewingItem.publicId}
                  </h3>
                </div>

                <div className="space-y-2 text-xs divide-y divide-line">
                  <div className="flex justify-between py-1.5">
                    <span className="text-content-muted">Folder</span>
                    <span className="font-medium capitalize">{viewingItem.folder}</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-content-muted">Dimensions</span>
                    <span className="font-medium">
                      {viewingItem.width && viewingItem.height
                        ? `${viewingItem.width} × ${viewingItem.height} px`
                        : "—"}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-content-muted">File Size</span>
                    <span className="font-medium">{formatBytes(viewingItem.bytes)}</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-content-muted">Uploaded</span>
                    <span className="font-medium">{formatDate(viewingItem.createdAt)}</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-content-muted">Usage in Store</span>
                    <span className="font-medium">
                      {viewingItem.usageCount > 0 ? `Used ${viewingItem.usageCount} time(s)` : "Unused"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Modal Action Buttons */}
              <div className="mt-6 space-y-2.5 border-t border-line pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyUrl(viewingItem.secureUrl, viewingItem.id)}
                  className="w-full justify-center"
                >
                  {copied === viewingItem.id ? (
                    <>
                      <Check className="mr-2 size-4 text-emerald-600" />
                      URL Copied to Clipboard!
                    </>
                  ) : (
                    <>
                      <Copy className="mr-2 size-4" />
                      Copy Image URL
                    </>
                  )}
                </Button>

                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="w-full justify-center text-xs"
                >
                  <a href={viewingItem.secureUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-2 size-3.5" />
                    Open Full Image in New Tab
                  </a>
                </Button>

                <Button
                  variant="danger"
                  size="sm"
                  loading={isDeleting}
                  onClick={() => handleDeleteSingle(viewingItem.id)}
                  className="w-full justify-center"
                >
                  <Trash2 className="mr-2 size-4" />
                  Delete from Database
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
