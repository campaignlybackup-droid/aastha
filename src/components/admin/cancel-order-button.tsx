"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/primitives";
import { adminCancelOrder } from "@/server/actions/admin";

/**
 * Cancels an unpaid order and releases its reserved stock.
 *
 * Two-step confirm rather than a modal: cancelling is reversible only by
 * placing a new order, and a stray click on a busy admin screen should not do
 * it.
 */
export function CancelOrderButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  function cancel() {
    setError(null);
    startTransition(async () => {
      const result = await adminCancelOrder(orderId);
      if (!result.ok) {
        setError(result.error);
        setConfirming(false);
        return;
      }
      router.refresh();
    });
  }

  if (!confirming) {
    return (
      <div className="space-y-2">
        <Button variant="outline" size="sm" onClick={() => setConfirming(true)}>
          Cancel order
        </Button>
        {error ? <Alert variant="danger">{error}</Alert> : null}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-content-muted">
        Cancel and release stock?
      </span>
      <Button variant="danger" size="sm" loading={pending} onClick={cancel}>
        Yes, cancel
      </Button>
      <Button
        variant="ghost"
        size="sm"
        disabled={pending}
        onClick={() => setConfirming(false)}
      >
        Keep it
      </Button>
    </div>
  );
}
