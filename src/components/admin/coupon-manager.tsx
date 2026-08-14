"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field, Input, Label, NativeSelect } from "@/components/ui/field";
import { Alert, Badge } from "@/components/ui/primitives";
import {
  deleteCoupon,
  saveCoupon,
  setCouponActive,
} from "@/server/actions/catalogue-admin";
import { formatPrice } from "@/lib/money";
import { formatDate } from "@/lib/utils";

type Coupon = {
  id: string;
  code: string;
  description: string | null;
  type: "PERCENTAGE" | "FLAT";
  value: number;
  minOrderPaise: number;
  maxDiscountPaise: number | null;
  startsAt: string | null;
  endsAt: string | null;
  usageLimit: number | null;
  usageCount: number;
  perCustomerLimit: number;
  isActive: boolean;
  _count: { usages: number };
};

type FormState = {
  id?: string;
  code: string;
  description: string;
  type: "PERCENTAGE" | "FLAT";
  value: string;
  minOrderRupees: string;
  maxDiscountRupees: string;
  startsAt: string;
  endsAt: string;
  usageLimit: string;
  perCustomerLimit: string;
  isActive: boolean;
};

const EMPTY: FormState = {
  code: "",
  description: "",
  type: "PERCENTAGE",
  value: "10",
  minOrderRupees: "0",
  maxDiscountRupees: "",
  startsAt: "",
  endsAt: "",
  usageLimit: "",
  perCustomerLimit: "1",
  isActive: true,
};

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);
}

/** Human summary of what a coupon actually does, for the list row. */
function describe(coupon: Coupon): string {
  const discount =
    coupon.type === "PERCENTAGE"
      ? `${coupon.value}% off`
      : `${formatPrice(coupon.value)} off`;

  const parts = [discount];
  if (coupon.minOrderPaise > 0) {
    parts.push(`over ${formatPrice(coupon.minOrderPaise)}`);
  }
  if (coupon.maxDiscountPaise) {
    parts.push(`capped at ${formatPrice(coupon.maxDiscountPaise)}`);
  }
  return parts.join(" · ");
}

function statusOf(coupon: Coupon): { label: string; variant: "success" | "neutral" | "warning" | "danger" } {
  if (!coupon.isActive) return { label: "Disabled", variant: "neutral" };

  const now = Date.now();
  if (coupon.startsAt && new Date(coupon.startsAt).getTime() > now) {
    return { label: "Scheduled", variant: "warning" };
  }
  if (coupon.endsAt && new Date(coupon.endsAt).getTime() < now) {
    return { label: "Expired", variant: "danger" };
  }
  if (coupon.usageLimit != null && coupon.usageCount >= coupon.usageLimit) {
    return { label: "Fully redeemed", variant: "danger" };
  }
  return { label: "Live", variant: "success" };
}

export function CouponManager({ coupons }: { coupons: Coupon[] }) {
  const router = useRouter();
  const [editing, setEditing] = React.useState<string | "new" | null>(null);
  const [form, setForm] = React.useState<FormState>(EMPTY);
  const [pending, startTransition] = React.useTransition();
  const [message, setMessage] = React.useState<
    { tone: "success" | "danger"; text: string } | null
  >(null);

  function run(action: () => Promise<{ ok: boolean; message?: string; error?: string }>) {
    setMessage(null);
    startTransition(async () => {
      const result = await action();
      setMessage(
        result.ok
          ? { tone: "success", text: result.message ?? "Saved." }
          : { tone: "danger", text: result.error ?? "Something went wrong." },
      );
      if (result.ok) setEditing(null);
      router.refresh();
    });
  }

  function submit() {
    run(() =>
      saveCoupon({
        id: form.id,
        code: form.code,
        description: form.description || undefined,
        type: form.type,
        value: Number(form.value) || 0,
        minOrderRupees: Number(form.minOrderRupees) || 0,
        maxDiscountRupees: form.maxDiscountRupees
          ? Number(form.maxDiscountRupees)
          : null,
        startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null,
        endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
        usageLimit: form.usageLimit ? Number(form.usageLimit) : null,
        perCustomerLimit: Number(form.perCustomerLimit) || 1,
        isActive: form.isActive,
      }),
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
        {coupons.length === 0 ? (
          <li className="px-5 py-12 text-center text-sm text-content-muted">
            No coupons yet.
          </li>
        ) : (
          coupons.map((coupon) => {
            const status = statusOf(coupon);

            return (
              <li key={coupon.id} className="px-5 py-3.5">
                {editing === coupon.id ? (
                  <CouponForm
                    form={form}
                    setForm={setForm}
                    pending={pending}
                    submitLabel="Save changes"
                    onSubmit={submit}
                    onCancel={() => setEditing(null)}
                  />
                ) : (
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium tracking-wide">
                          {coupon.code}
                        </span>
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </div>
                      <p className="mt-0.5 text-xs text-content-muted">
                        {describe(coupon)}
                      </p>
                      <p className="mt-0.5 text-xs text-content-subtle">
                        Used {coupon.usageCount}
                        {coupon.usageLimit ? ` of ${coupon.usageLimit}` : ""} ·{" "}
                        {coupon.perCustomerLimit} per customer
                        {coupon.endsAt ? ` · ends ${formatDate(coupon.endsAt)}` : ""}
                      </p>
                    </div>

                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          run(() => setCouponActive(coupon.id, !coupon.isActive))
                        }
                        disabled={pending}
                        className="rounded-xs border border-line-strong px-2.5 py-1.5 text-xs text-content-muted hover:border-[var(--color-accent)] disabled:opacity-40"
                      >
                        {coupon.isActive ? "Disable" : "Enable"}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setForm({
                            id: coupon.id,
                            code: coupon.code,
                            description: coupon.description ?? "",
                            type: coupon.type,
                            value:
                              coupon.type === "PERCENTAGE"
                                ? String(coupon.value)
                                : String(coupon.value / 100),
                            minOrderRupees: String(coupon.minOrderPaise / 100),
                            maxDiscountRupees: coupon.maxDiscountPaise
                              ? String(coupon.maxDiscountPaise / 100)
                              : "",
                            startsAt: toLocalInput(coupon.startsAt),
                            endsAt: toLocalInput(coupon.endsAt),
                            usageLimit: coupon.usageLimit
                              ? String(coupon.usageLimit)
                              : "",
                            perCustomerLimit: String(coupon.perCustomerLimit),
                            isActive: coupon.isActive,
                          });
                          setEditing(coupon.id);
                        }}
                        disabled={pending}
                        aria-label={`Edit ${coupon.code}`}
                        className="inline-flex size-8 items-center justify-center rounded-xs border border-line-strong text-content-muted hover:border-[var(--color-accent)] disabled:opacity-40"
                      >
                        <Pencil className="size-3.5" aria-hidden="true" />
                      </button>

                      <button
                        type="button"
                        onClick={() => run(() => deleteCoupon(coupon.id))}
                        disabled={pending || coupon._count.usages > 0}
                        aria-label={`Delete ${coupon.code}`}
                        title={
                          coupon._count.usages > 0
                            ? "Redeemed coupons are part of order history — disable instead"
                            : `Delete ${coupon.code}`
                        }
                        className="inline-flex size-8 items-center justify-center rounded-xs border border-line-strong text-content-muted hover:border-danger-500 hover:text-danger-700 disabled:opacity-30"
                      >
                        <Trash2 className="size-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                )}
              </li>
            );
          })
        )}
      </ul>

      <div className="border-t border-line px-5 py-4">
        {editing === "new" ? (
          <CouponForm
            form={form}
            setForm={setForm}
            pending={pending}
            submitLabel="Create coupon"
            onSubmit={submit}
            onCancel={() => setEditing(null)}
          />
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setForm(EMPTY);
              setEditing("new");
              setMessage(null);
            }}
          >
            <Plus aria-hidden="true" />
            Add coupon
          </Button>
        )}
      </div>
    </div>
  );
}

