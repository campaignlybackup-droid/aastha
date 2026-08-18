"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ShieldCheck, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field, FieldDescription, Input, Label } from "@/components/ui/field";
import { Alert } from "@/components/ui/primitives";
import { requestLoginCode, verifyLoginCode } from "@/server/actions/auth";
import { maskMobile, normaliseMobile } from "@/lib/utils";

/**
 * Passwordless login with smart returning user recognition.
 *
 * First-time user: requests Name & OTP code.
 * Returning user: displays a personalized "Welcome back, [Name]!" greeting & asks only for the OTP code.
 */
export function LoginForm({ next }: { next?: string }) {
  const router = useRouter();

  const [step, setStep] = React.useState<"mobile" | "code">("mobile");
  const [mobile, setMobile] = React.useState("");
  const [verifiedMobile, setVerifiedMobile] = React.useState("");
  const [code, setCode] = React.useState("");
  const [name, setName] = React.useState("");
  const [isExistingUser, setIsExistingUser] = React.useState(false);
  const [userName, setUserName] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();
  const [cooldown, setCooldown] = React.useState(0);

  // Resend countdown.
  React.useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  function onRequestCode(event?: React.FormEvent) {
    event?.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await requestLoginCode(mobile);
      if (!result.ok) {
        setError(result.error);
        if (result.retryAfterSeconds) setCooldown(result.retryAfterSeconds);
        return;
      }
      setVerifiedMobile(result.mobile);
      setCooldown(result.cooldownSeconds);
      setIsExistingUser(result.isExistingUser);
      setUserName(result.userName);
      setStep("code");
      setCode("");
    });
  }

  function onVerify(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await verifyLoginCode({
        mobile: verifiedMobile,
        code,
        name: isExistingUser ? undefined : name.trim() || undefined,
        next,
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      router.push(result.redirectTo);
      router.refresh();
    });
  }

  /* ------------------------------- Step 1 ------------------------------- */
  if (step === "mobile") {
    return (
      <form onSubmit={onRequestCode} className="space-y-5">
        <Field error={error}>
          <Label required>Mobile number</Label>
          <div className="flex items-center gap-2">
            <span className="flex h-11 items-center rounded-sm border border-line-strong px-3 text-sm text-content-muted">
              +91
            </span>
            <Input
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              name="phone"
              placeholder="98765 43210"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              required
              maxLength={14}
            />
          </div>
          <FieldDescription>
            We&rsquo;ll text you a 6-digit verification code. No password needed.
          </FieldDescription>
        </Field>

        <Button
          type="submit"
          size="lg"
          block
          loading={pending}
          disabled={!normaliseMobile(mobile)}
        >
          Send code
        </Button>

        <p className="flex items-start gap-2 text-xs leading-relaxed text-content-subtle">
          <ShieldCheck className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          By continuing you agree to our{" "}
          <Link href="/terms" className="underline underline-offset-2">
            Terms
          </Link>{" "}
          and{" "}
          <Link href="/privacy-policy" className="underline underline-offset-2">
            Privacy Policy
          </Link>
          .
        </p>
      </form>
    );
  }

  /* ------------------------------- Step 2 ------------------------------- */
  return (
    <form onSubmit={onVerify} className="space-y-5">
      <button
        type="button"
        onClick={() => {
          setStep("mobile");
          setError(null);
        }}
        className="inline-flex items-center gap-1.5 text-sm text-content-muted transition-colors hover:text-[var(--color-accent)]"
      >
        <ArrowLeft className="size-3.5" aria-hidden="true" />
        Change number
      </button>

      {isExistingUser ? (
        <div className="rounded-md border border-gold-500/30 bg-gold-50/50 p-4 text-center">
          <div className="flex items-center justify-center gap-1.5 font-display text-lg text-brand-900">
            <Sparkles className="size-4 text-gold-600" />
            Welcome back, {userName || "Valued Customer"}!
          </div>
          <p className="mt-1 text-xs text-content-muted">
            Enter the 6-digit code sent to{" "}
            <span className="font-medium text-content">{maskMobile(verifiedMobile)}</span>
          </p>
        </div>
      ) : (
        <div>
          <p className="text-sm text-content-muted">
            We sent a verification code to{" "}
            <span className="font-medium text-content">{maskMobile(verifiedMobile)}</span>
          </p>
        </div>
      )}

      <Field error={error}>
        <Label required>6-digit verification code</Label>
        <Input
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]*"
          maxLength={6}
          placeholder="······"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          required
          className="text-center text-lg tracking-[0.5em]"
        />
      </Field>

      {!isExistingUser && (
        <Field>
          <Label required>Your full name</Label>
          <Input
            type="text"
            autoComplete="name"
            placeholder="Priya Sharma"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            required
          />
          <FieldDescription>
            Enter your name to personalize your orders and certificate of authenticity.
          </FieldDescription>
        </Field>
      )}

      <Button
        type="submit"
        size="lg"
        block
        loading={pending}
        disabled={code.length !== 6 || (!isExistingUser && !name.trim())}
      >
        {isExistingUser ? "Verify & Sign In" : "Create Account & Continue"}
      </Button>

      <div className="text-center text-sm">
        {cooldown > 0 ? (
          <p className="text-content-subtle">
            Resend code in {cooldown}s
          </p>
        ) : (
          <button
            type="button"
            onClick={() => onRequestCode()}
            disabled={pending}
            className="underline underline-offset-4 hover:text-[var(--color-accent)] disabled:opacity-50"
          >
            Resend code
          </button>
        )}
      </div>

      {process.env.NODE_ENV === "development" ? (
        <Alert variant="info">
          Development mode: OTP code is logged in the server console.
        </Alert>
      ) : null}
    </form>
  );
}
