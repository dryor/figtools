import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { FigmaNode, FigmaPage, FigmaPaint, FigmaEffect, FigmaScrapeResult } from "@figtools/core";
import { slugifyWithCollisions } from "./slugify";

export interface MarkdownWriterOptions {
  outputDir: string;
  imageFormat?: "webp" | "png" | "jpg";
}

function isFigmaPage(result: FigmaScrapeResult): result is FigmaPage {
  return "nodes" in result;
}

function colorToHex({ r, g, b, a }: FigmaPaint["color"]): string {
  const hex = [r, g, b]
    .map((c) => Math.round(c).toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
  return a < 1 ? `#${hex} ${Math.round(a * 100)}%` : `#${hex}`;
}

function formatPaint(paint: FigmaPaint): string {
  const hex = colorToHex(paint.color);
  return paint.styleName ? `${hex} (${paint.styleName})` : hex;
}

function formatEffect(effect: FigmaEffect): string {
  const color = effect.color ? colorToHex(effect.color) : "";
  return [
    effect.type,
    `x=${effect.x}`,
    `y=${effect.y}`,
    `blur=${effect.blur}`,
    `spread=${effect.spread}`,
    color,
  ]
    .filter(Boolean)
    .join(" ");
}

function formatSize(value: number | null, mode: string | undefined): string | null {
  if (mode === "Fill") return value !== null ? `Fill (${value}px)` : "Fill";
  if (value === null) return null;
  if (mode === "Hug") return `Hug (${value}px)`;
  if (mode === "Fixed") return `Fixed (${value}px)`;
  return `${value}px`;
}

// Properties grouped into Figma inspection panel categories, each under its own H2.
function nodePropertyLines(node: FigmaNode): string[] {
  const lines: string[] = [`type: ${node.type}`];
  if (!node.visible) lines.push(`visible: false`);

  const {
    flow,
    widthSizing,
    heightSizing,
    fills,
    strokes,
    strokeWeight,
    strokeSide,
    cornerRadius,
    effects,
    opacity,
    paddingTop,
    paddingRight,
    paddingBottom,
    paddingLeft,
    itemSpacing,
    typography,
  } = node.styles;

  // ## Layout
  const layoutLines: string[] = [];
  if (flow) layoutLines.push(`Flow: ${flow}`);
  if (node.position.x !== null && node.position.y !== null)
    layoutLines.push(`Position: x=${node.position.x} y=${node.position.y}`);
  const w = formatSize(node.size.width, widthSizing);
  const h = formatSize(node.size.height, heightSizing);
  if (w !== null) layoutLines.push(`Width: ${w}`);
  if (h !== null) layoutLines.push(`Height: ${h}`);
  if (paddingTop !== undefined) layoutLines.push(`Padding top: ${paddingTop}px`);
  if (paddingRight !== undefined) layoutLines.push(`Padding right: ${paddingRight}px`);
  if (paddingBottom !== undefined) layoutLines.push(`Padding bottom: ${paddingBottom}px`);
  if (paddingLeft !== undefined) layoutLines.push(`Padding left: ${paddingLeft}px`);
  if (itemSpacing !== undefined) layoutLines.push(`Gap: ${itemSpacing}px`);
  if (opacity !== undefined) layoutLines.push(`Opacity: ${opacity}%`);
  if (layoutLines.length > 0) lines.push("", "## Layout", ...layoutLines);

  // ## Fill
  if (fills && fills.length > 0) lines.push("", "## Fill", ...fills.map(formatPaint));

  // ## Border
  const borderLines: string[] = [];
  if (strokeWeight !== undefined || (strokes && strokes.length > 0)) {
    const label = strokeSide ? `Border ${strokeSide.toLowerCase()}` : "Border";
    const parts: string[] = [];
    if (strokeWeight !== undefined) parts.push(`${strokeWeight}px`);
    if (strokes && strokes.length > 0) parts.push(strokes.map(formatPaint).join(", "));
    borderLines.push(`${label}: ${parts.join(" ")}`);
  }
  if (cornerRadius !== undefined) borderLines.push(`Radius: ${cornerRadius}px`);
  if (effects && effects.length > 0) {
    for (const effect of effects) borderLines.push(formatEffect(effect));
  }
  if (borderLines.length > 0) lines.push("", "## Border", ...borderLines);

  // ## Typography
  if (typography) {
    const typoLines: string[] = [];
    if (typography.styleName) typoLines.push(`Text style: ${typography.styleName}`);
    if (typography.fontFamily) typoLines.push(`Font: ${typography.fontFamily}`);
    if (typography.style) typoLines.push(`Style: ${typography.style}`);
    if (typography.fontWeight !== null && typography.fontWeight !== undefined)
      typoLines.push(`Weight: ${typography.fontWeight}`);
    if (typography.fontSize !== null && typography.fontSize !== undefined)
      typoLines.push(`Size: ${typography.fontSize}px`);
    if (typography.lineHeightPx !== null && typography.lineHeightPx !== undefined)
      typoLines.push(`Line height: ${typography.lineHeightPx}px`);
    if (typography.letterSpacing !== undefined)
      typoLines.push(`Letter spacing: ${typography.letterSpacing}`);
    if (typography.textAlignHorizontal) typoLines.push(`Align: ${typography.textAlignHorizontal}`);
    if (typography.textAlignVertical) typoLines.push(`Vertical align: ${typography.textAlignVertical}`);
    if (typoLines.length > 0) lines.push("", "## Typography", ...typoLines);
  }

  // ## Content (text nodes only)
  if (node.characters !== null) lines.push("", "## Content", node.characters);

  return lines;
}

function mediaHead(node: FigmaNode, slug: string, format: string): string {
  const lines: string[] = [];
  if (node.image !== null) lines.push(`![${node.name}](./${slug}.${format})`);
  if (node.svgCode !== null) lines.push(`[SVG](./${slug}.svg)`);
  return lines.length > 0 ? `\n\n${lines.join("\n")}` : "";
}

function nodeContent(node: FigmaNode, slug: string, format: string): string {
  return `# ${node.name}${mediaHead(node, slug, format)}\n\n${nodePropertyLines(node).join("\n")}\n`;
}

function pageContent(name: string, nodes: FigmaNode[], childSlugs: string[]): string {
  const links = nodes
    .map((node, i) => `- [${node.name}](${childSlugs[i]}/index.md)`)
    .join("\n");
  return `# ${name}\n\n${links}\n`;
}

function containerContent(node: FigmaNode, childSlugs: string[], slug: string, format: string): string {
  const meta = nodePropertyLines(node);
  const links = node.children
    .map((child, i) => `- [${child.name}](${childSlugs[i]}/index.md)`)
    .join("\n");
  return `# ${node.name}${mediaHead(node, slug, format)}\n\n${meta.join("\n")}\n\n## Children\n\n${links}\n`;
}

async function writeNodeAssets(node: FigmaNode, dir: string, slug: string, format: string): Promise<void> {
  if (node.image !== null) await writeFile(join(dir, `${slug}.${format}`), node.image);
  if (node.svgCode !== null) await writeFile(join(dir, `${slug}.svg`), node.svgCode, "utf8");
}

async function writeChildNode(node: FigmaNode, parentDir: string, slug: string, options: MarkdownWriterOptions): Promise<void> {
  const nodeDir = join(parentDir, slug);
  await mkdir(nodeDir, { recursive: true });
  const format = options.imageFormat ?? "png";
  await writeNodeAssets(node, nodeDir, slug, format);

  if (node.children.length === 0) {
    await writeFile(join(nodeDir, "index.md"), nodeContent(node, slug, format), "utf8");
    return;
  }

  const childSlugs = slugifyWithCollisions(node.children.map((c) => c.name));
  await writeFile(join(nodeDir, "index.md"), containerContent(node, childSlugs, slug, format), "utf8");
  for (let i = 0; i < node.children.length; i++) {
    await writeChildNode(node.children[i], nodeDir, childSlugs[i], options);
  }
}

export async function writeAsMarkdownTree(
  fileKey: string,
  result: FigmaScrapeResult,
  options: MarkdownWriterOptions,
): Promise<void> {
  const fileKeyDir = join(options.outputDir, fileKey);
  await mkdir(fileKeyDir, { recursive: true });

  const format = options.imageFormat ?? "png";

  if (isFigmaPage(result)) {
    const childSlugs = slugifyWithCollisions(result.nodes.map((n) => n.name));
    await writeFile(
      join(fileKeyDir, "index.md"),
      pageContent(result.name, result.nodes, childSlugs),
      "utf8",
    );
    for (let i = 0; i < result.nodes.length; i++) {
      await writeChildNode(result.nodes[i], fileKeyDir, childSlugs[i], options);
    }
    return;
  }

  const [slug] = slugifyWithCollisions([result.name]);

  if (result.children.length === 0) {
    const nodeDir = join(fileKeyDir, slug);
    await mkdir(nodeDir, { recursive: true });
    await writeNodeAssets(result, nodeDir, slug, format);
    await writeFile(join(nodeDir, "index.md"), nodeContent(result, slug, format), "utf8");
    return;
  }

  await writeNodeAssets(result, fileKeyDir, slug, format);
  const childSlugs = slugifyWithCollisions(result.children.map((c) => c.name));
  await writeFile(join(fileKeyDir, "index.md"), containerContent(result, childSlugs, slug, format), "utf8");
  for (let i = 0; i < result.children.length; i++) {
    await writeChildNode(result.children[i], fileKeyDir, childSlugs[i], options);
  }
}
