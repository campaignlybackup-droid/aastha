import "server-only";

import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { emailDriver } from "@/lib/email/client";
import { publicEnv } from "@/lib/env";
import { sendPurchaseEvent } from "@/lib/meta/capi";
import { formatPrice } from "@/lib/money";
import { WHATSAPP_TEMPLATES, whatsappDriver } from "@/lib/whatsapp/client";

/**
 * Post-order side effects.
 *
 * Called once, on the PENDING → CONFIRMED transition. Every step is
 * independently guarded and logged, because none of them may take down order
 * confirmation: the customer has already paid, and a WhatsApp outage is not a
 * reason to fail their order.
 */

export async function onOrderConfirmed(orderId: string) {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: orderInclude,
  });

  if (!order) return;

  // Run independently so one failure cannot prevent the others.
  await Promise.allSettled([
    sendOrderWhatsApp(order),
    sendOrderEmail(order),
    reportPurchaseToMeta(order),
  ]);
}

const orderInclude = {
  items: true,
  user: { select: { name: true, email: true, mobile: true } },
} satisfies Prisma.OrderInclude;

type OrderWithRelations = Prisma.OrderGetPayload<{
  include: typeof orderInclude;
}>;

/* -----------------------------------------------------------------------------
 * WhatsApp
 * -------------------------------------------------------------------------- */

async function sendOrderWhatsApp(order: OrderWithRelations) {
  const to = order.shipMobile || order.user.mobile;
  if (!to) return;

  const result = await whatsappDriver().sendTemplate(to, {
    name: WHATSAPP_TEMPLATES.orderPlaced,
    variables: [
      order.shipName.split(" ")[0] ?? "there",
      order.orderNumber,
      formatPrice(order.totalPaise),
      `${publicEnv.siteUrl}/account/orders/${order.id}`,
    ],
  });

  await db.notification.create({
    data: {
      channel: "WHATSAPP",
      status: result.ok ? "SENT" : "FAILED",
      recipient: to,
      template: "order.placed",
      providerMessageId: result.ok ? result.providerMessageId : null,
      error: result.ok ? null : result.error,
      orderId: order.id,
      userId: order.userId,
      sentAt: result.ok ? new Date() : null,
      attempts: 1,
      payload: { orderNumber: order.orderNumber },
    },
  });
}

/* -----------------------------------------------------------------------------
 * Email
 * -------------------------------------------------------------------------- */

