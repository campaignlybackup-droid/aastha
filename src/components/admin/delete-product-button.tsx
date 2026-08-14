"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/primitives";
import { deleteProduct } from "@/server/actions/product-admin";

/**
 * Deletes a product, with a two-step confirm.
 *
 * The action refuses when the product appears in any order, so the common
 * "this sold once, now it's gone from history" mistake is impossible — the
 * error explains to archive instead.
 */
export function DeleteProductButton({ productId }: { productId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  function remove() {
    setError(null);
    startTransition(async () => {
      const result = await deleteProduct(productId);
      if (!result.ok) {
        setError(result.error);
        setConfirming(false);
        return;
      }
      router.push("/admin/products");
    });
  }

  return (
    <div className="space-y-2">
      {confirming ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-content-muted">Delete permanently?</span>
          <Button variant="danger" size="sm" loading={pending} onClick={remove}>
            Yes, delete
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={() => setConfirming(false)}
          >
            Keep
          </Button>
        </div>
      ) : (
        <Button variant="outline" size="sm" onClick={() => setConfirming(true)}>
          Delete product
        </Button>
      )}

      {error ? <Alert variant="danger">{error}</Alert> : null}
    </div>
  );
}
