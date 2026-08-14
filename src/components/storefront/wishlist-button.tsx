"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";

import { toggleWishlist } from "@/server/actions/account";
import { cn } from "@/lib/utils";

/**
 * Save-for-later toggle.
 *
 * Resolves its own state after hydration rather than receiving it as a prop.
 * Reading the session on the product page would make all 24 prerendered
 * product pages dynamic, which costs far more than a brief unfilled heart.
 *
 * Optimistic on click: the heart fills immediately and reverts if the server
 * refuses. A signed-out visitor goes to login with `next` pointing back here.
 */
export function WishlistButton({
  productId,
  productSlug,
}: {
  productId: string;
  productSlug: string;
}) {
  const router = useRouter();
  const [saved, setSaved] = React.useState(false);
  const [signedIn, setSignedIn] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const controller = new AbortController();

    async function load() {
      try {
        const res = await fetch(
          `/api/wishlist/status?productId=${encodeURIComponent(productId)}`,
          { signal: controller.signal, cache: "no-store" },
        );
        if (!res.ok) return;
        const data = (await res.json()) as { signedIn: boolean; saved: boolean };
        setSignedIn(data.signedIn);
        setSaved(data.saved);
      } catch {
        /* Non-critical — the button still works, it just starts unfilled. */
      }
    }

    void load();
    return () => controller.abort();
  }, [productId]);

  function onClick() {
    if (!signedIn) {
      router.push(`/login?next=${encodeURIComponent(`/product/${productSlug}`)}`);
      return;
    }

    const previous = saved;
    setSaved(!previous);
    setError(null);

    startTransition(async () => {
      const result = await toggleWishlist(productId);
      if (!result.ok) {
        setSaved(previous);
        setError(result.error);
        return;
      }
      setSaved(result.inWishlist ?? !previous);
      router.refresh();
    });
  }

  return (
    <div>
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        aria-pressed={signedIn ? saved : undefined}
        className={cn(
          "inline-flex items-center gap-2 text-sm transition-colors disabled:opacity-50",
          saved
            ? "text-[var(--color-accent)]"
            : "text-content-muted hover:text-[var(--color-accent)]",
        )}
      >
        <Heart
          className={cn("size-4", saved && "fill-current")}
          aria-hidden="true"
        />
        {saved ? "Saved to wishlist" : "Save for later"}
      </button>

      {error ? (
        <p role="alert" className="mt-1 text-xs text-danger-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
