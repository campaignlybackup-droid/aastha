"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import {
  setCustomerRole,
  setCustomerStatus,
} from "@/server/actions/catalogue-admin";
import type { Role, UserStatus } from "@/generated/prisma/enums";

const ROLES: Role[] = [
  "CUSTOMER",
  "CONTENT_MANAGER",
  "MARKETING_MANAGER",
  "ORDER_MANAGER",
  "PRODUCT_MANAGER",
  "ADMIN",
  "SUPER_ADMIN",
];

/**
 * Per-customer controls.
 *
 * Role changes are super-admin only and never available on your own row —
 * otherwise an admin could promote themselves, or lock themselves out.
 */
export function CustomerActions({
  userId,
  role,
  status,
  isSelf,
  canManageRoles,
}: {
  userId: string;
  role: Role;
  status: UserStatus;
  isSelf: boolean;
  canManageRoles: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  function run(action: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setError(result.error ?? "Something went wrong.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex items-center justify-end gap-1.5">
        {canManageRoles && !isSelf ? (
          <>
            <label className="sr-only" htmlFor={`role-${userId}`}>
              Role
            </label>
            <select
              id={`role-${userId}`}
              value={role}
              disabled={pending}
              onChange={(event) =>
                run(() => setCustomerRole(userId, event.target.value as Role))
              }
              className="rounded-xs border border-line-strong px-1.5 py-1 text-xs outline-none disabled:opacity-50"
            >
              {ROLES.map((option) => (
                <option key={option} value={option}>
                  {option.replace(/_/g, " ").toLowerCase()}
                </option>
              ))}
            </select>
          </>
        ) : null}

        {!isSelf ? (
          <button
            type="button"
            onClick={() =>
              run(() =>
                setCustomerStatus(
                  userId,
                  status === "BLOCKED" ? "ACTIVE" : "BLOCKED",
                ),
              )
            }
            disabled={pending}
            className="rounded-xs border border-line-strong px-2 py-1 text-xs text-content-muted hover:border-danger-500 hover:text-danger-700 disabled:opacity-40"
          >
            {status === "BLOCKED" ? "Unblock" : "Block"}
          </button>
        ) : (
          <span className="text-xs text-content-subtle">You</span>
        )}
      </div>

      {error ? (
        <p role="alert" className="max-w-48 text-right text-xs text-danger-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
