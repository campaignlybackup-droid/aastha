import { describe, expect, it } from "vitest";

import { formatMobile, maskMobile, normaliseMobile, slugify } from "@/lib/utils";

/**
 * Mobile normalisation is the identity key for every customer account, so a
 * bug here silently creates duplicate accounts for the same person.
 */
describe("normaliseMobile", () => {
  it("accepts a bare 10-digit number", () => {
    expect(normaliseMobile("9876543210")).toBe("919876543210");
  });

  it("strips spaces, dashes and +91", () => {
    expect(normaliseMobile("+91 98765 43210")).toBe("919876543210");
    expect(normaliseMobile("+91-98765-43210")).toBe("919876543210");
    expect(normaliseMobile("091 98765 43210")).toBe("919876543210");
  });

  it("accepts an already-normalised number", () => {
    expect(normaliseMobile("919876543210")).toBe("919876543210");
  });

  it("maps every format of one number to the same identity", () => {
    const forms = ["9876543210", "+919876543210", "09876543210", "+91 98765 43210"];
    const normalised = new Set(forms.map(normaliseMobile));
    expect(normalised.size).toBe(1);
  });

  it("rejects numbers that are not plausible Indian mobiles", () => {
    // Indian mobile numbers begin 6–9.
    expect(normaliseMobile("1234567890")).toBeNull();
    expect(normaliseMobile("5876543210")).toBeNull();
    expect(normaliseMobile("98765")).toBeNull();
    expect(normaliseMobile("")).toBeNull();
    expect(normaliseMobile("not a phone")).toBeNull();
  });
});

describe("formatMobile / maskMobile", () => {
  it("formats for display", () => {
    expect(formatMobile("919876543210")).toBe("+91 98765 43210");
  });

  it("masks all but the last five digits", () => {
    const masked = maskMobile("919876543210");
    expect(masked).toBe("+91 ***** 43210");
    expect(masked).not.toContain("98765");
  });
});

describe("slugify", () => {
  it("produces URL-safe slugs", () => {
    expect(slugify("Rukmini Temple Jhumka Earrings")).toBe(
      "rukmini-temple-jhumka-earrings",
    );
  });

  it("collapses punctuation and trims separators", () => {
    expect(slugify("  Men's Jewellery & Kadas!  ")).toBe("men-s-jewellery-kadas");
  });

  it("caps length so a long name cannot produce an unusable URL", () => {
    expect(slugify("a".repeat(200)).length).toBeLessThanOrEqual(96);
  });
});
