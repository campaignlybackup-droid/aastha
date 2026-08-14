import "server-only";

import { createHash } from "node:crypto";

import { env, integrations, publicEnv } from "@/lib/env";
import { paiseToRupees } from "@/lib/money";

/**
 * Meta Conversions API.
 *
 * Server-side Purchase reporting. Two things make this correct rather than
 * merely present:
 *
 *  1. DEDUPLICATION. The `event_id` sent here is the SAME value the browser
 *     Pixel sends (Order.metaEventId). Meta collapses the pair into one
 *     conversion. Get this wrong and every sale is counted twice, which
 *     halves apparent ROAS and corrupts optimisation.
 *
 *  2. HASHING. Meta requires customer identifiers to be SHA-256 of a
 *     normalised value — trimmed, lowercased, and for phone numbers, digits
 *     only with country code. Sending raw PII is both a policy violation and
 *     produces no match, because Meta hashes its side too.
 */

const API_VERSION = "v21.0";

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/** Normalise then hash, per Meta's advanced-matching spec. */
function hashed(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  const normalised = value.trim().toLowerCase();
  return normalised ? sha256(normalised) : undefined;
}

function hashedPhone(e164Digits: string | null | undefined): string | undefined {
  if (!e164Digits) return undefined;
  // Digits only, including country code, no "+".
  const digits = e164Digits.replace(/\D/g, "");
  return digits ? sha256(digits) : undefined;
}

export type CapiPurchase = {
  /** MUST equal Order.metaEventId — the Pixel sends the same value. */
  eventId: string;
  eventTime: Date;
  orderNumber: string;
  totalPaise: number;
  contents: Array<{ id: string; quantity: number; pricePaise: number }>;
  customer: {
    email?: string | null;
    mobile?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    city?: string | null;
    state?: string | null;
    pincode?: string | null;
  };
  /** Captured from the browser when available; improves match quality. */
  clientIp?: string | null;
  clientUserAgent?: string | null;
  fbp?: string | null;
  fbc?: string | null;
  sourceUrl?: string;
};

export type CapiResult =
  | { ok: true; eventsReceived: number }
  | { ok: false; error: string };

export async function sendPurchaseEvent(
  purchase: CapiPurchase,
): Promise<CapiResult> {
  if (!integrations.metaCapi()) {
    return { ok: false, error: "Meta CAPI is not configured." };
  }

  const { customer } = purchase;

  const userData: Record<string, string | string[]> = {};
  const setIf = (key: string, value: string | undefined) => {
    if (value) userData[key] = [value];
  };

  setIf("em", hashed(customer.email));
  setIf("ph", hashedPhone(customer.mobile));
  setIf("fn", hashed(customer.firstName));
  setIf("ln", hashed(customer.lastName));
  setIf("ct", hashed(customer.city?.replace(/\s/g, "")));
  setIf("st", hashed(customer.state?.replace(/\s/g, "")));
  setIf("zp", hashed(customer.pincode));
  userData.country = [sha256("in")];

  // These two are NOT hashed — Meta expects them raw.
  if (purchase.clientIp) userData.client_ip_address = purchase.clientIp;
  if (purchase.clientUserAgent) {
    userData.client_user_agent = purchase.clientUserAgent;
  }
  if (purchase.fbp) userData.fbp = purchase.fbp;
  if (purchase.fbc) userData.fbc = purchase.fbc;

  const body = {
    data: [
      {
        event_name: "Purchase",
        // Seconds, not milliseconds. Meta rejects events more than 7 days old.
        event_time: Math.floor(purchase.eventTime.getTime() / 1000),
        event_id: purchase.eventId,
        event_source_url: purchase.sourceUrl ?? `${publicEnv.siteUrl}/checkout`,
        action_source: "website",
        user_data: userData,
        custom_data: {
          currency: "INR",
          value: paiseToRupees(purchase.totalPaise),
          order_id: purchase.orderNumber,
          content_type: "product",
          content_ids: purchase.contents.map((c) => c.id),
          contents: purchase.contents.map((c) => ({
            id: c.id,
            quantity: c.quantity,
            item_price: paiseToRupees(c.pricePaise),
          })),
          num_items: purchase.contents.reduce((sum, c) => sum + c.quantity, 0),
        },
      },
    ],
    ...(env().META_CAPI_TEST_EVENT_CODE
      ? { test_event_code: env().META_CAPI_TEST_EVENT_CODE }
      : {}),
  };

  try {
    const response = await fetch(
      `https://graph.facebook.com/${API_VERSION}/${publicEnv.metaPixelId}/events?access_token=${encodeURIComponent(env().META_CAPI_ACCESS_TOKEN)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(10_000),
      },
    );

    const data = (await response.json().catch(() => ({}))) as {
      events_received?: number;
      error?: { message?: string };
    };

    if (!response.ok || data.error) {
      return {
        ok: false,
        error: data.error?.message ?? `Meta responded ${response.status}`,
      };
    }

    return { ok: true, eventsReceived: data.events_received ?? 1 };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Meta CAPI unreachable.",
    };
  }
}
