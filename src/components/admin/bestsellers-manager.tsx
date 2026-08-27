"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Check, ImageIcon, Plus, Search, Star, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field, Input, Label } from "@/components/ui/field";
import { Alert, Badge } from "@/components/ui/primitives";
import { MediaImage } from "@/components/ui/media-image";
import { formatPrice } from "@/lib/money";
import { saveBestSellersAction } from "@/server/actions/bestsellers-admin";

export type AdminProductItem = {
  id: string;
  name: string;
  sku: string;
  pricePaise: number;
  imageUrl: string | null;
};

export function BestSellersManager({
  initialProductIds,
  products,
}: {
  initialProductIds: string[];
  products: AdminProductItem[];
}) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = React.useState<string[]>(initialProductIds);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [pending, startTransition] = React.useTransition();
  const [message, setMessage] = React.useState<{
    tone: "success" | "danger";
    text: string;
  } | null>(null);

  // Map product map for fast lookup
  const productMap = React.useMemo(() => {
    const map = new Map<string, AdminProductItem>();
    products.forEach((p) => map.set(p.id, p));
    return map;
  }, [products]);

  // Selected product items preserving order
  const selectedProducts = React.useMemo(() => {
    return selectedIds
      .map((id) => productMap.get(id))
      .filter((p): p is AdminProductItem => p !== undefined);
  }, [selectedIds, productMap]);

  // Unselected products matching search query
  const availableProducts = React.useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return products.filter((p) => {
      const matchesSearch =
        !query || p.name.toLowerCase().includes(query) || p.sku.toLowerCase().includes(query);
      return matchesSearch;
    });
  }, [products, searchQuery]);

  const addProduct = (id: string) => {
    if (!selectedIds.includes(id)) {
      setSelectedIds((prev) => [...prev, id]);
      setMessage(null);
    }
  };

  const removeProduct = (id: string) => {
    setSelectedIds((prev) => prev.filter((item) => item !== id));
    setMessage(null);
  };

  const moveUp = (index: number) => {
    if (index <= 0) return;
    const next = [...selectedIds];
    const temp = next[index - 1]!;
    next[index - 1] = next[index]!;
    next[index] = temp;
    setSelectedIds(next);
    setMessage(null);
  };

  const moveDown = (index: number) => {
    if (index >= selectedIds.length - 1) return;
    const next = [...selectedIds];
    const temp = next[index + 1]!;
    next[index + 1] = next[index]!;
    next[index] = temp;
    setSelectedIds(next);
    setMessage(null);
  };

  const handleSave = () => {
    setMessage(null);
    startTransition(async () => {
      const result = await saveBestSellersAction(selectedIds);
      setMessage(
        result.ok
          ? { tone: "success", text: result.message }
          : { tone: "danger", text: result.error },
      );
      if (result.ok) router.refresh();
    });
  };

  return (
    <div className="space-y-6">
      {message ? (
        <Alert variant={message.tone === "success" ? "success" : "danger"}>
          {message.text}
        </Alert>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-md border border-line bg-surface-sunken/40 p-4">
        <div>
          <h3 className="font-display text-base font-semibold text-brand-950 flex items-center gap-2">
            <Star className="size-4 text-gold-600 fill-gold-500 shrink-0" />
            Hand-Picked Best Sellers ({selectedIds.length})
          </h3>
          <p className="text-xs text-content-muted mt-0.5">
            Add products from your catalogue below. Re-order items using up/down arrows.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {selectedIds.length > 0 ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setSelectedIds([])}
              className="text-xs text-danger-700 hover:text-danger-800"
            >
              Clear All
            </Button>
          ) : null}
          <Button type="button" size="sm" loading={pending} onClick={handleSave}>
            Save Best Sellers
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Column: Selected Best Sellers (Ordered) */}
        <div className="lg:col-span-6 space-y-3">
          <div className="flex items-center justify-between border-b border-line pb-2">
            <span className="font-semibold text-xs text-brand-950 uppercase tracking-wider">
              1. Active Best Sellers Sequence ({selectedProducts.length})
            </span>
            <span className="text-[11px] text-content-subtle">Order shown on homepage</span>
          </div>

          {selectedProducts.length === 0 ? (
            <div className="rounded-md border border-dashed border-line p-8 text-center text-xs text-content-muted space-y-2">
              <Star className="mx-auto size-8 text-content-subtle opacity-40" />
              <p>No products added to Best Sellers list yet.</p>
              <p className="text-[11px] text-content-subtle">
                Select products from the catalogue on the right to build your Best Sellers list.
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {selectedProducts.map((prod, idx) => (
                <div
                  key={prod.id}
                  className="flex items-center justify-between gap-3 rounded-md border border-line bg-surface p-3 transition-all hover:border-gold-400"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-mono text-xs font-bold text-content-subtle size-6 shrink-0 flex items-center justify-center rounded bg-sand-100">
                      #{idx + 1}
                    </span>

                    <div className="relative size-12 shrink-0 overflow-hidden rounded border border-line bg-sand-100 flex items-center justify-center">
                      {prod.imageUrl ? (
                        <MediaImage
                          src={prod.imageUrl}
                          alt={prod.name}
                          fill
                          sizes="48px"
                          className="object-cover"
                        />
                      ) : (
                        <ImageIcon className="size-4 text-content-subtle opacity-40" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <h4 className="font-medium text-xs text-content truncate">{prod.name}</h4>
                      <p className="text-[11px] text-content-subtle">
                        {prod.sku} · {formatPrice(prod.pricePaise)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => moveUp(idx)}
                      disabled={idx === 0}
                      title="Move Up"
                      className="p-1 rounded border border-line hover:bg-sand-100 disabled:opacity-30"
                    >
                      <ArrowUp className="size-3.5 text-content" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveDown(idx)}
                      disabled={idx === selectedProducts.length - 1}
                      title="Move Down"
                      className="p-1 rounded border border-line hover:bg-sand-100 disabled:opacity-30"
                    >
                      <ArrowDown className="size-3.5 text-content" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeProduct(prod.id)}
                      title="Remove"
                      className="p-1 rounded border border-line hover:bg-danger-50 text-danger-700 hover:border-danger-300"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Catalogue Search & Fast Selection */}
        <div className="lg:col-span-6 space-y-3">
          <div className="flex items-center justify-between border-b border-line pb-2">
            <span className="font-semibold text-xs text-brand-950 uppercase tracking-wider">
              2. Select From Catalogue ({availableProducts.length})
            </span>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-2.5 size-4 text-content-subtle" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search product by name or SKU..."
              className="pl-9 text-xs"
            />
          </div>

          <div className="space-y-2 max-h-[550px] overflow-y-auto pr-1 divide-y divide-line/40 border border-line rounded-md p-2 bg-surface">
            {availableProducts.map((prod) => {
              const isAdded = selectedIds.includes(prod.id);

              return (
                <div
                  key={prod.id}
                  className={`flex items-center justify-between gap-3 p-2 rounded transition-colors ${
                    isAdded ? "bg-sand-50/70" : "hover:bg-sand-100/60"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative size-10 shrink-0 overflow-hidden rounded border border-line bg-sand-100 flex items-center justify-center">
                      {prod.imageUrl ? (
                        <MediaImage
                          src={prod.imageUrl}
                          alt={prod.name}
                          fill
                          sizes="40px"
                          className="object-cover"
                        />
                      ) : (
                        <ImageIcon className="size-4 text-content-subtle opacity-40" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <h4 className="font-medium text-xs text-content truncate">{prod.name}</h4>
                      <p className="text-[10px] text-content-subtle">
                        {prod.sku} · {formatPrice(prod.pricePaise)}
                      </p>
                    </div>
                  </div>

                  {isAdded ? (
                    <button
                      type="button"
                      onClick={() => removeProduct(prod.id)}
                      className="inline-flex items-center gap-1 rounded bg-gold-50 px-2 py-1 text-[11px] font-semibold text-gold-800 border border-gold-300 hover:bg-danger-50 hover:text-danger-700 hover:border-danger-300"
                    >
                      <Check className="size-3 text-gold-600" />
                      Added (Remove)
                    </button>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => addProduct(prod.id)}
                      className="text-xs px-2.5 py-1 h-auto"
                    >
                      <Plus className="size-3 mr-1" />
                      Add to Best Sellers
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
