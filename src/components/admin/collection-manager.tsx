"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ImageIcon, Pencil, Plus, Search, Star, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field, Input, Label, NativeSelect, Textarea } from "@/components/ui/field";
import { Alert, Badge } from "@/components/ui/primitives";
import { MediaImage } from "@/components/ui/media-image";
import {
  deleteCollection,
  saveCollection,
  toggleProductInCollection,
} from "@/server/actions/catalogue-admin";
import { cn } from "@/lib/utils";

type MediaOption = { id: string; url: string; label: string };

type Collection = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageId: string | null;
  image?: { id: string; url: string; secureUrl: string } | null;
  isActive: boolean;
  isFeatured: boolean;
  productIds: string[];
  _count: { products: number };
};

type Product = { id: string; name: string; sku: string };

type FormState = {
  id?: string;
  name: string;
  slug: string;
  description: string;
  imageId: string | null;
  isActive: boolean;
  isFeatured: boolean;
};

const EMPTY: FormState = {
  name: "",
  slug: "",
  description: "",
  imageId: null,
  isActive: true,
  isFeatured: false,
};

export function CollectionManager({
  collections,
  products,
  media = [],
}: {
  collections: Collection[];
  products: Product[];
  media?: MediaOption[];
}) {
  const router = useRouter();
  const [editing, setEditing] = React.useState<string | "new" | null>(null);
  const [managing, setManaging] = React.useState<string | null>(null);
  const [form, setForm] = React.useState<FormState>(EMPTY);
  const [pending, startTransition] = React.useTransition();
  const [message, setMessage] = React.useState<
    { tone: "success" | "danger"; text: string } | null
  >(null);

  function run(action: () => Promise<{ ok: boolean; message?: string; error?: string }>) {
    setMessage(null);
    startTransition(async () => {
      const result = await action();
      setMessage(
        result.ok
          ? { tone: "success", text: result.message ?? "Saved." }
          : { tone: "danger", text: result.error ?? "Something went wrong." },
      );
      if (result.ok) setEditing(null);
      router.refresh();
    });
  }

  function beginEdit(c: Collection) {
    setForm({
      id: c.id,
      name: c.name,
      slug: c.slug,
      description: c.description ?? "",
      imageId: c.imageId,
      isActive: c.isActive,
      isFeatured: c.isFeatured,
    });
    setEditing(c.id);
    setMessage(null);
  }

  return (
    <div>
      {message ? (
        <div className="px-5 pt-4">
          <Alert variant={message.tone === "success" ? "success" : "danger"}>
            {message.text}
          </Alert>
        </div>
      ) : null}

      <ul className="divide-y divide-line">
        {collections.map((collection) => (
          <li key={collection.id} className="px-5 py-3.5">
            {editing === collection.id ? (
              <CollectionForm
                form={form}
                setForm={setForm}
                media={media}
                pending={pending}
                submitLabel="Save changes"
                onSubmit={() => run(() => saveCollection(form))}
                onCancel={() => setEditing(null)}
              />
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative size-12 shrink-0 overflow-hidden rounded border border-line bg-sand-100 flex items-center justify-center">
                      {collection.image?.secureUrl || collection.image?.url ? (
                        <MediaImage
                          src={collection.image.secureUrl || collection.image.url}
                          alt={collection.name}
                          fill
                          sizes="48px"
                          className="object-cover"
                        />
                      ) : (
                        <ImageIcon className="size-4 text-content-subtle opacity-40" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={cn(
                            "text-sm font-medium text-content",
                            !collection.isActive && "text-content-subtle",
                          )}
                        >
                          {collection.name}
                        </span>
                        {collection.isFeatured ? (
                          <Badge variant="gold">
                            <Star className="size-2.5" aria-hidden="true" />
                            Featured
                          </Badge>
                        ) : null}
                        {!collection.isActive ? (
                          <Badge variant="neutral">Hidden</Badge>
                        ) : null}
                      </div>
                      <p className="mt-0.5 text-xs text-content-subtle">
                        /collections/{collection.slug} · {collection._count.products}{" "}
                        {collection._count.products === 1 ? "product" : "products"}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        setManaging(managing === collection.id ? null : collection.id)
                      }
                      disabled={pending}
                      className="rounded-xs border border-line-strong px-2.5 py-1.5 text-xs text-content-muted hover:border-[var(--color-accent)] disabled:opacity-40"
                    >
                      {managing === collection.id ? "Done" : "Products"}
                    </button>
                    <button
                      type="button"
                      onClick={() => beginEdit(collection)}
                      disabled={pending}
                      aria-label={`Edit ${collection.name}`}
                      className="inline-flex size-8 items-center justify-center rounded-xs border border-line-strong text-content-muted hover:border-[var(--color-accent)] disabled:opacity-40"
                    >
                      <Pencil className="size-3.5" aria-hidden="true" />
                    </button>
                    <DeleteButton
                      disabled={pending}
                      label={collection.name}
                      onConfirm={() => run(() => deleteCollection(collection.id))}
                    />
                  </div>
                </div>

                {managing === collection.id ? (
                  <ProductPicker
                    products={products}
                    selected={new Set(collection.productIds)}
                    pending={pending}
                    onToggle={(productId, include) =>
                      run(() =>
                        toggleProductInCollection({
                          productId,
                          collectionId: collection.id,
                          include,
                        }),
                      )
                    }
                  />
                ) : null}
              </>
            )}
          </li>
        ))}
      </ul>

      <div className="border-t border-line px-5 py-4">
        {editing === "new" ? (
          <CollectionForm
            form={form}
            setForm={setForm}
            pending={pending}
            submitLabel="Create collection"
            onSubmit={() => run(() => saveCollection(form))}
            onCancel={() => setEditing(null)}
          />
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setForm(EMPTY);
              setEditing("new");
              setMessage(null);
            }}
          >
            <Plus aria-hidden="true" />
            Add collection
          </Button>
        )}
      </div>
    </div>
  );
}

