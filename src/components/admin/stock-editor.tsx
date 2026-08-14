"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";

import { adminSetStock } from "@/server/actions/admin";
import { cn } from "@/lib/utils";

/**
 * Inline stock adjustment.
 *
 * Sets an absolute figure rather than applying a delta: staff counting a tray
 * of rings know how many there are, not how many have changed since they last
 * looked. The delta is derived server-side for the ledger.
 */
export function StockEditor({
  variantId,
  stockQuantity,
}: {
  variantId: string;
  stockQuantity: number;
}) {
  const router = useRouter();
  const [editing, setEditing] = React.useState(false);
  const [value, setValue] = React.useState(String(stockQuantity));
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  function save() {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed) || parsed < 0) {
      setError("Enter a whole number.");
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await adminSetStock({
        variantId,
        stockQuantity: parsed,
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      setEditing(false);
      router.refresh();
    });
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => {
          setValue(String(stockQuantity));
          setEditing(true);
        }}
        className="rounded-xs border border-line-strong px-2.5 py-1 text-xs text-content-muted transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
      >
        Set
      </button>
    );
  }

  return (
    <div className="flex items-center justify-end gap-1.5">
      <label className="sr-only" htmlFor={`stock-${variantId}`}>
        Stock quantity
      </label>
      <input
        id={`stock-${variantId}`}
        // Opened by an explicit click, so focus belongs in the field.
        autoFocus
        inputMode="numeric"
        value={value}
        onChange={(event) => setValue(event.target.value.replace(/\D/g, ""))}
        onKeyDown={(event) => {
          if (event.key === "Enter") save();
          if (event.key === "Escape") setEditing(false);
        }}
        className={cn(
          "h-8 w-16 rounded-xs border px-2 text-right text-sm outline-none",
          error ? "border-danger-500" : "border-line-strong focus:border-[var(--color-accent)]",
        )}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `stock-error-${variantId}` : undefined}
      />

      <button
        type="button"
        onClick={save}
        disabled={pending}
        aria-label="Save stock"
        className="inline-flex size-8 items-center justify-center rounded-xs border border-line-strong text-success-700 hover:border-success-500 disabled:opacity-50"
      >
        <Check className="size-3.5" aria-hidden="true" />
      </button>

      <button
        type="button"
        onClick={() => {
          setEditing(false);
          setError(null);
        }}
        disabled={pending}
        aria-label="Cancel"
        className="inline-flex size-8 items-center justify-center rounded-xs border border-line-strong text-content-muted hover:border-line-strong disabled:opacity-50"
      >
        <X className="size-3.5" aria-hidden="true" />
      </button>

      {error ? (
        <span
          id={`stock-error-${variantId}`}
          role="alert"
          className="absolute mt-10 text-xs text-danger-700"
        >
          {error}
        </span>
      ) : null}
    </div>
  );
}
