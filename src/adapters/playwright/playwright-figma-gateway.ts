import { chromium, type Locator, type Page } from "playwright";
import type { FigmaSession, FigmaGateway, FigmaFetchResult } from "../../figma/ports";
import type { CommonStyles, FigmaColor, FigmaPaint, RawFigmaNode, TypographyStyles } from "../../figma/model";

// Medido contra una sesión real: el panel de propiedades ya está resuelto
// ~3ms después del click (no hace falta esperar un render progresivo campo
// por campo). 500ms deja margen amplio sin acumular varios segundos de
// espera por cada campo ausente en un árbol grande.
const FIELD_TIMEOUT_MS = 500;

// Selectores confirmados corriendo contra una sesión real de figma.com
// (ver .env: FIGMA_TEST_CREDENTIAL / FIGMA_TEST_FILE_KEY). El panel real se
// llama "properties-panel" (no "inspect-panel"), las filas del layers panel
// tienen el nodeId como PREFIJO del testid ("{nodeId}-layers-panel-row", no
// "layer-row-{nodeId}"), y los campos de posición/tamaño son inputs cuyo
// valor vive en el atributo `value`, no en textContent. El nombre del nodo
// se lee de la fila del layers panel misma; el tipo, del ícono de esa
// misma fila. Solo se confirmaron los tipos Group/Frame/Instance/Auto
// layout — otros tipos de nodo (Text, Rectangle, Vector...) no se probaron.
const SELECTORS = {
  propertiesPanel: '[data-testid="properties-panel"]',
  layerRow: (nodeId: string) => `[data-testid="objects-panel"] [data-testid="${nodeId}-layers-panel-row"]`,
  layerRowName: '.object_row--rowName--GaDj-',
  layerRowTypeIcon: '[role="img"]',
  positionX: 'input[aria-label="X-position"]',
  positionY: 'input[aria-label="Y-position"]',
  widthHeightRow: '[data-testid="width-height-row"]',
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
      // El layers panel no expone una fila propia para el nodo CANVAS: solo
      // muestra los nodos de nivel superior (frames/groups) de la página
      // activa. No hay forma de leer ese nodo directamente del DOM, así que
      // se sintetiza acá: nombre de la página activa (PagesRowWrapper) más
      // los nodos top-level (menor nivel de indentación entre las filas
      // visibles sin expandir nada) como children.
      const pageName = (await page.locator('[aria-current="page"]').first().textContent()) ?? "";
      const topLevelIds = await this.listTopLevelNodeIds(page);
      if (topLevelIds.length === 0) return { status: "not-found-or-no-access" };

      const children: RawFigmaNode[] = [];
      for (const nodeId of topLevelIds) {
        const child = await this.readNode(page, nodeId);
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

  private async readNode(page: Page, nodeId: string): Promise<RawFigmaNode | null> {
    const row = page.locator(SELECTORS.layerRow(nodeId));
    if ((await row.count()) === 0) return null;
    await row.click();

    const panel = page.locator(SELECTORS.propertiesPanel);
    // El layout del panel de propiedades varía según el tipo de nodo (Group,
    // Frame, Instance, Text, Vector, nodos con auto-layout Fill/Hug...) y no
    // todos exponen los mismos campos. En vez de esperar cada campo de forma
    // estricta (lo que cuelga el recorrido recursivo apenas aparece un tipo
    // de nodo no mapeado), cada lectura tiene un timeout corto propio y cae
    // a un valor vacío si el campo no está.
    const name = (await row.locator(SELECTORS.layerRowName).textContent()) ?? "";
    const type = (await row.locator(SELECTORS.layerRowTypeIcon).first().getAttribute("aria-label")) ?? "";
    const visible = !(await this.isRowHidden(row));
    const x = await this.readDimension(panel, SELECTORS.positionX);
    const y = await this.readDimension(panel, SELECTORS.positionY);
    const width = await this.readDimension(panel, SELECTORS.width);
    const height = await this.readDimension(panel, SELECTORS.height);
    const styles = await this.readStyles(panel);

    const childIds = await this.expandAndListChildren(page, nodeId);

    const children: RawFigmaNode[] = [];
    for (const childId of childIds) {
      const child = await this.readNode(page, childId);
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

  // La fila entera (no rowContent, que es donde vive el testid) gana una
  // clase con el patrón "object_row--disabled" cuando la capa está oculta en
  // Figma (ícono de visibilidad apagado). Confirmado comparando el HTML de
  // un nodo oculto ("pokeball") contra un hermano visible.
  private async isRowHidden(row: Locator): Promise<boolean> {
    const wrapperClass = await row.evaluate((el) => {
      const wrapper = el.closest('[data-testid="layer-row-with-children"]') ?? el.parentElement;
      return wrapper?.className ?? "";
    });
    return wrapperClass.includes("object_row--disabled");
  }

  // Ni todos los campos (X/Y/width/height) existen para todo tipo de nodo
  // (ver comentario en readNode), ni el panel se re-renderiza de forma
  // perfectamente sincrónica tras el click — por eso la espera corta antes
  // de decidir que el campo no está, en vez de un count() inmediato que
  // podría dar un falso negativo por una carrera de timing. Medido contra
  // una sesión real: el panel completo (incluyendo campos que sí existen)
  // se resuelve en ~3ms tras el click, así que 500ms ya deja margen de
  // sobra sin acercarse al costo de 1.5-3s que tenía antes.
  private async readDimension(panel: Locator, selector: string): Promise<number | null> {
    const input = panel.locator(selector);
    try {
      await input.waitFor({ timeout: FIELD_TIMEOUT_MS });
    } catch {
      return null;
    }
    return parseCssNumber(await input.getAttribute("value"));
  }

  // opacity y corner-radius son inputs directos; fill/stroke/typography
  // viven como secciones "consumed-style-panel" (solo aparecen cuando el
  // nodo tiene un estilo con nombre aplicado — sin eso, la sección no
  // existe en el DOM y queda sin leer). Confirmado corriendo contra una
  // sesión real: la UI de Figma no expone fontFamily/fontWeight como campos
  // separados para un texto con estilo aplicado, solo el nombre del estilo
  // y tamaño/line-height combinados.
  private async readStyles(panel: Locator): Promise<CommonStyles & { typography?: TypographyStyles }> {
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
