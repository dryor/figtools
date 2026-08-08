import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, readFile, readdir, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { FigmaNode, FigmaScrapeResult } from "@figtools/core";
import { writeAsMarkdownTree } from "./markdown-writer";

function makeNode(overrides: Partial<FigmaNode> & Pick<FigmaNode, "id" | "name">): FigmaNode {
  return {
    type: "Frame",
    position: { x: 0, y: 0 },
    size: { width: 100, height: 100 },
    visible: true,
    styles: {},
    image: null,
    svgCode: null,
    characters: null,
    children: [],
    ...overrides,
  };
}

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), "figtools-cli-markdown-writer-"));
});

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true });
});

describe("writeAsMarkdownTree", () => {
  it("a node with no children is written as a folder with index.md", async () => {
    const leaf = makeNode({ id: "1:1", name: "Header", children: [] });

    await writeAsMarkdownTree("ABC123", leaf, { outputDir: tmpDir });

    const headerDir = join(tmpDir, "ABC123", "header");
    const dirStat = await stat(headerDir);
    expect(dirStat.isDirectory()).toBe(true);

    const indexStat = await stat(join(headerDir, "index.md"));
    expect(indexStat.isFile()).toBe(true);
  });

  it("un nodo con hijos se escribe como una carpeta con su propio index.md", async () => {
    const root: FigmaScrapeResult = makeNode({
      id: "1:1",
      name: "Home Screen",
      children: [makeNode({ id: "1:2", name: "Header", children: [] })],
    });

    await writeAsMarkdownTree("ABC123", root, { outputDir: tmpDir });

    const rootDir = join(tmpDir, "ABC123");
    const rootStat = await stat(rootDir);
    expect(rootStat.isDirectory()).toBe(true);

    const indexContents = await readFile(join(rootDir, "index.md"), "utf8");
    expect(indexContents).toContain("Home Screen");
  });

  it("each child is placed inside its parent node's folder, reflecting the hierarchy", async () => {
    const root: FigmaScrapeResult = makeNode({
      id: "1:1",
      name: "Home Screen",
      children: [
        makeNode({
          id: "1:2",
          name: "Card List",
          children: [makeNode({ id: "1:3", name: "Card", children: [] })],
        }),
      ],
    });

    await writeAsMarkdownTree("ABC123", root, { outputDir: tmpDir });

    const cardListDir = join(tmpDir, "ABC123", "card-list");
    const cardListStat = await stat(cardListDir);
    expect(cardListStat.isDirectory()).toBe(true);

    const cardPath = join(cardListDir, "card", "index.md");
    const cardStat = await stat(cardPath);
    expect(cardStat.isFile()).toBe(true);
  });

  it("el index.md de un nodo con hijos incluye un enlace a cada uno de sus hijos", async () => {
    const root: FigmaScrapeResult = makeNode({
      id: "1:1",
      name: "Home Screen",
      children: [
        makeNode({ id: "1:2", name: "Header", children: [] }),
        makeNode({ id: "1:3", name: "Card List", children: [] }),
      ],
    });

    await writeAsMarkdownTree("ABC123", root, { outputDir: tmpDir });

    const indexContents = await readFile(join(tmpDir, "ABC123", "index.md"), "utf8");
    expect(indexContents).toContain("header/index.md");
    expect(indexContents).toContain("card-list/index.md");
  });

  it("resuelve colisiones de nombre entre hermanos con sufijo [2], [3]...", async () => {
    const root: FigmaScrapeResult = makeNode({
      id: "1:1",
      name: "Row",
      children: [
        makeNode({ id: "1:2", name: "List Item", children: [] }),
        makeNode({ id: "1:3", name: "List Item", children: [] }),
        makeNode({ id: "1:4", name: "List Item", children: [] }),
      ],
    });

    await writeAsMarkdownTree("ABC123", root, { outputDir: tmpDir });

    const rowDir = join(tmpDir, "ABC123");
    const entries = await readdir(rowDir);
    expect(entries).toContain("list-item");
    expect(entries).toContain("list-item-[2]");
    expect(entries).toContain("list-item-[3]");
  });

  it("escribe los archivos de varias URLs en subcarpetas distintas por fileKey", async () => {
    const rootA: FigmaScrapeResult = makeNode({ id: "1:1", name: "Screen A", children: [] });
    const rootB: FigmaScrapeResult = makeNode({ id: "2:1", name: "Screen B", children: [] });

    await writeAsMarkdownTree("AAA111", rootA, { outputDir: tmpDir });
    await writeAsMarkdownTree("BBB222", rootB, { outputDir: tmpDir });

    const entriesA = await readdir(join(tmpDir, "AAA111"));
    const entriesB = await readdir(join(tmpDir, "BBB222"));
    expect(entriesA).toContain("screen-a");
    expect(entriesB).toContain("screen-b");
  });

  it("overwrites existing files with the same name without asking for confirmation", async () => {
    const firstRun = makeNode({ id: "1:1", name: "Header", children: [] });
    await writeAsMarkdownTree("ABC123", firstRun, { outputDir: tmpDir });

    const secondRun = makeNode({ id: "1:1", name: "Header (actualizado)", children: [] });
    await writeAsMarkdownTree("ABC123", secondRun, { outputDir: tmpDir });

    const contents = await readFile(join(tmpDir, "ABC123", "header", "index.md"), "utf8");
    expect(contents).toContain("actualizado");
  });

  it("a leaf node's markdown includes its position and size", async () => {
    const leaf = makeNode({
      id: "1:1",
      name: "Header",
      position: { x: 12, y: 64 },
      size: { width: 342, height: 48 },
      children: [],
    });

    await writeAsMarkdownTree("ABC123", leaf, { outputDir: tmpDir });

    const contents = await readFile(join(tmpDir, "ABC123", "header", "index.md"), "utf8");
    expect(contents).toContain("x=12");
    expect(contents).toContain("y=64");
    expect(contents).toContain("Width: 342px");
    expect(contents).toContain("Height: 48px");
  });

  it("a leaf node's markdown omits position/size when they are null", async () => {
    const leaf = makeNode({
      id: "1:1",
      name: "Header",
      position: { x: null, y: null },
      size: { width: null, height: null },
      children: [],
    });

    await writeAsMarkdownTree("ABC123", leaf, { outputDir: tmpDir });

    const contents = await readFile(join(tmpDir, "ABC123", "header", "index.md"), "utf8");
    expect(contents).not.toContain("position");
    expect(contents).not.toContain("size");
  });

  it("a leaf node's markdown includes its common styles (opacity, cornerRadius)", async () => {
    const leaf = makeNode({
      id: "1:1",
      name: "Card",
      styles: { opacity: 100, cornerRadius: 7 },
      children: [],
    });

    await writeAsMarkdownTree("ABC123", leaf, { outputDir: tmpDir });

    const contents = await readFile(join(tmpDir, "ABC123", "card", "index.md"), "utf8");
    expect(contents).toContain("Opacity: 100%");
    expect(contents).toContain("Radius: 7px");
  });

  it("a leaf node's markdown includes fills under the ## Fill section", async () => {
    const leaf = makeNode({
      id: "1:1",
      name: "Background",
      styles: {
        fills: [{ styleName: "Grayscale/Background", color: { hex: "#EFEFEF", a: 1 } }],
      },
      children: [],
    });

    await writeAsMarkdownTree("ABC123", leaf, { outputDir: tmpDir });

    const contents = await readFile(join(tmpDir, "ABC123", "background", "index.md"), "utf8");
    expect(contents).toContain("## Fill");
    expect(contents).toContain("Grayscale/Background");
    expect(contents).toContain("#EFEFEF");
  });

  it("a leaf node's markdown includes strokes under the ## Border section", async () => {
    const leaf = makeNode({
      id: "1:1",
      name: "HorizontalBorder",
      styles: {
        strokeWeight: 1,
        strokes: [{ styleName: null, color: { hex: "#E2BDC3", a: 1 } }],
      },
      children: [],
    });

    await writeAsMarkdownTree("ABC123", leaf, { outputDir: tmpDir });

    const contents = await readFile(join(tmpDir, "ABC123", "horizontalborder", "index.md"), "utf8");
    expect(contents).toContain("## Border");
    expect(contents).toContain("Border: 1px");
    expect(contents).toContain("#E2BDC3");
  });

  it("padding is written as four explicit lines under ## Layout", async () => {
    const leaf = makeNode({
      id: "1:1",
      name: "Link",
      styles: { paddingTop: 12, paddingRight: 16, paddingBottom: 12, paddingLeft: 16 },
      children: [],
    });

    await writeAsMarkdownTree("ABC123", leaf, { outputDir: tmpDir });

    const contents = await readFile(join(tmpDir, "ABC123", "link", "index.md"), "utf8");
    expect(contents).toContain("## Layout");
    expect(contents).toContain("Padding top: 12px");
    expect(contents).toContain("Padding right: 16px");
    expect(contents).toContain("Padding bottom: 12px");
    expect(contents).toContain("Padding left: 16px");
    expect(contents).not.toContain("Padding: 12px");
  });

  it("uniform padding still writes four explicit lines", async () => {
    const leaf = makeNode({
      id: "1:1",
      name: "Box",
      styles: { paddingTop: 16, paddingRight: 16, paddingBottom: 16, paddingLeft: 16 },
      children: [],
    });

    await writeAsMarkdownTree("ABC123", leaf, { outputDir: tmpDir });

    const contents = await readFile(join(tmpDir, "ABC123", "box", "index.md"), "utf8");
    expect(contents).toContain("Padding top: 16px");
    expect(contents).toContain("Padding right: 16px");
    expect(contents).toContain("Padding bottom: 16px");
    expect(contents).toContain("Padding left: 16px");
    expect(contents).not.toContain("Padding: 16px");
  });

  it("text content appears under ## Content, not as a key-value pair", async () => {
    const leaf = makeNode({ id: "1:1", name: "Heading 2", characters: "Consulta de Personas", children: [] });

    await writeAsMarkdownTree("ABC123", leaf, { outputDir: tmpDir });

    const contents = await readFile(join(tmpDir, "ABC123", "heading-2", "index.md"), "utf8");
    expect(contents).toContain("## Content");
    expect(contents).toContain("Consulta de Personas");
    expect(contents).not.toContain("characters:");
  });

  it("a node without text has no ## Content section", async () => {
    const leaf = makeNode({ id: "1:1", name: "Header", characters: null, children: [] });

    await writeAsMarkdownTree("ABC123", leaf, { outputDir: tmpDir });

    const contents = await readFile(join(tmpDir, "ABC123", "header", "index.md"), "utf8");
    expect(contents).not.toContain("## Content");
    expect(contents).not.toContain("characters");
  });

  it("a leaf node's markdown includes effects, formatted instead of printed as a raw object", async () => {
    const leaf = makeNode({
      id: "1:1",
      name: "Section",
      styles: {
        effects: [{ type: "Drop shadow", x: 0, y: 1, blur: 2, spread: 0, color: { hex: "#000000", a: 0.05 } }],
      },
      children: [],
    });

    await writeAsMarkdownTree("ABC123", leaf, { outputDir: tmpDir });

    const contents = await readFile(join(tmpDir, "ABC123", "section", "index.md"), "utf8");
    expect(contents).toContain("Drop shadow");
    expect(contents).toContain("blur=2");
    expect(contents).not.toContain("[object Object]");
  });

  it("a leaf node's markdown includes typography fields under ## Typography", async () => {
    const leaf = makeNode({
      id: "1:1",
      name: "Label",
      styles: {
        typography: {
          styleName: null,
          fontFamily: "font/family/subtitle",
          fontWeight: 600,
          fontSize: 14,
          lineHeightPx: 20,
        },
      },
      children: [],
    });

    await writeAsMarkdownTree("ABC123", leaf, { outputDir: tmpDir });

    const contents = await readFile(join(tmpDir, "ABC123", "label", "index.md"), "utf8");
    expect(contents).toContain("## Typography");
    expect(contents).toContain("font/family/subtitle");
    expect(contents).toContain("14");
    expect(contents).toContain("20");
  });

  it("a leaf node's markdown omits empty sections when styles is empty", async () => {
    const leaf = makeNode({ id: "1:1", name: "Header", styles: {}, children: [] });

    await writeAsMarkdownTree("ABC123", leaf, { outputDir: tmpDir });

    const contents = await readFile(join(tmpDir, "ABC123", "header", "index.md"), "utf8");
    expect(contents).toContain("type: Frame");
    expect(contents).toContain("Width: 100px");
    expect(contents).toContain("Height: 100px");
    expect(contents).not.toContain("## Fill");
    expect(contents).not.toContain("## Border");
  });

  it("a container node's index.md has a ## Children section before child links", async () => {
    const root: FigmaScrapeResult = makeNode({
      id: "1:1",
      name: "Nav",
      children: [
        makeNode({ id: "1:2", name: "Link", children: [] }),
        makeNode({ id: "1:3", name: "Icon", children: [] }),
      ],
    });

    await writeAsMarkdownTree("ABC123", root, { outputDir: tmpDir });

    const contents = await readFile(join(tmpDir, "ABC123", "index.md"), "utf8");
    expect(contents).toContain("## Children");
    const childrenPos = contents.indexOf("## Children");
    const linkPos = contents.indexOf("link/index.md");
    expect(linkPos).toBeGreaterThan(childrenPos);
  });

  it("Layout section groups flow, sizing, padding, and gap together", async () => {
    const leaf = makeNode({
      id: "1:1",
      name: "Row",
      styles: {
        flow: "Horizontal",
        widthSizing: "Hug",
        heightSizing: "Fill",
        paddingTop: 8,
        paddingRight: 8,
        paddingBottom: 8,
        paddingLeft: 8,
        itemSpacing: 4,
      },
      size: { width: 200, height: 50 },
      children: [],
    });

    await writeAsMarkdownTree("ABC123", leaf, { outputDir: tmpDir });

    const contents = await readFile(join(tmpDir, "ABC123", "row", "index.md"), "utf8");
    expect(contents).toContain("## Layout");
    expect(contents).toContain("Flow: Horizontal");
    expect(contents).toContain("Width: Hug (200px)");
    expect(contents).toContain("Height: Fill (50px)");
    expect(contents).toContain("Padding top: 8px");
    expect(contents).toContain("Gap: 4px");
    // Fill and Border sections absent
    expect(contents).not.toContain("## Fill");
    expect(contents).not.toContain("## Border");
  });

  describe("imagen y SVG", () => {
    it("a node with an image Buffer writes {slug}.png in its folder", async () => {
      const leaf = makeNode({ id: "1:1", name: "Card", image: Buffer.from([0x89, 0x50, 0x4e, 0x47]) });

      await writeAsMarkdownTree("ABC123", leaf, { outputDir: tmpDir });

      const imgStat = await stat(join(tmpDir, "ABC123", "card", "card.png"));
      expect(imgStat.isFile()).toBe(true);
    });

    it("index.md references the image using the node slug", async () => {
      const leaf = makeNode({ id: "1:1", name: "Card", image: Buffer.from([0x89, 0x50, 0x4e, 0x47]) });

      await writeAsMarkdownTree("ABC123", leaf, { outputDir: tmpDir });

      const contents = await readFile(join(tmpDir, "ABC123", "card", "index.md"), "utf8");
      expect(contents).toContain("![Card](./card.png)");
      expect(contents.indexOf("./card.png")).toBeLessThan(contents.indexOf("type:"));
    });

    it("imageFormat: 'png' writes {slug}.png (explicit — same as default)", async () => {
      const leaf = makeNode({ id: "1:1", name: "Card", image: Buffer.from([0x89, 0x50, 0x4e, 0x47]) });

      await writeAsMarkdownTree("ABC123", leaf, { outputDir: tmpDir, imageFormat: "png" });

      const dir = await readdir(join(tmpDir, "ABC123", "card"));
      expect(dir).toContain("card.png");
      expect(dir).toContain("card.png");
      const md = await readFile(join(tmpDir, "ABC123", "card", "index.md"), "utf8");
      expect(md).toContain("./card.png");
    });

    it("a node with image null writes no image file", async () => {
      const leaf = makeNode({ id: "1:1", name: "Card", image: null });

      await writeAsMarkdownTree("ABC123", leaf, { outputDir: tmpDir });

      const dir = await readdir(join(tmpDir, "ABC123", "card"));
      expect(dir.some((f) => f.startsWith("card."))).toBe(false);
      const md = await readFile(join(tmpDir, "ABC123", "card", "index.md"), "utf8");
      expect(md).not.toContain("![");
    });

    it("a node with svgCode writes {slug}.svg in its folder", async () => {
      const svg = '<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0"/></svg>';
      const leaf = makeNode({ id: "1:1", name: "ChevronRight", svgCode: svg });

      await writeAsMarkdownTree("ABC123", leaf, { outputDir: tmpDir });

      const svgStat = await stat(join(tmpDir, "ABC123", "chevronright", "chevronright.svg"));
      expect(svgStat.isFile()).toBe(true);
      const written = await readFile(join(tmpDir, "ABC123", "chevronright", "chevronright.svg"), "utf8");
      expect(written).toBe(svg);
    });

    it("index.md links to the SVG using the node slug", async () => {
      const svg = '<svg xmlns="http://www.w3.org/2000/svg"></svg>';
      const leaf = makeNode({ id: "1:1", name: "ChevronRight", svgCode: svg });

      await writeAsMarkdownTree("ABC123", leaf, { outputDir: tmpDir });

      const md = await readFile(join(tmpDir, "ABC123", "chevronright", "index.md"), "utf8");
      expect(md).toContain("[SVG](./chevronright.svg)");
    });

    it("a node with svgCode null writes no .svg file", async () => {
      const leaf = makeNode({ id: "1:1", name: "Box", svgCode: null });

      await writeAsMarkdownTree("ABC123", leaf, { outputDir: tmpDir });

      const dir = await readdir(join(tmpDir, "ABC123", "box"));
      expect(dir).not.toContain("box.svg");
      const md = await readFile(join(tmpDir, "ABC123", "box", "index.md"), "utf8");
      expect(md).not.toContain(".svg");
    });

    it("root container with image writes {slug}.png in fileKeyDir alongside index.md", async () => {
      const root = makeNode({
        id: "1:1",
        name: "Card",
        image: Buffer.from([0x89, 0x50, 0x4e, 0x47]),
        children: [makeNode({ id: "1:2", name: "Label" })],
      });

      await writeAsMarkdownTree("ABC123", root, { outputDir: tmpDir });

      const imgStat = await stat(join(tmpDir, "ABC123", "card.png"));
      expect(imgStat.isFile()).toBe(true);
      const md = await readFile(join(tmpDir, "ABC123", "index.md"), "utf8");
      expect(md).toContain("![Card](./card.png)");
      expect(md).toContain("## Children");
    });

    it("a node with both image and svgCode writes both files named after the slug", async () => {
      const leaf = makeNode({
        id: "1:1",
        name: "Arrow",
        image: Buffer.from([0x52, 0x49, 0x46, 0x46]),
        svgCode: "<svg></svg>",
      });

      await writeAsMarkdownTree("ABC123", leaf, { outputDir: tmpDir });

      const dir = await readdir(join(tmpDir, "ABC123", "arrow"));
      expect(dir).toContain("arrow.png");
      expect(dir).toContain("arrow.svg");
      expect(dir).toContain("index.md");
    });
  });
});
