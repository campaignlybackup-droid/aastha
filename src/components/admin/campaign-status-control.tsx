"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { setCampaignStatus } from "@/server/actions/cms";

/**
 * Campaign eligibility.
 *
 * DRAFT and ARCHIVED never show. SCHEDULED means "show whenever the dates
 * say so" — which is why there is no separate ACTIVE option here: activation
 * is the date window's job, not a button's.
 */
const OPTIONS = [
  { value: "DRAFT", label: "Draft — never shows" },
  { value: "SCHEDULED", label: "Scheduled — shows during its window" },
  { value: "ARCHIVED", label: "Archived — never shows" },
] as const;

export function CampaignStatusControl({
  campaignId,
  status,
}: {
  campaignId: string;
  status: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  // A campaign whose window is currently open reports ACTIVE; for the purposes
  // of this control that is the same eligibility as SCHEDULED.
  const value = status === "ACTIVE" ? "SCHEDULED" : status;

  function onChange(next: string) {
    setError(null);
    startTransition(async () => {
      const result = await setCampaignStatus(
        campaignId,
        next as "DRAFT" | "SCHEDULED" | "ARCHIVED",
      );
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <label className="sr-only" htmlFor={`campaign-status-${campaignId}`}>
        Campaign status
      </label>
      <select
        id={`campaign-status-${campaignId}`}
        value={OPTIONS.some((o) => o.value === value) ? value : "DRAFT"}
        disabled={pending}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-xs border border-line-strong px-2 py-1.5 text-xs outline-none disabled:opacity-50"
      >
        {OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error ? (
        <p role="alert" className="text-xs text-danger-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
