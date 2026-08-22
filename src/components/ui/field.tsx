"use client";

import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { AlertCircle } from "lucide-react";

import { cn } from "@/lib/utils";

/* -----------------------------------------------------------------------------
 * Form field primitives
 *
 * `Field` wires label ↔ control ↔ error/description together via generated ids
 * and aria-describedby, so every form in the app is screen-reader correct by
 * construction rather than by remembering to add attributes.
 * -------------------------------------------------------------------------- */

type FieldContextValue = {
  id: string;
  descriptionId: string;
  errorId: string;
  hasError: boolean;
};

const FieldContext = React.createContext<FieldContextValue | null>(null);

function useField() {
  const ctx = React.useContext(FieldContext);
  const fallbackId = React.useId();
  if (!ctx) {
    return {
      id: fallbackId,
      descriptionId: `${fallbackId}-description`,
      errorId: `${fallbackId}-error`,
      hasError: false,
    };
  }
  return ctx;
}

export function Field({
  children,
  error,
  className,
}: {
  children: React.ReactNode;
  /** Presence of a message switches the field into its error state. */
  error?: string | null;
  className?: string;
}) {
  const id = React.useId();
  const value = React.useMemo<FieldContextValue>(
    () => ({
      id,
      descriptionId: `${id}-description`,
      errorId: `${id}-error`,
      hasError: Boolean(error),
    }),
    [id, error],
  );

  return (
    <FieldContext.Provider value={value}>
      <div className={cn("space-y-1.5", className)}>
        {children}
        {error ? <FieldError>{error}</FieldError> : null}
      </div>
    </FieldContext.Provider>
  );
}

export function Label({
  className,
  required,
  children,
  ...props
}: React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> & {
  required?: boolean;
}) {
  const { id } = useField();
  return (
    <LabelPrimitive.Root
      htmlFor={id}
      className={cn(
        "block text-xs font-medium tracking-[0.08em] uppercase text-content-muted",
        className,
      )}
      {...props}
    >
      {children}
      {required ? (
        <span className="ml-0.5 text-danger-500" aria-hidden="true">
          *
        </span>
      ) : null}
    </LabelPrimitive.Root>
  );
}

const controlClasses = [
  "w-full bg-surface-raised text-content placeholder:text-content-subtle",
  "border border-line-strong rounded-sm",
  "transition-colors duration-150",
  "hover:border-sand-400",
  "focus:border-[var(--color-accent)] focus:outline-2 focus:outline-offset-0 focus:outline-[var(--color-accent)]",
  "disabled:cursor-not-allowed disabled:bg-sand-100 disabled:text-content-subtle",
  "aria-[invalid=true]:border-danger-500 aria-[invalid=true]:focus:outline-danger-500",
];

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(function Input({ className, ...props }, ref) {
  const { id, descriptionId, errorId, hasError } = useField();
  return (
    <input
      ref={ref}
      id={id}
      aria-invalid={hasError || undefined}
      aria-describedby={cn(descriptionId, hasError && errorId)}
      className={cn(controlClasses, "h-11 px-3.5 text-sm", className)}
      {...props}
    />
  );
});

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, rows = 4, ...props }, ref) {
  const { id, descriptionId, errorId, hasError } = useField();
  return (
    <textarea
      ref={ref}
      id={id}
      rows={rows}
      aria-invalid={hasError || undefined}
      aria-describedby={cn(descriptionId, hasError && errorId)}
      className={cn(controlClasses, "resize-y px-3.5 py-2.5 text-sm", className)}
      {...props}
    />
  );
});

/** Native select — used where a Radix Select would be overkill (e.g. state list). */
export const NativeSelect = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(function NativeSelect({ className, children, ...props }, ref) {
  const { id, descriptionId, errorId, hasError } = useField();
  return (
    <select
      ref={ref}
      id={id}
      aria-invalid={hasError || undefined}
      aria-describedby={cn(descriptionId, hasError && errorId)}
      className={cn(controlClasses, "h-11 px-3 text-sm", className)}
      {...props}
    >
      {children}
    </select>
  );
});

export function FieldDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  const { descriptionId } = useField();
  return (
    <p
      id={descriptionId}
      className={cn("text-xs leading-relaxed text-content-muted", className)}
      {...props}
    />
  );
}

export function FieldError({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  const { errorId } = useField();
  return (
    <p
      id={errorId}
      // `role="alert"` announces validation failures the moment they render.
      role="alert"
      className={cn(
        "flex items-start gap-1.5 text-xs leading-relaxed text-danger-700",
        className,
      )}
      {...props}
    >
      <AlertCircle className="mt-px size-3.5 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}
