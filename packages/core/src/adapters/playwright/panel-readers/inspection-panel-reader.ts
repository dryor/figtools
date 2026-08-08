import type { Locator } from "playwright";
import type { CommonStyles, FigmaColor, FigmaEffect, FigmaPaint, TypographyStyles } from "../../../figma/model";
import type { PanelReader } from "./panel-reader";
import { LayerRowPanelReader } from "./layer-row-panel-reader";

// Confirmed by running against a real session (view-only file, see
// adr/ADR-panel-reader-bridge.md): the inspection panel exposes uniform
// name-value pairs under the same pair of testids, regardless of the
// section (Layout, Typography...). Within the "Layout" section
// (properties-inspection-panel) some property names repeat across
// sub-sections — e.g. "Top" appears both under a "Border" sub-header and
// a separate "Padding" sub-header, each with its own value ("1px" vs
// "16px") — so the sub-header text (inspection_property--subHeader, no
// dedicated testid) has to be tracked alongside each row to tell them
// apart; the property name's text alone isn't a unique key.
//
// Fill and stroke colors don't share a container at all: fill lives in
// "colors-inspection-panel" and stroke in "borders-inspection-panel",
// each with its own [data-testid="inspectColorRow"] — confirmed in a real
// session on a node with both a fill and a stroke applied. Reading the
// first inspectColorRow found anywhere in the panel (the previous
// approach) would silently take whichever section happens to render
// first, not necessarily the fill.
//
// The selectors below with no data-testid (subHeader, shadow*,
// contentValue) originally used an exact CSS-module class
// (".modulo--campo--HASH") — the same kind of selector that already broke
// once elsewhere in this codebase after a Figma deploy regenerated its
// hashes (see layer-row-panel-reader.ts). Switched to a `[class*="..."]`
// prefix match on the stable part of the class name (module + field,
// without the hash suffix): confirmed in a real session that this matches
// the exact same elements as the old exact-class selectors did, and
// survives whatever hash Figma assigns on the next build.
const SELECTORS = {
  propertyRow: '[data-testid="inspectionPropertyRow"]',
  propertyName: '[data-testid="inspectionPropertyName"]',
  propertyValue: '[data-testid="inspectionPropertyValue"]',
  subHeader: '[class*="inspection_property--subHeader"]',
  fillColor: '[data-testid="colors-inspection-panel"] [data-testid="inspectColorRow"]',
  strokeColor: '[data-testid="borders-inspection-panel"] [data-testid="inspectColorRow"]',
  // "Shadows and blurs" doesn't reuse inspectionPropertyRow at all — it's
  // a different sub-tree confirmed on a real node with a drop shadow:
  // effectName (e.g. "Drop shadow"), a row of shadowButton pairs per
  // property (X/Y, then Blur/Spread), and a color row that reuses
  // inspectColorRow plus a sibling span with the opacity percentage.
  shadowsPanel: '[data-testid="shadows-inspection-panel"]',
  shadowName: '[class*="shadows_panel--shadowNameLabel"]',
  shadowButton: '[class*="shadows_panel--shadowButton"]',
  shadowLabel: '[class*="shadows_panel--shadowPropertyLabel"]',
  shadowValue: '[class*="shadows_panel--shadowValue"]',
  // Scoped inside shadowsPanel by the caller, so this reuses the same
  // inspectColorRow testid as fill/stroke without colliding with them.
  colorRow: '[data-testid="inspectColorRow"]',
  // A TEXT node's literal content lives in its own panel, separate from
  // "Layout" and "Typography" — confirmed on a real TEXT node ("Content"
  // section). Unlike the rest of the panel, its value isn't wrapped in an
  // inspectionPropertyRow/Name/Value triplet with a testid — it's a single
  // div holding the raw text, identified by its own CSS-module class.
  contentPanel: '[data-testid="content-inspection-panel"]',
  contentValue: '[class*="view_only_design_properties_panel--contentProperty"]',
};

