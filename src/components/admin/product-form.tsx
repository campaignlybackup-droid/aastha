"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink, GripVertical, Plus, Trash2, X } from "lucide-react";
import { MediaUpload } from "@/components/admin/media-upload";
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
import { Alert, Badge } from "@/components/ui/primitives";
import { MediaImage } from "@/components/ui/media-image";
import { saveProduct, type ProductInput } from "@/server/actions/product-admin";
import { cn } from "@/lib/utils";

type Option = { id: string; name: string };
type MediaOption = { id: string; url: string; label: string };

type VariantRow = {
  id?: string;
  title: string;
  sku: string;
  optionValues: string[];
  priceRupees: string;
  mrpRupees: string;
  stockQuantity: string;
  lowStockThreshold: string;
  trackInventory: boolean;
  isActive: boolean;
};

export type ProductFormValues = {
  id?: string;
  name: string;
  slug: string;
  sku: string;
  categoryId: string;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  isFeatured: boolean;
  shortDescription: string;
  description: string;
  tags: string[];
  taxPercent: string;
  silverPurity: string;
  silverWeightGram: string;
  dimensions: string;
  finish: string;
  plating: string;
  stoneType: string;
  stoneColour: string;
  stoneCount: string;
  occasion: string[];
  gender: "" | "WOMEN" | "MEN" | "UNISEX" | "KIDS";
  isAdjustable: boolean;
  careInstructions: string;
  warrantyInfo: string;
  authenticityInfo: string;
  whatsIncluded: string;
  imageIds: string[];
  collectionIds: string[];
  optionNames: string[];
  variants: VariantRow[];
  seoTitle: string;
  seoDescription: string;
  canonicalUrl: string;
};

export const BLANK_VARIANT: VariantRow = {
  title: "Standard",
  sku: "",
  optionValues: [],
  priceRupees: "",
  mrpRupees: "",
  stockQuantity: "0",
  lowStockThreshold: "3",
  trackInventory: true,
  isActive: true,
};

export const BLANK_PRODUCT: ProductFormValues = {
  name: "",
  slug: "",
  sku: "",
  categoryId: "",
  status: "DRAFT",
  isFeatured: false,
  shortDescription: "",
  description: "",
  tags: [],
  taxPercent: "3",
  silverPurity: "925 Sterling Silver",
  silverWeightGram: "",
  dimensions: "",
  finish: "",
  plating: "",
  stoneType: "",
  stoneColour: "",
  stoneCount: "",
  occasion: [],
  gender: "",
  isAdjustable: false,
  careInstructions: "",
  warrantyInfo: "",
  authenticityInfo: "",
  whatsIncluded: "",
  imageIds: [],
  collectionIds: [],
  optionNames: [],
  variants: [{ ...BLANK_VARIANT }],
  seoTitle: "",
  seoDescription: "",
  canonicalUrl: "",
};

/**
 * Product editor.
 *
 * Grouped into panels rather than tabs so the whole record is scannable and
 * printable, and so a validation error is never hidden behind a tab the user
 * cannot see. Numeric fields are held as strings while editing — parsing on
 * every keystroke makes a half-typed "1." unrepresentable.
 */
