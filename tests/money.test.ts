import { describe, expect, it } from "vitest";

import {
  applyPercentage,
  discountPercent,
  formatPrice,
  paiseToRupees,
  rupeesToPaise,
  sumPaise,
} from "@/lib/money";

/**
 * Money is the one place where a rounding mistake is a real financial bug,
 * so the edge cases are pinned down explicitly.
 */
describe("rupeesToPaise", () => {
  it("converts whole rupees", () => {
    expect(rupeesToPaise(1999)).toBe(199900);
  });

  it("rounds rather than truncates", () => {
    // 19.99 * 100 is 1998.9999999999998 in IEEE 754. Truncating gives 1998,
    // which would undercharge by a paisa on every such price.
    expect(rupeesToPaise(19.99)).toBe(1999);
    expect(rupeesToPaise(0.1)).toBe(10);
    expect(rupeesToPaise(2450.5)).toBe(245050);
  });

  it("round-trips every two-decimal amount exactly", () => {
    // Two decimals is the real input domain — a price field cannot hold more.
    for (let paise = 0; paise <= 100_000; paise += 7) {
      const rupees = paise / 100;
      expect(rupeesToPaise(rupees)).toBe(paise);
    }
  });

  it("accepts numeric strings", () => {
    expect(rupeesToPaise("2450.50")).toBe(245050);
  });

  it("rejects non-numeric input rather than producing NaN paise", () => {
    expect(() => rupeesToPaise("abc")).toThrow();
  });
});

describe("discountPercent", () => {
  it("computes a whole-number percentage", () => {
    expect(discountPercent(289000, 199900)).toBe(31);
  });

  it("returns 0 when not discounted", () => {
    expect(discountPercent(199900, 199900)).toBe(0);
    expect(discountPercent(199900, 249900)).toBe(0);
    expect(discountPercent(0, 199900)).toBe(0);
  });
});

describe("applyPercentage", () => {
  it("rounds down so the customer is never overcharged", () => {
    // 10% of 1999 is 199.9 → 199, not 200.
    expect(applyPercentage(1999, 10)).toBe(199);
  });

  it("respects a maximum discount cap", () => {
    // 10% of ₹10,000 is ₹1,000, but the coupon caps at ₹500.
    expect(applyPercentage(1_000_000, 10, 50_000)).toBe(50_000);
  });

  it("ignores a zero or null cap", () => {
    expect(applyPercentage(100_000, 10, null)).toBe(10_000);
    expect(applyPercentage(100_000, 10, 0)).toBe(10_000);
  });
});

describe("formatPrice", () => {
  it("uses Indian digit grouping", () => {
    // Lakh grouping: 1,25,000 — not 125,000.
    expect(formatPrice(12_500_000)).toBe("₹1,25,000");
  });

  it("omits decimals for whole rupees", () => {
    expect(formatPrice(199900)).toBe("₹1,999");
  });

  it("shows decimals when the amount has paise", () => {
    expect(formatPrice(11356)).toBe("₹113.56");
  });
});

describe("sumPaise and paiseToRupees", () => {
  it("sums without floating point drift", () => {
    const total = sumPaise([1999, 1999, 1999]);
    expect(total).toBe(5997);
    expect(paiseToRupees(total)).toBe(59.97);
  });
});
