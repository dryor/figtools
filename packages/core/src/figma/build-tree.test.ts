import { describe, it, expect } from "vitest";
import { resolve } from "./build-tree";
import type { RawFigmaNode, FigmaNode, FigmaPage } from "./model";

describe("build-tree: resolve", () => {
  it("maps a node that isn't a page to FigmaNode, preserving type, position, size, and children hierarchy", () => {
    const raw: RawFigmaNode = {
      id: "1:1", name: "Button", type: "COMPONENT",
      position: { x: 1, y: 2 }, size: { width: 10, height: 20 },
      visible: true, styles: {}, image: null,
      children: [
        { id: "1:2", name: "Label", type: "TEXT", position: { x: 0, y: 0 }, size: { width: 1, height: 1 }, visible: true, styles: {}, image: null, children: [] },
      ],
    };

    const result = resolve(raw) as FigmaNode;

    expect(result).not.toHaveProperty("nodes");
    expect(result.id).toBe("1:1");
    expect(result.type).toBe("COMPONENT");
    expect(result.children).toHaveLength(1);
    expect(result.children[0].id).toBe("1:2");
  });

  it("cuando el type es CANVAS, arma un FigmaPage cuyos nodes son los children del nodo crudo", () => {
    const raw: RawFigmaNode = {
      id: "0:1", name: "Page 1", type: "CANVAS",
      position: { x: 0, y: 0 }, size: { width: 0, height: 0 },
      visible: true, styles: {}, image: null,
      children: [
        { id: "1:10", name: "Frame A", type: "FRAME", position: { x: 0, y: 0 }, size: { width: 10, height: 10 }, visible: true, styles: {}, image: null, children: [] },
        { id: "1:20", name: "Frame B", type: "FRAME", position: { x: 0, y: 20 }, size: { width: 10, height: 10 }, visible: true, styles: {}, image: null, children: [] },
      ],
    };

    const result = resolve(raw) as FigmaPage;

    expect(result).toHaveProperty("nodes");
    expect(result.id).toBe("0:1");
    expect(result.name).toBe("Page 1");
    expect(result.nodes).toHaveLength(2);
    expect(result.nodes.map((n) => n.id)).toEqual(["1:10", "1:20"]);
  });
});
