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
  it("a node with no children is written as a single markdown file", async () => {
    const leaf = makeNode({ id: "1:1", name: "Header", children: [] });

    await writeAsMarkdownTree("ABC123", leaf, { outputDir: tmpDir });

    const fileKeyDir = join(tmpDir, "ABC123");
    const entries = await readdir(fileKeyDir);
    expect(entries).toContain("header.md");

    const headerStat = await stat(join(fileKeyDir, "header.md"));
    expect(headerStat.isFile()).toBe(true);
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

    const cardPath = join(cardListDir, "card.md");
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
    expect(indexContents).toContain("header.md");
    expect(indexContents).toContain("card-list.md");
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
    expect(entries).toContain("list-item.md");
    expect(entries).toContain("list-item-[2].md");
    expect(entries).toContain("list-item-[3].md");
  });

  it("escribe los archivos de varias URLs en subcarpetas distintas por fileKey", async () => {
    const rootA: FigmaScrapeResult = makeNode({ id: "1:1", name: "Screen A", children: [] });
    const rootB: FigmaScrapeResult = makeNode({ id: "2:1", name: "Screen B", children: [] });

    await writeAsMarkdownTree("AAA111", rootA, { outputDir: tmpDir });
    await writeAsMarkdownTree("BBB222", rootB, { outputDir: tmpDir });

    const entriesA = await readdir(join(tmpDir, "AAA111"));
    const entriesB = await readdir(join(tmpDir, "BBB222"));
    expect(entriesA).toContain("screen-a.md");
    expect(entriesB).toContain("screen-b.md");
  });

  it("overwrites existing files with the same name without asking for confirmation", async () => {
    const firstRun = makeNode({ id: "1:1", name: "Header", children: [] });
    await writeAsMarkdownTree("ABC123", firstRun, { outputDir: tmpDir });

    const secondRun = makeNode({ id: "1:1", name: "Header (actualizado)", children: [] });
    await writeAsMarkdownTree("ABC123", secondRun, { outputDir: tmpDir });

    const contents = await readFile(join(tmpDir, "ABC123", "header.md"), "utf8");
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

    const contents = await readFile(join(tmpDir, "ABC123", "header.md"), "utf8");
    expect(contents).toContain("x=12");
    expect(contents).toContain("y=64");
    expect(contents).toContain("width=342");
    expect(contents).toContain("height=48");
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

    const contents = await readFile(join(tmpDir, "ABC123", "header.md"), "utf8");
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

    const contents = await readFile(join(tmpDir, "ABC123", "card.md"), "utf8");
    expect(contents).toContain("opacity: 100");
    expect(contents).toContain("cornerRadius: 7");
  });

  it("a leaf node's markdown includes fills, with the style name when present", async () => {
    const leaf = makeNode({
      id: "1:1",
      name: "Background",
      styles: {
        fills: [{ styleName: "Grayscale/Background", color: { r: 239, g: 239, b: 239, a: 1 } }],
      },
      children: [],
    });

    await writeAsMarkdownTree("ABC123", leaf, { outputDir: tmpDir });

    const contents = await readFile(join(tmpDir, "ABC123", "background.md"), "utf8");
    expect(contents).toContain("fills:");
    expect(contents).toContain("Grayscale/Background");
    expect(contents).toContain("239");
  });

  it("a leaf node's markdown includes typography fields when present", async () => {
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

    const contents = await readFile(join(tmpDir, "ABC123", "label.md"), "utf8");
    expect(contents).toContain("font/family/subtitle");
    expect(contents).toContain("14");
    expect(contents).toContain("20");
  });

  it("a leaf node's markdown omits the styles section entirely when styles is empty", async () => {
    const leaf = makeNode({ id: "1:1", name: "Header", styles: {}, children: [] });

    await writeAsMarkdownTree("ABC123", leaf, { outputDir: tmpDir });

    const contents = await readFile(join(tmpDir, "ABC123", "header.md"), "utf8");
    expect(contents).toBe("# Header\n\ntype: Frame\nposition: x=0, y=0\nsize: width=100, height=100\n");
  });
});
