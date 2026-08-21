import { describe, expect, it } from "vitest";
import { formatPrice, rupeesToPaise, paiseToRupees } from "../src/lib/money";

describe("Site Audit: Price & Currency Integrity", () => {
  it("formats Indian rupees with exact digit grouping", () => {
    expect(formatPrice(150000)).toBe("₹1,500");
    expect(formatPrice(0)).toBe("₹0");
    expect(rupeesToPaise(1500)).toBe(150000);
    expect(paiseToRupees(150000)).toBe(1500);
  });
});