async function sendOrderEmail(order: OrderWithRelations) {
  const to = order.shipEmail || order.user.email;
  if (!to) return;

  const lines = order.items
    .map(
      (item) =>
        `  ${item.quantity} × ${item.productName}` +
        (item.variantTitle && item.variantTitle !== "Standard"
          ? ` (${item.variantTitle})`
          : "") +
        ` — ${formatPrice(item.lineTotalPaise)}`,
    )
    .join("\n");

  const orderUrl = `${publicEnv.siteUrl}/account/orders/${order.id}`;

  const text = [
    `Thank you for your order, ${order.shipName.split(" ")[0]}.`,
    ``,
    `Order ${order.orderNumber}`,
    ``,
    lines,
    ``,
    `Subtotal:  ${formatPrice(order.subtotalPaise)}`,
    order.discountPaise > 0
      ? `Discount:  − ${formatPrice(order.discountPaise)}`
      : null,
    `Shipping:  ${order.shippingPaise === 0 ? "Free" : formatPrice(order.shippingPaise)}`,
    `Total:     ${formatPrice(order.totalPaise)}`,
    `(includes ${formatPrice(order.taxPaise)} GST)`,
    ``,
    `Delivering to:`,
    `  ${order.shipName}`,
    `  ${order.shipLine1}${order.shipLine2 ? `, ${order.shipLine2}` : ""}`,
    `  ${order.shipCity}, ${order.shipState} ${order.shipPincode}`,
    ``,
    `Track your order: ${orderUrl}`,
    ``,
    `Need help? WhatsApp us on +${publicEnv.supportWhatsapp}.`,
    ``,
    `Aastha Silver & Jewels`,
  ]
    .filter((line) => line !== null)
    .join("\n");

  const html = `
    <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;color:#1f1c18">
      <h1 style="font-weight:400;font-size:24px;letter-spacing:0.02em">Thank you for your order</h1>
      <p style="color:#625b50;font-size:14px;line-height:1.6">
        Order <strong>${order.orderNumber}</strong> is confirmed and will be
        dispatched from Jaipur within 48 hours.
      </p>
      <table style="width:100%;border-collapse:collapse;margin:24px 0;font-size:14px">
        ${order.items
          .map(
            (item) => `
          <tr>
            <td style="padding:8px 0;border-bottom:1px solid #e8e3db">
              ${item.quantity} × ${escapeHtml(item.productName)}
              ${
                item.variantTitle && item.variantTitle !== "Standard"
                  ? `<br><span style="color:#837b6e;font-size:12px">${escapeHtml(item.variantTitle)}</span>`
                  : ""
              }
            </td>
            <td style="padding:8px 0;border-bottom:1px solid #e8e3db;text-align:right">
              ${formatPrice(item.lineTotalPaise)}
            </td>
          </tr>`,
          )
          .join("")}
        <tr>
          <td style="padding:12px 0;font-weight:bold">Total</td>
          <td style="padding:12px 0;text-align:right;font-weight:bold">
            ${formatPrice(order.totalPaise)}
          </td>
        </tr>
      </table>
      <p style="font-size:14px">
        <a href="${orderUrl}" style="color:#244b47">View your order</a>
      </p>
      <p style="color:#837b6e;font-size:12px;line-height:1.6">
        Need help? WhatsApp us on +${publicEnv.supportWhatsapp}.
      </p>
    </div>
  `;

  const result = await emailDriver().send({
    to,
    subject: `Order ${order.orderNumber} confirmed — Aastha Silver & Jewels`,
    html,
    text,
  });

  await db.notification.create({
    data: {
      channel: "EMAIL",
      status: result.ok ? "SENT" : "FAILED",
      recipient: to,
      template: "order.placed",
      providerMessageId: result.ok ? result.providerMessageId : null,
      error: result.ok ? null : result.error,
      orderId: order.id,
      userId: order.userId,
      sentAt: result.ok ? new Date() : null,
      attempts: 1,
    },
  });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/* -----------------------------------------------------------------------------
 * Meta Conversions API
 * -------------------------------------------------------------------------- */

async function reportPurchaseToMeta(order: OrderWithRelations) {
  // `metaCapiSentAt` is the guard: a webhook replay or a manual re-confirm
  // must never report the same revenue twice.
  if (order.metaCapiSentAt || !order.metaEventId) return;

  const [firstName, ...rest] = (order.shipName || "").trim().split(/\s+/);

  const result = await sendPurchaseEvent({
    eventId: order.metaEventId,
    eventTime: order.placedAt ?? order.createdAt,
    orderNumber: order.orderNumber,
    totalPaise: order.totalPaise,
    contents: order.items.map((item) => ({
      id: item.productId ?? item.sku,
      quantity: item.quantity,
      pricePaise: item.unitPricePaise,
    })),
    customer: {
      email: order.shipEmail ?? order.user.email,
      mobile: order.shipMobile ?? order.user.mobile,
      firstName,
      lastName: rest.join(" ") || null,
      city: order.shipCity,
      state: order.shipState,
      pincode: order.shipPincode,
    },
  });

  if (result.ok) {
    await db.order.update({
      where: { id: order.id },
      data: { metaCapiSentAt: new Date() },
    });
  } else {
    console.error(
      `[meta] Purchase CAPI failed for ${order.orderNumber}: ${result.error}`,
    );
  }
}

/* -----------------------------------------------------------------------------
 * Failure path
 * -------------------------------------------------------------------------- */

export async function onPaymentFailed(orderId: string) {
  const order = await db.order.findUnique({
    where: { id: orderId },
    select: { id: true, orderNumber: true, userId: true, shipMobile: true },
  });
  if (!order) return;

  // Recorded, not messaged. A "your payment failed" WhatsApp on what is
  // usually a transient bank decline reads as alarming, and the customer is
  // still on the checkout page where the error is already shown.
  await db.notification.create({
    data: {
      channel: "WHATSAPP",
      status: "QUEUED",
      recipient: order.shipMobile,
      template: "payment.failed",
      orderId: order.id,
      userId: order.userId,
      payload: { orderNumber: order.orderNumber },
    },
  });
}
