"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Clock, Flame, ImageIcon, Pencil, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field, Input, Label, NativeSelect, Textarea } from "@/components/ui/field";
import { Alert, Badge } from "@/components/ui/primitives";
import { MediaImage } from "@/components/ui/media-image";
import { formatPrice } from "@/lib/money";
import {
  deleteComboOffer,
  saveComboOffer,
  toggleComboOfferStatus,
  toggleGlobalCombos,
} from "@/server/actions/combo-admin";
import type { ComboOfferDetail } from "@/server/combos";

type MediaOption = { id: string; url: string; label: string };
type ProductOption = {
  id: string;
  name: string;
  pricePaise: number;
  variants: Array<{ id: string; title: string; pricePaise: number }>;
};

type FormItem = {
  productId: string;
  variantId: string;
  quantity: number;
};

type FormState = {
  id?: string;
  title: string;
  slug: string;
  description: string;
  comboPriceRupees: string;
  imageId: string | null;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
  isFeatured: boolean;
  items: FormItem[];
};

const EMPTY_FORM: FormState = {
  title: "",
  slug: "",
  description: "",
  comboPriceRupees: "",
  imageId: null,
  startsAt: "",
  endsAt: "",
  isActive: true,
  isFeatured: false,
  items: [
    { productId: "", variantId: "", quantity: 1 },
    { productId: "", variantId: "", quantity: 1 },
  ],
};