function CouponForm({
  form,
  setForm,
  pending,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  pending: boolean;
  submitLabel: string;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const isPercentage = form.type === "PERCENTAGE";

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
      className="space-y-4"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field>
          <Label required>Code</Label>
          <Input
            value={form.code}
            onChange={(e) => set("code", e.target.value.toUpperCase())}
            required
            maxLength={40}
            placeholder="WELCOME10"
            className="uppercase tracking-wide"
          />
        </Field>

        <Field>
          <Label>Internal description</Label>
          <Input
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            maxLength={200}
            placeholder="10% off a first order"
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field>
          <Label required>Discount type</Label>
          <NativeSelect
            value={form.type}
            onChange={(e) => set("type", e.target.value as FormState["type"])}
          >
            <option value="PERCENTAGE">Percentage off</option>
            <option value="FLAT">Flat amount off</option>
          </NativeSelect>
        </Field>

        <Field>
          <Label required>{isPercentage ? "Percent" : "Amount (₹)"}</Label>
          <Input
            inputMode="decimal"
            value={form.value}
            onChange={(e) => set("value", e.target.value)}
            required
          />
        </Field>

        <Field>
          <Label>Maximum discount (₹)</Label>
          <Input
            inputMode="decimal"
            value={form.maxDiscountRupees}
            onChange={(e) => set("maxDiscountRupees", e.target.value)}
            placeholder={isPercentage ? "e.g. 500" : "No cap"}
            disabled={!isPercentage}
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field>
          <Label>Minimum order (₹)</Label>
          <Input
            inputMode="decimal"
            value={form.minOrderRupees}
            onChange={(e) => set("minOrderRupees", e.target.value)}
          />
        </Field>

        <Field>
          <Label>Total redemptions</Label>
          <Input
            inputMode="numeric"
            value={form.usageLimit}
            onChange={(e) => set("usageLimit", e.target.value.replace(/\D/g, ""))}
            placeholder="Unlimited"
          />
        </Field>

        <Field>
          <Label>Per customer</Label>
          <Input
            inputMode="numeric"
            value={form.perCustomerLimit}
            onChange={(e) =>
              set("perCustomerLimit", e.target.value.replace(/\D/g, ""))
            }
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field>
          <Label>Starts</Label>
          <Input
            type="datetime-local"
            value={form.startsAt}
            onChange={(e) => set("startsAt", e.target.value)}
          />
        </Field>

        <Field>
          <Label>Ends</Label>
          <Input
            type="datetime-local"
            value={form.endsAt}
            onChange={(e) => set("endsAt", e.target.value)}
          />
        </Field>
      </div>

      <label className="flex cursor-pointer items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={form.isActive}
          onChange={(e) => set("isActive", e.target.checked)}
          className="size-4 accent-[var(--color-accent)]"
        />
        <span className="text-content-muted">Active</span>
      </label>

      <div className="flex gap-2">
        <Button type="submit" size="sm" loading={pending}>
          {submitLabel}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