/** Search-filtered checkbox list. Toggling writes immediately. */
function ProductPicker({
  products,
  selected,
  pending,
  onToggle,
}: {
  products: Product[];
  selected: Set<string>;
  pending: boolean;
  onToggle: (productId: string, include: boolean) => void;
}) {
  const [query, setQuery] = React.useState("");

  const filtered = query.trim()
    ? products.filter(
        (p) =>
          p.name.toLowerCase().includes(query.toLowerCase()) ||
          p.sku.toLowerCase().includes(query.toLowerCase()),
      )
    : products;

  return (
    <div className="mt-4 rounded-sm border border-line bg-surface-sunken p-3">
      <div className="mb-3 flex items-center gap-2">
        <Search className="size-3.5 text-content-subtle" aria-hidden="true" />
        <label htmlFor="collection-product-search" className="sr-only">
          Filter products
        </label>
        <input
          id="collection-product-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Filter by name or SKU"
          className="h-8 flex-1 rounded-xs border border-line-strong bg-surface-raised px-2 text-sm outline-none focus:border-[var(--color-accent)]"
        />
        <span className="text-xs text-content-subtle">
          {selected.size} selected
        </span>
      </div>

      <ul className="max-h-64 space-y-0.5 overflow-y-auto">
        {filtered.map((product) => {
          const included = selected.has(product.id);
          return (
            <li key={product.id}>
              <label className="flex cursor-pointer items-center gap-2.5 rounded-xs px-2 py-1.5 text-sm hover:bg-surface-raised">
                <input
                  type="checkbox"
                  checked={included}
                  disabled={pending}
                  onChange={(event) => onToggle(product.id, event.target.checked)}
                  className="size-4 accent-[var(--color-accent)]"
                />
                <span className="min-w-0 flex-1 truncate">{product.name}</span>
                <span className="shrink-0 text-xs text-content-subtle">
                  {product.sku}
                </span>
              </label>
            </li>
          );
        })}
        {filtered.length === 0 ? (
          <li className="px-2 py-4 text-center text-xs text-content-subtle">
            No products match “{query}”.
          </li>
        ) : null}
      </ul>
    </div>
  );
}

