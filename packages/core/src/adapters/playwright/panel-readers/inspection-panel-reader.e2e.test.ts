import { describe, it, expect, beforeAll } from "vitest";
import { PlaywrightFigmaNodeSource } from "../playwright-figma-node-source";
import { canExportAsSvg } from "./figma-asset-capturer";
import { CookieSessionStore } from "../../cookie-session-store";
import type { RawFigmaNode } from "../../../figma/model";

const FILE_KEY = process.env.FIGMA_TEST_FILE_KEY ?? "HThrmBFcF8JMNq4q6d8C4T";
const NODE_ID = process.env.FIGMA_TEST_NODE_ID ?? "2:5";

function findFirst(node: RawFigmaNode, predicate: (n: RawFigmaNode) => boolean): RawFigmaNode | undefined {
  if (predicate(node)) return node;
  for (const child of node.children) {
    const found = findFirst(child, predicate);
    if (found) return found;
  }
  return undefined;
}

function find(node: RawFigmaNode, ...path: string[]): RawFigmaNode {
  let cur = node;
  for (const name of path) {
    const next = cur.children.find((c) => c.name === name);
    if (!next) throw new Error(`Node "${name}" not found under "${cur.name}"`);
    cur = next;
  }
  return cur;
}

function hex({ r, g, b }: { r: number; g: number; b: number }): string {
  return (
    "#" +
    [r, g, b]
      .map((c) => Math.round(c).toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase()
  );
}

let root: RawFigmaNode;

beforeAll(async () => {
  const session = await new CookieSessionStore().getSession();
  if (!session) throw new Error('Sin sesión — corre `figtools login` primero');
  const result = await new PlaywrightFigmaNodeSource().fetchNode(FILE_KEY, NODE_ID, session);
  if (result.status !== "ok") throw new Error(`fetchNode failed: ${result.status}`);
  root = result.value;
}, 10 * 60 * 1000);

describe("Aside - Sidebar Navigation", () => {
  let aside: RawFigmaNode;
  beforeAll(() => {
    aside = find(root, "Aside - Sidebar Navigation");
  });

  it("flow es Vertical", () => expect(aside.styles.flow).toBe("Vertical"));

  it("width es Fixed (280px)", () => {
    expect(aside.styles.widthSizing).toBe("Fixed");
    expect(aside.size.width).toBe(280);
  });

  it("height es Fill (744px)", () => {
    expect(aside.styles.heightSizing).toBe("Fill");
    expect(aside.size.height).toBe(744);
  });

  it("padding uniforme 16px en los 4 lados", () => {
    expect(aside.styles.paddingTop).toBe(16);
    expect(aside.styles.paddingRight).toBe(16);
    expect(aside.styles.paddingBottom).toBe(16);
    expect(aside.styles.paddingLeft).toBe(16);
  });

  it("gap 8px", () => expect(aside.styles.itemSpacing).toBe(8));

  it("fill #F2F3F8", () => {
    expect(aside.styles.fills).toHaveLength(1);
    expect(hex(aside.styles.fills![0].color)).toBe("#F2F3F8");
  });

  it("border solo en el lado derecho, 1px, #E2BDC3", () => {
    expect(aside.styles.strokeSide).toBe("Right");
    expect(aside.styles.strokeWeight).toBe(1);
    expect(hex(aside.styles.strokes![0].color)).toBe("#E2BDC3");
  });
});

describe("Empresa Inc. (hidden TEXT child)", () => {
  let node: RawFigmaNode;
  beforeAll(() => {
    node = find(root, "Aside - Sidebar Navigation", "Margin", "Heading 1", "Empresa Inc.");
  });

  it("type es Text", () => expect(node.type).toContain("Text"));
  it("characters es el texto real", () => expect(node.characters).toBe("Empresa Inc."));

  it("fill #B70050", () => {
    expect(node.styles.fills).toHaveLength(1);
    expect(hex(node.styles.fills![0].color)).toBe("#B70050");
  });

  it("tipografía: Manrope Bold 700, 24px / 32px", () => {
    const t = node.styles.typography!;
    expect(t.fontFamily).toBe("Manrope");
    expect(t.fontWeight).toBe(700);
    expect(t.fontSize).toBe(24);
    expect(t.lineHeightPx).toBe(32);
    expect(t.style).toBe("Bold");
  });
});

describe("imagen y SVG", () => {
  it("Aside has a non-null image Buffer", () => {
    const aside = find(root, "Aside - Sidebar Navigation");
    expect(aside.image).not.toBeNull();
    expect(Buffer.isBuffer(aside.image)).toBe(true);
    expect(aside.image!.length).toBeGreaterThan(0);
  });

  it("a frame node has null svgCode", () => {
    const aside = find(root, "Aside - Sidebar Navigation");
    expect(aside.svgCode).toBeNull();
  });

  it("Empresa Inc. (hidden TEXT) has a non-null image Buffer", () => {
    const empresa = find(
      root,
      "Aside - Sidebar Navigation",
      "Margin",
      "Heading 1",
      "Empresa Inc.",
    );
    expect(empresa.image).not.toBeNull();
    expect(Buffer.isBuffer(empresa.image)).toBe(true);
    expect(empresa.image!.length).toBeGreaterThan(0);
  });

  it("the first SVG-eligible node in the tree has svgCode containing SVG markup", () => {
    const vector = findFirst(root, (n) => canExportAsSvg(n.type));
    if (!vector) {
      console.warn("No SVG-eligible node found in test file — skipping assertion");
      return;
    }
    console.info(`SVG-eligible node: name="${vector.name}" type="${vector.type}" image=${vector.image?.length ?? null} svgCode=${vector.svgCode?.length ?? null}`);
    expect(vector.svgCode).not.toBeNull();
    expect(vector.svgCode).toContain("<svg");
  });
});

describe("Link - Active State: Consultar", () => {
  let node: RawFigmaNode;
  beforeAll(() => {
    node = find(
      root,
      "Aside - Sidebar Navigation",
      "Nav",
      "Link - Active State: Consultar:css-transform",
      "Link - Active State: Consultar",
    );
  });

  it("flow es Horizontal", () => expect(node.styles.flow).toBe("Horizontal"));
  it("height es Hug", () => expect(node.styles.heightSizing).toBe("Hug"));

  it("padding 12px vertical, 16px horizontal", () => {
    expect(node.styles.paddingTop).toBe(12);
    expect(node.styles.paddingRight).toBe(16);
    expect(node.styles.paddingBottom).toBe(12);
    expect(node.styles.paddingLeft).toBe(16);
  });

  it("gap 12px", () => expect(node.styles.itemSpacing).toBe(12));

  it("fill #DD2367", () => {
    expect(node.styles.fills).toHaveLength(1);
    expect(hex(node.styles.fills![0].color)).toBe("#DD2367");
  });

  it("radius 8px", () => expect(node.styles.cornerRadius).toBe(8));
});
