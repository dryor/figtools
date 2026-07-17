import type { RawFigmaNode, FigmaNode, FigmaPage, FigmaScrapeResult } from "./model";

function toFigmaNode(raw: RawFigmaNode): FigmaNode {
  return {
    id: raw.id,
    name: raw.name,
    type: raw.type,
    position: raw.position,
    size: raw.size,
    styles: raw.styles,
    image: raw.image,
    children: raw.children.map(toFigmaNode),
  };
}

// Una página es, en los datos reales de Figma, un nodo type "CANVAS": sus
// children pasan a ser los nodos de nivel superior de la página.
export function resolve(raw: RawFigmaNode): FigmaScrapeResult {
  if (raw.type === "CANVAS") {
    const page: FigmaPage = {
      id: raw.id,
      name: raw.name,
      nodes: raw.children.map(toFigmaNode),
    };
    return page;
  }
  return toFigmaNode(raw);
}
