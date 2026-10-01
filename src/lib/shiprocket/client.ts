import "server-only";

import { env } from "@/lib/env";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";

/**
 * Shiprocket API Client for Partial COD Orders.
 *
 * Requirements:
 * - Strictly handles PARTIAL_COD orders (fully prepaid orders are skipped).
 * - Collects ONLY the remaining 40% balance at delivery via courier.
 * - Auto-detects the active pickup address if not explicitly configured.
 */

type CachedToken = {
  token: string;
  expiresAt: number;
};

let cachedAuthToken: CachedToken | null = null;

/**
 * Obtains an authentication token from Shiprocket.
 * Token is valid for 10 days; we cache in memory for 8 days.
 */
export async function getShiprocketToken(): Promise<string | null> {
  const { SHIPROCKET_EMAIL, SHIPROCKET_PASSWORD } = env();

  if (!SHIPROCKET_EMAIL || !SHIPROCKET_PASSWORD) {
    return null;
  }

  const now = Date.now();
  if (cachedAuthToken && cachedAuthToken.expiresAt > now) {
    return cachedAuthToken.token;
  }

  try {
    const res = await fetch("https://apiv2.shiprocket.in/v1/external/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: SHIPROCKET_EMAIL,
        password: SHIPROCKET_PASSWORD,
      }),
      signal: AbortSignal.timeout(12_000),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error(`[shiprocket] Auth failed (${res.status}): ${errText}`);
      return null;
    }

    const data = (await res.json()) as { token?: string };
    if (!data.token) {
      console.error("[shiprocket] Auth response missing token:", data);
      return null;
    }

    // Cache for 8 days (8 * 24 * 60 * 60 * 1000)
    cachedAuthToken = {
      token: data.token,
      expiresAt: now + 8 * 24 * 60 * 60 * 1000,
    };

    return data.token;
  } catch (error) {
    console.error("[shiprocket] Auth request error:", error);
    return null;
  }
}

/**
 * Resolves the pickup location nickname.
 * Uses SHIPROCKET_PICKUP_LOCATION if provided, otherwise fetches the first
 * active pickup location registered in Shiprocket.
 */
async function resolvePickupLocation(token: string): Promise<string> {
  const { SHIPROCKET_PICKUP_LOCATION } = env();
  if (SHIPROCKET_PICKUP_LOCATION) {
    return SHIPROCKET_PICKUP_LOCATION;
  }

  try {
    const res = await fetch("https://apiv2.shiprocket.in/v1/external/settings/company/pickup", {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(10_000),
    });

    if (res.ok) {
      const data = (await res.json()) as {
        data?: { shipping_address?: Array<{ pickup_location: string; status: number }> };
      };
      const addresses = data.data?.shipping_address ?? [];
      const primary = addresses.find((a) => a.status === 1) || addresses[0];
      if (primary?.pickup_location) {
        return primary.pickup_location;
      }
    }
  } catch (err) {
    console.warn("[shiprocket] Could not auto-fetch pickup locations, falling back to Primary:", err);
  }

  return "Primary";
}

export type ShiprocketOrderInput = {
  id: string;
  orderNumber: string;
  totalPaise: number;
  shipName: string;
  shipMobile: string;
  shipEmail?: string | null;
  shipLine1: string;
  shipLine2?: string | null;
  shipCity: string;
  shipState: string;
  shipPincode: string;
  internalNote?: string | null;
  trackingNumber?: string | null;
  placedAt?: Date | null;
  createdAt: Date;
  items: Array<{
    id: string;
    productName: string;
    variantTitle?: string | null;
    sku?: string | null;
    quantity: number;
    unitPricePaise: number;
  }>;
  user?: {
    email?: string | null;
    name?: string | null;
  } | null;
};

export type CreateShiprocketOrderResult =
  | {
      ok: true;
      shiprocketOrderId: number | string;
      shipmentId: number | string;
      codAmountRupees: number;
      alreadySynced?: boolean;
    }
  | {
      ok: false;
      error: string;
      skipped?: boolean;
    };

/**
 * Automatically creates a COD shipment on Shiprocket ONLY for Partial COD orders.
 * The collectible COD amount is set strictly to the remaining 40% balance due.
 */