// Composite key so a property name that repeats across sub-sections
// ("Top" under "Border" vs. under "Padding") doesn't collide. Rows with no
// sub-header keep their name as-is — none of the flat names already read
// here (Width, Height, Opacity, Radius, Font, Name, Weight, Size,
// Line height) live under a sub-header, so this doesn't change how they're
// looked up.
export function propertyKey(section: string | null, name: string): string {
  return section ? `${section}:${name}` : name;
}

// Border weight is exposed in two different shapes depending on whether
// the stroke is uniform or not — both confirmed on real nodes:
//  - Uniform on all 4 sides: a single flat row named "Border" (no
//    sub-header, same shape as "Radius"/"Opacity").
//  - Asymmetric: a "Border" sub-header followed by one row per side that
//    has a stroke ("Top", "Left"...), each under key "Border:<side>".
// This checks the flat name first, then falls back to any row under the
// "Border" section — there's only ever one child row observed under that
// sub-header in the nodes explored (a single side), even though Figma
// could in principle expose more than one asymmetric side at once.
export function firstValueInSection(properties: Map<string, string>, section: string): string | undefined {
  const flat = properties.get(section);
  if (flat !== undefined) return flat;
  const prefix = `${section}:`;
  for (const [key, value] of properties) {
    if (key.startsWith(prefix)) return value;
  }
  return undefined;
}

// "Gap" doesn't reliably close whatever sub-header preceded it — confirmed
// on a real node where the row sequence was Flow/Width/Height, a "Padding"
// sub-header, its "Bottom" row, and then "Gap" with no sub-header reset in
// between, so "Gap" ends up keyed as "Padding:Gap" rather than a flat
// "Gap". A node with no sub-header rendered before it would keep "Gap"
// flat instead. This looks for a key that is exactly "Gap" or ends in
// ":Gap", regardless of which section (if any) it landed under.
export function valueByPropertyName(properties: Map<string, string>, name: string): string | undefined {
  const flat = properties.get(name);
  if (flat !== undefined) return flat;
  const suffix = `:${name}`;
  for (const [key, value] of properties) {
    if (key.endsWith(suffix)) return value;
  }
  return undefined;
}

export class InspectionPanelReader extends LayerRowPanelReader implements PanelReader {
  // Confirmed by running against a real session, on root-level nodes,
  // nested ones with auto-layout, instances, and free shapes (rectangle):
  // the inspection panel never exposes X/Y in any tested case — only
  // Width/Height. Always null until a real node is found where it does
  // appear.
  async readPosition(_panel: Locator): Promise<{ x: number | null; y: number | null }> {
    return { x: null, y: null };
  }

  async readSize(panel: Locator): Promise<{ width: number | null; height: number | null }> {
    const properties = await this.readProperties(panel);
    return {
      width: parseFirstNumber(properties.get("Width")),
      height: parseFirstNumber(properties.get("Height")),
    };
  }

  // Font gives a variable/token name (e.g. "font/family/subtitle"), not a
  // literal font name — it's the only data the UI exposes for that field
  // in this mode.
  async readStyles(panel: Locator): Promise<CommonStyles & { typography?: TypographyStyles }> {
    const properties = await this.readProperties(panel);
    const styles: CommonStyles & { typography?: TypographyStyles } = {};

    const flow = valueByPropertyName(properties, "Flow");
    if (flow) styles.flow = flow;

    const widthSizing = parseSizingMode(properties.get("Width"));
    if (widthSizing) styles.widthSizing = widthSizing;
    const heightSizing = parseSizingMode(properties.get("Height"));
    if (heightSizing) styles.heightSizing = heightSizing;

    const opacity = parseFirstNumber(properties.get("Opacity"));
    if (opacity !== null) styles.opacity = opacity;

    // The property's real name is "Radius", not "Corner radius" — confirmed
    // in a real session on a node with radius 9999px (a circular avatar):
    // the panel showed a flat "Radius: 9999px" row, and "Corner radius"
    // never matched anything, leaving cornerRadius silently unset.
    const cornerRadius = parseFirstNumber(properties.get("Radius"));
    if (cornerRadius !== null) styles.cornerRadius = cornerRadius;

    const fills = await this.readFills(panel);
    if (fills.length > 0) styles.fills = fills;

    const { strokes, strokeWeight, strokeSide } = await this.readStrokeStyles(panel, properties);
    if (strokeWeight !== undefined) styles.strokeWeight = strokeWeight;
    if (strokeSide !== undefined) styles.strokeSide = strokeSide;
    if (strokes.length > 0) styles.strokes = strokes;

    Object.assign(styles, this.readPaddingStyles(properties));

    const itemSpacing = parseFirstNumber(valueByPropertyName(properties, "Gap"));
    if (itemSpacing !== null) styles.itemSpacing = itemSpacing;

    const effects = await this.readEffects(panel);
    if (effects.length > 0) styles.effects = effects;

    const typography = this.readTypography(properties);
    if (typography) styles.typography = typography;

    return styles;
  }

