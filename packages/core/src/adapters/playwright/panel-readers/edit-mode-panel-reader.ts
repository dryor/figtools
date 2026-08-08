import type { Locator } from "playwright";
import type { CommonStyles, FigmaColor, FigmaPaint, TypographyStyles } from "../../../figma/model";
import type { PanelReader } from "./panel-reader";
import { LayerRowPanelReader } from "./layer-row-panel-reader";

// Measured against a real session: the properties panel is already
// settled ~3ms after the click. 500ms leaves wide margin without piling
// up several seconds of waiting per missing field on a large tree.
const FIELD_TIMEOUT_MS = 500;

// Selectors confirmed by running against a real figma.com session. Layers
// panel rows have the nodeId as a PREFIX of the testid
// ("{nodeId}-layers-panel-row"), and position/size fields are inputs whose
// value lives in the `value` attribute, not in textContent. Only the
// Group/Frame/Instance/Auto layout types were confirmed — other node types
// (Text, Rectangle, Vector...) weren't tested.
const SELECTORS = {
  positionX: 'input[aria-label="X-position"]',
  positionY: 'input[aria-label="Y-position"]',
  width: '[data-testid="transform-width"]',
  height: '[data-testid="transform-height"]',
  opacity: '[data-testid="layer-opacity-input"]',
  cornerRadius: '[data-testid="transform-corner-radius"]',
  // Fill, Stroke, and Typography use the same collapsed component
  // (consumed-style-panel) when the node has a named style applied —
  // they're told apart by their <h2> text ("Fill"/"Stroke"/"Typography").
  // The actual color lives in the style icon's SVG, not as text.
  consumedStylePanel: '[data-testid="consumed-style-panel"]',
  // `[class*="..."]` prefix match on the stable part of the CSS-module
  // class name, ignoring the build hash suffix — this was already the
  // right pattern here before the same fix was generalized to the hashed
  // classes found in inspection-panel-reader.ts.
  styleName: '[class*="textStyleTitleName"]',
  styleTag: '[class*="styleTag"]',
  styleColorCircle: '[data-testid="svg-circle"] circle',
};

export class EditModePanelReader extends LayerRowPanelReader implements PanelReader {
  // Not implemented: edit mode's DOM (form inputs with a `value` attribute)
  // shares no selectors with inspection mode's "Content" panel, and no
  // editor-permission session was available to discover its own selector
  // for a TEXT node's content. See adr/ADR-pending-decisions.md.
  async readCharacters(_panel: Locator): Promise<string | null> {
    return null;
  }

  // The Enter/Escape drill-down for hidden TEXT children (see
  // InspectionPanelReader.supportsHiddenTextChild) was only confirmed in
  // inspection mode — same gap as readCharacters above: no editor-permission
  // session was available to verify whether it behaves the same way here.
  supportsHiddenTextChild(): boolean {
    return false;
  }

  async readPosition(panel: Locator): Promise<{ x: number | null; y: number | null }> {
    const x = await this.readDimension(panel, SELECTORS.positionX);
    const y = await this.readDimension(panel, SELECTORS.positionY);
    return { x, y };
  }

  async readSize(panel: Locator): Promise<{ width: number | null; height: number | null }> {
    const width = await this.readDimension(panel, SELECTORS.width);
    const height = await this.readDimension(panel, SELECTORS.height);
    return { width, height };
  }

  // opacity and corner-radius are direct inputs; fill/stroke/typography
  // live as "consumed-style-panel" sections (they only appear when the
  // node has a named style applied — without that, the section doesn't
  // exist in the DOM and is left unread). Confirmed by running against a
  // real session: Figma's UI doesn't expose fontFamily/fontWeight as
  // separate fields for a text with a style applied, only the style's
  // name and a combined size/line-height.
  async readStyles(panel: Locator): Promise<CommonStyles & { typography?: TypographyStyles }> {
    const styles: CommonStyles & { typography?: TypographyStyles } = {};

    const opacityText = await this.readTextOrNull(panel.locator(SELECTORS.opacity), "value");
    if (opacityText) styles.opacity = parseCssNumber(opacityText) ?? undefined;

    const cornerRadiusText = await this.readTextOrNull(panel.locator(SELECTORS.cornerRadius), "value");
    if (cornerRadiusText) styles.cornerRadius = parseCssNumber(cornerRadiusText) ?? undefined;

    const fill = await this.readConsumedStylePaint(panel, "Fill");
    if (fill) styles.fills = [fill];

    const stroke = await this.readConsumedStylePaint(panel, "Stroke");
    if (stroke) styles.strokes = [stroke];

    const typography = await this.readTypography(panel);
    if (typography) styles.typography = typography;

    return styles;
  }

