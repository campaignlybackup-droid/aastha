"use client";

import * as React from "react";
import { CheckCircle2, ExternalLink, Loader2, Send, Truck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge, Card, CardBody } from "@/components/ui/primitives";
import { adminPushToShiprocket } from "@/server/actions/admin";

export function ShiprocketSyncCard({
  orderId,
  orderNumber,
  internalNote,
  totalPaise,
}: {
  orderId: string;
  orderNumber: string;
  internalNote?: string | null;
  totalPaise: number;
}) {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);

  const isPartialCod = Boolean(internalNote?.includes("[PARTIAL_COD]"));
  if (!isPartialCod) {
    return null; // Strictly only shown for Partial COD orders
  }

  // Calculate 40% due
  const advancePaise = Math.round(totalPaise * 0.6);
  const dueRupees = Math.round((totalPaise - advancePaise) / 100);

  // Parse existing Shiprocket order id if synced
  const match = internalNote?.match(/\[SHIPROCKET_ORDER_ID:\s*([^|]+)\s*\|\s*SHIPMENT_ID:\s*([^|]+)\s*\|\s*COD_DUE:\s*([^\]]+)\]/i);
  const isSynced = Boolean(match);
  const shiprocketOrderId = match ? match[1].trim() : null;
  const shipmentId = match ? match[2].trim() : null;

  async function handlePush() {
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    const res = await adminPushToShiprocket(orderId);
    setLoading(false);

    if (!res.ok) {
      setError(res.error);
    } else {
      setSuccessMsg(res.message || "Pushed to Shiprocket successfully!");
    }
  }

  return (
    <Card className="border-purple-200 bg-purple-50/40">
      <CardBody className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Truck className="size-4 text-purple-700 shrink-0" aria-hidden="true" />
            <h3 className="font-semibold text-sm text-purple-950">
              Shiprocket Delivery (Partial COD)
            </h3>
          </div>
          {isSynced ? (
            <Badge variant="success" size="sm" className="gap-1">
              <CheckCircle2 className="size-3" />
              Synced
            </Badge>
          ) : (
            <Badge variant="warning" size="sm">
              Pending Sync
            </Badge>
          )}
        </div>

        <p className="text-xs text-purple-900/80 leading-relaxed">
          {isSynced ? (
            <>
              Order registered on Shiprocket as <strong>COD</strong> with cash collection of{" "}
              <strong>₹{dueRupees}</strong> (40% balance).
            </>
          ) : (
            <>
              60% advance was paid online. Pushing will register this as a <strong>COD shipment</strong> on Shiprocket to collect the remaining <strong>₹{dueRupees}</strong> (40% balance) upon delivery.
            </>
          )}
        </p>

        {isSynced ? (
          <div className="rounded border border-purple-200/80 bg-white/80 p-2.5 text-xs space-y-1 font-mono text-purple-950">
            <div>Shiprocket Order ID: <strong>{shiprocketOrderId}</strong></div>
            {shipmentId && <div>Shipment ID: <strong>{shipmentId}</strong></div>}
            <div>Cash Collectible at Delivery: <strong>₹{dueRupees}</strong></div>
          </div>
        ) : null}

        {error ? (
          <p className="text-xs font-medium text-danger-700 bg-danger-50 p-2 rounded border border-danger-200">
            {error}
          </p>
        ) : null}

        {successMsg ? (
          <p className="text-xs font-medium text-success-700 bg-success-50 p-2 rounded border border-success-200">
            {successMsg}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-2 pt-1">
          {!isSynced ? (
            <Button
              size="sm"
              onClick={handlePush}
              disabled={loading}
              className="bg-purple-700 hover:bg-purple-800 text-white text-xs h-8"
            >
              {loading ? (
                <>
                  <Loader2 className="size-3.5 animate-spin mr-1.5" />
                  Pushing…
                </>
              ) : (
                <>
                  <Send className="size-3.5 mr-1.5" />
                  Push to Shiprocket (Collect ₹{dueRupees})
                </>
              )}
            </Button>
          ) : null}

          <a
            href="https://app.shiprocket.in/orders"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-purple-800 hover:text-purple-950 underline underline-offset-4 py-1.5"
          >
            Open Shiprocket Dashboard
            <ExternalLink className="size-3" />
          </a>
        </div>
      </CardBody>
    </Card>
  );
}