export function ComboManager({
  combos,
  products,
  media,
  combosEnabled = true,
}: {
  combos: ComboOfferDetail[];
  products: ProductOption[];
  media: MediaOption[];
  combosEnabled?: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = React.useState<string | "new" | null>(null);
  const [form, setForm] = React.useState<FormState>(EMPTY_FORM);
  const [pending, startTransition] = React.useTransition();
  const [message, setMessage] = React.useState<{
    tone: "success" | "danger";
    text: string;
  } | null>(null);

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

  function beginEdit(combo: ComboOfferDetail) {
    const formatDateInput = (d: Date | null) => (d ? new Date(d).toISOString().slice(0, 16) : "");

    setForm({
      id: combo.id,
      title: combo.title,
      slug: combo.slug,
      description: combo.description ?? "",
      comboPriceRupees: (combo.comboPricePaise / 100).toString(),
      imageId: combo.imageUrl ? media.find((m) => m.url === combo.imageUrl)?.id ?? null : null,
      startsAt: formatDateInput(combo.startsAt),
      endsAt: formatDateInput(combo.endsAt),
      isActive: combo.isActive,
      isFeatured: combo.isFeatured,
      items: combo.items.map((item) => ({
        productId: item.productId,
        variantId: item.variantId ?? "",
        quantity: item.quantity,
      })),
    });
    setEditing(combo.id);
    setMessage(null);
  }

  return (
    <div>
      {/* Global Feature Switch Header */}
      <div className="border-b border-line px-5 py-4 bg-sand-50/70 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-brand-950">
              Global Combo Offers Feature:
            </span>
            <Badge variant={combosEnabled ? "accent" : "neutral"}>
              {combosEnabled ? "ENABLED" : "DISABLED"}
            </Badge>
          </div>
          <p className="text-xs text-content-muted mt-0.5">
            {combosEnabled
              ? "Combo offers are active. Navbar link will show whenever live combos exist."
              : "Feature is turned off. The page and navbar links are hidden from store visitors."}
          </p>
        </div>

        <Button
          size="sm"
          variant={combosEnabled ? "outline" : "primary"}
          disabled={pending}
          onClick={() => run(() => toggleGlobalCombos(!combosEnabled))}
          className={combosEnabled ? "border-danger-600 text-danger-700 hover:bg-danger-50" : ""}
        >
          {combosEnabled ? "Turn OFF Combo Offers" : "Turn ON Combo Offers"}
        </Button>
      </div>
      {message ? (
        <div className="px-5 pt-4">
          <Alert variant={message.tone === "success" ? "success" : "danger"}>
            {message.text}
          </Alert>
        </div>
      ) : null}

      <div className="divide-y divide-line">
        {combos.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-content-muted">
            No combo offers created yet. Click below to add your first combo bundle!
          </div>
        ) : (
          combos.map((combo) => (
            <div key={combo.id} className="px-5 py-4">
              {editing === combo.id ? (
                <ComboForm
                  form={form}
                  setForm={setForm}
                  products={products}
                  media={media}
                  pending={pending}
                  submitLabel="Save changes"
                  onSubmit={() => {
                    const pricePaise = Math.round(parseFloat(form.comboPriceRupees || "0") * 100);
                    run(() =>
                      saveComboOffer({
                        ...form,
                        comboPricePaise: pricePaise,
                      }),
                    );
                  }}
                  onCancel={() => setEditing(null)}
                />
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="relative size-14 shrink-0 overflow-hidden rounded-md border border-line bg-sand-100 flex items-center justify-center">
                      {combo.imageUrl ? (
                        <MediaImage
                          src={combo.imageUrl}
                          alt={combo.title}
                          fill
                          sizes="56px"
                          className="object-cover"
                        />
                      ) : (
                        <ImageIcon className="size-5 text-content-subtle opacity-40" />
                      )}
                    </div>

                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-sm text-content">
                          {combo.title}
                        </span>
                        {combo.savingsPaise > 0 ? (
                          <Badge variant="accent">Save {formatPrice(combo.savingsPaise)}</Badge>
                        ) : null}
                        {!combo.isActive ? <Badge variant="neutral">Hidden</Badge> : null}
                      </div>

                      <p className="text-xs text-content-muted">
                        Combo Price:{" "}
                        <strong className="text-brand-950 font-bold">
                          {formatPrice(combo.comboPricePaise)}
                        </strong>{" "}
                        (Original Total: {formatPrice(combo.originalTotalPaise)})
                      </p>

                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-content-subtle pt-0.5">
                        <span>
                          Stock Left:{" "}
                          <strong
                            className={
                              combo.availableStock <= 3
                                ? "text-danger-700 font-bold"
                                : "text-content-muted font-semibold"
                            }
                          >
                            {combo.availableStock} units
                          </strong>
                        </span>
                        {combo.endsAt ? (
                          <span className="flex items-center gap-1 text-amber-800">
                            <Clock className="size-3 text-amber-600" />
                            Ends: {new Date(combo.endsAt).toLocaleString()}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => run(() => toggleComboOfferStatus(combo.id, !combo.isActive))}
                      disabled={pending}
                      className="rounded-xs border border-line-strong px-2.5 py-1 text-xs font-medium text-content-muted hover:border-brand-900"
                    >
                      {combo.isActive ? "Hide" : "Activate"}
                    </button>
                    <button
                      type="button"
                      onClick={() => beginEdit(combo)}
                      disabled={pending}
                      className="inline-flex size-8 items-center justify-center rounded-xs border border-line-strong text-content-muted hover:border-brand-900"
                    >
                      <Pencil className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => run(() => deleteComboOffer(combo.id))}
                      disabled={pending}
                      className="inline-flex size-8 items-center justify-center rounded-xs border border-line-strong text-content-muted hover:border-danger-600 hover:text-danger-700"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <div className="border-t border-line px-5 py-4">
        {editing === "new" ? (
          <ComboForm
            form={form}
            setForm={setForm}
            products={products}
            media={media}
            pending={pending}
            submitLabel="Create combo offer"
            onSubmit={() => {
              const pricePaise = Math.round(parseFloat(form.comboPriceRupees || "0") * 100);
              run(() =>
                saveComboOffer({
                  ...form,
                  comboPricePaise: pricePaise,
                }),
              );
            }}
            onCancel={() => setEditing(null)}
          />
        ) : (
          <Button
            size="sm"
            onClick={() => {
              setForm(EMPTY_FORM);
              setEditing("new");
              setMessage(null);
            }}
          >
            <Plus className="size-3.5 mr-1" />
            Add Combo Offer
          </Button>
        )}
      </div>
    </div>
  );
}

function ComboForm({
  form,
  setForm,
  products,
  media,
  pending,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  products: ProductOption[];
  media: MediaOption[];
  pending: boolean;
  submitLabel: string;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  // Calculate sum of individual items
  const originalSumPaise = form.items.reduce((sum, item) => {
    const p = products.find((prod) => prod.id === item.productId);
    if (!p) return sum;
    const v = p.variants.find((v) => v.id === item.variantId) || p.variants[0];
    return sum + (v?.pricePaise ?? p.pricePaise) * (item.quantity || 1);
  }, 0);

  const comboPricePaise = Math.round(parseFloat(form.comboPriceRupees || "0") * 100);
  const savingsPaise = Math.max(0, originalSumPaise - comboPricePaise);
  const savingsPercent =
    originalSumPaise > 0 ? Math.round((savingsPaise / originalSumPaise) * 100) : 0;

  const updateItem = (index: number, patch: Partial<FormItem>) => {
    setForm((f) => {
      const items = [...f.items];
      items[index] = { ...items[index]!, ...patch };
      return { ...f, items };
    });
  };

  const addItem = () => {
    setForm((f) => ({
      ...f,
      items: [...f.items, { productId: "", variantId: "", quantity: 1 }],
    }));
  };

  const removeItem = (index: number) => {
    if (form.items.length <= 2) return;
    setForm((f) => ({
      ...f,
      items: f.items.filter((_, i) => i !== index),
    }));
  };

  const selectedMedia = media.find((m) => m.id === form.imageId);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="space-y-5 rounded-md border border-line bg-surface-sunken/30 p-4"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field>
          <Label required>Combo Title</Label>
          <Input
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="e.g. Royal Silver Necklace + Earrings Set"
            required
          />
        </Field>

        <Field>
          <Label>Discounted Combo Price (₹)</Label>
          <Input
            type="number"
            step="1"
            value={form.comboPriceRupees}
            onChange={(e) => set("comboPriceRupees", e.target.value)}
            placeholder="e.g. 2999"
            required
          />
        </Field>
      </div>

      {/* Savings indicator */}
      {originalSumPaise > 0 ? (
        <div className="rounded border border-gold-300/80 bg-gold-50/60 p-3 text-xs flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="font-semibold text-content-muted">Original Combined Sum: </span>
            <span className="font-mono text-content">{formatPrice(originalSumPaise)}</span>
          </div>
          <div>
            <span className="font-semibold text-brand-950">You Save: </span>
            <strong className="font-bold text-success-700 font-mono">
              {formatPrice(savingsPaise)} ({savingsPercent}% OFF)
            </strong>
          </div>
        </div>
      ) : null}

      {/* Custom Image Upload / Picker */}
      <Field>
        <Label>Custom Combo Photo (Optional)</Label>
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
              <option value="">No custom image (Use combined product photos)</option>
              {media.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </NativeSelect>
            <p className="text-[11px] text-content-subtle">
              If left unselected, the combo card automatically combines individual product photos.
            </p>
          </div>
        </div>
      </Field>

      {/* Bundled Products */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label required>Bundled Products (At least 2)</Label>
          <Button type="button" size="sm" variant="outline" onClick={addItem}>
            <Plus className="size-3 mr-1" />
            Add Another Product
          </Button>
        </div>

        <div className="space-y-3">
          {form.items.map((item, idx) => {
            const selectedProduct = products.find((p) => p.id === item.productId);

            return (
              <div
                key={idx}
                className="flex flex-wrap items-center gap-3 rounded border border-line p-3 bg-surface"
              >
                <span className="font-bold text-xs text-content-subtle shrink-0">
                  Item #{idx + 1}
                </span>

                <div className="flex-1 min-w-[200px]">
                  <NativeSelect
                    value={item.productId}
                    onChange={(e) =>
                      updateItem(idx, { productId: e.target.value, variantId: "" })
                    }
                    required
                  >
                    <option value="">Select a product...</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({formatPrice(p.pricePaise)})
                      </option>
                    ))}
                  </NativeSelect>
                </div>

                {selectedProduct && selectedProduct.variants.length > 0 ? (
                  <div className="min-w-[160px]">
                    <NativeSelect
                      value={item.variantId}
                      onChange={(e) => updateItem(idx, { variantId: e.target.value })}
                    >
                      <option value="">Default Variant</option>
                      {selectedProduct.variants.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.title} ({formatPrice(v.pricePaise)})
                        </option>
                      ))}
                    </NativeSelect>
                  </div>
                ) : null}

                {form.items.length > 2 ? (
                  <button
                    type="button"
                    onClick={() => removeItem(idx)}
                    className="p-1.5 text-danger-600 hover:text-danger-800"
                  >
                    <Trash2 className="size-4" />
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      {/* Expiration Timer & Description */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field>
          <Label>Offer Expiration Countdown (Ends At)</Label>
          <Input
            type="datetime-local"
            value={form.endsAt}
            onChange={(e) => set("endsAt", e.target.value)}
          />
          <p className="text-[11px] text-content-subtle">
            Sets the live countdown timer on storefront cards and product pages.
          </p>
        </Field>

        <Field>
          <Label>Description</Label>
          <Textarea
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            rows={2}
            placeholder="Special combo offer details or highlights..."
          />
        </Field>
      </div>

      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(e) => set("isActive", e.target.checked)}
            className="size-4 accent-brand-900"
          />
          <span>Active & Visible on Storefront</span>
        </label>
      </div>

      <div className="flex gap-2 pt-2">
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
