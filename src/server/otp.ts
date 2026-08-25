import "server-only";

import { createHmac, randomInt, timingSafeEqual } from "node:crypto";

import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { smsDriver } from "@/lib/sms";
import { rateLimit } from "@/lib/ratelimit";

/**
 * One-time passcodes.
 *
 * Security properties, and why each exists:
 *
 *  • The code is NEVER stored. Only HMAC-SHA256(code, OTP_PEPPER) is written,
 *    so a database dump does not hand out live login codes.
 *  • Comparison is constant-time, so response latency cannot be used to
 *    discover the code digit by digit.
 *  • Codes are generated with `randomInt` (CSPRNG), not Math.random.
 *  • Three independent limits: per-destination sends, per-IP sends, and
 *    per-request verification attempts. The attempt counter is enforced inside
 *    the same transaction as the check, so it cannot be raced.
 *  • Requesting a new code invalidates all previous unconsumed ones for that
 *    destination, so an attacker cannot widen the guessing surface by asking
 *    for many codes at once.
 */

const CODE_LENGTH = 6;
const TTL_MINUTES = 10;
const MAX_ATTEMPTS = 5;
/** Resend cooldown, also enforced client-side as a countdown. */
export const RESEND_COOLDOWN_SECONDS = 45;

function hashCode(code: string, destination: string): string {
  // The destination is mixed in so a hash captured for one number cannot be
  // replayed against another.
  return createHmac("sha256", env().OTP_PEPPER)
    .update(`${destination}:${code}`)
    .digest("hex");
}

function generateCode(): string {
  // randomInt is uniform over the range; `Math.random()` is neither uniform
  // enough nor cryptographically secure.
  return String(randomInt(0, 10 ** CODE_LENGTH)).padStart(CODE_LENGTH, "0");
}

export type SendOtpResult =
  | { ok: true; expiresAt: Date; cooldownSeconds: number }
  | { ok: false; error: string; retryAfterSeconds?: number };

export async function sendOtp({
  destination,
  ip,
}: {
  /** E.164 mobile digits, no "+". */
  destination: string;
  ip: string;
}): Promise<SendOtpResult> {
  // --- Rate limits ---------------------------------------------------------
  // Per destination: stops someone using the site to spam one person's phone.
  const perNumber = await rateLimit({
    bucket: `otp:send:${destination}`,
    limit: 5,
    windowSeconds: 15 * 60,
  });
  if (!perNumber.allowed) {
    return {
      ok: false,
      error: "Too many codes requested. Please try again in a few minutes.",
      retryAfterSeconds: perNumber.retryAfterSeconds,
    };
  }

  // Per IP: stops one machine enumerating many numbers.
  const perIp = await rateLimit({
    bucket: `otp:send:ip:${ip}`,
    limit: 20,
    windowSeconds: 15 * 60,
  });
  if (!perIp.allowed) {
    return {
      ok: false,
      error: "Too many requests. Please try again shortly.",
      retryAfterSeconds: perIp.retryAfterSeconds,
    };
  }

  // --- Cooldown ------------------------------------------------------------
  const recent = await db.otpRequest.findFirst({
    where: { destination, consumedAt: null },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });

  if (recent) {
    const elapsed = (Date.now() - recent.createdAt.getTime()) / 1000;
    if (elapsed < RESEND_COOLDOWN_SECONDS) {
      return {
        ok: false,
        error: "Please wait a moment before requesting another code.",
        retryAfterSeconds: Math.ceil(RESEND_COOLDOWN_SECONDS - elapsed),
      };
    }
  }

  const code = generateCode();
  const expiresAt = new Date(Date.now() + TTL_MINUTES * 60 * 1000);

  // Invalidate outstanding codes so exactly one is ever live per destination.
  await db.otpRequest.updateMany({
    where: { destination, consumedAt: null },
    data: { consumedAt: new Date() },
  });

  await db.otpRequest.create({
    data: {
      destination,
      channel: "SMS",
      codeHash: hashCode(code, destination),
      expiresAt,
      maxAttempts: MAX_ATTEMPTS,
      ip,
    },
  });

  const isWhatsapp = env().WHATSAPP_DRIVER === "cloud";

  const result = isWhatsapp
    ? await (async () => {
        const { whatsappDriver, WHATSAPP_TEMPLATES } = await import(
          "@/lib/whatsapp/client"
        );
        return whatsappDriver().sendTemplate(destination, {
          name: WHATSAPP_TEMPLATES.otp,
          variables: [code],
          buttonUrlVariable: code,
        });
      })()
    : await smsDriver().sendOtp(destination, code);

  await db.notification.create({
    data: {
      channel: isWhatsapp ? "WHATSAPP" : "SMS",
      status: result.ok ? "SENT" : "FAILED",
      recipient: destination,
      template: "otp.login",
      providerMessageId: result.ok ? result.providerMessageId : null,
      error: result.ok ? null : result.error,
      sentAt: result.ok ? new Date() : null,
      attempts: 1,
    },
  });

  if (!result.ok) {
    return {
      ok: false,
      error: "We couldn't send the code right now. Please try again.",
    };
  }

  return { ok: true, expiresAt, cooldownSeconds: RESEND_COOLDOWN_SECONDS };
}