  // Not every field (X/Y/width/height) exists for every node type, and the
  // panel doesn't re-render perfectly synchronously after the click —
  // that's why there's a short wait before deciding a field is absent,
  // instead of an immediate count() that could give a false negative from
  // a timing race.
  private async readDimension(panel: Locator, selector: string): Promise<number | null> {
    const input = panel.locator(selector);
    try {
      await input.waitFor({ timeout: FIELD_TIMEOUT_MS });
    } catch {
      return null;
    }
    return parseCssNumber(await input.getAttribute("value"));
  }

  private async readTextOrNull(locator: Locator, attribute?: string): Promise<string | null> {
    try {
      await locator.first().waitFor({ timeout: FIELD_TIMEOUT_MS });
    } catch {
      return null;
    }
    return attribute ? locator.first().getAttribute(attribute) : locator.first().textContent();
  }

  // consumed-style-panel repeats once per section (Fill, Stroke,
  // Typography); it's identified by its <h2> text.
  private async findConsumedStyleSection(panel: Locator, sectionTitle: string): Promise<Locator | null> {
    const sections = panel.locator(SELECTORS.consumedStylePanel);
    const count = await sections.count();
    for (let i = 0; i < count; i++) {
      const section = sections.nth(i);
      const title = await section.locator("h2").first().textContent().catch(() => null);
      if (title?.trim() === sectionTitle) return section;
    }
    return null;
  }

  private async readConsumedStylePaint(panel: Locator, sectionTitle: "Fill" | "Stroke"): Promise<FigmaPaint | null> {
    const section = await this.findConsumedStyleSection(panel, sectionTitle);
    if (!section) return null;

    const styleName = await this.readTextOrNull(section.locator(SELECTORS.styleName));
    const fill = await this.readTextOrNull(section.locator(SELECTORS.styleColorCircle), "fill");
    const color = parseRgbaColor(fill);
    if (!color) return null;

    return { styleName, color };
  }

  private async readTypography(panel: Locator): Promise<TypographyStyles | null> {
    const section = await this.findConsumedStyleSection(panel, "Typography");
    if (!section) return null;

    const styleName = await this.readTextOrNull(section.locator(SELECTORS.styleName));
    // The tag combines font size and line-height as " · 8/12".
    const styleTag = await this.readTextOrNull(section.locator(SELECTORS.styleTag));
    const match = styleTag?.match(/(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/);

    return {
      styleName,
      fontFamily: null,
      fontWeight: null,
      fontSize: match ? parseFloat(match[1]) : null,
      lineHeightPx: match ? parseFloat(match[2]) : null,
    };
  }
}

function parseCssNumber(text: string | null): number | null {
  if (!text) return null;
  const match = text.match(/-?\d+(\.\d+)?/);
  return match ? parseFloat(match[0]) : null;
}

function rgbToHex(r: number, g: number, b: number): string {
  return (
    "#" +
    [r, g, b]
      .map((c) => Math.round(c).toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase()
  );
}

function parseRgbaColor(fill: string | null): FigmaColor | null {
  if (!fill) return null;
  const match = fill.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)/);
  if (!match) return null;
  const [, r, g, b, alpha] = match;
  return {
    hex: rgbToHex(parseInt(r, 10), parseInt(g, 10), parseInt(b, 10)),
    a: alpha !== undefined ? parseFloat(alpha) : 1,
  };
}
