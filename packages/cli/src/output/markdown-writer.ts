import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { FigmaNode, FigmaPage, FigmaScrapeResult } from "@figtools/core";
import { slugifyWithCollisions } from "./slugify";

export interface MarkdownWriterOptions {
  outputDir: string;
}

function isFigmaPage(result: FigmaScrapeResult): result is FigmaPage {
  return "nodes" in result;
}

function leafContent(node: FigmaNode): string {
  return `# ${node.name}\n\ntype: ${node.type}\n`;
}

function containerContent(name: string, children: FigmaNode[], childSlugs: string[]): string {
  const links = children
    .map((child, i) => {
      const slug = childSlugs[i];
      const href = child.children.length === 0 ? `${slug}.md` : `${slug}/index.md`;
      return `- [${child.name}](${href})`;
    })
    .join("\n");
  return `# ${name}\n\n${links}\n`;
}

async function writeChildNode(node: FigmaNode, parentDir: string, slug: string): Promise<void> {
  if (node.children.length === 0) {
    await writeFile(join(parentDir, `${slug}.md`), leafContent(node), "utf8");
    return;
  }

  const nodeDir = join(parentDir, slug);
  await mkdir(nodeDir, { recursive: true });
  const childSlugs = slugifyWithCollisions(node.children.map((c) => c.name));
  await writeFile(join(nodeDir, "index.md"), containerContent(node.name, node.children, childSlugs), "utf8");
  for (let i = 0; i < node.children.length; i++) {
    await writeChildNode(node.children[i], nodeDir, childSlugs[i]);
  }
}

export async function writeAsMarkdownTree(
  fileKey: string,
  result: FigmaScrapeResult,
  options: MarkdownWriterOptions,
): Promise<void> {
  const fileKeyDir = join(options.outputDir, fileKey);
  await mkdir(fileKeyDir, { recursive: true });

  if (isFigmaPage(result)) {
    const childSlugs = slugifyWithCollisions(result.nodes.map((n) => n.name));
    await writeFile(
      join(fileKeyDir, "index.md"),
      containerContent(result.name, result.nodes, childSlugs),
      "utf8",
    );
    for (let i = 0; i < result.nodes.length; i++) {
      await writeChildNode(result.nodes[i], fileKeyDir, childSlugs[i]);
    }
    return;
  }

  if (result.children.length === 0) {
    const [slug] = slugifyWithCollisions([result.name]);
    await writeFile(join(fileKeyDir, `${slug}.md`), leafContent(result), "utf8");
    return;
  }

  const childSlugs = slugifyWithCollisions(result.children.map((c) => c.name));
  await writeFile(
    join(fileKeyDir, "index.md"),
    containerContent(result.name, result.children, childSlugs),
    "utf8",
  );
  for (let i = 0; i < result.children.length; i++) {
    await writeChildNode(result.children[i], fileKeyDir, childSlugs[i]);
  }
}
