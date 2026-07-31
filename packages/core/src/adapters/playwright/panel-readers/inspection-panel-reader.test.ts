import { describe, it, expect } from "vitest";
import { propertyKey, firstValueInSection, valueByPropertyName, parseTypography, InspectionPanelReader } from "./inspection-panel-reader";

describe("get_figma_information: InspectionPanelReader supports the hidden-TEXT-child drill-down", () => {
  it("confirms support, since Enter/Escape was verified in inspection mode", () => {
    expect(new InspectionPanelReader().supportsHiddenTextChild()).toBe(true);
  });
});

describe("get_figma_information: Compose the inspection panel's property lookup key", () => {
  it("keeps the plain name when the row has no sub-header", () => {
    expect(propertyKey(null, "Width")).toBe("Width");
  });

  it("prefixes the name with its sub-header, so a repeated name across sections doesn't collide", () => {
    // Confirmed in a real session: the panel repeats "Top" under both a
    // "Border" sub-header (stroke weight) and a separate "Padding"
    // sub-header, with different values ("1px" vs "16px"). A flat
    // Map<string,string> keyed only by name would let the second
    // overwrite the first.
    expect(propertyKey("Border", "Top")).toBe("Border:Top");
    expect(propertyKey("Padding", "Top")).toBe("Padding:Top");
    expect(propertyKey("Border", "Top")).not.toBe(propertyKey("Padding", "Top"));
  });
});

describe("get_figma_information: Resolve a value scoped to a sub-header section", () => {
  it("prefers a flat row over a value under a sub-header of the same name", () => {
    // Confirmed on a real node: a uniform stroke renders as a single flat
    // "Border: 1px" row, no sub-header at all.
    const properties = new Map([["Border", "1px"]]);
    expect(firstValueInSection(properties, "Border")).toBe("1px");
  });

  it("falls back to any row nested under the section when there's no flat row", () => {
    // Confirmed on a real node: an asymmetric stroke renders a "Border"
    // sub-header followed by a per-side row ("Top", in this case).
    const properties = new Map([["Border:Top", "1px"], ["Padding:Top", "16px"]]);
    expect(firstValueInSection(properties, "Border")).toBe("1px");
  });

  it("returns undefined when the section isn't present at all", () => {
    const properties = new Map([["Width", "100px"]]);
    expect(firstValueInSection(properties, "Border")).toBeUndefined();
  });
});

describe("get_figma_information: Resolve a value by property name regardless of its section", () => {
  it("finds a flat row with no section", () => {
    const properties = new Map([["Gap", "5.2px"]]);
    expect(valueByPropertyName(properties, "Gap")).toBe("5.2px");
  });

  it("finds the row even when it landed under an unrelated sub-header", () => {
    // Confirmed on a real node: "Gap" appeared right after a "Padding"
    // sub-header's row, with no sub-header reset in between — the row
    // ended up keyed "Padding:Gap" instead of a flat "Gap".
    const properties = new Map([["Padding:Bottom", "1.2px"], ["Padding:Gap", "5.2px"]]);
    expect(valueByPropertyName(properties, "Gap")).toBe("5.2px");
  });

  it("returns undefined when the property isn't present under any section", () => {
    const properties = new Map([["Width", "100px"]]);
    expect(valueByPropertyName(properties, "Gap")).toBeUndefined();
  });
});

describe("get_figma_information: Parse the Typography section's properties", () => {
  it("returns null when there's no Font row (not a TEXT node)", () => {
    const properties = new Map([["Width", "100px"]]);
    expect(parseTypography(properties)).toBeNull();
  });

  it("reads the base fields already supported before this session", () => {
    const properties = new Map([
      ["Font", "Manrope"],
      ["Weight", "700"],
      ["Size", "24px"],
      ["Line height", "32px"],
    ]);
    const result = parseTypography(properties);
    expect(result?.fontFamily).toBe("Manrope");
    expect(result?.fontWeight).toBe(700);
    expect(result?.fontSize).toBe(24);
    expect(result?.lineHeightPx).toBe(32);
  });

  it("also reads Style, Letter spacing, Horizontal alignment, and Vertical alignment", () => {
    // Confirmed on a real node ("AP" avatar text): the panel exposes all
    // four of these as flat rows in the Typography section, previously
    // never read even though the model already declared fields for them.
    const properties = new Map([
      ["Font", "Nimbus Sans"],
      ["Weight", "700"],
      ["Style", "Bold"],
      ["Size", "16px"],
      ["Line height", "24px"],
      ["Letter spacing", "0px"],
      ["Horizontal alignment", "Center"],
      ["Vertical alignment", "Middle"],
    ]);
    const result = parseTypography(properties);
    expect(result?.style).toBe("Bold");
    expect(result?.letterSpacing).toBe(0);
    expect(result?.textAlignHorizontal).toBe("Center");
    expect(result?.textAlignVertical).toBe("Middle");
  });

  it("omits Horizontal alignment when the panel doesn't expose it", () => {
    // Confirmed on a real node ("Empresa Inc." heading): only Vertical
    // alignment was present, no Horizontal alignment row at all.
    const properties = new Map([
      ["Font", "Manrope"],
      ["Weight", "700"],
      ["Size", "24px"],
      ["Line height", "32px"],
      ["Vertical alignment", "Middle"],
    ]);
    const result = parseTypography(properties);
    expect(result?.textAlignHorizontal).toBeUndefined();
    expect(result?.textAlignVertical).toBe("Middle");
  });
});