export function ProductForm({
  initial,
  categories,
  collections,
  media,
}: {
  initial: ProductFormValues;
  categories: Option[];
  collections: Option[];
  media: MediaOption[];
}) {
  const router = useRouter();
  const [form, setForm] = React.useState(initial);
  const [pending, startTransition] = React.useTransition();
  const [message, setMessage] = React.useState<
    { tone: "success" | "danger"; text: string } | null
  >(null);

  const set = <K extends keyof ProductFormValues>(
    key: K,
    value: ProductFormValues[K],
  ) => setForm((f) => ({ ...f, [key]: value }));

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null);

    const payload: ProductInput = {
      id: form.id,
      name: form.name,
      slug: form.slug || undefined,
      sku: form.sku || undefined,
      categoryId: form.categoryId,
      status: form.status,
      isFeatured: form.isFeatured,
      shortDescription: form.shortDescription || undefined,
      description: form.description || undefined,
      tags: form.tags,
      taxPercent: Number(form.taxPercent) || 0,
      silverPurity: form.silverPurity || undefined,
      silverWeightGram: form.silverWeightGram
        ? Number(form.silverWeightGram)
        : null,
      dimensions: form.dimensions || undefined,
      finish: form.finish || undefined,
      plating: form.plating || undefined,
      stoneType: form.stoneType || undefined,
      stoneColour: form.stoneColour || undefined,
      stoneCount: form.stoneCount ? Number(form.stoneCount) : null,
      occasion: form.occasion,
      gender: form.gender || null,
      isAdjustable: form.isAdjustable,
      careInstructions: form.careInstructions || undefined,
      warrantyInfo: form.warrantyInfo || undefined,
      authenticityInfo: form.authenticityInfo || undefined,
      whatsIncluded: form.whatsIncluded || undefined,
      imageIds: form.imageIds,
      collectionIds: form.collectionIds,
      optionNames: form.optionNames.filter(Boolean),
      variants: form.variants.map((variant) => ({
        id: variant.id,
        title: variant.title,
        sku: variant.sku || undefined,
        optionValues: variant.optionValues,
        priceRupees: Number(variant.priceRupees) || 0,
        mrpRupees: Number(variant.mrpRupees) || 0,
        stockQuantity: Number(variant.stockQuantity) || 0,
        lowStockThreshold: Number(variant.lowStockThreshold) || 0,
        trackInventory: variant.trackInventory,
        isActive: variant.isActive,
      })),
      seoTitle: form.seoTitle || undefined,
      seoDescription: form.seoDescription || undefined,
      canonicalUrl: form.canonicalUrl || undefined,
    };

    startTransition(async () => {
      const result = await saveProduct(payload);

      if (!result.ok) {
        setMessage({ tone: "danger", text: result.error });
        // The error banner sits at the bottom of a long form.
        window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
        return;
      }

      setMessage({ tone: "success", text: result.message ?? "Saved." });

      if (!form.id) {
        router.push(`/admin/products/${result.id}`);
        return;
      }
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      {/* --- Basics ------------------------------------------------------- */}
      <Panel title="Basics">
        <div className="space-y-4 px-5 py-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <Label required>Product name</Label>
              <Input
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                required
                maxLength={160}
                placeholder="Anaya Floral Band Ring"
              />
            </Field>

            <Field>
              <Label required>Category</Label>
              <NativeSelect
                value={form.categoryId}
                onChange={(e) => set("categoryId", e.target.value)}
                required
              >
                <option value="">Choose a category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          </div>

          <Field>
            <Label>Short description</Label>
            <Input
              value={form.shortDescription}
              onChange={(e) => set("shortDescription", e.target.value)}
              maxLength={300}
              placeholder="One line that appears under the product name."
            />
          </Field>

          <Field>
            <Label>Full description</Label>
            <Textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              rows={8}
              className="font-mono text-xs"
              placeholder={"<p>What makes this piece worth buying…</p>"}
            />
            <FieldDescription>
              Basic HTML: p, h2, h3, ul, li, strong, em, a. Sanitised before
              display.
            </FieldDescription>
          </Field>

          <TagEditor
            label="Tags"
            help="Used by search and filters. Lowercased automatically."
            values={form.tags}
            onChange={(tags) => set("tags", tags)}
            placeholder="oxidised, stackable…"
          />

          <div className="grid gap-4 sm:grid-cols-3">
            <Field>
              <Label>Status</Label>
              <NativeSelect
                value={form.status}
                onChange={(e) =>
                  set("status", e.target.value as ProductFormValues["status"])
                }
              >
                <option value="DRAFT">Draft — not on the storefront</option>
                <option value="ACTIVE">Active — visible and buyable</option>
                <option value="ARCHIVED">Archived — hidden</option>
              </NativeSelect>
            </Field>

            <Field>
              <Label>GST %</Label>
              <Input
                inputMode="decimal"
                value={form.taxPercent}
                onChange={(e) => set("taxPercent", e.target.value)}
              />
              <FieldDescription>Included in the price shown.</FieldDescription>
            </Field>

            <div className="flex items-end pb-2">
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.isFeatured}
                  onChange={(e) => set("isFeatured", e.target.checked)}
                  className="size-4 accent-[var(--color-accent)]"
                />
                <span className="text-content-muted">Featured</span>
              </label>
            </div>
          </div>

          {form.id ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <Label>URL slug</Label>
                <Input
                  value={form.slug}
                  onChange={(e) => set("slug", e.target.value)}
                  maxLength={96}
                />
                <FieldDescription>
                  Changing this breaks existing links to /product/{form.slug}.
                </FieldDescription>
              </Field>

              <Field>
                <Label>Product SKU</Label>
                <Input value={form.sku} disabled className="opacity-70" />
                <FieldDescription>
                  Fixed after creation — it appears on certificates.
                </FieldDescription>
              </Field>
            </div>
          ) : null}
        </div>
      </Panel>

      {/* --- Images ------------------------------------------------------- */}
      <Panel
        title="Images"
        description="The first image is the primary one, used on cards, social shares and the Meta feed."
      >
        <div className="px-5 py-4">
          <ImagePicker
            media={media}
            selected={form.imageIds}
            onChange={(imageIds) => set("imageIds", imageIds)}
          />
        </div>
      </Panel>

      {/* --- Variants ----------------------------------------------------- */}
      <Panel
        title="Variants and stock"
        description="Every product needs at least one. A product sold in a single configuration just keeps the “Standard” row."
      >
        <div className="space-y-4 px-5 py-4">
          <OptionNames
            names={form.optionNames}
            onChange={(optionNames) => {
              // Keep each variant's values aligned to the option count.
              set("optionNames", optionNames);
              set(
                "variants",
                form.variants.map((v) => ({
                  ...v,
                  optionValues: optionNames.map((_, i) => v.optionValues[i] ?? ""),
                })),
              );
            }}
          />

          <VariantTable
            optionNames={form.optionNames}
            variants={form.variants}
            onChange={(variants) => set("variants", variants)}
          />
        </div>
      </Panel>

      {/* --- Jewellery details -------------------------------------------- */}
      <Panel title="Jewellery details">
        <div className="space-y-4 px-5 py-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field>
              <Label>Silver purity</Label>
              <Input
                value={form.silverPurity}
                onChange={(e) => set("silverPurity", e.target.value)}
                placeholder="925 Sterling Silver"
              />
            </Field>

            <Field>
              <Label>Weight (grams)</Label>
              <Input
                inputMode="decimal"
                value={form.silverWeightGram}
                onChange={(e) => set("silverWeightGram", e.target.value)}
              />
            </Field>

            <Field>
              <Label>Dimensions</Label>
              <Input
                value={form.dimensions}
                onChange={(e) => set("dimensions", e.target.value)}
                placeholder="18mm x 12mm"
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field>
              <Label>Finish</Label>
              <Input
                value={form.finish}
                onChange={(e) => set("finish", e.target.value)}
                placeholder="Oxidised, High Polish…"
              />
            </Field>

            <Field>
              <Label>Plating</Label>
              <Input
                value={form.plating}
                onChange={(e) => set("plating", e.target.value)}
                placeholder="Rhodium"
              />
            </Field>

            <Field>
              <Label>Worn by</Label>
              <NativeSelect
                value={form.gender}
                onChange={(e) =>
                  set("gender", e.target.value as ProductFormValues["gender"])
                }
              >
                <option value="">Not specified</option>
                <option value="WOMEN">Women</option>
                <option value="MEN">Men</option>
                <option value="UNISEX">Unisex</option>
                <option value="KIDS">Kids</option>
              </NativeSelect>
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field>
              <Label>Stone type</Label>
              <Input
                value={form.stoneType}
                onChange={(e) => set("stoneType", e.target.value)}
                placeholder="Cubic Zircon, Freshwater Pearl…"
              />
            </Field>

            <Field>
              <Label>Stone colour</Label>
              <Input
                value={form.stoneColour}
                onChange={(e) => set("stoneColour", e.target.value)}
              />
            </Field>

            <Field>
              <Label>Stone count</Label>
              <Input
                inputMode="numeric"
                value={form.stoneCount}
                onChange={(e) =>
                  set("stoneCount", e.target.value.replace(/\D/g, ""))
                }
              />
            </Field>
          </div>

          <TagEditor
            label="Occasions"
            help="Feeds the Occasion filter on listing pages."
            values={form.occasion}
            onChange={(occasion) => set("occasion", occasion)}
            placeholder="Everyday, Wedding, Gifting…"
            preserveCase
          />

          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.isAdjustable}
              onChange={(e) => set("isAdjustable", e.target.checked)}
              className="size-4 accent-[var(--color-accent)]"
            />
            <span className="text-content-muted">Adjustable</span>
          </label>
        </div>
      </Panel>

      {/* --- Buyer information --------------------------------------------- */}
      <Panel
        title="Buyer information"
        description="Shown in the collapsible sections on the product page. Only write what is true — these are commitments."
      >
        <div className="space-y-4 px-5 py-4">
          <Field>
            <Label>Care instructions</Label>
            <Textarea
              value={form.careInstructions}
              onChange={(e) => set("careInstructions", e.target.value)}
              rows={3}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <Label>Warranty</Label>
              <Textarea
                value={form.warrantyInfo}
                onChange={(e) => set("warrantyInfo", e.target.value)}
                rows={3}
              />
            </Field>

            <Field>
              <Label>Authenticity</Label>
              <Textarea
                value={form.authenticityInfo}
                onChange={(e) => set("authenticityInfo", e.target.value)}
                rows={3}
              />
            </Field>
          </div>

          <Field>
            <Label>What&rsquo;s included</Label>
            <Input
              value={form.whatsIncluded}
              onChange={(e) => set("whatsIncluded", e.target.value)}
              placeholder="Jewellery piece, pouch, polishing cloth, certificate, gift box"
            />
          </Field>
        </div>
      </Panel>

      {/* --- Collections and SEO -------------------------------------------- */}
      <Panel title="Collections">
        <div className="px-5 py-4">
          {collections.length === 0 ? (
            <p className="text-sm text-content-muted">
              No collections yet.{" "}
              <Link href="/admin/collections" className="underline underline-offset-4">
                Create one
              </Link>
              .
            </p>
          ) : (
            <ul className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
              {collections.map((collection) => (
                <li key={collection.id}>
                  <label className="flex cursor-pointer items-center gap-2 rounded-xs px-2 py-1.5 text-sm hover:bg-sand-50">
                    <input
                      type="checkbox"
                      checked={form.collectionIds.includes(collection.id)}
                      onChange={(e) =>
                        set(
                          "collectionIds",
                          e.target.checked
                            ? [...form.collectionIds, collection.id]
                            : form.collectionIds.filter((id) => id !== collection.id),
                        )
                      }
                      className="size-4 accent-[var(--color-accent)]"
                    />
                    <span className="text-content-muted">{collection.name}</span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Panel>

      <Panel title="SEO">
        <div className="space-y-4 px-5 py-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <Label>SEO title</Label>
              <Input
                value={form.seoTitle}
                onChange={(e) => set("seoTitle", e.target.value)}
                maxLength={140}
                placeholder={form.name}
              />
              <FieldDescription>
                Google truncates past about 60 characters. The brand name is
                appended automatically.
              </FieldDescription>
            </Field>

            <Field>
              <Label>Meta description</Label>
              <Input
                value={form.seoDescription}
                onChange={(e) => set("seoDescription", e.target.value)}
                maxLength={300}
                placeholder={form.shortDescription}
              />
              <FieldDescription>Aim for under 155 characters.</FieldDescription>
            </Field>
          </div>

          <Field>
            <Label>Canonical URL</Label>
            <Input
              value={form.canonicalUrl}
              onChange={(e) => set("canonicalUrl", e.target.value)}
              placeholder="Leave blank unless this duplicates another page"
            />
          </Field>
        </div>
      </Panel>

      {/* --- Save ---------------------------------------------------------- */}
      {message ? (
        <Alert variant={message.tone === "success" ? "success" : "danger"}>
          {message.text}
        </Alert>
      ) : null}

      <div className="sticky bottom-0 flex flex-wrap items-center gap-3 border-t border-line bg-surface-raised px-5 py-4">
        <Button type="submit" loading={pending}>
          {form.id ? "Save changes" : "Create product"}
        </Button>

        {form.id ? (
          <Link
            href={`/product/${form.slug}`}
            target="_blank"
            className="inline-flex items-center gap-1.5 text-sm text-content-muted hover:text-[var(--color-accent)]"
          >
            <ExternalLink className="size-3.5" aria-hidden="true" />
            View on storefront
          </Link>
        ) : null}

        <span className="ml-auto text-xs text-content-subtle">
          {form.status === "ACTIVE"
            ? "Saving publishes this immediately."
            : "Draft and archived products are not visible to customers."}
        </span>
      </div>
    </form>
  );
}

/* -----------------------------------------------------------------------------
 * Sub-components
 * -------------------------------------------------------------------------- */

function TagEditor({
  label,
  help,
  values,
  onChange,
  placeholder,
  preserveCase = false,
}: {
  label: string;
  help?: string;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  preserveCase?: boolean;
}) {
  const [draft, setDraft] = React.useState("");

  function commit() {
    // Accept comma-separated pastes as well as one-at-a-time entry.
    const parts = draft
      .split(",")
      .map((part) => (preserveCase ? part.trim() : part.trim().toLowerCase()))
      .filter(Boolean);

    if (parts.length) {
      onChange([...new Set([...values, ...parts])]);
    }
    setDraft("");
  }

  return (
    <Field>
      <Label>{label}</Label>

      {values.length ? (
        <ul className="mb-2 flex flex-wrap gap-1.5">
          {values.map((value) => (
            <li key={value}>
              <button
                type="button"
                onClick={() => onChange(values.filter((v) => v !== value))}
                className="inline-flex items-center gap-1 rounded-xs border border-line-strong px-2 py-1 text-xs text-content-muted hover:border-danger-500 hover:text-danger-700"
              >
                {value}
                <X className="size-3" aria-hidden="true" />
                <span className="sr-only">Remove</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <Input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            // Enter must not submit the whole product form.
            e.preventDefault();
            commit();
          }
        }}
        placeholder={placeholder}
      />
      {help ? <FieldDescription>{help}</FieldDescription> : null}
    </Field>
  );
}

function OptionNames({
  names,
  onChange,
}: {
  names: string[];
  onChange: (names: string[]) => void;
}) {
  return (
    <div className="rounded-sm border border-line bg-surface-sunken p-3">
      <p className="u-eyebrow mb-2 text-content-subtle">Option dimensions</p>
      <div className="flex flex-wrap items-center gap-2">
        {names.map((name, index) => (
          <span key={index} className="flex items-center gap-1">
            <Field>
              <Input
                value={name}
                onChange={(e) => {
                  const next = [...names];
                  next[index] = e.target.value;
                  onChange(next);
                }}
                placeholder="Size"
                className="h-9 w-36"
              />
            </Field>
            <button
              type="button"
              onClick={() => onChange(names.filter((_, i) => i !== index))}
              aria-label={`Remove ${name || "option"}`}
              className="inline-flex size-8 items-center justify-center rounded-xs border border-line-strong text-content-muted hover:border-danger-500 hover:text-danger-700"
            >
              <X className="size-3.5" aria-hidden="true" />
            </button>
          </span>
        ))}

        {names.length < 2 ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onChange([...names, ""])}
          >
            <Plus aria-hidden="true" />
            Add option
          </Button>
        ) : null}
      </div>
      <p className="mt-2 text-xs text-content-subtle">
        e.g. “Size” for rings, “Length” for chains. Leave empty for a product
        sold in one configuration. The product page builds a selector per
        dimension automatically.
      </p>
    </div>
  );
}

function VariantTable({
  optionNames,
  variants,
  onChange,
}: {
  optionNames: string[];
  variants: VariantRow[];
  onChange: (variants: VariantRow[]) => void;
}) {
  const update = (index: number, patch: Partial<VariantRow>) => {
    const next = [...variants];
    next[index] = { ...next[index], ...patch };
    onChange(next);
  };

  return (
    <div className="space-y-3">
      {variants.map((variant, index) => (
        <div
          key={variant.id ?? `new-${index}`}
          className={cn(
            "rounded-sm border p-3",
            variant.isActive ? "border-line" : "border-line bg-sand-50 opacity-70",
          )}
        >
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <GripVertical
              className="size-3.5 text-content-subtle"
              aria-hidden="true"
            />
            <span className="text-xs text-content-subtle">
              Variant {index + 1}
            </span>
            {variant.id ? <Badge variant="outline">saved</Badge> : null}
            {!variant.isActive ? <Badge variant="neutral">inactive</Badge> : null}

            <button
              type="button"
              onClick={() => onChange(variants.filter((_, i) => i !== index))}
              disabled={variants.length === 1}
              aria-label={`Remove variant ${index + 1}`}
              title={
                variants.length === 1
                  ? "A product needs at least one variant"
                  : "Remove variant"
              }
              className="ml-auto inline-flex size-8 items-center justify-center rounded-xs border border-line-strong text-content-muted hover:border-danger-500 hover:text-danger-700 disabled:opacity-30"
            >
              <Trash2 className="size-3.5" aria-hidden="true" />
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field>
              <Label required>Name</Label>
              <Input
                value={variant.title}
                onChange={(e) => update(index, { title: e.target.value })}
                placeholder="Size 14"
              />
            </Field>

            {optionNames.map((optionName, optionIndex) => (
              <Field key={optionIndex}>
                <Label>{optionName || `Option ${optionIndex + 1}`}</Label>
                <Input
                  value={variant.optionValues[optionIndex] ?? ""}
                  onChange={(e) => {
                    const values = [...variant.optionValues];
                    values[optionIndex] = e.target.value;
                    update(index, { optionValues: values });
                  }}
                />
              </Field>
            ))}

            <Field>
              <Label required>MRP (₹)</Label>
              <Input
                inputMode="decimal"
                value={variant.mrpRupees}
                onChange={(e) => update(index, { mrpRupees: e.target.value })}
              />
            </Field>

            <Field>
              <Label required>Selling price (₹)</Label>
              <Input
                inputMode="decimal"
                value={variant.priceRupees}
                onChange={(e) => update(index, { priceRupees: e.target.value })}
              />
            </Field>

            <Field>
              <Label>Stock</Label>
              <Input
                inputMode="numeric"
                value={variant.stockQuantity}
                onChange={(e) =>
                  update(index, {
                    stockQuantity: e.target.value.replace(/\D/g, ""),
                  })
                }
                disabled={!variant.trackInventory}
              />
            </Field>

            <Field>
              <Label>Low-stock alert at</Label>
              <Input
                inputMode="numeric"
                value={variant.lowStockThreshold}
                onChange={(e) =>
                  update(index, {
                    lowStockThreshold: e.target.value.replace(/\D/g, ""),
                  })
                }
                disabled={!variant.trackInventory}
              />
            </Field>

            <Field>
              <Label>SKU</Label>
              <Input
                value={variant.sku}
                onChange={(e) => update(index, { sku: e.target.value })}
                placeholder="Generated if blank"
              />
            </Field>
          </div>

          <div className="mt-3 flex flex-wrap gap-5">
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={variant.trackInventory}
                onChange={(e) =>
                  update(index, { trackInventory: e.target.checked })
                }
                className="size-4 accent-[var(--color-accent)]"
              />
              <span className="text-content-muted">Track stock</span>
            </label>

            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={variant.isActive}
                onChange={(e) => update(index, { isActive: e.target.checked })}
                className="size-4 accent-[var(--color-accent)]"
              />
              <span className="text-content-muted">Available to buy</span>
            </label>
          </div>
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() =>
          onChange([
            ...variants,
            {
              ...BLANK_VARIANT,
              title: optionNames.length ? "" : "Standard",
              optionValues: optionNames.map(() => ""),
              // Copy pricing from the previous row — variants of one product
              // usually share a price, and retyping it is pure friction.
              mrpRupees: variants[variants.length - 1]?.mrpRupees ?? "",
              priceRupees: variants[variants.length - 1]?.priceRupees ?? "",
            },
          ])
        }
      >
        <Plus aria-hidden="true" />
        Add variant
      </Button>
    </div>
  );
}

function ImagePicker({
  media,
  selected,
  onChange,
}: {
  media: MediaOption[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const [query, setQuery] = React.useState("");

  const byId = new Map(media.map((m) => [m.id, m]));
  const filtered = query.trim()
    ? media.filter((m) => m.label.toLowerCase().includes(query.toLowerCase()))
    : media;

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= selected.length) return;
    const next = [...selected];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  return (
    <div className="space-y-4">
      {selected.length ? (
        <ol className="flex flex-wrap gap-3">
          {selected.map((id, index) => {
            const item = byId.get(id);
            return (
              <li key={id} className="w-28">
                <div className="relative aspect-square overflow-hidden rounded-sm border border-line bg-sand-100">
                  {item ? (
                    <MediaImage
                      src={item.url}
                      alt=""
                      fill
                      sizes="112px"
                      className="object-cover"
                    />
                  ) : null}
                  {index === 0 ? (
                    <span className="absolute left-1 top-1">
                      <Badge variant="accent">Primary</Badge>
                    </span>
                  ) : null}
                </div>

                <div className="mt-1.5 flex justify-between gap-1">
                  <button
                    type="button"
                    onClick={() => move(index, -1)}
                    disabled={index === 0}
                    aria-label="Move image earlier"
                    className="rounded-xs border border-line-strong px-1.5 text-xs disabled:opacity-30"
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    onClick={() => move(index, 1)}
                    disabled={index === selected.length - 1}
                    aria-label="Move image later"
                    className="rounded-xs border border-line-strong px-1.5 text-xs disabled:opacity-30"
                  >
                    →
                  </button>
                  <button
                    type="button"
                    onClick={() => onChange(selected.filter((s) => s !== id))}
                    aria-label="Remove image"
                    className="rounded-xs border border-line-strong px-1.5 text-xs text-content-muted hover:border-danger-500 hover:text-danger-700"
                  >
                    <Trash2 className="size-3" aria-hidden="true" />
                  </button>
                </div>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="text-sm text-content-muted">
          No images selected. A product without one shows a placeholder on cards
          and is skipped by the Meta feed.
        </p>
      )}

      <div className="rounded-sm border border-line bg-surface-sunken p-3 space-y-3">
        <MediaUpload enabled={true} />

        <Field>
          <Label htmlFor="product-image-search" className="sr-only">
            Filter media
          </Label>
          <Input
            id="product-image-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter media by name"
          />
        </Field>

        <ul className="grid max-h-64 grid-cols-4 gap-2 overflow-y-auto sm:grid-cols-6 lg:grid-cols-8">
          {filtered.map((item) => {
            const isSelected = selected.includes(item.id);
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() =>
                    onChange(
                      isSelected
                        ? selected.filter((s) => s !== item.id)
                        : [...selected, item.id],
                    )
                  }
                  aria-pressed={isSelected}
                  title={item.label}
                  className={cn(
                    "relative block aspect-square w-full overflow-hidden rounded-xs border-2 bg-sand-100 transition-colors",
                    isSelected
                      ? "border-[var(--color-accent)]"
                      : "border-transparent hover:border-line-strong",
                  )}
                >
                  <MediaImage
                    src={item.url}
                    alt=""
                    fill
                    sizes="80px"
                    className="object-cover"
                  />
                </button>
              </li>
            );
          })}
        </ul>

        {media.length === 0 ? (
          <p className="py-4 text-center text-xs text-content-subtle">
            No media yet. Upload images under{" "}
            <Link href="/admin/media" className="underline underline-offset-4">
              Media
            </Link>
            .
          </p>
        ) : null}
      </div>
    </div>
  );
}
