"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Pencil, Plus, Star, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field, Input, Label, NativeSelect, Textarea } from "@/components/ui/field";
import { Alert, Badge } from "@/components/ui/primitives";
import {
  deleteCategory,
  reorderCategories,
  saveCategory,
} from "@/server/actions/catalogue-admin";
import { cn } from "@/lib/utils";

type Category = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  description: string | null;
  isActive: boolean;
  isFeatured: boolean;
  seoTitle: string | null;
  seoDescription: string | null;
  _count: { products: number; children: number };
};

type FormState = {
  id?: string;
  name: string;
  slug: string;
  parentId: string;
  description: string;
  isActive: boolean;
  isFeatured: boolean;
  seoTitle: string;
  seoDescription: string;
};

const EMPTY: FormState = {
  name: "",
  slug: "",
  parentId: "",
  description: "",
  isActive: true,
  isFeatured: false,
  seoTitle: "",
  seoDescription: "",
};

export function CategoryManager({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const [editing, setEditing] = React.useState<string | "new" | null>(null);
  const [form, setForm] = React.useState<FormState>(EMPTY);
  const [pending, startTransition] = React.useTransition();
  const [message, setMessage] = React.useState<
    { tone: "success" | "danger"; text: string } | null
  >(null);

  // Roots first, each followed by its children — the shape the storefront nav
  // renders, so the admin list matches what the customer sees.
  const roots = categories.filter((c) => !c.parentId);
  const ordered = roots.flatMap((root) => [
    root,
    ...categories.filter((c) => c.parentId === root.id),
  ]);

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

  function beginEdit(category: Category) {
    setForm({
      id: category.id,
      name: category.name,
      slug: category.slug,
      parentId: category.parentId ?? "",
      description: category.description ?? "",
      isActive: category.isActive,
      isFeatured: category.isFeatured,
      seoTitle: category.seoTitle ?? "",
      seoDescription: category.seoDescription ?? "",
    });
    setEditing(category.id);
    setMessage(null);
  }

  function moveRoot(rootIndex: number, direction: -1 | 1) {
    const target = rootIndex + direction;
    if (target < 0 || target >= roots.length) return;

    const next = [...roots];
    [next[rootIndex], next[target]] = [next[target], next[rootIndex]];
    run(() => reorderCategories(next.map((c) => c.id)));
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
        {ordered.map((category) => {
          const isChild = Boolean(category.parentId);
          const rootIndex = roots.findIndex((r) => r.id === category.id);

          return (
            <li key={category.id} className={cn("px-5 py-3.5", isChild && "pl-12")}>
              {editing === category.id ? (
                <CategoryForm
                  form={form}
                  setForm={setForm}
                  categories={categories}
                  pending={pending}
                  submitLabel="Save changes"
                  onSubmit={() => run(() => saveCategory(form))}
                  onCancel={() => setEditing(null)}
                />
              ) : (
                <div className="flex flex-wrap items-center gap-3">
                  {!isChild ? (
                    <div className="flex flex-col gap-0.5">
                      <button
                        type="button"
                        onClick={() => moveRoot(rootIndex, -1)}
                        disabled={pending || rootIndex === 0}
                        aria-label={`Move ${category.name} up`}
                        className="inline-flex size-6 items-center justify-center rounded-xs border border-line-strong text-content-muted hover:border-[var(--color-accent)] disabled:opacity-30"
                      >
                        <ArrowUp className="size-3" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveRoot(rootIndex, 1)}
                        disabled={pending || rootIndex === roots.length - 1}
                        aria-label={`Move ${category.name} down`}
                        className="inline-flex size-6 items-center justify-center rounded-xs border border-line-strong text-content-muted hover:border-[var(--color-accent)] disabled:opacity-30"
                      >
                        <ArrowDown className="size-3" aria-hidden="true" />
                      </button>
                    </div>
                  ) : null}

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={cn("text-sm", !category.isActive && "text-content-subtle")}>
                        {category.name}
                      </span>
                      {category.isFeatured ? (
                        <Badge variant="gold">
                          <Star className="size-2.5" aria-hidden="true" />
                          Featured
                        </Badge>
                      ) : null}
                      {!category.isActive ? <Badge variant="neutral">Hidden</Badge> : null}
                    </div>
                    <p className="mt-0.5 text-xs text-content-subtle">
                      /category/{category.slug} · {category._count.products}{" "}
                      {category._count.products === 1 ? "product" : "products"}
                    </p>
                  </div>

                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => beginEdit(category)}
                      disabled={pending}
                      aria-label={`Edit ${category.name}`}
                      className="inline-flex size-8 items-center justify-center rounded-xs border border-line-strong text-content-muted hover:border-[var(--color-accent)] disabled:opacity-40"
                    >
                      <Pencil className="size-3.5" aria-hidden="true" />
                    </button>
                    <DeleteCategoryButton
                      category={category}
                      disabled={pending}
                      onConfirm={() => run(() => deleteCategory(category.id))}
                    />
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <div className="border-t border-line px-5 py-4">
        {editing === "new" ? (
          <CategoryForm
            form={form}
            setForm={setForm}
            categories={categories}
            pending={pending}
            submitLabel="Create category"
            onSubmit={() => run(() => saveCategory(form))}
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
            Add category
          </Button>
        )}
      </div>
    </div>
  );
}

function DeleteCategoryButton({
  category,
  disabled,
  onConfirm,
}: {
  category: Category;
  disabled: boolean;
  onConfirm: () => void;
}) {
  const [confirming, setConfirming] = React.useState(false);
  const blocked = category._count.products > 0 || category._count.children > 0;

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
      aria-label={`Delete ${category.name}`}
      title={
        blocked
          ? "This category still has products or subcategories"
          : `Delete ${category.name}`
      }
      className="inline-flex size-8 items-center justify-center rounded-xs border border-line-strong text-content-muted hover:border-danger-500 hover:text-danger-700 disabled:opacity-40"
    >
      <Trash2 className="size-3.5" aria-hidden="true" />
    </button>
  );
}

function CategoryForm({
  form,
  setForm,
  categories,
  pending,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  categories: Category[];
  pending: boolean;
  submitLabel: string;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  // Only top-level categories can be parents — one level of nesting is what
  // the storefront navigation renders.
  const parentOptions = categories.filter(
    (c) => !c.parentId && c.id !== form.id,
  );

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
      className="space-y-4"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field>
          <Label required>Name</Label>
          <Input
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            required
            maxLength={80}
          />
        </Field>

        <Field>
          <Label>Parent category</Label>
          <NativeSelect
            value={form.parentId}
            onChange={(e) => set("parentId", e.target.value)}
          >
            <option value="">None (top level)</option>
            {parentOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
      </div>

      {form.id ? (
        <Field>
          <Label>URL slug</Label>
          <Input
            value={form.slug}
            onChange={(e) => set("slug", e.target.value)}
            maxLength={96}
          />
          <p className="text-xs text-content-subtle">
            Changing this breaks existing links to /category/{form.slug}. Only
            change it if the page is not yet shared or indexed.
          </p>
        </Field>
      ) : null}

      <Field>
        <Label>Description</Label>
        <Textarea
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          rows={2}
          maxLength={600}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field>
          <Label>SEO title</Label>
          <Input
            value={form.seoTitle}
            onChange={(e) => set("seoTitle", e.target.value)}
            maxLength={120}
            placeholder={form.name}
          />
        </Field>
        <Field>
          <Label>SEO description</Label>
          <Input
            value={form.seoDescription}
            onChange={(e) => set("seoDescription", e.target.value)}
            maxLength={200}
          />
        </Field>
      </div>

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
          <span className="text-content-muted">
            Featured (header nav and category row)
          </span>
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
