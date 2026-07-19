import type { Locator } from "playwright";
import type { CommonStyles, TypographyStyles } from "../../../figma/model";
import type { PanelReader } from "./panel-reader";
import { LayerRowPanelReader } from "./layer-row-panel-reader";

// Confirmed by running against a real session (view-only file, see
// adr/ADR-panel-reader-bridge.md): the inspection panel exposes uniform
// name-value pairs under the same pair of testids, regardless of the
// section (Layout, Typography, Colors...) — unlike the edit panel, there's
// no need to distinguish by section to read each field, only by the
// property name's text.
const SELECTORS = {
  propertyRow: '[data-testid="inspectionPropertyRow"]',
  propertyName: '[data-testid="inspectionPropertyName"]',
  propertyValue: '[data-testid="inspectionPropertyValue"]',
  color: '[data-testid="inspectColorRow"]',
};

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

    const opacity = parseFirstNumber(properties.get("Opacity"));
    if (opacity !== null) styles.opacity = opacity;

    const cornerRadius = parseFirstNumber(properties.get("Corner radius"));
    if (cornerRadius !== null) styles.cornerRadius = cornerRadius;

    const color = await this.readTextOrNull(panel.locator(SELECTORS.color));
    if (color) styles.fills = [{ styleName: null, color: hexToColor(color) }];

    const typography = this.readTypography(properties);
    if (typography) styles.typography = typography;

    return styles;
  }

  private readTypography(properties: Map<string, string>): TypographyStyles | null {
    const font = properties.get("Font");
    if (!font) return null;

    return {
      styleName: properties.get("Name") ?? null,
      fontFamily: font,
      fontWeight: parseFirstNumber(properties.get("Weight")),
      fontSize: parseFirstNumber(properties.get("Size")),
      lineHeightPx: parseFirstNumber(properties.get("Line height")),
    };
  }

  private async readProperties(panel: Locator): Promise<Map<string, string>> {
    const rows = panel.locator(SELECTORS.propertyRow);
    const count = await rows.count();
    const properties = new Map<string, string>();
    for (let i = 0; i < count; i++) {
      const row = rows.nth(i);
      const name = await row.locator(SELECTORS.propertyName).textContent();
      const value = await row.locator(SELECTORS.propertyValue).textContent();
      if (name && value) properties.set(name.trim(), value.trim());
    }
    return properties;
  }

  private async readTextOrNull(locator: Locator): Promise<string | null> {
    return (await locator.count()) > 0 ? locator.first().textContent() : null;
  }
}

// Covers "342px", "Fixed (1,440px)", and "Hug (1,153px)" — the first
// number that appears in the text is always the resolved value in pixels.
function parseFirstNumber(text: string | undefined): number | null {
  if (!text) return null;
  const match = text.replace(/,/g, "").match(/-?\d+(\.\d+)?/);
  return match ? parseFloat(match[0]) : null;
}

function hexToColor(hex: string): { r: number; g: number; b: number; a: number } {
  const clean = hex.replace("#", "");
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
    a: 1,
  };
}
