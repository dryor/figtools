import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { PlaywrightFigmaNodeSource } from "../playwright-figma-node-source";
import { CookieSessionStore } from "../../cookie-session-store";
import { DEFAULT_FETCH_OPTIONS } from "../../../figma/ports";
import type { FigmaSession } from "../../../figma/ports";
import type { RawFigmaNode } from "../../../figma/model";

const FILE_KEY = "HThrmBFcF8JMNq4q6d8C4T";
const NODE_ID = "2:5";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURE_PATH = join(__dirname, "__fixtures__", "inspection-mode-tree.json");

function loadFixture(): RawFigmaNode {
  return JSON.parse(readFileSync(FIXTURE_PATH, "utf-8"));
}

function collectMediaNodes(node: RawFigmaNode, out: RawFigmaNode[] = []): RawFigmaNode[] {
  if (node.image !== null || node.svgCode !== null) out.push(node);
  for (const child of node.children) collectMediaNodes(child, out);
  return out;
}

// Same session for both tests below — this only caches that (reads a local
// file, cheap). The real fetch against Figma is a separate run per test,
// with different options each, so it lives inside each it(), not here.
let session: FigmaSession;

beforeAll(async () => {
  const stored = await new CookieSessionStore().getSession();
  if (!stored) throw new Error("No session — run `figtools login` first");
  session = stored;
});

describe.concurrent("get_figma_information: full tree (real browser, inspection mode)", () => {
  it.concurrent("matches the golden fixture", async () => {
    const result = await new PlaywrightFigmaNodeSource().fetchNode(FILE_KEY, NODE_ID, {
      session,
      ...DEFAULT_FETCH_OPTIONS,
    });
    if (result.status !== "ok") throw new Error(`fetchNode failed: ${result.status}`);

    expect(result.value).toEqual(loadFixture());
  }, 10 * 60 * 1000);

  it.concurrent("populates image/svgCode when the request asks for them", async () => {
    const result = await new PlaywrightFigmaNodeSource().fetchNode(FILE_KEY, NODE_ID, {
      session,
      image: { enabled: true, format: "PNG" },
      icons: { enabled: true },
    });
    if (result.status !== "ok") throw new Error(`fetchNode failed: ${result.status}`);

    const mediaNodes = collectMediaNodes(result.value);
    expect(mediaNodes.length).toBeGreaterThan(0);
    for (const node of mediaNodes) {
      if (node.image !== null) {
        expect(Buffer.isBuffer(node.image)).toBe(true);
        expect(node.image.length).toBeGreaterThan(0);
      }
      if (node.svgCode !== null) {
        expect(node.svgCode).toContain("<svg");
      }
    }
  }, 20 * 60 * 1000);
});
