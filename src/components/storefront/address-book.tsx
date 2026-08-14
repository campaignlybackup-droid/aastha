"use client";

import * as React from "react";
import { Check, MapPin, Pencil, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Field,
  Input,
  Label,
  NativeSelect,
} from "@/components/ui/field";
import { Alert, Badge, Card, CardBody, EmptyState } from "@/components/ui/primitives";
import {
  deleteAddress,
  saveAddress,
  setDefaultAddress,
  type AddressInput,
} from "@/server/actions/account";
import { INDIAN_STATES } from "@/lib/india";
import { formatMobile } from "@/lib/utils";
import { cn } from "@/lib/utils";

export type SavedAddress = {
  id: string;
  label: string | null;
  name: string;
  mobile: string;
  line1: string;
  line2: string | null;
  landmark: string | null;
  city: string;
  state: string;
  pincode: string;
  country: string;
  isDefault: boolean;
};

const EMPTY_FORM: AddressInput = {
  label: "",
  name: "",
  mobile: "",
  line1: "",
  line2: "",
  landmark: "",
  city: "",
  state: "",
  pincode: "",
  country: "India",
  isDefault: false,
};

/**
 * Address book.
 *
 * Also embedded in checkout, where `onSelect` turns the list into a picker and
 * `compact` trims the chrome. Keeping one component means the two places can
 * never drift apart in validation or behaviour.
 */
