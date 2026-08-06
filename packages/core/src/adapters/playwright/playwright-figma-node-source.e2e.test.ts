import { describe, it, expect, beforeAll } from "vitest";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { PlaywrightFigmaNodeSource } from "./playwright-figma-node-source";
import { CookieSessionStore } from "../cookie-session-store";
import { DEFAULT_FETCH_OPTIONS } from "../../figma/ports";
import type { FigmaSession } from "../../figma/ports";
import type { RawFigmaNode } from "../../figma/model";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Golden fixtures, captured from a real passing run against the files below
// (2026-08-01) — full FigmaFetchResult objects, compared with toEqual
// instead of field-by-field toBeTruthy()/not.toBeNull() checks (edit-mode-node
// is the one exception — see stripIds below). Re-capture with writeResult's
// output below when EDIT_MODE_*/VIEW_MODE_* changes, or when the fixture
// file's own design changes on purpose.
const FIXTURES_DIR = join(__dirname, "__fixtures__");

function loadFixture(name: string): unknown {
  return JSON.parse(readFileSync(join(FIXTURES_DIR, name), "utf-8"));
}

// Each run also leaves the full result on disk (after the assert, so an
// already-failed comparison doesn't overwrite a previously good dump) —
// the fixture diff vitest prints on failure is hard to read at this tree
// size, this file is for opening the two full JSON side by side by hand.
const OUTPUT_DIR = join(process.cwd(), "tmp", "e2e-output");

function writeResult(fileName: string, result: unknown): void {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  writeFileSync(join(OUTPUT_DIR, fileName), JSON.stringify(result, null, 2));
}

// Editor-permission file — the account behind `figtools login` has edit
// access here. Same file adr/ADR-layers-virtualization.md's tree-truncation
// bug was originally reproduced against.
const EDIT_MODE_FILE_KEY = "sNTGmFfSPm7S51VBed4PZR";
const EDIT_MODE_NODE_ID = "1017:431";

// EDIT_MODE_NODE_ID is itself an Instance. Confirmed by comparing two
// sequential real fetches of it (2026-08-05): every descendant's id
// changed between fetches (e.g. "1301:843" -> "1302:843", same suffix,
// prefix incremented by one), while non-id fields stayed identical. Figma
// assigns each descendant a fresh id scoped to that particular expansion
// of the instance rather than a permanent one — not a race, reproduced
// identically across serial, single-session fetches. ids get stripped
// before comparing this one fixture; every other field (name, type,
// position, size, styles, structure, ordering) still compares exactly.
function stripIds(node: RawFigmaNode): RawFigmaNode {
  return { ...node, id: "", children: node.children.map(stripIds) };
}

// View-only file in an organization that enables the inspection panel for
// viewers. Same fixture inspection-panel-reader.e2e.test.ts already
// hardcodes, reused here instead of a second dedicated file (see
// adr/ADR-pending-decisions.md).
const VIEW_MODE_FILE_KEY = "HThrmBFcF8JMNq4q6d8C4T";
const VIEW_MODE_NODE_ID = "2:5";

let session: FigmaSession;

beforeAll(async () => {
  const stored = await new CookieSessionStore().getSession();
  if (!stored) throw new Error("No session — run `figtools login` first");
  session = stored;
});

describe.concurrent("get_figma_information: Get a specific node from a Figma design (real browser, edit mode)", () => {
  it.concurrent("matches the golden fixture (edit-mode-node.json)", async () => {
    const result = await new PlaywrightFigmaNodeSource().fetchNode(EDIT_MODE_FILE_KEY, EDIT_MODE_NODE_ID, {
      session,
      ...DEFAULT_FETCH_OPTIONS,
    });
    if (result.status !== "ok") throw new Error(`fetchNode failed: ${result.status}`);

    const fixture = loadFixture("edit-mode-node.json") as { status: string; value: RawFigmaNode };
    expect(stripIds(result.value)).toEqual(stripIds(fixture.value));
    writeResult("fetch-node-edit-mode.json", result);
  }, 10 * 60 * 1000);
});

describe.concurrent("get_figma_information: Get the nodes of the default page in a Figma design (real browser, edit mode)", () => {
  it.concurrent("matches the golden fixture (edit-mode-default-page.json)", async () => {
    const result = await new PlaywrightFigmaNodeSource().fetchDefaultPage(EDIT_MODE_FILE_KEY, {
      session,
      ...DEFAULT_FETCH_OPTIONS,
    });

    expect(result).toEqual(loadFixture("edit-mode-default-page.json"));
    writeResult("fetch-default-page-edit-mode.json", result);
  }, 10 * 60 * 1000);
});

describe.concurrent("get_figma_information: Get a specific node from a Figma design with read-only permission (real browser, inspection mode)", () => {
  it.concurrent("matches the golden fixture (view-mode-node.json)", async () => {
    const result = await new PlaywrightFigmaNodeSource().fetchNode(VIEW_MODE_FILE_KEY, VIEW_MODE_NODE_ID, {
      session,
      ...DEFAULT_FETCH_OPTIONS,
    });

    expect(result).toEqual(loadFixture("view-mode-node.json"));
    writeResult("fetch-node-view-mode.json", result);
  }, 10 * 60 * 1000);
});