export async function createPartialCodShipment(
  order: ShiprocketOrderInput,
): Promise<CreateShiprocketOrderResult> {
  // 1. STRICT GUARD: Verify this is a Partial COD order.
  const isPartialCod = Boolean(order.internalNote?.includes("[PARTIAL_COD]"));
  if (!isPartialCod) {
    return {
      ok: false,
      error: "Order is fully prepaid (not Partial COD). Skipped Shiprocket sync.",
      skipped: true,
    };
  }

  // 2. IDEMPOTENCY GUARD: Do not push if already synced.
  if (order.internalNote?.includes("[SHIPROCKET_ORDER_ID:")) {
    return {
      ok: true,
      shiprocketOrderId: "EXISTING",
      shipmentId: "EXISTING",
      codAmountRupees: 0,
      alreadySynced: true,
    };
  }

  // 3. Authenticate with Shiprocket
  const token = await getShiprocketToken();
  if (!token) {
    return {
      ok: false,
      error: "Shiprocket credentials missing or invalid in environment variables.",
    };
  }

  // 4. Calculate exact remaining 40% balance due
  const advancePaise = Math.round(order.totalPaise * 0.6);
  const balancePaise = order.totalPaise - advancePaise;
  const codDueRupees = Math.round(balancePaise / 100);

  // 5. Customer name parsing
  const nameParts = (order.shipName || "").trim().split(/\s+/);
  const firstName = nameParts[0] || "Customer";
  const lastName = nameParts.slice(1).join(" ") || firstName;

  // 6. 10-digit mobile number for Shiprocket
  const cleanMobile = (order.shipMobile || "").replace(/\D/g, "").slice(-10);

  // 7. Format date (YYYY-MM-DD HH:mm)
  const d = order.placedAt ?? order.createdAt ?? new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const orderDateStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;

  // 8. Resolve pickup location
  const pickupLocation = await resolvePickupLocation(token);

  // 9. Prepare Order Items
  const orderItems = order.items.map((item) => ({
    name: item.productName + (item.variantTitle && item.variantTitle !== "Standard" ? ` - ${item.variantTitle}` : ""),
    sku: item.sku || `SKU-${item.id.slice(-6)}`,
    units: item.quantity,
    selling_price: Math.max(1, Math.round(item.unitPricePaise / 100)),
    discount: 0,
    tax: 0,
  }));

  // 10. Construct Shiprocket Payload
  const payload = {
    order_id: order.orderNumber,
    order_date: orderDateStr,
    pickup_location: pickupLocation,
    channel_id: "",
    comment: `Partial COD: 60% advance paid online. Collect remaining 40% balance (₹${codDueRupees}) on delivery.`,
    billing_customer_name: firstName,
    billing_last_name: lastName,
    billing_address: order.shipLine1,
    billing_address_2: order.shipLine2 || "",
    billing_city: order.shipCity,
    billing_pincode: order.shipPincode,
    billing_state: order.shipState,
    billing_country: "India",
    billing_email: order.shipEmail || order.user?.email || "customer@aasthasilver.com",
    billing_phone: cleanMobile,
    shipping_is_billing: true,
    order_items: orderItems,
    payment_method: "COD",
    shipping_charges: 0,
    giftwrap_charges: 0,
    transaction_charges: 0,
    total_discount: 0,
    sub_total: codDueRupees, // CRITICAL: This is the exact cash amount the courier collects at delivery
    length: 10,  // Standard jewellery box cm
    breadth: 10, // Standard jewellery box cm
    height: 5,   // Standard jewellery box cm
    weight: 0.25 // Standard parcel weight kg
  };

  try {
    const res = await fetch("https://apiv2.shiprocket.in/v1/external/orders/create/adhoc", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15_000),
    });

    const data = (await res.json().catch(() => ({}))) as {
      order_id?: number | string;
      shipment_id?: number | string;
      status?: string;
      status_code?: number;
      awb_code?: string;
      message?: string;
      errors?: unknown;
    };

    if (!res.ok || (!data.order_id && !data.shipment_id)) {
      const errStr = data.message || JSON.stringify(data.errors || data);
      console.error(`[shiprocket] Order creation failed for ${order.orderNumber}:`, errStr);
      return { ok: false, error: errStr || "Shiprocket rejected the order." };
    }

    const shiprocketOrderId = data.order_id || "";
    const shipmentId = data.shipment_id || "";
    const awbCode = data.awb_code || null;

    // 11. Update Order in DB with Shiprocket reference
    const noteLine = `[SHIPROCKET_ORDER_ID: ${shiprocketOrderId} | SHIPMENT_ID: ${shipmentId} | COD_DUE: ₹${codDueRupees}]`;
    const updatedNote = order.internalNote ? `${order.internalNote}\n${noteLine}` : noteLine;

    await db.order.update({
      where: { id: order.id },
      data: {
        internalNote: updatedNote,
        ...(awbCode && !order.trackingNumber ? { trackingNumber: awbCode } : {}),
      },
    });

    console.info(`[shiprocket] Successfully synced Partial COD Order ${order.orderNumber} (Shiprocket ID: ${shiprocketOrderId}, COD Due: ₹${codDueRupees})`);

    return {
      ok: true,
      shiprocketOrderId,
      shipmentId,
      codAmountRupees: codDueRupees,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Shiprocket API network timeout";
    console.error(`[shiprocket] Error syncing ${order.orderNumber}:`, errorMsg);
    return { ok: false, error: errorMsg };
  }
}
