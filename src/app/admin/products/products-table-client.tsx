"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { Copy, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { EmptyRow, TableWrap, Td, Th } from "@/components/admin/ui";
import { ProductStatusToggle } from "@/components/admin/product-status-toggle";
import { MediaImage } from "@/components/ui/media-image";
import { Badge } from "@/components/ui/primitives";
import { formatPrice, discountPercent } from "@/lib/money";
import { duplicateProductsAction } from "@/server/actions/product-admin";

type ProductData = {
  id: string;
  name: string;
  slug: string;
  sku: string;
  status: any;
  pricePaise: number;
  mrpPaise: number;
  salesCount: number;
  category: { name: string };
  images: { media: { secureUrl: string } }[];
  variants: { stockQuantity: number; reservedQuantity: number; trackInventory: boolean }[];
};

export function ProductsTableClient({
  products,
  query,
}: {
  products: ProductData[];
  query: string;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();

  const toggleAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelected(products.map((p) => p.id));
    } else {
      setSelected([]);
    }
  };

  const toggleOne = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleDuplicate = () => {
    if (!selected.length) return;
    if (!confirm(`Duplicate ${selected.length} product(s)?`)) return;

    startTransition(async () => {
      const res = await duplicateProductsAction(selected);
      if (res.ok) {
        setSelected([]);
        router.refresh();
      } else {
        alert(res.message);
      }
    });
  };

  return (
    <div className="relative">
      {/* Floating Action Bar */}
      {selected.length > 0 && (
        <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between rounded-t-md bg-brand-50 px-4 py-2 border-b border-brand-200">
          <span className="text-sm font-medium text-brand-900">
            {selected.length} selected
          </span>
          <button
            onClick={handleDuplicate}
            disabled={isPending}
            className="inline-flex items-center gap-1.5 rounded-sm bg-brand-800 px-3 py-1.5 text-xs text-sand-50 transition-colors hover:bg-brand-900 disabled:opacity-50"
          >
            {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Copy className="size-3.5" />}
            Duplicate Selected
          </button>
        </div>
      )}

      <TableWrap>
        <thead>
          <tr>
            <Th className="w-10 pl-4 py-2">
              <input
                type="checkbox"
                className="rounded-sm border-line-strong text-brand-800 focus:ring-brand-800"
                checked={selected.length === products.length && products.length > 0}
                onChange={toggleAll}
                aria-label="Select all"
              />
            </Th>
            <Th>Product</Th>
            <Th>Category</Th>
            <Th align="right">Price</Th>
            <Th align="right">Stock</Th>
            <Th align="right">Sold</Th>
            <Th align="center">Status</Th>
          </tr>
        </thead>
        <tbody>
          {products.length === 0 ? (
            <EmptyRow
              colSpan={7}
              message={query ? `No products match “${query}”.` : "No products yet."}
            />
          ) : (
            products.map((product) => {
              const free = product.variants.reduce(
                (sum, v) =>
                  sum +
                  (v.trackInventory
                    ? Math.max(0, v.stockQuantity - v.reservedQuantity)
                    : 0),
                0,
              );
              const untracked = product.variants.some((v) => !v.trackInventory);
              const off = discountPercent(product.mrpPaise, product.pricePaise);

              return (
                <tr key={product.id} className="hover:bg-sand-50">
                  <Td className="pl-4">
                    <input
                      type="checkbox"
                      className="rounded-sm border-line-strong text-brand-800 focus:ring-brand-800"
                      checked={selected.includes(product.id)}
                      onChange={() => toggleOne(product.id)}
                      aria-label={`Select ${product.name}`}
                    />
                  </Td>
                  <Td>
                    <div className="flex items-center gap-3">
                      <div className="relative size-11 shrink-0 overflow-hidden bg-sand-100">
                        {product.images[0] ? (
                          <MediaImage
                            src={product.images[0].media.secureUrl}
                            alt=""
                            fill
                            sizes="44px"
                            className="object-cover"
                          />
                        ) : null}
                      </div>
                      <div className="min-w-0">
                        <Link
                          href={`/admin/products/${product.id}`}
                          className="block truncate font-medium hover:text-[var(--color-accent)]"
                        >
                          {product.name}
                        </Link>
                        <span className="block text-xs text-content-subtle">
                          {product.sku}
                        </span>
                      </div>
                    </div>
                  </Td>
                  <Td className="text-content-muted">{product.category.name}</Td>
                  <Td align="right" className="whitespace-nowrap">
                    {formatPrice(product.pricePaise)}
                    {off > 0 ? (
                      <span className="block text-xs text-content-subtle">
                        {off}% off
                      </span>
                    ) : null}
                  </Td>
                  <Td align="right">
                    {untracked ? (
                      <span className="text-content-subtle">—</span>
                    ) : free === 0 ? (
                      <Badge variant="danger">Out</Badge>
                    ) : free <= 3 ? (
                      <Badge variant="warning">{free}</Badge>
                    ) : (
                      free
                    )}
                  </Td>
                  <Td align="right" className="text-content-muted">
                    {product.salesCount}
                  </Td>
                  <Td align="center">
                    <ProductStatusToggle
                      productId={product.id}
                      status={product.status}
                    />
                  </Td>
                </tr>
              );
            })
          )}
        </tbody>
      </TableWrap>
    </div>
  );
}
