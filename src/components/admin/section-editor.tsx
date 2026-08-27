"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";

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
import { updateSectionSettings } from "@/server/actions/cms";
import {
  SECTION_FORMS,
  getAtPath,
  setAtPath,
  type FieldSpec,
  type RepeaterSpec,
} from "@/lib/cms/fields";
import { SECTION_LABELS, type SectionType } from "@/lib/cms/sections";

type MediaOption = { id: string; url: string; label: string };
type ProductOption = { id: string; name: string; sku: string; pricePaise: number };

/**
 * Section settings editor.
 *
 * Forms are generated from the field specs in lib/cms/fields.ts rather than
 * hand-written per type, so a new section type needs a spec and nothing else.
 * Zod still validates on save — a spec that drifts from its schema surfaces as
 * a field-level error instead of writing bad settings.
 */
export function SectionEditor({
  sectionId,
  type,
  initialSettings,
  media,
  products = [],
}: {
  sectionId: string;
  type: SectionType;
  initialSettings: Record<string, unknown>;
  media: MediaOption[];
  products?: ProductOption[];
}) {
  const router = useRouter();
  const [settings, setSettings] = React.useState(initialSettings);
  const [pending, startTransition] = React.useTransition();
  const [message, setMessage] = React.useState<
    { tone: "success" | "danger"; text: string } | null
  >(null);

  const spec = SECTION_FORMS[type];

  const update = (path: string, value: unknown) => {
    setSettings((current) => setAtPath(current, path, value));
    setMessage(null);
  };

  const handleSave = () => {
    setMessage(null);
    startTransition(async () => {
      const result = await updateSectionSettings({ id: sectionId, settings });
      setMessage(
        result.ok
          ? { tone: "success", text: result.message ?? "Saved." }
          : { tone: "danger", text: result.error },
      );
      if (result.ok) router.refresh();
    });
  };

  // No spec for this type — fall back to raw JSON so it is still editable
  // rather than being a dead end.
  if (!spec) {
    return (
      <RawJsonEditor
        settings={settings}
        onChange={setSettings}
        onSave={handleSave}
        pending={pending}
        message={message}
      />
    );
  }

  return (
    <div className="space-y-6 px-5 py-4">
      <p className="text-xs text-content-subtle">
        Editing a {SECTION_LABELS[type].toLowerCase()} section.
      </p>

      {spec.fields.length ? (
        <div className="space-y-6">
          {spec.fields.map((field) => (
            <FieldControl
              key={field.path}
              field={field}
              value={getAtPath(settings, field.path)}
              media={media}
              products={products}
              onChange={(value) => update(field.path, value)}
            />
          ))}
        </div>
      ) : null}

      {spec.repeaters?.map((repeater) => (
        <Repeater
          key={repeater.path}
          spec={repeater}
          items={(getAtPath(settings, repeater.path) as unknown[]) ?? []}
          media={media}
          onChange={(items) => update(repeater.path, items)}
        />
      ))}

      {message ? (
        <Alert variant={message.tone === "success" ? "success" : "danger"}>
          {message.text}
        </Alert>
      ) : null}

      <div className="pt-4 border-t border-line">
        <Button size="sm" onClick={handleSave} loading={pending}>
          Save section
        </Button>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function FieldControl({
  field,
  value,
  media,
  products = [],
  onChange,
}: {
  field: FieldSpec;
  value: unknown;
  media: MediaOption[];
  products?: ProductOption[];
  onChange: (value: unknown) => void;
}) {
  return (
    <div>
      <Field>
        <Label>{field.label}</Label>

        {field.kind === "text" || field.kind === "link" ? (
          <Input
            value={typeof value === "string" ? value : ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
          />
        ) : null}

        {field.kind === "textarea" ? (
          <Textarea
            rows={2}
            value={typeof value === "string" ? value : ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
          />
        ) : null}

        {field.kind === "richtext" ? (
          <Textarea
            rows={6}
            value={typeof value === "string" ? value : ""}
            onChange={(e) => onChange(e.target.value)}
            className="font-mono text-xs"
          />
        ) : null}

        {field.kind === "number" ? (
          <Input
            inputMode="numeric"
            value={typeof value === "number" ? String(value) : ""}
            onChange={(e) => {
              const parsed = Number.parseInt(e.target.value.replace(/\D/g, ""), 10);
              onChange(Number.isFinite(parsed) ? parsed : undefined);
            }}
          />
        ) : null}

        {field.kind === "boolean" ? (
          <label className="flex cursor-pointer items-center gap-2 pt-1 text-sm">
            <input
              type="checkbox"
              checked={value === true}
              onChange={(e) => onChange(e.target.checked)}
              className="size-4 accent-[var(--color-accent)]"
            />
            <span className="text-content-muted">Yes</span>
          </label>
        ) : null}

        {field.kind === "select" ? (
          <NativeSelect
            value={typeof value === "string" ? value : ""}
            onChange={(e) => onChange(e.target.value)}
          >
            {field.options?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </NativeSelect>
        ) : null}

        {field.kind === "image" ? (
          <ImagePicker
            value={typeof value === "string" ? value : ""}
            media={media}
            onChange={onChange}
          />
        ) : null}

        {field.kind === "productSource" ? (
          <ProductSourcePicker
            value={(value as Record<string, unknown>) ?? {}}
            products={products}
            onChange={onChange}
          />
        ) : null}

        {field.help ? <FieldDescription>{field.help}</FieldDescription> : null}
      </Field>
    </div>
  );
}

function ImagePicker({
  value,
  media,
  onChange,
}: {
  value: string;
  media: MediaOption[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-3">
      <NativeSelect
        value={media.some((m) => m.url === value) ? value : ""}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Choose from media…</option>
        {media.map((option) => (
          <option key={option.id} value={option.url}>
            {option.label}
          </option>
        ))}
      </NativeSelect>

      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="or paste an image URL"
        className="text-xs"
      />

      {value ? (
        <div className="relative h-28 w-full overflow-hidden rounded-sm border border-line bg-sand-100">
          <MediaImage src={value} alt="" fill sizes="400px" className="object-contain" />
        </div>
      ) : null}
    </div>
  );
}

function ProductSourcePicker({
  value,
  products = [],
  onChange,
}: {
  value: Record<string, unknown>;
  products?: ProductOption[];
  onChange: (value: Record<string, unknown>) => void;
}) {
  const mode = typeof value.mode === "string" ? value.mode : "new";
  const limit = typeof value.limit === "number" ? value.limit : 8;
  const currentProductIds = Array.isArray(value.productIds)
    ? (value.productIds as string[])
    : [];

  const [searchTerm, setSearchTerm] = React.useState("");

  const set = (patch: Record<string, unknown>) =>
    onChange({ ...value, productIds: currentProductIds, ...patch });

  const filteredProducts = searchTerm.trim()
    ? products.filter(
        (p) =>
          p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.sku.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    : products;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-semibold text-content-subtle mb-1" htmlFor="source-mode">
            Product Source Mode
          </label>
          <NativeSelect
            id="source-mode"
            value={mode}
            onChange={(e) => set({ mode: e.target.value })}
          >
            <option value="new">Newest arrivals</option>
            <option value="bestsellers">Best sellers (Automatic / Pinned)</option>
            <option value="manual">Pick products manually (Hand-picked)</option>
            <option value="featured">Featured products</option>
            <option value="category">A category</option>
            <option value="collection">A collection</option>
          </NativeSelect>
        </div>

        <div>
          <label className="block text-xs font-semibold text-content-subtle mb-1" htmlFor="source-limit">
            Display Limit (Count)
          </label>
          <Input
            id="source-limit"
            inputMode="numeric"
            value={String(limit)}
            onChange={(e) => {
              const parsed = Number.parseInt(e.target.value.replace(/\D/g, ""), 10);
              set({ limit: Number.isFinite(parsed) ? parsed : 8 });
            }}
            placeholder="How many"
          />
        </div>

        {mode === "category" ? (
          <div className="sm:col-span-2">
            <Input
              value={typeof value.categorySlug === "string" ? value.categorySlug : ""}
              onChange={(e) => set({ categorySlug: e.target.value })}
              placeholder="Category slug, e.g. earrings"
            />
          </div>
        ) : null}

        {mode === "collection" ? (
          <div className="sm:col-span-2">
            <Input
              value={typeof value.collectionSlug === "string" ? value.collectionSlug : ""}
              onChange={(e) => set({ collectionSlug: e.target.value })}
              placeholder="Collection slug, e.g. bridal-edit"
            />
          </div>
        ) : null}
      </div>

      {/* Manual & Best Sellers Product Selector */}
      {mode === "manual" || mode === "bestsellers" ? (
        <div className="space-y-3 rounded-md border border-line p-3.5 bg-surface-sunken/40">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-brand-950">
              {mode === "manual"
                ? "Hand-picked Products List"
                : "Hand-picked / Pinned Best Sellers"}
            </span>
            <a
              href="/admin/bestsellers"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-semibold text-brand-900 hover:text-gold-700 underline"
            >
              Open Full Best Sellers Manager →
            </a>
          </div>

          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search catalogue products by name or SKU..."
            className="text-xs"
          />

          {products.length > 0 ? (
            <div className="max-h-52 overflow-y-auto space-y-1 rounded border border-line p-2 text-xs bg-surface divide-y divide-line/40">
              {filteredProducts.map((prod) => {
                const isChecked = currentProductIds.includes(prod.id);
                return (
                  <label
                    key={prod.id}
                    className="flex items-center justify-between gap-2 cursor-pointer hover:bg-sand-100 p-1.5 rounded transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          const next = e.target.checked
                            ? [...currentProductIds, prod.id]
                            : currentProductIds.filter((id) => id !== prod.id);
                          set({ productIds: next });
                        }}
                        className="size-4 accent-brand-900 shrink-0"
                      />
                      <span className="truncate font-medium text-content">{prod.name}</span>
                      <span className="text-[10px] text-content-subtle uppercase shrink-0">
                        {prod.sku}
                      </span>
                    </div>

                    {isChecked ? (
                      <span className="text-[10px] font-bold text-gold-600 bg-gold-50 px-1.5 py-0.5 rounded border border-gold-300">
                        Selected
                      </span>
                    ) : null}
                  </label>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-content-subtle">No active products found.</p>
          )}

          {currentProductIds.length > 0 ? (
            <div className="pt-2 border-t border-line/60 flex items-center justify-between">
              <span className="text-[11px] text-content-muted">
                Selected IDs: {currentProductIds.join(", ")}
              </span>
              <button
                type="button"
                onClick={() => set({ productIds: [] })}
                className="text-[11px] text-danger-600 underline hover:text-danger-800"
              >
                Clear all selections
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function Repeater({
  spec,
  items,
  media,
  onChange,
}: {
  spec: RepeaterSpec;
  items: unknown[];
  media: MediaOption[];
  onChange: (items: unknown[]) => void;
}) {
  const [open, setOpen] = React.useState<number | null>(0);

  const updateItem = (index: number, path: string, value: unknown) => {
    const next = [...items];
    next[index] = setAtPath(
      (next[index] as Record<string, unknown>) ?? {},
      path,
      value,
    );
    onChange(next);
  };

  return (
    <section className="rounded-sm border border-line">
      <header className="flex items-center justify-between border-b border-line px-4 py-2.5">
        <h3 className="text-sm font-medium">{spec.label}</h3>
        <span className="text-xs text-content-subtle">
          {items.length} of {spec.max}
        </span>
      </header>

      <ul className="divide-y divide-line">
        {items.map((item, index) => {
          const title =
            (getAtPath(item, spec.titlePath) as string) ||
            `${spec.itemLabel} ${index + 1}`;
          const expanded = open === index;

          return (
            <li key={index}>
              <div className="flex items-center gap-2 px-4 py-2.5">
                <button
                  type="button"
                  onClick={() => setOpen(expanded ? null : index)}
                  aria-expanded={expanded}
                  className="min-w-0 flex-1 truncate text-left text-sm hover:text-[var(--color-accent)]"
                >
                  {title}
                </button>

                <button
                  type="button"
                  onClick={() => onChange(items.filter((_, i) => i !== index))}
                  disabled={items.length <= spec.min}
                  aria-label={`Remove ${title}`}
                  title={
                    items.length <= spec.min
                      ? `At least ${spec.min} required`
                      : `Remove ${title}`
                  }
                  className="inline-flex size-7 items-center justify-center rounded-xs border border-line-strong text-content-muted hover:border-danger-500 hover:text-danger-700 disabled:opacity-30"
                >
                  <Trash2 className="size-3" aria-hidden="true" />
                </button>
              </div>

              {expanded ? (
                <div className="grid gap-4 border-t border-line bg-surface-sunken px-4 py-4 sm:grid-cols-2">
                  {spec.fields.map((field) => (
                    <FieldControl
                      key={field.path}
                      field={field}
                      value={getAtPath(item, field.path)}
                      media={media}
                      onChange={(value: unknown) => updateItem(index, field.path, value)}
                    />
                  ))}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>

      {items.length < spec.max ? (
        <div className="border-t border-line px-4 py-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              onChange([...items, structuredClone(spec.blank)]);
              setOpen(items.length);
            }}
          >
            <Plus aria-hidden="true" />
            Add {spec.itemLabel.toLowerCase()}
          </Button>
        </div>
      ) : null}
    </section>
  );
}

function RawJsonEditor({
  settings,
  onChange,
  onSave,
  pending,
  message,
}: {
  settings: Record<string, unknown>;
  onChange: (settings: Record<string, unknown>) => void;
  onSave: () => void;
  pending: boolean;
  message: { tone: "success" | "danger"; text: string } | null;
}) {
  const [text, setText] = React.useState(() => JSON.stringify(settings, null, 2));
  const [parseError, setParseError] = React.useState<string | null>(null);

  return (
    <div className="space-y-4">
      <Alert variant="info">
        This section type has no generated form yet, so its settings are edited
        as JSON. They are still validated on save.
      </Alert>

      <Field error={parseError}>
        <Label>Settings JSON</Label>
        <Textarea
          rows={16}
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            try {
              onChange(JSON.parse(event.target.value) as Record<string, unknown>);
              setParseError(null);
            } catch {
              setParseError("That is not valid JSON yet.");
            }
          }}
          className="font-mono text-xs"
        />
      </Field>

      {message ? (
        <Alert variant={message.tone === "success" ? "success" : "danger"}>
          {message.text}
        </Alert>
      ) : null}

      <Button onClick={onSave} loading={pending} disabled={Boolean(parseError)}>
        Save section
      </Button>
    </div>
  );
}