  private async readFills(panel: Locator): Promise<FigmaPaint[]> {
    const fillLocators = panel.locator(SELECTORS.fillColor);
    const fillCount = await fillLocators.count();
    const fills: FigmaPaint[] = [];
    for (let i = 0; i < fillCount; i++) {
      const text = await fillLocators.nth(i).textContent();
      if (text?.trim()) fills.push({ styleName: null, color: hexToColor(text.trim()) });
    }
    return fills;
  }

  // Uniform border: flat "Border" property (no sub-header, single value).
  // Asymmetric: "Border" sub-header + one row per side → "Border:Right",
  // "Border:Left", etc. Both shapes confirmed on real nodes (see
  // firstValueInSection's comment). Only the first asymmetric side is read.
  private async readStrokeStyles(
    panel: Locator,
    properties: Map<string, string>
  ): Promise<{ strokes: FigmaPaint[]; strokeWeight?: number; strokeSide?: string }> {
    const result: { strokes: FigmaPaint[]; strokeWeight?: number; strokeSide?: string } = { strokes: [] };

    const flatBorder = properties.get("Border");
    if (flatBorder !== undefined) {
      const strokeWeight = parseFirstNumber(flatBorder);
      if (strokeWeight !== null) result.strokeWeight = strokeWeight;
    } else {
      for (const [key, value] of properties) {
        if (key.startsWith("Border:")) {
          const weight = parseFirstNumber(value);
          if (weight !== null) {
            result.strokeWeight = weight;
            result.strokeSide = key.slice("Border:".length);
            break;
          }
        }
      }
    }

    const strokeLocators = panel.locator(SELECTORS.strokeColor);
    const strokeCount = await strokeLocators.count();
    const strokes: FigmaPaint[] = [];
    for (let i = 0; i < strokeCount; i++) {
      const text = await strokeLocators.nth(i).textContent();
      if (text?.trim()) strokes.push({ styleName: null, color: hexToColor(text.trim()) });
    }
    result.strokes = strokes;
    return result;
  }

  // Uniform padding: flat "Padding" property row with a single value.
  // Non-uniform: "Padding" sub-header + individual "Top"/"Right"/... rows.
  // The flat "Padding" key appears when all 4 sides are equal; confirmed on
  // a real node that showed "Padding: 16px" as a single row in the Layout
  // section instead of 4 separate rows.
  // "Padding" for uniform padding doesn't always appear as a flat key —
  // confirmed on a real node where it appeared as "Border:Padding" (i.e.
  // Figma placed the "Padding: 16px" row inside the "Border" sub-header
  // without a dedicated "Padding" sub-header). valueByPropertyName finds
  // it regardless of which sub-header it landed under.
  private readPaddingStyles(
    properties: Map<string, string>
  ): Pick<CommonStyles, "paddingTop" | "paddingRight" | "paddingBottom" | "paddingLeft"> {
    const padding: Pick<CommonStyles, "paddingTop" | "paddingRight" | "paddingBottom" | "paddingLeft"> = {};
    const uniformPadding = parseFirstNumber(valueByPropertyName(properties, "Padding"));
    if (uniformPadding !== null) {
      padding.paddingTop = uniformPadding;
      padding.paddingRight = uniformPadding;
      padding.paddingBottom = uniformPadding;
      padding.paddingLeft = uniformPadding;
    } else {
      const paddingTop = parseFirstNumber(properties.get(propertyKey("Padding", "Top")));
      if (paddingTop !== null) padding.paddingTop = paddingTop;
      const paddingRight = parseFirstNumber(properties.get(propertyKey("Padding", "Right")));
      if (paddingRight !== null) padding.paddingRight = paddingRight;
      const paddingBottom = parseFirstNumber(properties.get(propertyKey("Padding", "Bottom")));
      if (paddingBottom !== null) padding.paddingBottom = paddingBottom;
      const paddingLeft = parseFirstNumber(properties.get(propertyKey("Padding", "Left")));
      if (paddingLeft !== null) padding.paddingLeft = paddingLeft;
    }
    return padding;
  }

