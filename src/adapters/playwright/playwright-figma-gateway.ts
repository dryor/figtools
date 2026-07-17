import { chromium, type Page } from "playwright";
import type { FigmaSession, FigmaGateway, FigmaFetchResult } from "../../figma/ports";
import type { RawFigmaNode } from "../../figma/model";

// UNCONFIRMED: no se pudo inspeccionar el DOM real de Figma desde este
// entorno (sin red hacia figma.com). Esta es la primera implementación de
// FigmaGateway: lee el panel de Inspect, que solo existe con sesión (por
// eso el core siempre requiere login, ver ADR). Los selectores de acá son
// el punto de partida a corregir contra la app real. El puerto está
// diseñado justo para que otro adapter (ej. uno que intercepte red) pueda
// reemplazar a este sin tocar el core.
const SELECTORS = {
  inspectPanel: '[data-testid="inspect-panel"]',
  layerRow: (nodeId: string) => `[data-testid="layer-row-${nodeId}"]`,
  layerChildRows: (nodeId: string) => `[data-testid="layer-row-${nodeId}"] [data-testid="layer-row"]`,
  nodeName: '[data-testid="inspect-node-name"]',
  nodeType: '[data-testid="inspect-node-type"]',
  positionX: '[data-testid="inspect-x"]',
  positionY: '[data-testid="inspect-y"]',
  width: '[data-testid="inspect-width"]',
  height: '[data-testid="inspect-height"]',
};

export class PlaywrightFigmaGateway implements FigmaGateway {
  async fetchNode(fileKey: string, nodeId: string, session: FigmaSession): Promise<FigmaFetchResult<RawFigmaNode>> {
    const url = `https://www.figma.com/design/${fileKey}?node-id=${nodeId.replace(":", "-")}`;
    return this.withPage(session, url, async (page) => {
      const node = await this.readNode(page, nodeId);
      return node ? { status: "ok", value: node } : { status: "not-found-or-no-access" };
    });
  }

  async fetchDefaultPage(fileKey: string, session: FigmaSession): Promise<FigmaFetchResult<RawFigmaNode>> {
    const url = `https://www.figma.com/design/${fileKey}`;
    return this.withPage(session, url, async (page) => {
      const pageNodeId = await page.locator('[data-testid="layer-row"]').first().getAttribute("data-node-id");
      if (!pageNodeId) return { status: "not-found-or-no-access" };
      const node = await this.readNode(page, pageNodeId);
      return node ? { status: "ok", value: node } : { status: "not-found-or-no-access" };
    });
  }

  private async withPage(
    session: FigmaSession,
    url: string,
    run: (page: Page) => Promise<FigmaFetchResult<RawFigmaNode>>
  ): Promise<FigmaFetchResult<RawFigmaNode>> {
    const browser = await chromium.launch({ headless: true });
    try {
      const context = await browser.newContext();
      await context.addCookies(JSON.parse(session.credential));
      const page = await context.newPage();

      const response = await page.goto(url);
      if (response && (response.status() === 401 || response.status() === 403)) {
        return { status: "session-expired" };
      }
      if (response && response.status() === 404) {
        return { status: "not-found-or-no-access" };
      }

      await page.waitForSelector(SELECTORS.inspectPanel);
      return await run(page);
    } finally {
      await browser.close();
    }
  }

  private async readNode(page: Page, nodeId: string): Promise<RawFigmaNode | null> {
    const row = page.locator(SELECTORS.layerRow(nodeId));
    if ((await row.count()) === 0) return null;
    await row.click();

    const panel = page.locator(SELECTORS.inspectPanel);
    const name = (await panel.locator(SELECTORS.nodeName).textContent()) ?? "";
    const type = (await panel.locator(SELECTORS.nodeType).textContent()) ?? "";
    const x = parseCssNumber(await panel.locator(SELECTORS.positionX).textContent());
    const y = parseCssNumber(await panel.locator(SELECTORS.positionY).textContent());
    const width = parseCssNumber(await panel.locator(SELECTORS.width).textContent());
    const height = parseCssNumber(await panel.locator(SELECTORS.height).textContent());

    const childIds = await page
      .locator(SELECTORS.layerChildRows(nodeId))
      .evaluateAll((els) => els.map((el) => el.getAttribute("data-node-id")));

    const children: RawFigmaNode[] = [];
    for (const childId of childIds) {
      if (!childId) continue;
      const child = await this.readNode(page, childId);
      if (child) children.push(child);
    }

    return {
      id: nodeId,
      name,
      type,
      position: { x, y },
      size: { width, height },
      // El Inspect panel también muestra fills/strokes/tipografía; falta
      // mapear cada campo de CommonStyles/TypographyStyles a su selector.
      styles: {},
      // Requiere la API de export de imágenes de Figma; ese flujo nunca se
      // diseñó, así que queda sin resolver por ahora.
      image: null,
      children,
    };
  }
}

function parseCssNumber(text: string | null): number {
  if (!text) return 0;
  const match = text.match(/-?\d+(\.\d+)?/);
  return match ? parseFloat(match[0]) : 0;
}
