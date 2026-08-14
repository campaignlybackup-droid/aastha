"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/field";
import { Alert } from "@/components/ui/primitives";
import {
  createUploadSignature,
  registerUploadedMedia,
} from "@/server/actions/media";

const FOLDERS = [
  "PRODUCT",
  "HERO",
  "BANNER",
  "CATEGORY",
  "CAMPAIGN",
  "OTHER",
] as const;

const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/avif"];

type CloudinaryResponse = {
  public_id?: string;
  url?: string;
  secure_url?: string;
  format?: string;
  width?: number;
  height?: number;
  bytes?: number;
  original_filename?: string;
  error?: { message?: string };
};

/**
 * Direct-to-Cloudinary upload.
 *
 * The file never touches our server: we mint a one-shot signature, the browser
 * POSTs straight to Cloudinary, and only the resulting metadata comes back for
 * recording. That keeps large images out of the serverless request budget.
 *
 * Files are validated client-side for type and size purely as a courtesy —
 * `registerUploadedMedia` re-checks the returned URL against the configured
 * cloud, which is the check that actually matters.
 */
export function MediaUpload({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [folder, setFolder] = React.useState<string>("PRODUCT");
  const [busy, setBusy] = React.useState(false);
  const [progress, setProgress] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<
    { tone: "success" | "danger"; text: string } | null
  >(null);

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;

    setMessage(null);
    setBusy(true);

    let uploaded = 0;
    const failures: string[] = [];

    try {
      for (const [index, file] of Array.from(files).entries()) {
        setProgress(`Uploading ${index + 1} of ${files.length}…`);

        if (!ACCEPTED.includes(file.type)) {
          failures.push(`${file.name}: not a JPEG, PNG, WebP or AVIF`);
          continue;
        }
        if (file.size > MAX_BYTES) {
          failures.push(`${file.name}: larger than 10 MB`);
          continue;
        }

        // A fresh signature per file — each one is single-use.
        const signed = await createUploadSignature(folder);
        if (!signed.ok) {
          failures.push(signed.error);
          break;
        }

        const body = new FormData();
        body.append("file", file);
        body.append("api_key", signed.apiKey);
        body.append("timestamp", String(signed.timestamp));
        body.append("folder", signed.folder);
        body.append("signature", signed.signature);

        const response = await fetch(
          `https://api.cloudinary.com/v1_1/${signed.cloudName}/image/upload`,
          { method: "POST", body },
        );

        const data = (await response.json()) as CloudinaryResponse;

        if (!response.ok || !data.public_id || !data.secure_url) {
          failures.push(`${file.name}: ${data.error?.message ?? "upload failed"}`);
          continue;
        }

        const recorded = await registerUploadedMedia({
          publicId: data.public_id,
          url: data.url ?? data.secure_url,
          secureUrl: data.secure_url,
          format: data.format,
          width: data.width,
          height: data.height,
          bytes: data.bytes,
          filename: data.original_filename ?? file.name,
          folder: folder as (typeof FOLDERS)[number],
        });

        if (!recorded.ok) {
          failures.push(`${file.name}: ${recorded.error}`);
          continue;
        }

        uploaded += 1;
      }

      setMessage(
        failures.length
          ? {
              tone: uploaded ? "success" : "danger",
              text: `${uploaded} uploaded. ${failures.length} failed — ${failures[0]}`,
            }
          : { tone: "success", text: `${uploaded} file${uploaded === 1 ? "" : "s"} uploaded.` },
      );

      router.refresh();
    } finally {
      setBusy(false);
      setProgress(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  if (!enabled) return null;

  return (
    <div className="space-y-3 border-b border-line px-5 py-4">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label
            htmlFor="upload-folder"
            className="mb-1 block text-xs text-content-muted"
          >
            Upload to
          </label>
          <NativeSelect
            id="upload-folder"
            value={folder}
            onChange={(event) => setFolder(event.target.value)}
            className="h-9 w-44"
          >
            {FOLDERS.map((option) => (
              <option key={option} value={option}>
                {option.charAt(0) + option.slice(1).toLowerCase()}
              </option>
            ))}
          </NativeSelect>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED.join(",")}
          multiple
          onChange={(event) => onFiles(event.target.files)}
          className="hidden"
          id="media-file-input"
        />

        <Button
          type="button"
          variant="outline"
          size="sm"
          loading={busy}
          onClick={() => inputRef.current?.click()}
        >
          {!busy && <Upload aria-hidden="true" />}
          Choose images
        </Button>

        <p className="text-xs text-content-subtle">
          JPEG, PNG, WebP or AVIF · up to 10 MB each. Portrait crops around
          1200×1500 suit the product grid best.
        </p>
      </div>

      {progress ? (
        <p className="text-xs text-content-muted" role="status">
          {progress}
        </p>
      ) : null}

      {message ? (
        <Alert variant={message.tone === "success" ? "success" : "danger"}>
          {message.text}
        </Alert>
      ) : null}
    </div>
  );
}