export function AddressBook({
  addresses,
  selectedId,
  onSelect,
  compact = false,
}: {
  addresses: SavedAddress[];
  selectedId?: string;
  onSelect?: (id: string) => void;
  compact?: boolean;
}) {
  const [editing, setEditing] = React.useState<string | "new" | null>(
    addresses.length === 0 ? "new" : null,
  );
  const [form, setForm] = React.useState<AddressInput>(EMPTY_FORM);
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  function beginEdit(address: SavedAddress) {
    setForm({
      label: address.label ?? "",
      name: address.name,
      mobile: address.mobile.startsWith("91")
        ? address.mobile.slice(2)
        : address.mobile,
      line1: address.line1,
      line2: address.line2 ?? "",
      landmark: address.landmark ?? "",
      city: address.city,
      state: address.state,
      pincode: address.pincode,
      country: address.country,
      isDefault: address.isDefault,
    });
    setEditing(address.id);
    setError(null);
  }

  function beginCreate() {
    setForm({ ...EMPTY_FORM, isDefault: addresses.length === 0 });
    setEditing("new");
    setError(null);
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await saveAddress({
        ...form,
        id: editing && editing !== "new" ? editing : undefined,
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      setEditing(null);
      // In checkout, a newly saved address should become the chosen one.
      if (result.addressId) onSelect?.(result.addressId);
    });
  }

  function remove(id: string) {
    setError(null);
    startTransition(async () => {
      const result = await deleteAddress(id);
      if (!result.ok) setError(result.error);
    });
  }

  function makeDefault(id: string) {
    setError(null);
    startTransition(async () => {
      const result = await setDefaultAddress(id);
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <div className="space-y-4">
      {error ? <Alert variant="danger">{error}</Alert> : null}

      {addresses.length === 0 && editing !== "new" ? (
        <EmptyState
          icon={MapPin}
          title="No saved addresses"
          description="Add a delivery address to speed up checkout."
          action={<Button onClick={beginCreate}>Add address</Button>}
        />
      ) : null}

      <ul className="space-y-3">
        {addresses.map((address) =>
          editing === address.id ? (
            <li key={address.id}>
              <AddressForm
                form={form}
                setForm={setForm}
                pending={pending}
                onSubmit={submit}
                onCancel={() => setEditing(null)}
                submitLabel="Save changes"
              />
            </li>
          ) : (
            <li key={address.id}>
              <Card
                className={cn(
                  "transition-colors",
                  onSelect && "cursor-pointer",
                  selectedId === address.id &&
                    "border-[var(--color-accent)] ring-1 ring-[var(--color-accent)]",
                )}
                onClick={onSelect ? () => onSelect(address.id) : undefined}
              >
                <CardBody className="flex items-start gap-3">
                  {onSelect ? (
                    <input
                      type="radio"
                      name="shipping-address"
                      checked={selectedId === address.id}
                      onChange={() => onSelect(address.id)}
                      aria-label={`Deliver to ${address.name}, ${address.line1}`}
                      className="mt-1 size-4 shrink-0 accent-[var(--color-accent)]"
                    />
                  ) : null}

                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium">{address.name}</p>
                      {address.label ? (
                        <Badge variant="outline">{address.label}</Badge>
                      ) : null}
                      {address.isDefault ? (
                        <Badge variant="accent">Default</Badge>
                      ) : null}
                    </div>

                    <address className="text-sm not-italic leading-relaxed text-content-muted">
                      {address.line1}
                      {address.line2 ? `, ${address.line2}` : ""}
                      {address.landmark ? `, near ${address.landmark}` : ""}
                      <br />
                      {address.city}, {address.state} {address.pincode}
                      <br />
                      {formatMobile(address.mobile)}
                    </address>

                    {!compact ? (
                      <div className="mt-3 flex flex-wrap gap-3 text-xs">
                        <button
                          type="button"
                          onClick={() => beginEdit(address)}
                          disabled={pending}
                          className="inline-flex items-center gap-1 underline underline-offset-4 hover:text-[var(--color-accent)]"
                        >
                          <Pencil className="size-3" aria-hidden="true" />
                          Edit
                        </button>

                        {!address.isDefault ? (
                          <>
                            <button
                              type="button"
                              onClick={() => makeDefault(address.id)}
                              disabled={pending}
                              className="inline-flex items-center gap-1 underline underline-offset-4 hover:text-[var(--color-accent)]"
                            >
                              <Check className="size-3" aria-hidden="true" />
                              Make default
                            </button>
                            <button
                              type="button"
                              onClick={() => remove(address.id)}
                              disabled={pending}
                              className="inline-flex items-center gap-1 underline underline-offset-4 hover:text-danger-700"
                            >
                              <Trash2 className="size-3" aria-hidden="true" />
                              Remove
                            </button>
                          </>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </CardBody>
              </Card>
            </li>
          ),
        )}
      </ul>

      {editing === "new" ? (
        <AddressForm
          form={form}
          setForm={setForm}
          pending={pending}
          onSubmit={submit}
          onCancel={addresses.length ? () => setEditing(null) : undefined}
          submitLabel="Save address"
        />
      ) : addresses.length ? (
        <Button variant="outline" onClick={beginCreate} disabled={pending}>
          <Plus aria-hidden="true" />
          Add another address
        </Button>
      ) : null}
    </div>
  );
}

function AddressForm({
  form,
  setForm,
  pending,
  onSubmit,
  onCancel,
  submitLabel,
}: {
  form: AddressInput;
  setForm: React.Dispatch<React.SetStateAction<AddressInput>>;
  pending: boolean;
  onSubmit: (event: React.FormEvent) => void;
  onCancel?: () => void;
  submitLabel: string;
}) {
  const set = <K extends keyof AddressInput>(key: K, value: AddressInput[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  return (
    <Card>
      <CardBody>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <Label required>Full name</Label>
              <Input
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                autoComplete="name"
                required
                maxLength={80}
              />
            </Field>

            <Field>
              <Label required>Mobile number</Label>
              <Input
                type="tel"
                inputMode="numeric"
                value={form.mobile}
                onChange={(e) => set("mobile", e.target.value)}
                autoComplete="tel-national"
                placeholder="98765 43210"
                required
                maxLength={14}
              />
            </Field>
          </div>

          <Field>
            <Label required>Address</Label>
            <Input
              value={form.line1}
              onChange={(e) => set("line1", e.target.value)}
              autoComplete="address-line1"
              placeholder="Flat / House no., building, street"
              required
              maxLength={160}
            />
          </Field>

          <Field>
            <Label>Area, colony (optional)</Label>
            <Input
              value={form.line2 ?? ""}
              onChange={(e) => set("line2", e.target.value)}
              autoComplete="address-line2"
              maxLength={160}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <Label>Landmark (optional)</Label>
              <Input
                value={form.landmark ?? ""}
                onChange={(e) => set("landmark", e.target.value)}
                placeholder="Near…"
                maxLength={120}
              />
            </Field>

            <Field>
              <Label required>PIN code</Label>
              <Input
                inputMode="numeric"
                value={form.pincode}
                onChange={(e) =>
                  set("pincode", e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                autoComplete="postal-code"
                required
                maxLength={6}
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <Label required>City</Label>
              <Input
                value={form.city}
                onChange={(e) => set("city", e.target.value)}
                autoComplete="address-level2"
                required
                maxLength={80}
              />
            </Field>

            <Field>
              <Label required>State</Label>
              <NativeSelect
                value={form.state}
                onChange={(e) => set("state", e.target.value)}
                autoComplete="address-level1"
                required
              >
                <option value="">Select a state</option>
                {INDIAN_STATES.map((state) => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          </div>

          <Field>
            <Label>Label (optional)</Label>
            <Input
              value={form.label ?? ""}
              onChange={(e) => set("label", e.target.value)}
              placeholder="Home, Office"
              maxLength={40}
            />
          </Field>

          <label className="flex cursor-pointer items-center gap-2.5 text-sm">
            <input
              type="checkbox"
              checked={form.isDefault ?? false}
              onChange={(e) => set("isDefault", e.target.checked)}
              className="size-4 rounded-xs accent-[var(--color-accent)]"
            />
            <span className="text-content-muted">
              Use as my default delivery address
            </span>
          </label>

          <div className="flex flex-wrap gap-3 pt-1">
            <Button type="submit" loading={pending}>
              {submitLabel}
            </Button>
            {onCancel ? (
              <Button
                type="button"
                variant="ghost"
                onClick={onCancel}
                disabled={pending}
              >
                Cancel
              </Button>
            ) : null}
          </div>
        </form>
      </CardBody>
    </Card>
  );
}
