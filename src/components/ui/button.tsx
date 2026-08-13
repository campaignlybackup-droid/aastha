import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * The single button in the system.
 *
 * Note the `lg` size sets uppercase + wide tracking: that treatment is reserved
 * for primary commerce CTAs (Add to Cart, Buy Now, Place Order) so those actions
 * read differently from ordinary UI buttons without needing a bespoke variant.
 */
const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap",
    "font-medium tracking-[0.02em]",
    "transition-colors duration-200 ease-[var(--ease-out-quart)]",
    "disabled:pointer-events-none disabled:opacity-45",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]",
    // Icons should never be squashed by flex or intercept the click.
    "[&_svg]:pointer-events-none [&_svg]:shrink-0",
  ],
  {
    variants: {
      variant: {
        primary:
          "bg-[var(--color-accent)] text-[var(--color-accent-contrast)] hover:bg-[var(--color-accent-hover)]",
        secondary:
          "bg-sand-900 text-sand-50 hover:bg-sand-800",
        outline:
          "border border-line-strong bg-transparent text-content hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]",
        ghost:
          "bg-transparent text-content hover:bg-sand-100",
        gold:
          "bg-gold-500 text-sand-950 hover:bg-gold-400",
        danger:
          "bg-danger-500 text-white hover:bg-danger-700",
        link:
          "bg-transparent text-content underline underline-offset-4 decoration-line-strong hover:decoration-[var(--color-accent)] hover:text-[var(--color-accent)]",
        // Reversed for use on the dark teal footer / hero overlays.
        inverse:
          "bg-sand-50 text-sand-900 hover:bg-white",
      },
      size: {
        sm: "h-9 rounded-xs px-3.5 text-xs [&_svg]:size-3.5",
        md: "h-11 rounded-sm px-5 text-sm [&_svg]:size-4",
        lg: "h-14 rounded-sm px-8 text-xs uppercase tracking-[0.14em] [&_svg]:size-4",
        icon: "size-10 rounded-sm [&_svg]:size-4.5",
        "icon-sm": "size-8 rounded-xs [&_svg]:size-4",
      },
      block: {
        true: "w-full",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** Render as the child element (e.g. a Next.js `<Link>`) instead of `<button>`. */
  asChild?: boolean;
  /** Shows a spinner and blocks interaction. Keeps the button's width stable. */
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      className,
      variant,
      size,
      block,
      asChild = false,
      loading = false,
      disabled,
      children,
      ...props
    },
    ref,
  ) {
    const Comp = asChild ? Slot : "button";

    // `asChild` forwards to an arbitrary element, which must receive exactly one
    // child — so the spinner treatment only applies to real <button> elements.
    if (asChild) {
      return (
        <Comp
          ref={ref}
          className={cn(buttonVariants({ variant, size, block, className }))}
          {...props}
        >
          {children}
        </Comp>
      );
    }

    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size, block, className }))}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading && <Loader2 className="animate-spin" aria-hidden="true" />}
        {children}
      </button>
    );
  },
);

export { buttonVariants };
