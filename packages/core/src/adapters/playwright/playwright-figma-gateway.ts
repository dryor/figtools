import { chromium, type Page } from "playwright";
import type { FigmaSession, FigmaGateway, FigmaFetchResult } from "../../figma/ports";
import type { RawFigmaNode } from "../../figma/model";
import type { PanelReader } from "./panel-readers/panel-reader";
import { detectPanelMode } from "./panel-readers/detect-panel-mode";
import { createPanelReader } from "./panel-readers/create-panel-reader";

// Selectores confirmados corriendo contra una sesión real de figma.com
// (ver .env: FIGMA_TEST_CREDENTIAL / FIGMA_TEST_FILE_KEY, y
// FIGMA_TEST_VIEW_* para modo inspección). Las filas del layers panel
// tienen el nodeId como PREFIJO del testid ("{nodeId}-layers-panel-row").
// Los selectores propios de cada modo de panel viven en panel-readers/ (ver
// adr/ADR-panel-reader-bridge.md).
const SELECTORS = {
  layerRow: (nodeId: string) => `[data-testid="objects-panel"] [data-testid="${nodeId}-layers-panel-row"]`,
};

export class PlaywrightFigmaGateway implements FigmaGateway {
  async fetchNode(fileKey: string, nodeId: string, session: FigmaSession): Promise<FigmaFetchResult<RawFigmaNode>> {
    const url = `https://www.figma.com/design/${fileKey}?node-id=${nodeId.replace(":", "-")}`;
    return this.withPage(session, url, async (page) => {
      const readTree = await this.startReading(page, nodeId);
      if (!readTree) return { status: "incomplete-node-data" };

      const node = await readTree(nodeId);
      return node ? { status: "ok", value: node } : { status: "not-found-or-no-access" };
    });
  }

  async fetchDefaultPage(fileKey: string, session: FigmaSession): Promise<FigmaFetchResult<RawFigmaNode>> {
    const url = `https://www.figma.com/design/${fileKey}`;
    return this.withPage(session, url, async (page) => {
      // El layers panel no expone una fila propia para el nodo CANVAS: solo
      // muestra los nodos de nivel superior (frames/groups) de la página
      // activa. No hay forma de leer ese nodo directamente del DOM, así que
      // se sintetiza acá: nombre de la página activa (PagesRowWrapper) más
      // los nodos top-level (menor nivel de indentación entre las filas
      // visibles sin expandir nada) como children.
      const pageName = (await page.locator('[aria-current="page"]').first().textContent()) ?? "";
      const topLevelIds = await this.listTopLevelNodeIds(page);
      if (topLevelIds.length === 0) return { status: "not-found-or-no-access" };

      const readTree = await this.startReading(page, topLevelIds[0]);
      if (!readTree) return { status: "incomplete-node-data" };

      const children: RawFigmaNode[] = [];
      for (const nodeId of topLevelIds) {
        const child = await readTree(nodeId);
        if (child) children.push(child);
      }

      return {
        status: "ok",
        value: {
          id: fileKey,
          name: pageName,
          type: "CANVAS",
          // El nodo CANVAS es sintético (ver comentario arriba): no hay
          // posición/tamaño real que leer del DOM para él.
          position: { x: null, y: null },
          size: { width: null, height: null },
          visible: true,
          styles: {},
          image: null,
          children,
        },
      };
    });
  }

  // El panel de propiedades no existe hasta que se selecciona un nodo real —
  // detectPanelMode no tiene nada que inspeccionar antes del primer click
  // (confirmado: fetchDefaultPage sin este orden devolvía "none" siempre,
  // aunque el archivo sí tuviera un panel disponible). Por eso se clickea el
  // nodo semilla acá, se detecta el modo recién con eso en pantalla, y el
  // PanelReader resultante se reutiliza para el resto del árbol — el modo no
  // cambia entre nodos de una misma página cargada.
  private async startReading(
    page: Page,
    seedNodeId: string
  ): Promise<((nodeId: string) => Promise<RawFigmaNode | null>) | null> {
    const seedRow = page.locator(SELECTORS.layerRow(seedNodeId));
    if ((await seedRow.count()) === 0) return null;
    await seedRow.click();

    const mode = await detectPanelMode({ hasSelector: (selector) => this.hasSelector(page, selector) });
    if (mode === "none") return null;

    const reader = createPanelReader(mode);
    return (nodeId: string) => this.readNode(page, nodeId, reader);
  }

  private async hasSelector(page: Page, selector: string): Promise<boolean> {
    return (await page.locator(`[data-testid="${selector}"]`).count()) > 0;
  }

