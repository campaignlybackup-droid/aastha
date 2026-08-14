import "server-only";

import { env } from "@/lib/env";

/**
 * Transactional email.
 *
 * Same shape as the SMS and WhatsApp modules: a driver interface with a
 * console implementation for development and a real one for production.
 */

export type EmailResult =
  | { ok: true; providerMessageId: string | null }
  | { ok: false; error: string };

export interface EmailDriver {
  send(message: {
    to: string;
    subject: string;
    html: string;
    text: string;
  }): Promise<EmailResult>;
}

const consoleDriver: EmailDriver = {
  async send({ to, subject, text }) {
    console.info(
      `\n┌─ Email (console driver) ──────────────────────\n` +
        `│  To:      ${to}\n` +
        `│  Subject: ${subject}\n` +
        `├───────────────────────────────────────────────\n` +
        text
          .split("\n")
          .map((line) => `│  ${line}`)
          .join("\n") +
        `\n└───────────────────────────────────────────────\n`,
    );
    return { ok: true, providerMessageId: null };
  },
};

const resendDriver: EmailDriver = {
  async send({ to, subject, html, text }) {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env().RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: env().EMAIL_FROM,
          to: [to],
          subject,
          html,
          text,
        }),
        signal: AbortSignal.timeout(10_000),
      });

      const data = (await response.json().catch(() => ({}))) as {
        id?: string;
        message?: string;
      };

      if (!response.ok) {
        return {
          ok: false,
          error: data.message ?? `Resend responded ${response.status}`,
        };
      }

      return { ok: true, providerMessageId: data.id ?? null };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : "Email send failed.",
      };
    }
  },
};

export function emailDriver(): EmailDriver {
  return env().EMAIL_DRIVER === "resend" ? resendDriver : consoleDriver;
}
