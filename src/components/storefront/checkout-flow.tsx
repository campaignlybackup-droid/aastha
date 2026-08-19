"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { CheckCircle2, Gift, Lock, Tag } from "lucide-react";

import {
  AddressBook,
  type SavedAddress,
} from "@/components/storefront/address-book";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, Input, Label, Textarea } from "@/components/ui/field";
import { Alert, Card, CardBody } from "@/components/ui/primitives";
import { MediaImage } from "@/components/ui/media-image";
import {
  startCheckout,
  verifyCheckoutPayment,
} from "@/server/actions/checkout";
import {
  applyCouponToCart,
  removeCouponFromCart,
} from "@/server/actions/cart";
import {
  trackAddPaymentInfo,
  trackBeginCheckout,
  trackPurchase,
} from "@/lib/analytics/events";
import { formatPrice } from "@/lib/money";
import type { CartView } from "@/server/cart";
import type { ActiveCoupon } from "@/server/coupons";
import type { RazorpayHandlerResponse, RazorpayOptions } from "@/lib/payments/razorpay-types";

export function CheckoutFlow({
  cart,
  addresses,
  customer,
  availableCoupons = [],
}: {
  cart: CartView;
  addresses: SavedAddress[];
  customer: { name: string | null; email: string | null; mobile: string };
  availableCoupons?: ActiveCoupon[];
}) {
  const router = useRouter();

  const [selectedAddressId, setSelectedAddressId] = React.useState(
    () => addresses.find((a) => a.isDefault)?.id ?? addresses[0]?.id ?? "",
  );
  const [email, setEmail] = React.useState(customer.email ?? "");
  const [note, setNote] = React.useState("");
  const [isGiftWrapped, setIsGiftWrapped] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState<
    "idle" | "creating" | "paying" | "verifying"
  >("idle");
  const [scriptLoaded, setScriptLoaded] = React.useState(false);
  const [needsScript, setNeedsScript] = React.useState(false);

  // Coupon state
  const [couponInput, setCouponInput] = React.useState("");
  const [couponError, setCouponError] = React.useState<string | null>(null);
  const [couponPending, startCouponTransition] = React.useTransition();
  const [showCouponsModal, setShowCouponsModal] = React.useState(false);

  const GIFT_WRAP_PAISE = 4000; // ₹40
  const finalTotalPaise = cart.totals.totalPaise + (isGiftWrapped ? GIFT_WRAP_PAISE : 0);

  // begin_checkout, once, when the page is first usable.
  const reportedBeginCheckout = React.useRef(false);
  React.useEffect(() => {
    if (reportedBeginCheckout.current || cart.lines.length === 0) return;
    reportedBeginCheckout.current = true;

    trackBeginCheckout(
      cart.lines.map((line) => ({
        productId: line.productId,
        productName: line.name,
        variantId: line.variantId,
        quantity: line.quantity,
        pricePaise: line.unitPricePaise,
      })),
      cart.totals.totalPaise,
    );
  }, [cart]);

  const analyticsItems = cart.lines.map((line) => ({
    productId: line.productId,
    productName: line.name,
    variantId: line.variantId,
    quantity: line.quantity,
    pricePaise: line.unitPricePaise,
  }));

  function handleApplyCoupon(e: React.FormEvent) {
    e.preventDefault();
    if (!couponInput.trim()) return;
    setCouponError(null);

    startCouponTransition(async () => {
      const res = await applyCouponToCart(couponInput);
      if (!res.ok) {
        setCouponError(res.error);
        return;
      }
      setCouponInput("");
      setShowCouponsModal(false);
      router.refresh();
    });
  }

  function applySelectedCoupon(code: string) {
    setCouponError(null);
    startCouponTransition(async () => {
      const res = await applyCouponToCart(code);
      if (!res.ok) {
        setCouponError(res.error);
        return;
      }
      setCouponInput("");
      setShowCouponsModal(false);
      router.refresh();
    });
  }

  function handleRemoveCoupon() {
    setCouponError(null);
    startCouponTransition(async () => {
      const res = await removeCouponFromCart();
      if (!res.ok) {
        setCouponError(res.error);
        return;
      }
      router.refresh();
    });
  }

  async function onPay() {
    setError(null);

    if (!selectedAddressId) {
      setError("Please choose a delivery address.");
      return;
    }

    setStatus("creating");
    setNeedsScript(true);

    const created = await startCheckout({
      addressId: selectedAddressId,
      email,
      customerNote: note,
      isGiftWrapped,
    });

    if (!created.ok) {
      setError(created.error);
      setStatus("idle");
      // Stock may have shifted; re-render the cart summary.
      router.refresh();
      return;
    }

    if (created.paymentUnavailable || !created.razorpay) {
      setError(
        "Online payment isn't switched on yet. Your order has been recorded — we'll contact you on WhatsApp to complete it.",
      );
      setStatus("idle");
      return;
    }

    // Wait for the Razorpay script if it is still in flight.
    const ready = await waitFor(() => Boolean(window.Razorpay), 12_000);
    if (!ready) {
      setError("The payment window failed to load. Please try again.");
      setStatus("idle");
      return;
    }

    trackAddPaymentInfo(created.amountPaise, analyticsItems);
    setStatus("paying");

    const address = addresses.find((a) => a.id === selectedAddressId);

    const checkout = new window.Razorpay!({
      key: created.razorpay.keyId,
      amount: created.amountPaise,
      currency: "INR",
      name: "Aastha Silver & Jewels",
      description: `Order ${created.orderNumber}`,
      order_id: created.razorpay.orderId,
      prefill: {
        name: address?.name ?? customer.name ?? "",
        contact: address?.mobile ?? customer.mobile,
        email: email || undefined,
      },
      notes: { orderId: created.orderId, orderNumber: created.orderNumber },
      theme: { color: "#1f5557" },

      handler: (response) => {
        setStatus("verifying");

        void (async () => {
          const verified = await verifyCheckoutPayment({
            orderId: created.orderId,
            razorpayOrderId: response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            signature: response.razorpay_signature,
          });

          if (!verified.ok) {
            router.push(`/order/${created.orderId}?pending=1`);
            return;
          }

          trackPurchase({
            orderNumber: verified.orderNumber,
            eventId: created.metaEventId,
            totalPaise: created.amountPaise,
            shippingPaise: cart.totals.shippingPaise,
            taxPaise: cart.totals.taxPaise,
            couponCode: cart.coupon?.code,
            items: analyticsItems,
          });

          router.push(`/order/${verified.orderId}`);
        })();
      },

      modal: {
        ondismiss: () => {
          setStatus("idle");
          setError(
            "Payment was cancelled. Your bag is still here whenever you're ready.",
          );
        },
      },
    });

    checkout.open();
  }

  const busy = status !== "idle";

  return (
    <>
      {needsScript ? (
        <Script
          src="https://checkout.razorpay.com/v1/checkout.js"
          strategy="lazyOnload"
          onLoad={() => setScriptLoaded(true)}
          onError={() =>
            setError("The payment window failed to load. Please try again.")
          }
        />
      ) : null}

      <div className="grid gap-10 lg:grid-cols-[1fr_22rem] lg:gap-14">
        <div className="space-y-10">
          {/* --- Address ---------------------------------------------------- */}
          <section aria-labelledby="delivery-heading">
            <h2 id="delivery-heading" className="mb-4 font-display text-2xl">
              Delivery address
            </h2>
            <AddressBook
              addresses={addresses}
              selectedId={selectedAddressId}
              onSelect={setSelectedAddressId}
              compact
            />
          </section>

          {/* --- Contact ---------------------------------------------------- */}
          <section aria-labelledby="contact-heading">
            <h2 id="contact-heading" className="mb-4 font-display text-2xl">
              Contact &amp; Instructions
            </h2>
            <Card>
              <CardBody className="space-y-4">
                <Field>
                  <Label>Email for your receipt</Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    placeholder="you@example.com"
                    maxLength={180}
                  />
                  <FieldDescription>
                    Order updates also go to WhatsApp on{" "}
                    {customer.mobile.startsWith("91")
                      ? `+91 ${customer.mobile.slice(2)}`
                      : customer.mobile}
                    .
                  </FieldDescription>
                </Field>

                <Field>
                  <Label>Order notes (optional)</Label>
                  <Textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={3}
                    maxLength={500}
                    placeholder="Gift wrapping, engraving initials, delivery instructions…"
                  />
                </Field>
              </CardBody>
            </Card>
          </section>

          {/* --- Review ----------------------------------------------------- */}
          <section aria-labelledby="review-heading">
            <h2 id="review-heading" className="mb-4 font-display text-2xl">
              Review your order
            </h2>
            <ul className="divide-y divide-line border-y border-line">
              {cart.lines.map((line) => (
                <li key={line.itemId} className="flex gap-4 py-4">
                  <div className="relative size-16 shrink-0 overflow-hidden bg-sand-100">
                    {line.imageUrl ? (
                      <MediaImage
                        src={line.imageUrl}
                        alt=""
                        fill
                        sizes="64px"
                        className="object-cover"
                      />
                    ) : null}
                  </div>
                  <div className="flex min-w-0 flex-1 justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{line.name}</p>
                      <p className="mt-0.5 text-xs text-content-muted">
                        {Object.entries(line.variantOptions)
                          .map(([k, v]) => `${k}: ${v}`)
                          .join(" · ") || line.variantTitle}
                        {" · "}Qty {line.quantity}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-medium">
                      {formatPrice(line.lineTotalPaise)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* --- Summary ------------------------------------------------------ */}
        <aside className="lg:sticky lg:top-[calc(var(--header-height)+1.5rem)] lg:self-start">
          <div className="space-y-5 border border-line bg-surface-raised p-5 shadow-sm rounded-md">
            <h2 className="font-display text-xl">Order total</h2>

            {/* Gift Wrapping Option Checkbox */}
            <div className="rounded-md border border-gold-500/40 bg-gold-50/50 p-4 transition-colors hover:border-gold-500">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  id="gift-wrap-checkbox"
                  checked={isGiftWrapped}
                  onChange={(e) => setIsGiftWrapped(e.target.checked)}
                  className="mt-0.5 size-4 rounded border-line-strong text-brand-800 focus:ring-brand-800"
                />
                <div className="text-sm">
                  <div className="flex items-center justify-between gap-2 font-medium text-brand-900">
                    <span className="flex items-center gap-1.5">
                      <Gift className="size-4 text-gold-600 shrink-0" />
                      Add Gift Wrapping
                    </span>
                    <span className="font-semibold text-brand-800">+ ₹40</span>
                  </div>
                  <p className="mt-0.5 text-xs text-content-muted leading-relaxed">
                    Includes signature box, ribbon &amp; personalized note card.
                  </p>
                </div>
              </label>
            </div>

            {/* Promo / Coupon Code Section */}
            <div className="border-t border-line pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-content-muted flex items-center gap-1.5">
                  <Tag className="size-3.5 text-gold-600" />
                  Coupon Code
                </span>
                {availableCoupons && availableCoupons.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => setShowCouponsModal(!showCouponsModal)}
                    className="text-xs text-[var(--color-accent)] underline hover:text-brand-900 font-medium"
                  >
                    {showCouponsModal ? "Hide Offers" : `View Offers (${availableCoupons.length})`}
                  </button>
                ) : null}
              </div>

              {cart.coupon ? (
                <div className="flex items-center justify-between rounded-md border border-success-700/30 bg-success-50/60 p-3 text-xs">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-success-700 shrink-0" />
                    <div>
                      <p className="font-bold text-success-900">{cart.coupon.code}</p>
                      <p className="text-[0.65rem] text-success-700">
                        Saving {formatPrice(cart.totals.discountPaise)}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveCoupon}
                    disabled={couponPending}
                    className="text-xs font-medium text-danger-700 underline hover:text-danger-900"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <form onSubmit={handleApplyCoupon} className="flex gap-2">
                  <Input
                    type="text"
                    placeholder="ENTER COUPON CODE"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                    className="h-9 text-xs uppercase tracking-wider"
                  />
                  <Button
                    type="submit"
                    size="sm"
                    variant="outline"
                    loading={couponPending}
                    disabled={!couponInput.trim() || couponPending}
                    className="h-9 shrink-0 text-xs px-3"
                  >
                    Apply
                  </Button>
                </form>
              )}

              {couponError ? (
                <p className="text-xs text-danger-700">{couponError}</p>
              ) : null}

              {/* Active Coupons Drawer List */}
              {showCouponsModal && availableCoupons && availableCoupons.length > 0 && (
                <div className="rounded-md border border-line bg-surface p-3 space-y-2.5 max-h-60 overflow-y-auto shadow-inner">
                  <p className="text-xs font-semibold text-content border-b border-line pb-1.5">
                    Available Coupons ({availableCoupons.length})
                  </p>
                  {availableCoupons.map((coupon) => {
                    const isEligible = cart.totals.subtotalPaise >= coupon.minOrderPaise;
                    const discountLabel =
                      coupon.type === "PERCENTAGE"
                        ? `${coupon.value}% OFF${coupon.maxDiscountPaise ? ` up to ${formatPrice(coupon.maxDiscountPaise)}` : ""}`
                        : `Flat ${formatPrice(coupon.value)} OFF`;

                    return (
                      <div
                        key={coupon.id}
                        className="rounded-sm border border-line bg-sand-50/60 p-2.5 space-y-1 text-xs"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono font-bold tracking-wider text-brand-900 bg-gold-50 px-1.5 py-0.5 rounded border border-gold-300">
                            {coupon.code}
                          </span>
                          {isEligible ? (
                            <button
                              type="button"
                              onClick={() => applySelectedCoupon(coupon.code)}
                              disabled={couponPending}
                              className="rounded bg-brand-800 px-2 py-1 text-[0.65rem] font-medium text-sand-50 hover:bg-brand-900 transition-colors"
                            >
                              Apply
                            </button>
                          ) : (
                            <span className="text-[0.65rem] text-content-subtle italic">
                              Min order {formatPrice(coupon.minOrderPaise)}
                            </span>
                          )}
                        </div>
                        <p className="font-medium text-content">{discountLabel}</p>
                        {coupon.description ? (
                          <p className="text-[0.65rem] text-content-muted leading-tight">
                            {coupon.description}
                          </p>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <dl className="space-y-2.5 text-sm border-t border-line pt-4">
              <div className="flex justify-between">
                <dt className="text-content-muted">Subtotal</dt>
                <dd>{formatPrice(cart.totals.subtotalPaise)}</dd>
              </div>

              {cart.totals.discountPaise > 0 ? (
                <div className="flex justify-between">
                  <dt className="text-content-muted">
                    Discount{cart.coupon ? ` (${cart.coupon.code})` : ""}
                  </dt>
                  <dd className="text-success-700 font-medium">
                    − {formatPrice(cart.totals.discountPaise)}
                  </dd>
                </div>
              ) : null}

              <div className="flex justify-between">
                <dt className="text-content-muted">Shipping</dt>
                <dd
                  className={
                    cart.totals.shippingPaise === 0 ? "text-success-700 font-medium" : ""
                  }
                >
                  {cart.totals.shippingPaise === 0
                    ? "Free"
                    : formatPrice(cart.totals.shippingPaise)}
                </dd>
              </div>

              {isGiftWrapped ? (
                <div className="flex justify-between">
                  <dt className="text-content-muted flex items-center gap-1">
                    <Gift className="size-3.5 text-gold-600" />
                    Gift wrapping
                  </dt>
                  <dd className="font-medium text-brand-900">+ {formatPrice(GIFT_WRAP_PAISE)}</dd>
                </div>
              ) : null}

              <div className="flex items-baseline justify-between border-t border-line pt-3">
                <dt className="text-base font-semibold">Total</dt>
                <dd className="text-xl font-bold text-brand-950">
                  {formatPrice(finalTotalPaise)}
                </dd>
              </div>

              <p className="text-xs text-content-subtle">
                Includes {formatPrice(cart.totals.taxPaise)} GST
              </p>
            </dl>

            {error ? <Alert variant="danger">{error}</Alert> : null}

            <Button
              size="lg"
              block
              onClick={onPay}
              loading={busy}
              disabled={busy || !selectedAddressId || cart.lines.length === 0}
            >
              {!busy && <Lock aria-hidden="true" />}
              {status === "verifying"
                ? "Confirming…"
                : status === "paying"
                  ? "Waiting for payment…"
                  : `Pay ${formatPrice(finalTotalPaise)}`}
            </Button>

            <p className="text-center text-xs leading-relaxed text-content-subtle">
              Payments are processed securely by Razorpay. We never see or store your
              card details.
            </p>

            {needsScript && !scriptLoaded && status === "creating" ? (
              <p className="text-center text-xs text-content-subtle">
                Loading secure payment…
              </p>
            ) : null}
          </div>
        </aside>
      </div>
    </>
  );
}

/** Polls a predicate until true or the deadline passes. */
function waitFor(predicate: () => boolean, timeoutMs: number): Promise<boolean> {
  return new Promise((resolve) => {
    if (predicate()) return resolve(true);

    const started = Date.now();
    const interval = setInterval(() => {
      if (predicate()) {
        clearInterval(interval);
        resolve(true);
      } else if (Date.now() - started > timeoutMs) {
        clearInterval(interval);
        resolve(false);
      }
    }, 100);
  });
}