  private async listTopLevelNodeIds(page: Page): Promise<string[]> {
    return page.evaluate(() => {
      const objectsPanel = document.querySelector('[data-testid="objects-panel"]');
      if (!objectsPanel) return [];
      const wrappers = Array.from(objectsPanel.querySelectorAll('[style*="translate3d"]')).filter((w) =>
        w.querySelector(':scope > [data-testid$="-layers-panel-row"]')
      ) as HTMLElement[];

      const rows = wrappers.map((w) => {
        const content = w.querySelector(':scope > [data-testid$="-layers-panel-row"]') as HTMLElement;
        const testid = content.getAttribute("data-testid") ?? "";
        const indents = content.querySelectorAll(".object_row--indent--ZzXY2").length;
        return { testid, indents };
      });
      if (rows.length === 0) return [];

      const minIndent = Math.min(...rows.map((r) => r.indents));
      return rows
        .filter((r) => r.indents === minIndent)
        .map((r) => r.testid.replace(/-layers-panel-row$/, ""));
    });
  }

  private async withPage(
    session: FigmaSession,
    url: string,
    run: (page: Page) => Promise<FigmaFetchResult<RawFigmaNode>>
  ): Promise<FigmaFetchResult<RawFigmaNode>> {
    // headless:true dispara el WAF de Figma (403 "The request could not be
    // satisfied" vía CloudFront) aun con cookies de sesión válidas; en
    // headed la misma sesión responde 200. Confirmado corriendo ambos modos
    // contra una sesión real.
    const browser = await chromium.launch({ headless: false });
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

      // properties-panel existe en el DOM incluso sin selección; lo que
      // marca que el archivo terminó de cargar es que el layers panel ya
      // tiene al menos una fila.
      await page.waitForSelector('[data-testid$="-layers-panel-row"]');
      return await run(page);
    } finally {
      await browser.close();
    }
  }

  private async readNode(page: Page, nodeId: string, reader: PanelReader): Promise<RawFigmaNode | null> {
    const row = page.locator(SELECTORS.layerRow(nodeId));
    if ((await row.count()) === 0) return null;
    await row.click();

    const panel = page.locator('[data-testid="properties-panel"]');
    const name = await reader.readName(row);
    const type = await reader.readType(row);
    const visible = await reader.readVisible(row);
    const { x, y } = await reader.readPosition(panel);
    const { width, height } = await reader.readSize(panel);
    const styles = await reader.readStyles(panel);

    const childIds = await this.expandAndListChildren(page, nodeId);

    const children: RawFigmaNode[] = [];
    for (const childId of childIds) {
      const child = await this.readNode(page, childId, reader);
      if (child) children.push(child);
    }

    return {
      id: nodeId,
      name,
      type,
      position: { x, y },
      size: { width, height },
      visible,
      styles,
      // Requiere la API de export de imágenes de Figma; ese flujo nunca se
      // diseñó, así que queda sin resolver por ahora.
      image: null,
      children,
    };
  }

  // El layers panel está virtualizado: los hijos de un nodo colapsado no
  // existen en el DOM hasta expandirlo, y el caret de expansión solo se
  // vuelve visible/clickeable tras hover sobre la fila (confirmado
  // corriendo contra una sesión real). No hay data-node-id ni jerarquía
  // explícita en el marcado: la única señal de "es hijo directo" es que la
  // fila quede inmediatamente debajo del padre, en orden visual (posición Y
  // del wrapper), con un nivel de indentación exactamente uno mayor que el
  // del padre. Se corta al llegar a la primera fila con indentación menor
  // o igual a la del padre.
  private async expandAndListChildren(page: Page, nodeId: string): Promise<string[]> {
    const row = page.locator(SELECTORS.layerRow(nodeId));
    await row.hover();
    const caret = row.locator('[data-testid="layers-panel-expand-caret"]');
    if ((await caret.count()) === 0) return [];
    await caret.click({ force: true });
    await page.waitForTimeout(300);

    return page.evaluate((currentTestId) => {
      const objectsPanel = document.querySelector('[data-testid="objects-panel"]');
      if (!objectsPanel) return [];
      const wrappers = Array.from(objectsPanel.querySelectorAll('[style*="translate3d"]')).filter((w) =>
        w.querySelector(':scope > [data-testid$="-layers-panel-row"]')
      ) as HTMLElement[];

      const rows = wrappers
        .map((w) => {
          const content = w.querySelector(':scope > [data-testid$="-layers-panel-row"]') as HTMLElement;
          const testid = content.getAttribute("data-testid") ?? "";
          const indents = content.querySelectorAll(".object_row--indent--ZzXY2").length;
          const yMatch = w.style.transform.match(/translate3d\([^,]+,\s*([^,]+)/);
          const y = yMatch ? parseFloat(yMatch[1]) : 0;
          return { testid, indents, y };
        })
        .sort((a, b) => a.y - b.y);

      const parentIndex = rows.findIndex((r) => r.testid === `${currentTestId}-layers-panel-row`);
      if (parentIndex === -1) return [];
      const parentIndents = rows[parentIndex].indents;

      const childIds: string[] = [];
      for (let i = parentIndex + 1; i < rows.length; i++) {
        if (rows[i].indents <= parentIndents) break;
        if (rows[i].indents === parentIndents + 1) {
          childIds.push(rows[i].testid.replace(/-layers-panel-row$/, ""));
        }
      }
      return childIds;
    }, nodeId);
  }
}
