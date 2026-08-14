"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { Panel } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, Input, Label, NativeSelect, Textarea } from "@/components/ui/field";
import { adminSaveSetting } from "@/server/actions/admin";
import { INDIAN_STATES } from "@/lib/india";

type Initial = {
  contact: {
    email: string;
    phone: string;
    whatsapp: string;
    addressLines: string[];
    city: string;
    state: string;
    hours: string;
  };
  shipping: {
    freeAbovePaise: number;
    flatRatePaise: number;
    dispatchCopy: string;
    deliveryCopy: string;
  };
  announcement: { enabled: boolean; text: string; href?: string };
  social: { instagram?: string; facebook?: string; youtube?: string };
  brand: { tagline: string; city: string; state: string };
};

/**
 * Store settings.
 *
 * Each panel saves independently so a mistake in one does not block the
 * others, and so the success message names what was actually saved.
 *
 * The copy fields here are business claims — dispatch time, address, contact
 * hours. They ship blank rather than pre-filled: every surface hides the field
 * when it is empty, so an unset value shows nothing rather than a promise the
 * store has not made.
 */
export function SettingsForm({ initial }: { initial: Initial }) {
  return (
    <div className="space-y-6">
      <ContactPanel initial={initial.contact} />
      <BrandPanel initial={initial.brand} />
      <ShippingPanel initial={initial.shipping} />
      <AnnouncementPanel initial={initial.announcement} />
      <SocialPanel initial={initial.social} />
    </div>
  );
}

function useSave(key: string) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [result, setResult] = React.useState<
    { tone: "success" | "danger"; text: string } | null
  >(null);

  const save = (value: unknown) => {
    setResult(null);
    startTransition(async () => {
      const response = await adminSaveSetting(key, value);
      setResult(
        response.ok
          ? { tone: "success", text: response.message ?? "Saved." }
          : { tone: "danger", text: response.error },
      );
      router.refresh();
    });
  };

  return { save, pending, result };
}

function SaveRow({
  pending,
  result,
}: {
  pending: boolean;
  result: { tone: "success" | "danger"; text: string } | null;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 pt-1">
      <Button type="submit" size="sm" loading={pending}>
        Save
      </Button>
      {result ? (
        <span
          role="status"
          className={
            result.tone === "success"
              ? "text-xs text-success-700"
              : "text-xs text-danger-700"
          }
        >
          {result.text}
        </span>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function ContactPanel({ initial }: { initial: Initial["contact"] }) {
  const { save, pending, result } = useSave("contact");
  const [form, setForm] = React.useState({
    ...initial,
    addressText: initial.addressLines.join("\n"),
  });

  return (
    <Panel
      title="Contact"
      description="Shown in the footer, on the order page and in schema.org data."
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          save({
            email: form.email.trim(),
            phone: form.phone.trim(),
            whatsapp: form.whatsapp.replace(/\D/g, ""),
            addressLines: form.addressText
              .split("\n")
              .map((line) => line.trim())
              .filter(Boolean),
            city: form.city.trim(),
            state: form.state.trim(),
            hours: form.hours.trim(),
          });
        }}
        className="space-y-4 px-5 py-4"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <Label>Email</Label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="hello@yourdomain.in"
            />
          </Field>

          <Field>
            <Label>Phone</Label>
            <Input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="+91 98765 43210"
            />
          </Field>
        </div>

        <Field>
          <Label>WhatsApp number</Label>
          <Input
            value={form.whatsapp}
            onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
            placeholder="919876543210"
            inputMode="numeric"
          />
          <FieldDescription>
            Country code and number, digits only. Powers the floating chat
            button and the order-page support link.
          </FieldDescription>
        </Field>

        <Field>
          <Label>Address</Label>
          <Textarea
            value={form.addressText}
            onChange={(e) => setForm({ ...form, addressText: e.target.value })}
            rows={3}
            placeholder={"Shop name\nStreet\nArea"}
          />
          <FieldDescription>
            One line per row. Leave blank to omit the address entirely — a
            wrong address published in search results sends customers to the
            wrong door.
          </FieldDescription>
        </Field>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field>
            <Label>City</Label>
            <Input
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
            />
          </Field>

          <Field>
            <Label>State</Label>
            <NativeSelect
              value={form.state}
              onChange={(e) => setForm({ ...form, state: e.target.value })}
            >
              <option value="">Not set</option>
              {INDIAN_STATES.map((state) => (
                <option key={state} value={state}>
                  {state}
                </option>
              ))}
            </NativeSelect>
          </Field>

          <Field>
            <Label>Opening hours</Label>
            <Input
              value={form.hours}
              onChange={(e) => setForm({ ...form, hours: e.target.value })}
              placeholder="Mon–Sat, 10am – 7pm"
            />
          </Field>
        </div>

        <SaveRow pending={pending} result={result} />
      </form>
    </Panel>
  );
}

function BrandPanel({ initial }: { initial: Initial["brand"] }) {
  const { save, pending, result } = useSave("brand");
  const [form, setForm] = React.useState(initial);

  return (
    <Panel title="Brand" description="The one-line description under the footer logo.">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          save({
            tagline: form.tagline.trim(),
            city: form.city.trim(),
            state: form.state.trim(),
          });
        }}
        className="space-y-4 px-5 py-4"
      >
        <Field>
          <Label>Footer tagline</Label>
          <Input
            value={form.tagline}
            onChange={(e) => setForm({ ...form, tagline: e.target.value })}
            maxLength={160}
          />
          <FieldDescription>
            Keep it to something you can stand behind. The homepage story block
            is edited separately under Homepage.
          </FieldDescription>
        </Field>

        <SaveRow pending={pending} result={result} />
      </form>
    </Panel>
  );
}

