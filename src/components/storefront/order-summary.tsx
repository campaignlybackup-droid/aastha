import Link from "next/link";

import { MediaImage } from "@/components/ui/media-image";
import { Badge } from "@/components/ui/primitives";
import { formatPrice } from "@/lib/money";
import { formatMobile } from "@/lib/utils";
import type { OrderStatus, PaymentStatus } from "@/generated/prisma/enums";

/** Customer-facing status labels. V1 only ever sets the first three. */
const ORDER_STATUS: Record<
  OrderStatus,
  { label: string; variant: "neutral" | "success" | "warning" | "danger" | "accent" }
> = {
  PENDING: { label: "Awaiting payment", variant: "warning" },
  CONFIRMED: { label: "Confirmed", variant: "success" },
  CANCELLED: { label: "Cancelled", variant: "danger" },
  PACKED: { label: "Packed", variant: "accent" },
  SHIPPED: { label: "Shipped", variant: "accent" },
  DELIVERED: { label: "Delivered", variant: "success" },
  RETURN_REQUESTED: { label: "Return requested", variant: "warning" },
  RETURNED: { label: "Returned", variant: "neutral" },
  REFUNDED: { label: "Refunded", variant: "neutral" },
};

const PAYMENT_STATUS: Record<PaymentStatus, string> = {
  PENDING: "Payment pending",
  AUTHORIZED: "Payment authorised",
  PAID: "Paid",
  FAILED: "Payment failed",
  REFUNDED: "Refunded",
  PARTIALLY_REFUNDED: "Partially refunded",
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const config = ORDER_STATUS[status];
  return (
    <Badge variant={config.variant} size="md">
      {config.label}
    </Badge>
  );
}

export function paymentStatusLabel(status: PaymentStatus): string {
  return PAYMENT_STATUS[status];
}

export type OrderDetail = {
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  subtotalPaise: number;
  discountPaise: number;
  shippingPaise: number;
  taxPaise: number;
  totalPaise: number;
  couponCode: string | null;
  customerNote: string | null;
  shipName: string;
  shipMobile: string;
  shipLine1: string;
  shipLine2: string | null;
  shipLandmark: string | null;
  shipCity: string;
  shipState: string;
  shipPincode: string;
  internalNote?: string | null;
  items: Array<{
    id: string;
    productName: string;
    variantTitle: string;
    slug: string;
    imageUrl: string | null;
    quantity: number;
    unitPricePaise: number;
    lineTotalPaise: number;
  }>;
};

/** Line items + totals + delivery address. Shared by the order page and admin. */
export function OrderSummary({ order }: { order: OrderDetail }) {
  const isPartialCod = Boolean(order.internalNote?.includes("[PARTIAL_COD]"));
  const advancePaise = isPartialCod ? Math.round(order.totalPaise * 0.60) : order.totalPaise;
  const balanceOnDeliveryPaise = isPartialCod ? order.totalPaise - advancePaise : 0;

  return (
    <div className="space-y-8">
      <ul className="divide-y divide-line border-y border-line">
        {order.items.map((item) => (
          <li key={item.id} className="flex gap-4 py-4">
            <Link
              href={`/product/${item.slug}`}
              className="relative size-20 shrink-0 overflow-hidden bg-sand-100"
            >
              {item.imageUrl ? (
                <MediaImage
                  src={item.imageUrl}
                  alt={item.productName}
                  fill
                  sizes="80px"
                  className="object-cover"
                />
              ) : null}
            </Link>

            <div className="flex min-w-0 flex-1 justify-between gap-3">
              <div className="min-w-0">
                <Link
                  href={`/product/${item.slug}`}
                  className="text-sm hover:text-[var(--color-accent)]"
                >
                  {item.productName}
                </Link>
                <p className="mt-0.5 text-xs text-content-muted">
                  {item.variantTitle !== "Standard"
                    ? `${item.variantTitle} · `
                    : ""}
                  Qty {item.quantity} × {formatPrice(item.unitPricePaise)}
                </p>
              </div>
              <p className="shrink-0 text-sm">
                {formatPrice(item.lineTotalPaise)}
              </p>
            </div>
          </li>
        ))}
      </ul>

      <div className="grid gap-8 sm:grid-cols-2">
        <div>
          <h3 className="u-eyebrow mb-3 text-content-subtle">Delivering to</h3>
          <address className="text-sm not-italic leading-relaxed text-content-muted">
            <span className="text-content">{order.shipName}</span>
            <br />
            {order.shipLine1}
            {order.shipLine2 ? `, ${order.shipLine2}` : ""}
            {order.shipLandmark ? `, near ${order.shipLandmark}` : ""}
            <br />
            {order.shipCity}, {order.shipState} {order.shipPincode}
            <br />
            {formatMobile(order.shipMobile)}
          </address>

          {order.customerNote ? (
            <>
              <h3 className="u-eyebrow mb-2 mt-5 text-content-subtle">
                Your note
              </h3>
              <p className="text-sm leading-relaxed text-content-muted">
                {order.customerNote}
              </p>
            </>
          ) : null}
        </div>

        <dl className="space-y-2.5 text-sm">
          <div className="flex justify-between">
            <dt className="text-content-muted">Subtotal</dt>
            <dd>{formatPrice(order.subtotalPaise)}</dd>
          </div>

          {order.discountPaise > 0 ? (
            <div className="flex justify-between">
              <dt className="text-content-muted">
                Discount{order.couponCode ? ` (${order.couponCode})` : ""}
              </dt>
              <dd className="text-success-700">
                − {formatPrice(order.discountPaise)}
              </dd>
            </div>
          ) : null}

          <div className="flex justify-between">
            <dt className="text-content-muted">Shipping</dt>
            <dd>
              {order.shippingPaise === 0
                ? "Free"
                : formatPrice(order.shippingPaise)}
            </dd>
          </div>

          {isPartialCod ? (
            <>
              <div className="flex justify-between text-xs text-content-muted">
                <dt>Partial COD Fee</dt>
                <dd className="font-medium text-brand-900">+ ₹200</dd>
              </div>
              <div className="flex items-baseline justify-between border-t border-line pt-3">
                <dt className="font-semibold text-content">Total Order Value</dt>
                <dd className="text-base font-semibold">
                  {formatPrice(order.totalPaise)}
                </dd>
              </div>
              <div className="rounded-md bg-gold-50/70 p-3 border border-gold-300/60 space-y-1.5 text-xs">
                <div className="flex justify-between font-bold text-brand-950">
                  <span>Advance Paid Online (60%):</span>
                  <span>{formatPrice(advancePaise)}</span>
                </div>
                <div className="flex justify-between font-bold text-amber-900">
                  <span>Balance Due on Delivery (40%):</span>
                  <span>{formatPrice(balanceOnDeliveryPaise)}</span>
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-baseline justify-between border-t border-line pt-3">
              <dt className="font-medium">Total paid</dt>
              <dd className="text-lg font-medium">
                {formatPrice(order.totalPaise)}
              </dd>
            </div>
          )}

          <p className="text-xs text-content-subtle">
            Includes {formatPrice(order.taxPaise)} GST
          </p>
        </dl>
      </div>
    </div>
  );
}
