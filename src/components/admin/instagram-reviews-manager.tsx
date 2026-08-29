"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, ArrowUp, ArrowDown, Image as ImageIcon } from "lucide-react";

import { Panel } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  Input,
  Label,
  NativeSelect,
  Textarea,
} from "@/components/ui/field";
import { Alert } from "@/components/ui/primitives";
import { MediaImage } from "@/components/ui/media-image";
import { adminSaveSetting } from "@/server/actions/admin";
import type { InstagramReviewsSettings } from "@/server/catalog";
import { DEFAULT_IG_REVIEWS } from "@/components/storefront/instagram-reviews-section";

type MediaOption = { id: string; secureUrl: string; filename: string | null };

export function InstagramReviewsManager({
  initial,
  media = [],
}: {
  initial?: InstagramReviewsSettings;
  media?: MediaOption[];
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [feedback, setFeedback] = React.useState<{
    tone: "success" | "danger";
    text: string;
  } | null>(null);

  const [eyebrow, setEyebrow] = React.useState(
    initial?.eyebrow ?? "Instagram DM Reviews"
  );
  const [title, setTitle] = React.useState(
    initial?.title ?? "Loved by 2,000+ Silver Enthusiasts"
  );
  const [description, setDescription] = React.useState(
    initial?.description ??
      "Direct messages and order love from our Instagram family across India."
  );

  const rawItems =
    initial?.items && initial.items.length > 0 ? initial.items : DEFAULT_IG_REVIEWS;

  const [items, setItems] = React.useState<
    Array<{ id: string; imageSrc: string; chatSnippet: string; timeAgo: string }>
  >(
    rawItems.map((item, idx) => ({
      id: item.id || `ig-item-${idx}-${Date.now()}`,
      imageSrc: item.imageSrc || "",
      chatSnippet: item.chatSnippet || "",
      timeAgo: item.timeAgo || "1d ago",
    }))
  );

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: `ig-item-${Date.now()}`,
        imageSrc: "",
        chatSnippet: "Loved the craftsmanship and genuine 925 silver finish! ✨",
        timeAgo: "1d ago",
      },
    ]);
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const moveItem = (index: number, direction: "up" | "down") => {
    setItems((prev) => {
      const copy = [...prev];
      const target = direction === "up" ? index - 1 : index + 1;
      if (target < 0 || target >= copy.length) return prev;
      const temp = copy[index];
      copy[index] = copy[target];
      copy[target] = temp;
      return copy;
    });
  };

  const updateItem = (
    index: number,
    field: "imageSrc" | "chatSnippet" | "timeAgo",
    value: string
  ) => {
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleSave = () => {
    setFeedback(null);
    startTransition(async () => {
      const payload: InstagramReviewsSettings = {
        eyebrow,
        title,
        description,
        items,
      };
      const res = await adminSaveSetting("instagram_reviews", payload);
      setFeedback(
        res.ok
          ? { tone: "success", text: "Instagram review screenshots updated successfully!" }
          : { tone: "danger", text: res.error }
      );
      if (res.ok) router.refresh();
    });
  };

  return (
    <div className="space-y-6">
      <Panel>
        <div className="border-b border-line p-5">
          <h2 className="text-base font-semibold text-brand-950">
            Instagram DM Reviews Settings
          </h2>
          <p className="text-xs text-content-muted mt-0.5">
            Configure heading, subtext, and custom Instagram chat review screenshots shown on the storefront marquee.
          </p>
        </div>

        <div className="p-5 space-y-4">
          <Field>
            <Label>Badge / Eyebrow Text</Label>
            <Input
              value={eyebrow}
              onChange={(e) => setEyebrow(e.target.value)}
              placeholder="e.g. Instagram DM Reviews"
            />
          </Field>

          <Field>
            <Label>Heading</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Loved by 2,000+ Silver Enthusiasts"
            />
          </Field>

          <Field>
            <Label>Supporting Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Direct messages and order love from our Instagram family..."
              rows={2}
            />
          </Field>
        </div>
      </Panel>

      <Panel>
        <div className="flex items-center justify-between border-b border-line p-5">
          <div>
            <h3 className="text-sm font-semibold text-brand-950">
              Instagram DM Screenshots ({items.length})
            </h3>
            <p className="text-xs text-content-muted">
              Add screenshot images of actual customer Instagram DMs or WhatsApp reviews.
            </p>
          </div>

          <Button size="sm" variant="outline" onClick={addItem}>
            <Plus className="size-3.5 mr-1" aria-hidden="true" />
            Add Screenshot Card
          </Button>
        </div>

        <div className="divide-y divide-line">
          {items.map((item, idx) => (
            <div key={item.id} className="p-5 space-y-4 bg-surface hover:bg-sand-50/50 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-brand-950">
                  Card #{idx + 1}
                </span>

                <div className="flex items-center gap-1">
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    disabled={idx === 0}
                    onClick={() => moveItem(idx, "up")}
                    title="Move up"
                  >
                    <ArrowUp className="size-3.5" />
                  </Button>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    disabled={idx === items.length - 1}
                    onClick={() => moveItem(idx, "down")}
                    title="Move down"
                  >
                    <ArrowDown className="size-3.5" />
                  </Button>
                  <Button
                    size="icon-sm"
                    variant="danger"
                    onClick={() => removeItem(idx)}
                    title="Remove item"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field>
                  <Label>Screenshot Image URL / Media Library</Label>
                  {media.length > 0 ? (
                    <NativeSelect
                      value={media.some((m) => m.secureUrl === item.imageSrc) ? item.imageSrc : ""}
                      onChange={(e) => updateItem(idx, "imageSrc", e.target.value)}
                      className="mb-2"
                    >
                      <option value="">Choose from media library…</option>
                      {media.map((m) => (
                        <option key={m.id} value={m.secureUrl}>
                          {m.filename || m.secureUrl}
                        </option>
                      ))}
                    </NativeSelect>
                  ) : null}

                  <Input
                    value={item.imageSrc}
                    onChange={(e) => updateItem(idx, "imageSrc", e.target.value)}
                    placeholder="or paste image URL (e.g. /reviews/ig-chat-1.jpg or Cloudinary URL)"
                    className="text-xs"
                  />
                  <FieldDescription>
                    Image of the DM review screenshot.
                  </FieldDescription>
                </Field>

                <div className="space-y-4">
                  <Field>
                    <Label>Time Badge</Label>
                    <Input
                      value={item.timeAgo}
                      onChange={(e) => updateItem(idx, "timeAgo", e.target.value)}
                      placeholder="e.g. 2h ago, 1d ago"
                    />
                  </Field>

                  <Field>
                    <Label>Chat Message Snippet / Fallback Caption</Label>
                    <Textarea
                      value={item.chatSnippet}
                      onChange={(e) => updateItem(idx, "chatSnippet", e.target.value)}
                      placeholder="Enter review text snippet..."
                      rows={2}
                    />
                  </Field>
                </div>
              </div>

              {/* Preview Box */}
              {item.imageSrc ? (
                <div className="mt-2 flex items-center gap-3 rounded-lg border border-line bg-sand-100/60 p-2.5">
                  <div className="relative size-16 shrink-0 overflow-hidden rounded-md border border-line bg-surface">
                    <MediaImage src={item.imageSrc} alt="Preview" fill sizes="64px" className="object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-semibold text-brand-950 block truncate">
                      Screenshot Image Ready
                    </span>
                    <span className="text-[11px] text-content-subtle truncate block">
                      {item.imageSrc}
                    </span>
                  </div>
                </div>
              ) : null}
            </div>
          ))}
        </div>

        {feedback ? (
          <div className="p-5">
            <Alert variant={feedback.tone === "success" ? "success" : "danger"}>
              {feedback.text}
            </Alert>
          </div>
        ) : null}

        <div className="p-5 border-t border-line flex items-center justify-between">
          <Button size="sm" variant="outline" onClick={addItem}>
            <Plus className="size-3.5 mr-1" /> Add Screenshot
          </Button>

          <Button size="sm" onClick={handleSave} loading={pending}>
            Save Instagram Reviews
          </Button>
        </div>
      </Panel>
    </div>
  );
}