function DeleteButton({
  label,
  disabled,
  onConfirm,
}: {
  label: string;
  disabled: boolean;
  onConfirm: () => void;
}) {
  const [confirming, setConfirming] = React.useState(false);

  if (confirming) {
    return (
      <span className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={onConfirm}
          disabled={disabled}
          className="rounded-xs border border-danger-500 px-2 py-1 text-xs text-danger-700 disabled:opacity-40"
        >
          Delete
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={disabled}
          className="rounded-xs border border-line-strong px-2 py-1 text-xs text-content-muted disabled:opacity-40"
        >
          Keep
        </button>
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      disabled={disabled}
      aria-label={`Delete ${label}`}
      className="inline-flex size-8 items-center justify-center rounded-xs border border-line-strong text-content-muted hover:border-danger-500 hover:text-danger-700 disabled:opacity-40"
    >
      <Trash2 className="size-3.5" aria-hidden="true" />
    </button>
  );
}

function CollectionForm({
  form,
  setForm,
  media = [],
  pending,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  media?: MediaOption[];
  pending: boolean;
  submitLabel: string;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const selectedMedia = media.find((m) => m.id === form.imageId);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
      className="space-y-4 rounded-md border border-line bg-surface-sunken/40 p-4"
    >
      <Field>
        <Label required>Collection Name</Label>
        <Input
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          required
          maxLength={80}
        />
      </Field>

      {form.id ? (
        <Field>
          <Label>URL slug</Label>
          <Input
            value={form.slug}
            onChange={(e) => set("slug", e.target.value)}
            maxLength={96}
          />
          <p className="text-xs text-content-subtle">
            Changing this breaks existing links to /collections/{form.slug}.
          </p>
        </Field>
      ) : null}

      {/* Collection Photo / Tile Cover Picker */}
      <Field>
        <Label>Collection Tile Cover Photo</Label>
        <div className="flex items-center gap-4 rounded border border-line p-3 bg-surface">
          <div className="relative size-14 shrink-0 overflow-hidden rounded border border-line bg-sand-100 flex items-center justify-center">
            {selectedMedia ? (
              <MediaImage
                src={selectedMedia.url}
                alt=""
                fill
                sizes="56px"
                className="object-cover"
              />
            ) : (
              <ImageIcon className="size-5 text-content-subtle opacity-40" />
            )}
          </div>
          <div className="flex-1 space-y-1">
            <NativeSelect
              value={form.imageId ?? ""}
              onChange={(e) => set("imageId", e.target.value || null)}
            >
              <option value="">No custom image (Use top product photo)</option>
              {media.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </NativeSelect>
            <p className="text-[11px] text-content-subtle">
              Selected photo appears as the cover image in "Shop by occasion" &amp; collection carousels.
            </p>
          </div>
        </div>
      </Field>

      <Field>
        <Label>Description</Label>
        <Textarea
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          rows={2}
          maxLength={600}
        />
      </Field>

      <div className="flex flex-wrap gap-5">
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(e) => set("isActive", e.target.checked)}
            className="size-4 accent-[var(--color-accent)]"
          />
          <span className="text-content-muted">Visible on the storefront</span>
        </label>

        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.isFeatured}
            onChange={(e) => set("isFeatured", e.target.checked)}
            className="size-4 accent-[var(--color-accent)]"
          />
          <span className="text-content-muted">Featured in the footer and carousels</span>
        </label>
      </div>

      <div className="flex gap-2">
        <Button type="submit" size="sm" loading={pending}>
          {submitLabel}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
