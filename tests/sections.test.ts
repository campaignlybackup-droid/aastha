import { describe, expect, it } from "vitest";

import {
  SECTION_TYPES,
  parseSectionForRender,
  parseSectionSettings,
  sectionSchemas,
} from "@/lib/cms/sections";

/**
 * The section contract is what lets the renderer trust stored settings. These
 * tests pin down the two behaviours the homepage depends on: invalid settings
 * never render, and every declared type has a schema and a label.
 */
describe("section registry", () => {
  it("has a schema for every declared type", () => {
    for (const type of SECTION_TYPES) {
      expect(sectionSchemas[type]).toBeDefined();
    }
  });
});

describe("parseSectionSettings", () => {
  it("accepts a valid product carousel", () => {
    const result = parseSectionSettings("PRODUCT_CAROUSEL", {
      title: "New arrivals",
      source: { mode: "new", limit: 8, productIds: [] },
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe("New arrivals");
      expect(result.data.source.limit).toBe(8);
    }
  });

  it("applies defaults for omitted optional fields", () => {
    const result = parseSectionSettings("PRODUCT_CAROUSEL", {
      title: "Best sellers",
      source: { mode: "bestsellers" },
    });

    expect(result.success).toBe(true);
    if (result.success) {
      // limit defaults to 8 rather than being undefined at render time.
      expect(result.data.source.limit).toBe(8);
      expect(result.data.eyebrow).toBe("");
    }
  });

  it("rejects a hero with no slides", () => {
    const result = parseSectionSettings("HERO", { slides: [] });
    expect(result.success).toBe(false);
  });

  it("rejects a carousel limit outside the allowed range", () => {
    const result = parseSectionSettings("PRODUCT_CAROUSEL", {
      title: "Too many",
      source: { mode: "new", limit: 500 },
    });
    expect(result.success).toBe(false);
  });
});

describe("parseSectionForRender", () => {
  const base = { id: "s1", label: "Test", type: "PRODUCT_CAROUSEL" };

  it("returns a parsed section when settings are valid", () => {
    const parsed = parseSectionForRender({
      ...base,
      settings: { title: "Row", source: { mode: "new" } },
    });

    expect(parsed).not.toBeNull();
    expect(parsed?.type).toBe("PRODUCT_CAROUSEL");
  });

  it("drops a section with invalid settings instead of throwing", () => {
    // One malformed section must never take down the whole homepage.
    expect(
      parseSectionForRender({ ...base, settings: { source: { mode: "new" } } }),
    ).toBeNull();
  });

  it("drops a section whose type is no longer known", () => {
    expect(
      parseSectionForRender({ ...base, type: "REMOVED_TYPE", settings: {} }),
    ).toBeNull();
  });

  it("never throws on arbitrary stored JSON", () => {
    for (const settings of [null, undefined, 42, "string", [], { a: 1 }]) {
      expect(() =>
        parseSectionForRender({ ...base, settings }),
      ).not.toThrow();
    }
  });
});