  async readCharacters(panel: Locator): Promise<string | null> {
    return this.readTextOrNull(panel.locator(SELECTORS.contentPanel).locator(SELECTORS.contentValue));
  }

  // Confirmed in a real session, on two different hidden TEXT children
  // (see playwright-figma-node-source.ts's readHiddenTextChild): pressing
  // Enter with a parent row selected drills into its TEXT child even when
  // that child never appears in the layers panel tree at all — not even
  // after retrying the normal expand mechanism. Never verified in edit
  // mode, hence this flag instead of assuming every PanelReader supports it.
  supportsHiddenTextChild(): boolean {
    return true;
  }

  // Only single-shadow nodes were confirmed in a real session — Figma
  // allows stacking multiple shadows/blurs, but no node with more than one
  // was found to confirm how the DOM repeats per effect. This reads at
  // most one, from the first shadowsPanel found; extending to multiple
  // effects needs a real node with more than one to confirm the repeated
  // structure first.
  private async readEffects(panel: Locator): Promise<FigmaEffect[]> {
    const section = panel.locator(SELECTORS.shadowsPanel);
    if ((await section.count()) === 0) return [];

    const type = await this.readTextOrNull(section.locator(SELECTORS.shadowName));
    if (!type) return [];

    const values = new Map<string, string>();
    const buttons = section.locator(SELECTORS.shadowButton);
    const count = await buttons.count();
    for (let i = 0; i < count; i++) {
      const button = buttons.nth(i);
      try {
        const label = await button.locator(SELECTORS.shadowLabel).textContent({ timeout: 500 });
        const value = await button.locator(SELECTORS.shadowValue).textContent({ timeout: 500 });
        if (label && value) values.set(label.trim(), value.trim());
      } catch {
        break;
      }
    }

    const colorHex = await this.readTextOrNull(section.locator(SELECTORS.colorRow));
    // The opacity percentage ("5%") is a sibling <span> right after the hex
    // one, sharing the same class but with no testid of its own — confirmed
    // in a real session on a drop shadow with reduced opacity.
    //
    // Known risk, not resolved: this is positional (first following
    // sibling), not anchored to any stable attribute — investigated in a
    // real session without finding one. If Figma ever inserts another
    // element between the hex span and the percentage span, this silently
    // reads nothing (colorAlpha stays null → alpha defaults to 1) rather
    // than throwing, so a future opacity change on a shadow could go
    // unnoticed instead of failing loudly.
    const colorAlpha = await this.readTextOrNull(section.locator(SELECTORS.colorRow).locator("xpath=following-sibling::span[1]"));

    return [
      {
        type,
        x: parseFirstNumber(values.get("X")),
        y: parseFirstNumber(values.get("Y")),
        blur: parseFirstNumber(values.get("Blur")),
        spread: parseFirstNumber(values.get("Spread")),
        color: colorHex ? hexToColor(colorHex, parsePercent(colorAlpha)) : null,
      },
    ];
  }

  private readTypography(properties: Map<string, string>): TypographyStyles | null {
    return parseTypography(properties);
  }

