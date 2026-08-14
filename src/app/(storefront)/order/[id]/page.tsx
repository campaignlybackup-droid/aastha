import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, Clock, MessageCircle, Package } from "lucide-react";

import {
  OrderStatusBadge,
  OrderSummary,
  paymentStatusLabel,
} from "@/components/storefront/order-summary";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/primitives";
import { db } from "@/lib/db";
import { publicEnv } from "@/lib/env";
import { buildWhatsAppLink } from "@/lib/whatsapp/link";
import { formatDateTime } from "@/lib/utils";
import { requireUser } from "@/server/auth";
import { getSetting } from "@/server/catalog";

export const metadata: Metadata = {
  title: "Order confirmation",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * Order confirmation.
 *
 * Reached straight after payment, and later from order history. V1 has no
 * courier tracking by design — the honest thing to show is what we actually
 * know (payment confirmed, dispatch window) plus a direct line to support.
 */
export default async function OrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ pending?: string }>;
}) {
  const [{ id }, query, user] = await Promise.all([
    params,
    searchParams,
    requireUser(),
  ]);

  // Scoped by userId: one customer must never be able to read another's order
  // by guessing an id.
  const order = await db.order.findFirst({
    where: { id, userId: user.id },
    include: { items: { orderBy: { id: "asc" } } },
  });

  if (!order) notFound();

  const contact = await getSetting("contact");
  const whatsapp = contact.whatsapp || publicEnv.supportWhatsapp;

  const confirmed = order.status === "CONFIRMED";
  // The browser callback could not verify, but the webhook may still land.
  const awaitingConfirmation = !confirmed && query.pending === "1";

  return (
    <div className="u-container max-w-3xl py-12 md:py-16">
      {/* --- Headline ---------------------------------------------------- */}
      <div className="mb-10 text-center">
        {confirmed ? (
          <>
            <span className="mx-auto mb-5 flex size-14 items-center justify-center rounded-full bg-success-50">
              <CheckCircle2
                className="size-7 text-success-700"
                aria-hidden="true"
              />
            </span>
            <h1 className="text-display-sm md:text-display-md">
              Order placed successfully
            </h1>
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-content-muted">
              Thank you, {order.shipName.split(" ")[0]}. We&rsquo;ve sent a
              confirmation and will dispatch from Jaipur within 48 hours.
            </p>
          </>
        ) : (
          <>
            <span className="mx-auto mb-5 flex size-14 items-center justify-center rounded-full bg-warning-50">
              <Clock className="size-7 text-warning-700" aria-hidden="true" />
            </span>
            <h1 className="text-display-sm md:text-display-md">
              {awaitingConfirmation
                ? "Confirming your payment"
                : "Order awaiting payment"}
            </h1>
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-content-muted">
              {awaitingConfirmation
                ? "Your payment is being verified with the bank. This usually takes a few seconds — refresh in a moment. If money was debited, the order will confirm automatically."
                : "This order hasn't been paid for yet. You can complete it from your bag."}
            </p>
          </>
        )}
      </div>

      {/* --- Key facts ---------------------------------------------------- */}
      <div className="mb-8 grid gap-px overflow-hidden rounded-md border border-line bg-line sm:grid-cols-3">
        <Fact label="Order number" value={order.orderNumber} mono />
        <Fact
          label="Placed"
          value={formatDateTime(order.placedAt ?? order.createdAt)}
        />
        <Fact
          label="Payment"
          value={paymentStatusLabel(order.paymentStatus)}
        />
      </div>

      <div className="mb-8 flex flex-wrap items-center gap-3">
        <OrderStatusBadge status={order.status} />
        {order.status === "PENDING" && !awaitingConfirmation ? (
          <Button asChild size="sm" variant="outline">
            <Link href="/cart">Complete payment</Link>
          </Button>
        ) : null}
      </div>

      {awaitingConfirmation ? (
        <Alert variant="info" className="mb-8">
          Don&rsquo;t place the order again — that would charge you twice. If
          this page still shows &ldquo;confirming&rdquo; after a few minutes,
          message us on WhatsApp with your order number.
        </Alert>
      ) : null}

      {/* --- Items and totals --------------------------------------------- */}
      <OrderSummary order={order} />

      {/* --- Support ------------------------------------------------------- */}
      <div className="mt-12 rounded-md border border-line bg-surface-sunken p-6 text-center">
        <h2 className="font-display text-xl">Need help with your order?</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-content-muted">
          Message us with your order number and we&rsquo;ll pick it up right
          away.
        </p>

        {whatsapp ? (
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" className="bg-[#25D366] text-white hover:bg-[#1FB855]">
              <a
                href={buildWhatsAppLink(
                  whatsapp,
                  `Hi Aastha Silver & Jewels, I need help with order ${order.orderNumber}.`,
                )}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle aria-hidden="true" />
                Chat with us on WhatsApp
              </a>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/account/orders">
                <Package aria-hidden="true" />
                All my orders
              </Link>
            </Button>
          </div>
        ) : null}

        {contact.phone ? (
          <p className="mt-4 text-xs text-content-subtle">
            Or call {contact.phone}
            {contact.hours ? ` · ${contact.hours}` : ""}
          </p>
        ) : null}
      </div>

      <div className="mt-8 text-center">
        <Link
          href="/shop"
          className="text-sm underline underline-offset-4 hover:text-[var(--color-accent)]"
        >
          Continue shopping
        </Link>
      </div>
    </div>
  );
}

function Fact({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="bg-surface-raised px-4 py-3.5">
      <dt className="u-eyebrow text-content-subtle">{label}</dt>
      <dd className={`mt-1 text-sm ${mono ? "font-medium tracking-wide" : ""}`}>
        {value}
      </dd>
    </div>
  );
}
