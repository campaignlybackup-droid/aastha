"use client";

import * as React from "react";
import { Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Newsletter capture.
 *
 * Uses a plain fetch rather than a server action so the same component can sit
 * in the footer of every page without opting those pages into a dynamic
 * render.
 */
export function NewsletterForm({
  source = "footer",
  tone = "dark",
  buttonLabel = "Subscribe",
  className,
}: {
  source?: string;
  /** "light" for the dark teal footer, "dark" for light backgrounds. */
  tone?: "light" | "dark";
  buttonLabel?: string;
  className?: string;
}) {
  const [email, setEmail] = React.useState("");
  const [state, setState] = React.useState<
    "idle" | "submitting" | "done" | "error"
  >("idle");
  const [message, setMessage] = React.useState("");

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (state === "submitting") return;

    setState("submitting");
    setMessage("");

    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };

      if (!res.ok || !data.ok) {
        setState("error");
        setMessage(data.error ?? "Something went wrong. Please try again.");
        return;
      }

      setState("done");
      setMessage("You're on the list.");
      setEmail("");
    } catch {
      setState("error");
      setMessage("Network error. Please try again.");
    }
  }

  if (state === "done") {
    return (
      <p
        className={cn(
          "flex items-center gap-2 text-sm",
          tone === "light" ? "text-gold-300" : "text-success-700",
          className,
        )}
        role="status"
      >
        <Check className="size-4" aria-hidden="true" />
        {message}
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className={cn("space-y-2", className)}>
      <div className="flex gap-2">
        <label htmlFor={`newsletter-${source}`} className="sr-only">
          Email address
        </label>
        <input
          id={`newsletter-${source}`}
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          aria-invalid={state === "error" || undefined}
          className={cn(
            "h-11 min-w-0 flex-1 rounded-sm border px-3.5 text-sm outline-none transition-colors",
            tone === "light"
              ? "border-sand-50/20 bg-transparent text-sand-100 placeholder:text-sand-400 focus:border-gold-400"
              : "border-line-strong bg-surface-raised text-content placeholder:text-content-subtle focus:border-[var(--color-accent)]",
          )}
        />
        <Button
          type="submit"
          variant={tone === "light" ? "gold" : "primary"}
          loading={state === "submitting"}
        >
          {buttonLabel}
        </Button>
      </div>

      {state === "error" && message ? (
        <p
          role="alert"
          className={cn(
            "text-xs",
            tone === "light" ? "text-danger-50" : "text-danger-700",
          )}
        >
          {message}
        </p>
      ) : null}
    </form>
  );
}
