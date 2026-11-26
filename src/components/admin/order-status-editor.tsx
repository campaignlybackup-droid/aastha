"use client";

import * as React from "react";
import { Check, Edit3, Package } from "lucide-react";

import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/field";
import { Alert } from "@/components/ui/primitives";
import { adminUpdateOrderStatus } from "@/server/actions/admin";
import type { OrderStatus, PaymentStatus } from "@/generated/prisma/client";

export function OrderStatusEditor({
  orderId,
  currentStatus,
  currentPaymentStatus,
  currentTrackingNumber,
  customerMobile,
}: {
  orderId: string;
  currentStatus: OrderStatus;
  currentPaymentStatus: PaymentStatus;
  currentTrackingNumber?: string | null;
  customerMobile?: string | null;
}) {
  const [status, setStatus] = React.useState<OrderStatus>(currentStatus);
  const [paymentStatus, setPaymentStatus] = React.useState<PaymentStatus>(currentPaymentStatus);
  const [trackingNumber, setTrackingNumber] = React.useState(currentTrackingNumber ?? "");
  const [notifyWhatsApp, setNotifyWhatsApp] = React.useState(true);
  const [isEditing, setIsEditing] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [feedback, setFeedback] = React.useState<{ message: string; isError: boolean } | null>(null);

  const isShipped = status === "SHIPPED";
  const showTracking = isShipped || Boolean(currentTrackingNumber) || Boolean(trackingNumber.trim());

  async function handleSave() {
    setLoading(true);
    setFeedback(null);

    const trimmedTracking = trackingNumber.trim() || undefined;

    const res = await adminUpdateOrderStatus({
      orderId,
      status,
      paymentStatus,
      trackingNumber: trimmedTracking,
      sendWhatsAppNotification: notifyWhatsApp && Boolean(trimmedTracking),
    });

    setLoading(false);

    if (!res.ok) {
      setFeedback({ message: res.error, isError: true });
      return;
    }

    setFeedback({ message: res.message || "Status updated successfully!", isError: false });
    setIsEditing(false);
  }

  if (!isEditing) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsEditing(true)}
        className="h-8 text-xs"
      >
        <Edit3 className="mr-1.5 size-3.5" />
        Edit Order / Payment Status
      </Button>
    );
  }

  return (
    <div className="mt-3 rounded-lg border border-line bg-surface-raised p-4 shadow-sm space-y-4 max-w-md">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-content-muted">
          Manually Override Statuses
        </h4>
        <button
          type="button"
          onClick={() => setIsEditing(false)}
          className="text-xs text-content-subtle hover:text-content"
        >
          Cancel
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-medium text-content-muted mb-1">
            Order Status
          </label>
          <NativeSelect
            value={status}
            onChange={(e) => setStatus(e.target.value as OrderStatus)}
            className="h-9 text-xs"
          >
            <option value="PENDING">PENDING</option>
            <option value="CONFIRMED">CONFIRMED</option>
            <option value="PACKED">PACKED</option>
            <option value="SHIPPED">SHIPPED</option>
            <option value="DELIVERED">DELIVERED</option>
            <option value="CANCELLED">CANCELLED</option>
          </NativeSelect>
        </div>

        <div>
          <label className="block text-xs font-medium text-content-muted mb-1">
            Payment Status
          </label>
          <NativeSelect
            value={paymentStatus}
            onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus)}
            className="h-9 text-xs"
          >
            <option value="PENDING">PENDING</option>
            <option value="PAID">PAID</option>
            <option value="FAILED">FAILED</option>
            <option value="REFUNDED">REFUNDED</option>
          </NativeSelect>
        </div>
      </div>

      {/* Tracking number sub-section */}
      {showTracking ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Package className="size-3.5 text-amber-700 shrink-0" />
              <span className="text-xs font-semibold text-amber-800">
                India Post / Courier Tracking ID
              </span>
            </div>
            {isShipped ? (
              <span className="text-[10px] font-medium bg-amber-200/80 text-amber-900 px-1.5 py-0.5 rounded">
                Shipped
              </span>
            ) : null}
          </div>
          <input
            id="tracking-number-input"
            type="text"
            value={trackingNumber}
            onChange={(e) => {
              setTrackingNumber(e.target.value);
              if (e.target.value.trim() && (status === "CONFIRMED" || status === "PACKED")) {
                setStatus("SHIPPED");
              }
            }}
            placeholder="e.g. EW123456789IN"
            maxLength={30}
            className="w-full rounded border border-amber-200 bg-white px-2.5 py-1.5 text-xs font-mono placeholder:text-content-subtle focus:outline-none focus:ring-1 focus:ring-amber-400"
          />
          <p className="text-[11px] text-amber-700 leading-relaxed">
            Customers will see this number and a direct link to{" "}
            <a
              href="https://www.indiapost.gov.in/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2"
            >
              indiapost.gov.in
            </a>{" "}
            to track their shipment.
          </p>

          <label className="flex items-center gap-2 cursor-pointer pt-1 border-t border-amber-200/60">
            <input
              type="checkbox"
              checked={notifyWhatsApp}
              onChange={(e) => setNotifyWhatsApp(e.target.checked)}
              className="rounded border-amber-300 text-emerald-600 focus:ring-emerald-500 size-3.5"
            />
            <span className="text-xs text-amber-950 font-medium">
              📲 Send WhatsApp automated message with tracking ID to customer{customerMobile ? ` (+${customerMobile})` : ""}
            </span>
          </label>
        </div>
      ) : null}

      {feedback ? (
        <Alert variant={feedback.isError ? "danger" : "success"} className="text-xs py-2">
          {feedback.message}
        </Alert>
      ) : null}

      <div className="flex items-center gap-2">
        <Button
          size="sm"
          onClick={handleSave}
          loading={loading}
          className="h-8 text-xs bg-emerald-700 hover:bg-emerald-800 text-white"
        >
          <Check className="mr-1 size-3.5" />
          Save Status Changes
        </Button>
      </div>
    </div>
  );
}
