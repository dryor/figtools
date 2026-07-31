import type { RawFigmaNode, FigmaNode, FigmaPage, FigmaScrapeResult } from "./model";

function toFigmaNode(raw: RawFigmaNode): FigmaNode {
  return {
    id: raw.id,
    name: raw.name,
    type: raw.type,
    position: raw.position,
    size: raw.size,
    visible: raw.visible,
    styles: raw.styles,
    image: raw.image,
    characters: raw.characters,
    children: raw.children.map(toFigmaNode),
  };
}

// A page is, in Figma's real data, a node of type "CANVAS": its children
// become the page's top-level nodes.
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
