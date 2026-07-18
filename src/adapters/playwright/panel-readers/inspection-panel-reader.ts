import type { Locator } from "playwright";
import type { CommonStyles, TypographyStyles } from "../../../figma/model";
import type { PanelReader } from "./panel-reader";
import { LayerRowPanelReader } from "./layer-row-panel-reader";

// Confirmado corriendo contra una sesión real (archivo de solo view, ver
// adr/ADR-panel-reader-bridge.md): el panel de inspección expone pares
// nombre-valor uniformes bajo el mismo par de testids, sin importar la
// sección (Layout, Typography, Colors...) — a diferencia del panel de
// edición, no hace falta distinguir por sección para leer cada campo, solo
// por el texto del nombre de la propiedad.
const SELECTORS = {
  propertyRow: '[data-testid="inspectionPropertyRow"]',
  propertyName: '[data-testid="inspectionPropertyName"]',
  propertyValue: '[data-testid="inspectionPropertyValue"]',
  color: '[data-testid="inspectColorRow"]',
};

export class InspectionPanelReader extends LayerRowPanelReader implements PanelReader {
  // Confirmado corriendo contra una sesión real, en nodos de nivel raíz,
  // anidados con auto-layout, instancias y formas libres (rectángulo): el
  // panel de inspección no expone X/Y en ningún caso probado — solo
  // Width/Height. Siempre null hasta encontrar un nodo real donde sí
  // aparezca.
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

  // Font da un nombre de variable/token (ej. "font/family/subtitle"), no un
  // nombre de fuente literal — es el único dato que la UI expone para ese
  // campo en este modo.
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

// Cubre "342px", "Fixed (1,440px)" y "Hug (1,153px)" — el primer número que
// aparece en el texto es siempre el valor resuelto en píxeles.
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
