import "server-only";

import { env } from "@/lib/env";

/**
 * WhatsApp messaging.
 *
 * Provider-agnostic by design: callers pass a template name and variables, not
 * Meta-shaped JSON. Switching to a BSP means writing another driver here.
 *
 * Note on templates: outside a 24-hour customer-initiated window, WhatsApp
 * only permits pre-approved template messages. Every template below must be
 * registered and approved in the WhatsApp Manager before it will deliver.
 */

export type WhatsAppResult =
  | { ok: true; providerMessageId: string | null }
  | { ok: false; error: string };

export type WhatsAppTemplate = {
  /** Approved template name in WhatsApp Manager. */
  name: string;
  languageCode?: string;
  /** Positional {{1}}, {{2}} … body variables. */
  variables: string[];
};

export interface WhatsAppDriver {
  sendTemplate(to: string, template: WhatsAppTemplate): Promise<WhatsAppResult>;
}

const consoleDriver: WhatsAppDriver = {
  async sendTemplate(to, template) {
    console.info(
      `\n┌─ WhatsApp (console driver) ───────────────────\n` +
        `│  To:       +${to}\n` +
        `│  Template: ${template.name}\n` +
        `│  Vars:     ${template.variables.join(" | ")}\n` +
        `└───────────────────────────────────────────────\n`,
    );
    return { ok: true, providerMessageId: null };
  },
};

const cloudDriver: WhatsAppDriver = {
  async sendTemplate(to, template) {
    const { WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID } = env();

    try {
      const response = await fetch(
        `https://graph.facebook.com/v21.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to,
            type: "template",
            template: {
              name: template.name,
              language: { code: template.languageCode ?? "en" },
              components: template.variables.length
                ? [
                    {
                      type: "body",
                      parameters: template.variables.map((text) => ({
                        type: "text",
                        text,
                      })),
                    },
                  ]
                : [],
            },
          }),
          signal: AbortSignal.timeout(10_000),
        },
      );

      const data = (await response.json().catch(() => ({}))) as {
        messages?: Array<{ id: string }>;
        error?: { message?: string };
      };

      if (!response.ok || data.error) {
        return {
          ok: false,
          error: data.error?.message ?? `WhatsApp API responded ${response.status}`,
        };
      }

      return { ok: true, providerMessageId: data.messages?.[0]?.id ?? null };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : "WhatsApp unreachable.",
      };
    }
  },
};

export function whatsappDriver(): WhatsAppDriver {
  return env().WHATSAPP_DRIVER === "cloud" ? cloudDriver : consoleDriver;
}

/**
 * Template registry.
 *
 * Names must match approved templates. Keeping them here rather than inline at
 * call sites means the set of messages this store can send is auditable in one
 * place — which is also what the WhatsApp review process asks for.
 */
export const WHATSAPP_TEMPLATES = {
  orderPlaced: "order_placed",
  paymentReceived: "payment_received",
  // Registered now, used in V2 when shipping lands.
  orderShipped: "order_shipped",
  orderDelivered: "order_delivered",
} as const;
