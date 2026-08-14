"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { adminSetProductStatus } from "@/server/actions/admin";
import type { ProductStatus } from "@/generated/prisma/enums";
import { cn } from "@/lib/utils";

const OPTIONS: ProductStatus[] = ["DRAFT", "ACTIVE", "ARCHIVED"];

/**
 * Inline status switcher.
 *
 * A native select rather than a dropdown menu: it is one tap on mobile, fully
 * keyboard accessible for free, and this table has one on every row.
 */
export function ProductStatusToggle({
  productId,
  status,
}: {
  productId: string;
  status: ProductStatus;
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [value, setValue] = React.useState(status);
  const [error, setError] = React.useState(false);

  function onChange(next: ProductStatus) {
    const previous = value;
    // Optimistic: the table should not flicker while the round trip happens.
    setValue(next);
    setError(false);

    startTransition(async () => {
      const result = await adminSetProductStatus(productId, next);
      if (!result.ok) {
        setValue(previous);
        setError(true);
        return;
      }
      router.refresh();
    });
  }

  return (
    <select
      value={value}
      disabled={pending}
      onChange={(event) => onChange(event.target.value as ProductStatus)}
      aria-label="Product status"
      className={cn(
        "rounded-xs border px-2 py-1 text-xs outline-none transition-colors disabled:opacity-50",
        error
          ? "border-danger-500 text-danger-700"
          : value === "ACTIVE"
            ? "border-success-500/40 bg-success-50 text-success-700"
            : value === "DRAFT"
              ? "border-warning-500/40 bg-warning-50 text-warning-700"
              : "border-line-strong text-content-muted",
      )}
    >
      {OPTIONS.map((option) => (
        <option key={option} value={option}>
          {option.charAt(0) + option.slice(1).toLowerCase()}
        </option>
      ))}
    </select>
  );
}
