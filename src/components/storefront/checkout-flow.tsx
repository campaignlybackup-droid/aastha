"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { Lock } from "lucide-react";

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
  trackAddPaymentInfo,
  trackBeginCheckout,
  trackPurchase,
} from "@/lib/analytics/events";
import { formatPrice } from "@/lib/money";
import type { CartView } from "@/server/cart";

/**
 * Checkout.
 *
 * Single page: address, contact, review, pay. A multi-step wizard adds
 * abandonment for no benefit at this basket size.
 *
 * The Razorpay script loads lazily on first payment attempt rather than on
 * page load, so an abandoned checkout costs no third-party JavaScript.
 */

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => { open: () => void };
  }
}

type RazorpayOptions = {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill: { name: string; contact: string; email?: string };
  notes: Record<string, string>;
  theme: { color: string };
  handler: (response: RazorpayHandlerResponse) => void;
  modal: { ondismiss: () => void };
};

type RazorpayHandlerResponse = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

export function CheckoutFlow({
  cart,
  addresses,
  customer,
}: {
  cart: CartView;
  addresses: SavedAddress[];
  customer: { name: string | null; email: string | null; mobile: string };
}) {
  const router = useRouter();

  const [selectedAddressId, setSelectedAddressId] = React.useState(
    () => addresses.find((a) => a.isDefault)?.id ?? addresses[0]?.id ?? "",
  );
  const [email, setEmail] = React.useState(customer.email ?? "");
  const [note, setNote] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState<
    "idle" | "creating" | "paying" | "verifying"
  >("idle");
  const [scriptLoaded, setScriptLoaded] = React.useState(false);
  const [needsScript, setNeedsScript] = React.useState(false);

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
      theme: { color: "#244b47" },

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
            // The webhook is still the authority — send them to the order page
            // rather than implying the payment failed.
            router.push(`/order/${created.orderId}?pending=1`);
            return;
          }

          // Same eventId as the server's CAPI call, so Meta counts one sale.
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
              Contact
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
                      <p className="text-sm">{line.name}</p>
                      <p className="mt-0.5 text-xs text-content-muted">
                        {Object.entries(line.variantOptions)
                          .map(([k, v]) => `${k}: ${v}`)
                          .join(" · ") || line.variantTitle}
                        {" · "}Qty {line.quantity}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm">
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
          <div className="space-y-5 border border-line bg-surface-raised p-5">
            <h2 className="font-display text-xl">Order total</h2>

            <dl className="space-y-2.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-content-muted">Subtotal</dt>
                <dd>{formatPrice(cart.totals.subtotalPaise)}</dd>
              </div>

              {cart.totals.discountPaise > 0 ? (
                <div className="flex justify-between">
                  <dt className="text-content-muted">
                    Discount{cart.coupon ? ` (${cart.coupon.code})` : ""}
                  </dt>
                  <dd className="text-success-700">
                    − {formatPrice(cart.totals.discountPaise)}
                  </dd>
                </div>
              ) : null}

              <div className="flex justify-between">
                <dt className="text-content-muted">Shipping</dt>
                <dd
                  className={
                    cart.totals.shippingPaise === 0 ? "text-success-700" : ""
                  }
                >
                  {cart.totals.shippingPaise === 0
                    ? "Free"
                    : formatPrice(cart.totals.shippingPaise)}
                </dd>
              </div>

              <div className="flex items-baseline justify-between border-t border-line pt-3">
                <dt className="text-base font-medium">Total</dt>
                <dd className="text-xl font-medium">
                  {formatPrice(cart.totals.totalPaise)}
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
                  : `Pay ${formatPrice(cart.totals.totalPaise)}`}
            </Button>

            <p className="text-center text-xs leading-relaxed text-content-subtle">
              Payments are processed by Razorpay. We never see or store your
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
