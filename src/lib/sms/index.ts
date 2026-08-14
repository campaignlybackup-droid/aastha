import "server-only";

import { env } from "@/lib/env";

/**
 * SMS provider abstraction.
 *
 * Callers ask for "send this OTP to this number". Which provider does it, and
 * how, is decided here. Swapping MSG91 for another gateway means adding a
 * driver below — no call site changes.
 *
 * The `console` driver prints to the server log and is the correct setting for
 * local development: no DLT template, no credits, no waiting for a real SMS.
 */

export type SmsResult =
  | { ok: true; providerMessageId: string | null }
  | { ok: false; error: string };

export interface SmsDriver {
  sendOtp(to: string, code: string): Promise<SmsResult>;
}

/* -----------------------------------------------------------------------------
 * Console (development)
 * -------------------------------------------------------------------------- */

const consoleDriver: SmsDriver = {
  async sendOtp(to, code) {
    console.info(
      `\n┌─ SMS (console driver) ────────────────────────\n` +
        `│  To:   +${to}\n` +
        `│  OTP:  ${code}\n` +
        `└───────────────────────────────────────────────\n`,
    );
    return { ok: true, providerMessageId: null };
  },
};

/* -----------------------------------------------------------------------------
 * MSG91
 * -------------------------------------------------------------------------- */

const msg91Driver: SmsDriver = {
  async sendOtp(to, code) {
    const { MSG91_AUTH_KEY, MSG91_OTP_TEMPLATE_ID, MSG91_SENDER_ID } = env();

    if (!MSG91_AUTH_KEY || !MSG91_OTP_TEMPLATE_ID) {
      return {
        ok: false,
        error: "MSG91 is not configured (auth key or template id missing).",
      };
    }

    try {
      const response = await fetch("https://control.msg91.com/api/v5/otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          authkey: MSG91_AUTH_KEY,
        },
        body: JSON.stringify({
          template_id: MSG91_OTP_TEMPLATE_ID,
          mobile: to,
          otp: code,
          ...(MSG91_SENDER_ID ? { sender: MSG91_SENDER_ID } : {}),
          // We generate and hash the OTP ourselves; MSG91 must not mint its
          // own, or the code we stored would not match the one delivered.
          otp_expiry: 10,
        }),
        // Do not let a hanging gateway hold the request open indefinitely.
        signal: AbortSignal.timeout(10_000),
      });

      const data = (await response.json().catch(() => ({}))) as {
        type?: string;
        message?: string;
        request_id?: string;
      };

      if (!response.ok || data.type === "error") {
        return {
          ok: false,
          error: data.message ?? `MSG91 responded ${response.status}`,
        };
      }

      return { ok: true, providerMessageId: data.request_id ?? null };
    } catch (error) {
      return {
        ok: false,
        error:
          error instanceof Error ? error.message : "SMS gateway unreachable.",
      };
    }
  },
};

export function smsDriver(): SmsDriver {
  return env().SMS_DRIVER === "msg91" ? msg91Driver : consoleDriver;
}