function ShippingPanel({ initial }: { initial: Initial["shipping"] }) {
  const { save, pending, result } = useSave("shipping");
  const [form, setForm] = React.useState({
    freeAbove: String(initial.freeAbovePaise / 100),
    flatRate: String(initial.flatRatePaise / 100),
    dispatchCopy: initial.dispatchCopy,
    deliveryCopy: initial.deliveryCopy,
  });

  return (
    <Panel
      title="Shipping"
      description="Thresholds feed the cart and the free-shipping nudge."
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          save({
            freeAbovePaise: Math.round((Number(form.freeAbove) || 0) * 100),
            flatRatePaise: Math.round((Number(form.flatRate) || 0) * 100),
            dispatchCopy: form.dispatchCopy.trim(),
            deliveryCopy: form.deliveryCopy.trim(),
          });
        }}
        className="space-y-4 px-5 py-4"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <Label>Free shipping above (₹)</Label>
            <Input
              inputMode="decimal"
              value={form.freeAbove}
              onChange={(e) => setForm({ ...form, freeAbove: e.target.value })}
            />
          </Field>

          <Field>
            <Label>Flat rate below that (₹)</Label>
            <Input
              inputMode="decimal"
              value={form.flatRate}
              onChange={(e) => setForm({ ...form, flatRate: e.target.value })}
            />
          </Field>
        </div>

        <Field>
          <Label>Dispatch promise</Label>
          <Input
            value={form.dispatchCopy}
            onChange={(e) => setForm({ ...form, dispatchCopy: e.target.value })}
            placeholder="e.g. Dispatched within 48 hours."
            maxLength={160}
          />
          <FieldDescription>
            This is a commitment customers will hold you to, and it appears on
            the product page and order confirmation. Leave blank until you are
            sure you can meet it — blank simply hides it.
          </FieldDescription>
        </Field>

        <Field>
          <Label>Delivery estimate</Label>
          <Input
            value={form.deliveryCopy}
            onChange={(e) => setForm({ ...form, deliveryCopy: e.target.value })}
            placeholder="e.g. Delivery in 3–7 business days."
            maxLength={160}
          />
        </Field>

        <SaveRow pending={pending} result={result} />
      </form>
    </Panel>
  );
}

function AnnouncementPanel({ initial }: { initial: Initial["announcement"] }) {
  const { save, pending, result } = useSave("announcement");
  const [form, setForm] = React.useState({
    enabled: initial.enabled,
    text: initial.text,
    href: initial.href ?? "",
  });

  return (
    <Panel
      title="Announcement bar"
      description="The thin strip above the header. A live campaign overrides this."
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          save({
            enabled: form.enabled,
            text: form.text.trim(),
            href: form.href.trim() || undefined,
          });
        }}
        className="space-y-4 px-5 py-4"
      >
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.enabled}
            onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
            className="size-4 accent-[var(--color-accent)]"
          />
          <span className="text-content-muted">Show the announcement bar</span>
        </label>

        <Field>
          <Label>Message</Label>
          <Input
            value={form.text}
            onChange={(e) => setForm({ ...form, text: e.target.value })}
            maxLength={160}
          />
        </Field>

        <Field>
          <Label>Link (optional)</Label>
          <Input
            value={form.href}
            onChange={(e) => setForm({ ...form, href: e.target.value })}
            placeholder="/shop"
            maxLength={300}
          />
        </Field>

        <SaveRow pending={pending} result={result} />
      </form>
    </Panel>
  );
}

function SocialPanel({ initial }: { initial: Initial["social"] }) {
  const { save, pending, result } = useSave("social");
  const [form, setForm] = React.useState({
    instagram: initial.instagram ?? "",
    facebook: initial.facebook ?? "",
    youtube: initial.youtube ?? "",
  });

  return (
    <Panel
      title="Social links"
      description="Icons appear in the footer only for the networks you fill in."
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          save({
            instagram: form.instagram.trim(),
            facebook: form.facebook.trim(),
            youtube: form.youtube.trim(),
          });
        }}
        className="space-y-4 px-5 py-4"
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <Field>
            <Label>Instagram</Label>
            <Input
              value={form.instagram}
              onChange={(e) => setForm({ ...form, instagram: e.target.value })}
              placeholder="https://instagram.com/…"
            />
          </Field>

          <Field>
            <Label>Facebook</Label>
            <Input
              value={form.facebook}
              onChange={(e) => setForm({ ...form, facebook: e.target.value })}
              placeholder="https://facebook.com/…"
            />
          </Field>

          <Field>
            <Label>YouTube</Label>
            <Input
              value={form.youtube}
              onChange={(e) => setForm({ ...form, youtube: e.target.value })}
              placeholder="https://youtube.com/…"
            />
          </Field>
        </div>

        <SaveRow pending={pending} result={result} />
      </form>
    </Panel>
  );
}
