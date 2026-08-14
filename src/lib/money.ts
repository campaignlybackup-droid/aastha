/**
 * Money handling.
 *
 * Every monetary amount in this codebase is an integer number of PAISE.
 * Rationale:
 *   • Floating point rupees accumulate rounding errors across cart maths.
 *   • Razorpay's API is denominated in paise, so there is no conversion at the
 *     payment boundary — the number we compute is the number we charge.
 *
 * Never introduce a float rupee value. Parse user input with `rupeesToPaise`
 * at the edge and keep paise all the way to the database.
 */

export const CURRENCY = "INR" as const;

/**
 * Rupees → paise.
 *
 * Input domain is rupee amounts with at most TWO decimal places, which is the
 * only thing a price field can meaningfully hold. Rounding is applied because
 * `19.99 * 100` is `1998.9999999999998` in IEEE 754 and truncating would
 * undercharge by a paisa on every such price.
 *
 * A third decimal place (0.145) sits between representable values and will
 * round according to its actual float value rather than the decimal literal.
 * That is accepted: it is not a price a jeweller can enter.
 */
export function rupeesToPaise(rupees: number | string): number {
  const value = typeof rupees === "string" ? Number(rupees) : rupees;
  if (!Number.isFinite(value)) {
    throw new Error(`Cannot convert non-numeric value to paise: ${rupees}`);
  }
  return Math.round(value * 100);
}

export function paiseToRupees(paise: number): number {
  return paise / 100;
}

/**
 * Format paise as a display string, e.g. 12500000 → "₹1,25,000".
 * Uses the Indian digit grouping convention (lakh/crore).
 */
export function formatPrice(
  paise: number,
  options: { showDecimals?: boolean } = {},
): string {
  const { showDecimals = false } = options;
  const hasPaise = paise % 100 !== 0;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: CURRENCY,
    minimumFractionDigits: showDecimals || hasPaise ? 2 : 0,
    maximumFractionDigits: showDecimals || hasPaise ? 2 : 0,
  }).format(paiseToRupees(paise));
}

/** Discount percentage of MRP, rounded to a whole number. 0 when not on offer. */
export function discountPercent(mrpPaise: number, pricePaise: number): number {
  if (mrpPaise <= 0 || pricePaise >= mrpPaise) return 0;
  return Math.round(((mrpPaise - pricePaise) / mrpPaise) * 100);
}

/**
 * Apply a percentage discount to a base amount, optionally capped.
 * Rounds down so the customer is never charged a fraction of a paisa more.
 */
export function applyPercentage(
  basePaise: number,
  percent: number,
  maxDiscountPaise?: number | null,
): number {
  const raw = Math.floor((basePaise * percent) / 100);
  if (maxDiscountPaise && maxDiscountPaise > 0) {
    return Math.min(raw, maxDiscountPaise);
  }
  return raw;
}

/** Sum helper that keeps the paise contract explicit at call sites. */
export function sumPaise(amounts: number[]): number {
  return amounts.reduce((total, amount) => total + amount, 0);
}
