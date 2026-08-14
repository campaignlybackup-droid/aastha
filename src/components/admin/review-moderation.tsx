"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";

import { Alert, Badge, Rating } from "@/components/ui/primitives";
import { adminModerateReview } from "@/server/actions/admin";
import { formatDate } from "@/lib/utils";

type Review = {
  id: string;
  rating: number;
  title: string | null;
  body: string | null;
  status: string;
  isVerified: boolean;
  createdAt: string;
  authorName: string;
  product: { name: string; slug: string };
};

/**
 * Review moderation.
 *
 * Approving recalculates the product's rating average server-side, so the
 * denormalised rating on the product can never drift from the approved set.
 */
export function ReviewModeration({ reviews }: { reviews: Review[] }) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [message, setMessage] = React.useState<
    { tone: "success" | "danger"; text: string } | null
  >(null);

  function moderate(id: string, decision: "APPROVED" | "REJECTED") {
    setMessage(null);
    startTransition(async () => {
      const result = await adminModerateReview(id, decision);
      setMessage(
        result.ok
          ? { tone: "success", text: result.message ?? "Saved." }
          : { tone: "danger", text: result.error },
      );
      router.refresh();
    });
  }

  if (reviews.length === 0) {
    return (
      <p className="px-5 py-12 text-center text-sm text-content-muted">
        Nothing in this view.
      </p>
    );
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
        {reviews.map((review) => (
          <li key={review.id} className="px-5 py-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="mb-1.5 flex flex-wrap items-center gap-2.5">
                  <Rating value={review.rating} />
                  <span className="text-sm">{review.authorName}</span>
                  {review.isVerified ? (
                    <Badge variant="success">Verified purchase</Badge>
                  ) : (
                    <Badge variant="warning">Not a verified purchase</Badge>
                  )}
                  <span className="text-xs text-content-subtle">
                    {formatDate(review.createdAt)}
                  </span>
                </div>

                <p className="text-xs text-content-subtle">
                  on{" "}
                  <Link
                    href={`/product/${review.product.slug}`}
                    target="_blank"
                    className="underline underline-offset-2 hover:text-[var(--color-accent)]"
                  >
                    {review.product.name}
                  </Link>
                </p>

                {review.title ? (
                  <p className="mt-2 font-display text-lg">{review.title}</p>
                ) : null}
                {review.body ? (
                  <p className="mt-1 text-sm leading-relaxed text-content-muted">
                    {review.body}
                  </p>
                ) : null}
              </div>

              <div className="flex gap-2">
                {review.status !== "APPROVED" ? (
                  <button
                    type="button"
                    onClick={() => moderate(review.id, "APPROVED")}
                    disabled={pending}
                    className="inline-flex items-center gap-1.5 rounded-xs border border-success-500/50 px-3 py-1.5 text-xs text-success-700 hover:bg-success-50 disabled:opacity-40"
                  >
                    <Check className="size-3.5" aria-hidden="true" />
                    Approve
                  </button>
                ) : null}

                {review.status !== "REJECTED" ? (
                  <button
                    type="button"
                    onClick={() => moderate(review.id, "REJECTED")}
                    disabled={pending}
                    className="inline-flex items-center gap-1.5 rounded-xs border border-line-strong px-3 py-1.5 text-xs text-content-muted hover:border-danger-500 hover:text-danger-700 disabled:opacity-40"
                  >
                    <X className="size-3.5" aria-hidden="true" />
                    Reject
                  </button>
                ) : null}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
