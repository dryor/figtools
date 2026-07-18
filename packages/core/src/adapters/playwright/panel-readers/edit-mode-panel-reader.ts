import type { Locator } from "playwright";
import type { CommonStyles, FigmaColor, FigmaPaint, TypographyStyles } from "../../../figma/model";
import type { PanelReader } from "./panel-reader";
import { LayerRowPanelReader } from "./layer-row-panel-reader";

// Medido contra una sesión real: el panel de propiedades ya está resuelto
// ~3ms después del click. 500ms deja margen amplio sin acumular varios
// segundos de espera por cada campo ausente en un árbol grande.
const FIELD_TIMEOUT_MS = 500;

// Selectores confirmados corriendo contra una sesión real de figma.com. Las
// filas del layers panel tienen el nodeId como PREFIJO del testid
// ("{nodeId}-layers-panel-row"), y los campos de posición/tamaño son inputs
// cuyo valor vive en el atributo `value`, no en textContent. Solo se
// confirmaron los tipos Group/Frame/Instance/Auto layout — otros tipos de
// nodo (Text, Rectangle, Vector...) no se probaron.
const SELECTORS = {
  positionX: 'input[aria-label="X-position"]',
  positionY: 'input[aria-label="Y-position"]',
  width: '[data-testid="transform-width"]',
  height: '[data-testid="transform-height"]',
  opacity: '[data-testid="layer-opacity-input"]',
  cornerRadius: '[data-testid="transform-corner-radius"]',
  // Fill, Stroke y Typography usan el mismo componente colapsado
  // (consumed-style-panel) cuando el nodo tiene un estilo con nombre
  // aplicado — se distinguen por el texto de su <h2> ("Fill"/"Stroke"/
  // "Typography"). El color real está en el SVG del ícono de estilo, no
  // como texto.
  consumedStylePanel: '[data-testid="consumed-style-panel"]',
  styleName: '[class*="textStyleTitleName"]',
  styleTag: '[class*="styleTag"]',
  styleColorCircle: '[data-testid="svg-circle"] circle',
};

export class EditModePanelReader extends LayerRowPanelReader implements PanelReader {
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

  // opacity y corner-radius son inputs directos; fill/stroke/typography
  // viven como secciones "consumed-style-panel" (solo aparecen cuando el
  // nodo tiene un estilo con nombre aplicado — sin eso, la sección no
  // existe en el DOM y queda sin leer). Confirmado corriendo contra una
  // sesión real: la UI de Figma no expone fontFamily/fontWeight como campos
  // separados para un texto con estilo aplicado, solo el nombre del estilo
  // y tamaño/line-height combinados.
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

  // Ni todos los campos (X/Y/width/height) existen para todo tipo de nodo,
  // ni el panel se re-renderiza de forma perfectamente sincrónica tras el
  // click — por eso la espera corta antes de decidir que el campo no está,
  // en vez de un count() inmediato que podría dar un falso negativo por una
  // carrera de timing.
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

  // consumed-style-panel se repite una vez por sección (Fill, Stroke,
  // Typography); se identifica por el texto de su <h2>.
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
    // El tag combina tamaño de fuente y line-height como " · 8/12".
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

function parseRgbaColor(fill: string | null): FigmaColor | null {
  if (!fill) return null;
  const match = fill.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)/);
  if (!match) return null;
  return {
    r: parseInt(match[1], 10),
    g: parseInt(match[2], 10),
    b: parseInt(match[3], 10),
    a: match[4] !== undefined ? parseFloat(match[4]) : 1,
  };
}
