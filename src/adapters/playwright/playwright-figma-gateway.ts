import { chromium } from "playwright";
import type { FigmaSession, FigmaGateway, FigmaFetchResult } from "../../figma/ports";
import type { RawFigmaNode } from "../../figma/model";

// Especulativo: no se pudo confirmar contra Figma real (sin acceso de red en
// este entorno). Figma dibuja el diseño en <canvas>, no hay árbol DOM con los
// datos, así que se intercepta la respuesta de red que carga el documento en
// vez de leer el DOM. El patrón de URL y la forma del JSON son una suposición
// basada en el schema de la REST API oficial (ver ADR) — hay que confirmarlos
// contra tráfico real antes de confiar en este archivo.
const FIGMA_DOCUMENT_RESPONSE = /figma\.com\/(api|graphql)\//;

export class PlaywrightFigmaGateway implements FigmaGateway {
  async fetchNode(nodeId: string, session: FigmaSession): Promise<FigmaFetchResult<RawFigmaNode>> {
    const url = `https://www.figma.com/design/x?node-id=${nodeId.replace(":", "-")}`;
    return this.fetchDocument(url, session, (document) => findNodeById(document, nodeId));
  }

  async fetchDefaultPage(fileKey: string, session: FigmaSession): Promise<FigmaFetchResult<RawFigmaNode>> {
    const url = `https://www.figma.com/design/${fileKey}`;
    return this.fetchDocument(url, session, (document) => firstPage(document));
  }

  private async fetchDocument(
    url: string,
    session: FigmaSession,
    extract: (document: unknown) => RawFigmaNode | null
  ): Promise<FigmaFetchResult<RawFigmaNode>> {
    const browser = await chromium.launch({ headless: true });
    try {
      const context = await browser.newContext();
      await context.addCookies(JSON.parse(session.credential));
      const page = await context.newPage();

      const responsePromise = page.waitForResponse((res) => FIGMA_DOCUMENT_RESPONSE.test(res.url()));
      const [response] = await Promise.all([responsePromise, page.goto(url)]);

      if (response.status() === 401 || response.status() === 403) {
        return { status: "session-expired" };
      }
      if (response.status() === 404) {
        return { status: "not-found-or-no-access" };
      }

      const document = await response.json();
      const node = extract(document);
      return node ? { status: "ok", value: node } : { status: "not-found-or-no-access" };
    } finally {
      await browser.close();
    }
  }
}

function findNodeById(document: any, nodeId: string): RawFigmaNode | null {
  const stack = [document?.document ?? document];
  while (stack.length > 0) {
    const node = stack.pop();
    if (!node) continue;
    if (node.id === nodeId) return toRawFigmaNode(node);
    stack.push(...(node.children ?? []));
  }
  return null;
}

function firstPage(document: any): RawFigmaNode | null {
  const page = (document?.document ?? document)?.children?.[0];
  return page ? toRawFigmaNode(page) : null;
}

function toRawFigmaNode(node: any): RawFigmaNode {
  const box = node.absoluteBoundingBox ?? { x: 0, y: 0, width: 0, height: 0 };
  return {
    id: node.id,
    name: node.name,
    type: node.type,
    position: { x: box.x, y: box.y },
    size: { width: box.width, height: box.height },
    styles: {
      fills: node.fills,
      strokes: node.strokes,
      strokeWeight: node.strokeWeight,
      cornerRadius: node.cornerRadius,
      effects: node.effects,
      opacity: node.opacity,
      blendMode: node.blendMode,
      typography: node.style
        ? {
            fontFamily: node.style.fontFamily,
            fontWeight: node.style.fontWeight,
            fontSize: node.style.fontSize,
            textAlignHorizontal: node.style.textAlignHorizontal,
            textAlignVertical: node.style.textAlignVertical,
            letterSpacing: node.style.letterSpacing,
            lineHeightPx: node.style.lineHeightPx,
            lineHeightPercent: node.style.lineHeightPercent,
            textCase: node.style.textCase,
            textDecoration: node.style.textDecoration,
          }
        : undefined,
    },
    // Requiere una llamada aparte a la API de export de imágenes de Figma;
    // ese flujo nunca se diseñó, así que queda sin resolver por ahora.
    image: null,
    children: (node.children ?? []).map(toRawFigmaNode),
  };
}