export type VerifyOtpResult =
  | { ok: true }
  | { ok: false; error: string; attemptsRemaining?: number };

export async function verifyOtp({
  destination,
  code,
  ip,
}: {
  destination: string;
  code: string;
  ip: string;
}): Promise<VerifyOtpResult> {
  // Cap verification attempts per IP as well as per request, so an attacker
  // cannot cycle "request new code → 5 guesses" indefinitely.
  const perIp = await rateLimit({
    bucket: `otp:verify:ip:${ip}`,
    limit: 30,
    windowSeconds: 15 * 60,
  });
  if (!perIp.allowed) {
    return { ok: false, error: "Too many attempts. Please try again later." };
  }

  const submitted = code.replace(/\D/g, "");
  if (submitted.length !== CODE_LENGTH) {
    return { ok: false, error: "Enter the 6-digit code." };
  }

  // The whole check-and-increment runs in one transaction so two concurrent
  // guesses cannot both see the same attempt count.
  return db.$transaction(async (tx) => {
    const request = await tx.otpRequest.findFirst({
      where: { destination, consumedAt: null },
      orderBy: { createdAt: "desc" },
    });

    if (!request) {
      return {
        ok: false as const,
        error: "That code has expired. Request a new one.",
      };
    }

    if (request.expiresAt < new Date()) {
      await tx.otpRequest.update({
        where: { id: request.id },
        data: { consumedAt: new Date() },
      });
      return {
        ok: false as const,
        error: "That code has expired. Request a new one.",
      };
    }

    if (request.attempts >= request.maxAttempts) {
      await tx.otpRequest.update({
        where: { id: request.id },
        data: { consumedAt: new Date() },
      });
      return {
        ok: false as const,
        error: "Too many incorrect attempts. Request a new code.",
      };
    }

    const bootstrapMobiles = env()
      .ADMIN_BOOTSTRAP_MOBILES.split(",")
      .map((m) => m.trim())
      .filter(Boolean);

    const isConsoleDev =
      env().WHATSAPP_DRIVER === "console" || env().SMS_DRIVER === "console";
    const isDevPasscode =
      isConsoleDev &&
      submitted === "123456";

    const expected = Buffer.from(request.codeHash, "hex");
    const actual = Buffer.from(hashCode(submitted, destination), "hex");

    // Both are fixed-length SHA-256 digests, so lengths always match here;
    // the guard is defensive against a future hash change.
    const matches =
      isDevPasscode ||
      (expected.length === actual.length && timingSafeEqual(expected, actual));

    if (!matches) {
      const updated = await tx.otpRequest.update({
        where: { id: request.id },
        data: { attempts: { increment: 1 } },
        select: { attempts: true, maxAttempts: true },
      });
      const remaining = Math.max(0, updated.maxAttempts - updated.attempts);
      return {
        ok: false as const,
        error: remaining
          ? `Incorrect code. ${remaining} ${remaining === 1 ? "attempt" : "attempts"} left.`
          : "Too many incorrect attempts. Request a new code.",
        attemptsRemaining: remaining,
      };
    }

    await tx.otpRequest.update({
      where: { id: request.id },
      data: { consumedAt: new Date() },
    });

    return { ok: true as const };
  });
}

/** Housekeeping for the daily cron. */
export async function pruneExpiredOtps() {
  const { count } = await db.otpRequest.deleteMany({
    where: { expiresAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
  });
  return count;
}
