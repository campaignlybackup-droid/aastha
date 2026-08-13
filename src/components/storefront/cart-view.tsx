"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Minus, Plus, ShoppingBag, Tag, Trash2, X } from "lucide-react";

import { MediaImage } from "@/components/ui/media-image";
import { Button } from "@/components/ui/button";
import { notifyCartUpdated } from "@/components/storefront/cart-badge";
import { Alert, Badge, EmptyState } from "@/components/ui/primitives";
import {
  applyCouponToCart,
  removeCouponFromCart,
  updateCartItemQuantity,
} from "@/server/actions/cart";
import { formatPrice } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { CartView as CartViewData } from "@/server/cart";

/**
 * The cart.
 *
 * Holds the server-rendered cart as initial state, then replaces it wholesale
 * with whatever each server action returns. The client never recomputes a
 * total — it only ever displays one the server produced, which is the same
 * function checkout charges from.
 */
export function CartView({ initialCart }: { initialCart: CartViewData }) {
  const router = useRouter();
  const [cart, setCart] = React.useState(initialCart);
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);

  // The server may re-render this page (e.g. after revalidatePath); adopt the
  // fresher data rather than keeping stale local state. Adjusting during
  // render rather than in an effect avoids a second render pass showing the
  // stale total. See react.dev "adjusting state when a prop changes".
  const [seenServerCart, setSeenServerCart] = React.useState(initialCart);
  if (initialCart !== seenServerCart) {
    setSeenServerCart(initialCart);
    setCart(initialCart);
  }

  function run(action: () => Promise<
    | { ok: true; cart: CartViewData; message?: string }
    | { ok: false; error: string }
  >) {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setCart(result.cart);
      if (result.message) setNotice(result.message);
      notifyCartUpdated(result.cart.itemCount);
      router.refresh();
    });
  }

  if (cart.lines.length === 0) {
    return (
      <EmptyState
        icon={ShoppingBag}
        title="Your bag is empty"
        description="Nothing here yet. Have a look at what's new, or start with the pieces customers buy most."
        action={
          <div className="flex flex-wrap justify-center gap-3">
            <Button asChild>
              <Link href="/shop">Browse jewellery</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/shop?sort=popular">Best sellers</Link>
            </Button>
          </div>
        }
      />
    );
  }

  const { totals } = cart;

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_22rem] lg:gap-14">
      {/* ---------------- Lines ---------------- */}
      <section aria-label="Items in your bag">
        {cart.hasStockIssues ? (
          <Alert variant="warning" className="mb-6">
            Some quantities changed because stock moved while your bag was open.
            The amounts below are current.
          </Alert>
        ) : null}

        <ul className="divide-y divide-line border-y border-line">
          {cart.lines.map((line) => (
            <li key={line.itemId} className="flex gap-4 py-5">
              <Link
                href={`/product/${line.slug}`}
                className="relative size-24 shrink-0 overflow-hidden bg-sand-100 sm:size-28"
              >
                {line.imageUrl ? (
                  <MediaImage
                    src={line.imageUrl}
                    alt={line.name}
                    fill
                    sizes="112px"
                    className="object-cover"
                  />
                ) : null}
              </Link>

              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      href={`/product/${line.slug}`}
                      className="text-sm leading-snug hover:text-[var(--color-accent)]"
                    >
                      {line.name}
                    </Link>
                    {Object.keys(line.variantOptions).length ? (
                      <p className="mt-0.5 text-xs text-content-muted">
                        {Object.entries(line.variantOptions)
                          .map(([key, value]) => `${key}: ${value}`)
                          .join(" · ")}
                      </p>
                    ) : line.variantTitle !== "Standard" ? (
                      <p className="mt-0.5 text-xs text-content-muted">
                        {line.variantTitle}
                      </p>
                    ) : null}
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      run(() =>
                        updateCartItemQuantity({
                          itemId: line.itemId,
                          quantity: 0,
                        }),
                      )
                    }
                    disabled={pending}
                    aria-label={`Remove ${line.name} from bag`}
                    className="shrink-0 p-1 text-content-subtle transition-colors hover:text-danger-700 disabled:opacity-40"
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </button>
                </div>

                {!line.inStock ? (
                  <Badge variant="danger">Out of stock</Badge>
                ) : line.availableQuantity <= 3 ? (
                  <Badge variant="warning">
                    Only {line.availableQuantity} left
                  </Badge>
                ) : null}

                <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-2">
                  <div className="inline-flex items-center rounded-sm border border-line-strong">
                    <button
                      type="button"
                      onClick={() =>
                        run(() =>
                          updateCartItemQuantity({
                            itemId: line.itemId,
                            quantity: line.quantity - 1,
                          }),
                        )
                      }
                      disabled={pending}
                      aria-label="Decrease quantity"
                      className="inline-flex size-9 items-center justify-center transition-colors hover:text-[var(--color-accent)] disabled:opacity-40"
                    >
                      <Minus className="size-3.5" aria-hidden="true" />
                    </button>
                    <span className="w-8 text-center text-sm tabular-nums">
                      {line.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        run(() =>
                          updateCartItemQuantity({
                            itemId: line.itemId,
                            quantity: line.quantity + 1,
                          }),
                        )
                      }
                      disabled={
                        pending || line.quantity >= line.availableQuantity
                      }
                      aria-label="Increase quantity"
                      className="inline-flex size-9 items-center justify-center transition-colors hover:text-[var(--color-accent)] disabled:opacity-40"
                    >
                      <Plus className="size-3.5" aria-hidden="true" />
                    </button>
                  </div>

                  <div className="text-right">
                    <p className="text-sm font-medium">
                      {formatPrice(line.lineTotalPaise)}
                    </p>
                    {line.quantity > 1 ? (
                      <p className="text-xs text-content-subtle">
                        {formatPrice(line.unitPricePaise)} each
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-6">
          <Link
            href="/shop"
            className="text-sm underline underline-offset-4 hover:text-[var(--color-accent)]"
          >
            Continue shopping
          </Link>
        </div>
      </section>

      {/* ---------------- Summary ---------------- */}
      <aside className="lg:sticky lg:top-[calc(var(--header-height)+1.5rem)] lg:self-start">
        <div className="space-y-5 border border-line bg-surface-raised p-5">
          <h2 className="font-display text-xl">Order summary</h2>

          <CouponField
            coupon={cart.coupon}
            couponError={cart.couponError}
            pending={pending}
            onApply={(code) => run(() => applyCouponToCart(code))}
            onRemove={() => run(() => removeCouponFromCart())}
          />

          <dl className="space-y-2.5 border-t border-line pt-4 text-sm">
            <Row label="Subtotal" value={formatPrice(totals.subtotalPaise)} />

            {totals.discountPaise > 0 ? (
              <Row
                label={`Discount${cart.coupon ? ` (${cart.coupon.code})` : ""}`}
                value={`− ${formatPrice(totals.discountPaise)}`}
                tone="success"
              />
            ) : null}

            <Row
              label="Shipping"
              value={
                totals.shippingPaise === 0
                  ? "Free"
                  : formatPrice(totals.shippingPaise)
              }
              tone={totals.shippingPaise === 0 ? "success" : undefined}
            />

            <div className="flex items-baseline justify-between border-t border-line pt-3">
              <dt className="text-base font-medium">Total</dt>
              <dd className="text-xl font-medium">
                {formatPrice(totals.totalPaise)}
              </dd>
            </div>

            {/* Indian retail convention: displayed prices already include GST,
                so this is disclosure, not an added line. */}
            <p className="text-xs text-content-subtle">
              Includes {formatPrice(totals.taxPaise)} GST
            </p>
          </dl>

          {totals.freeShippingRemainingPaise > 0 ? (
            <p className="rounded-sm bg-surface-sunken p-3 text-xs leading-relaxed text-content-muted">
              Add {formatPrice(totals.freeShippingRemainingPaise)} more to get
              free shipping.
            </p>
          ) : null}

          {error ? <Alert variant="danger">{error}</Alert> : null}
          {notice ? <Alert variant="success">{notice}</Alert> : null}

          <Button asChild size="lg" block disabled={pending}>
            <Link href="/checkout">Proceed to checkout</Link>
          </Button>

          <p className="text-center text-xs text-content-subtle">
            Secure payment via Razorpay · UPI, cards, net banking
          </p>
        </div>
      </aside>
    </div>
  );
}

function Row({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "success";
}) {
  return (
    <div className="flex items-baseline justify-between">
      <dt className="text-content-muted">{label}</dt>
      <dd className={cn(tone === "success" && "text-success-700")}>{value}</dd>
    </div>
  );
}

function CouponField({
  coupon,
  couponError,
  pending,
  onApply,
  onRemove,
}: {
  coupon: { code: string; description: string | null } | null;
  couponError: string | null;
  pending: boolean;
  onApply: (code: string) => void;
  onRemove: () => void;
}) {
  const [code, setCode] = React.useState("");
  const [open, setOpen] = React.useState(false);

  if (coupon) {
    return (
      <div className="flex items-start justify-between gap-3 rounded-sm bg-success-50 p-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-sm font-medium text-success-700">
            <Tag className="size-3.5" aria-hidden="true" />
            {coupon.code} applied
          </p>
          {coupon.description ? (
            <p className="mt-0.5 text-xs text-success-700/80">
              {coupon.description}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onRemove}
          disabled={pending}
          aria-label={`Remove coupon ${coupon.code}`}
          className="shrink-0 p-0.5 text-success-700 disabled:opacity-40"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>
    );
  }

  return (
    <div>
      {couponError ? (
        <Alert variant="warning" className="mb-3">
          {couponError}
        </Alert>
      ) : null}

      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-1.5 text-sm underline underline-offset-4 hover:text-[var(--color-accent)]"
        >
          <Tag className="size-3.5" aria-hidden="true" />
          Have a discount code?
        </button>
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            onApply(code);
          }}
          className="flex gap-2"
        >
          <label htmlFor="coupon-code" className="sr-only">
            Discount code
          </label>
          <input
            id="coupon-code"
            value={code}
            onChange={(event) => setCode(event.target.value.toUpperCase())}
            placeholder="WELCOME10"
            autoComplete="off"
            spellCheck={false}
            className="h-10 min-w-0 flex-1 rounded-sm border border-line-strong bg-surface-raised px-3 text-sm uppercase tracking-wide outline-none focus:border-[var(--color-accent)]"
          />
          <Button
            type="submit"
            variant="outline"
            disabled={!code.trim() || pending}
            loading={pending}
          >
            Apply
          </Button>
        </form>
      )}
    </div>
  );
}
