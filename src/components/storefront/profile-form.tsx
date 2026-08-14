"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Field, FieldDescription, Input, Label } from "@/components/ui/field";
import { Alert } from "@/components/ui/primitives";
import { updateProfile } from "@/server/actions/account";

export function ProfileForm({
  initial,
}: {
  initial: { name: string; email: string; marketingOptIn: boolean };
}) {
  const [name, setName] = React.useState(initial.name);
  const [email, setEmail] = React.useState(initial.email);
  const [marketingOptIn, setMarketingOptIn] = React.useState(
    initial.marketingOptIn,
  );
  const [pending, startTransition] = React.useTransition();
  const [result, setResult] = React.useState<
    { tone: "success" | "danger"; message: string } | null
  >(null);

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setResult(null);

    startTransition(async () => {
      const response = await updateProfile({ name, email, marketingOptIn });
      setResult(
        response.ok
          ? { tone: "success", message: response.message ?? "Saved." }
          : { tone: "danger", message: response.error },
      );
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field>
          <Label required>Name</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            required
            maxLength={80}
          />
        </Field>

        <Field>
          <Label>Email</Label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            maxLength={180}
            placeholder="you@example.com"
          />
          <FieldDescription>
            For order confirmations and receipts.
          </FieldDescription>
        </Field>
      </div>

      <label className="flex cursor-pointer items-start gap-2.5 text-sm">
        <input
          type="checkbox"
          checked={marketingOptIn}
          onChange={(e) => setMarketingOptIn(e.target.checked)}
          className="mt-0.5 size-4 rounded-xs border-line-strong accent-[var(--color-accent)]"
        />
        <span className="text-content-muted">
          Email me when new collections launch. About once a month.
        </span>
      </label>

      {result ? (
        <Alert variant={result.tone === "success" ? "success" : "danger"}>
          {result.message}
        </Alert>
      ) : null}

      <Button type="submit" loading={pending}>
        Save changes
      </Button>
    </form>
  );
}