  // The panel re-renders after each row selection, so a count taken once
  // and reused across the loop can go stale mid-iteration (the property
  // rows shrink between two nodes with a different field set) — that left
  // `.nth(i)` waiting up to the default 30s for an index that no longer
  // exists. Each row's read is bounded by a short timeout instead, and a
  // miss is treated as "this row is gone", not a hang.
  //
  // Section tracking: sub-headers ("Border", "Padding") and their rows are
  // siblings in DOM order within the same section container, confirmed in
  // a real session — reading both element types in a single query,
  // in document order, lets each row be paired with whichever sub-header
  // most recently preceded it, without needing a separate lookup per row.
  private async readProperties(panel: Locator): Promise<Map<string, string>> {
    const entries = panel.locator(`${SELECTORS.propertyRow}, ${SELECTORS.subHeader}`);
    const count = await entries.count();
    const properties = new Map<string, string>();
    let currentSection: string | null = null;
    for (let i = 0; i < count; i++) {
      const entry = entries.nth(i);
      try {
        const isSubHeader = await entry.evaluate((el, selector) => el.matches(selector), SELECTORS.subHeader, {
          timeout: 500,
        });
        if (isSubHeader) {
          currentSection = (await entry.textContent({ timeout: 500 }))?.trim() ?? null;
          continue;
        }
        const name = await entry.locator(SELECTORS.propertyName).textContent({ timeout: 500 });
        const value = await entry.locator(SELECTORS.propertyValue).textContent({ timeout: 500 });
        if (name && value) properties.set(propertyKey(currentSection, name.trim()), value.trim());
      } catch {
        break;
      }
    }
    return properties;
  }

  private async readTextOrNull(locator: Locator): Promise<string | null> {
    return (await locator.count()) > 0 ? locator.first().textContent() : null;
  }
}

// Confirmed on a real TEXT node: the panel exposes more than
// Font/Weight/Size/Line height — Style ("Bold"), Letter spacing,
// Horizontal alignment ("Center"), and Vertical alignment ("Middle") are
// all separate flat rows in the same section, previously left unread even
// though the model already declared fields for them. Horizontal alignment
// wasn't present on every text node tested (one showed only Vertical
// alignment) — read as optional/undefined rather than assuming it's
// always there.
export function parseTypography(properties: Map<string, string>): TypographyStyles | null {
  const font = properties.get("Font");
  if (!font) return null;

  const style = properties.get("Style");
  const textAlignHorizontal = properties.get("Horizontal alignment");
  const textAlignVertical = properties.get("Vertical alignment");
  const letterSpacing = parseFirstNumber(properties.get("Letter spacing"));

  return {
    styleName: properties.get("Name") ?? null,
    fontFamily: font,
    fontWeight: parseFirstNumber(properties.get("Weight")),
    fontSize: parseFirstNumber(properties.get("Size")),
    lineHeightPx: parseFirstNumber(properties.get("Line height")),
    ...(style ? { style } : {}),
    ...(textAlignHorizontal ? { textAlignHorizontal } : {}),
    ...(textAlignVertical ? { textAlignVertical } : {}),
    ...(letterSpacing !== null ? { letterSpacing } : {}),
  };
}

// Extracts the sizing mode keyword from strings like "Fixed (280px)",
// "Hug (120px)", or "Fill". Returns null for plain "342px" (no keyword).
function parseSizingMode(text: string | undefined): string | null {
  if (!text) return null;
  if (text.startsWith("Hug")) return "Hug";
  if (text.startsWith("Fill")) return "Fill";
  if (text.startsWith("Fixed")) return "Fixed";
  return null;
}

// Covers "342px", "Fixed (1,440px)", and "Hug (1,153px)" — the first
// number that appears in the text is always the resolved value in pixels.
function parseFirstNumber(text: string | undefined): number | null {
  if (!text) return null;
  const match = text.replace(/,/g, "").match(/-?\d+(\.\d+)?/);
  return match ? parseFloat(match[0]) : null;
}

// Fill/stroke colors don't expose a separate opacity percentage in the
// panel (confirmed: only the shadow color row does), so `alpha` defaults
// to full opacity unless the caller reads one.
function hexToColor(hex: string, alpha = 1): FigmaColor {
  const clean = hex.replace("#", "").toUpperCase();
  return { hex: `#${clean}`, a: alpha };
}

function parsePercent(text: string | null): number {
  if (!text) return 1;
  const match = text.match(/(\d+(?:\.\d+)?)%/);
  return match ? parseFloat(match[1]) / 100 : 1;
}
