import { describe, it, expect } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PlaywrightFigmaNodeSource } from "./playwright-figma-node-source";
import type { RawFigmaNode } from "../../figma/model";

// There's no "golden" fixture defined yet to compare against real data, so
// each run leaves the full result on disk (after the asserts, so an already
// failed test doesn't pollute the result) to inspect it by hand.
const OUTPUT_DIR = join(process.cwd(), "tmp", "e2e-output");

function writeResult(fileName: string, result: unknown): void {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  writeFileSync(join(OUTPUT_DIR, fileName), JSON.stringify(result, null, 2));
}

// Requires a real session (FIGMA_TEST_CREDENTIAL, obtained by running the
// PlaywrightLogin test once) and a known Figma file (FIGMA_TEST_FILE_KEY /
// FIGMA_TEST_NODE_ID) to compare against real data. There's no "golden"
// fixture defined yet — that's a pending prerequisite, not something this
// test can resolve on its own.
const RUN_EDIT_MODE = Boolean(process.env.FIGMA_TEST_CREDENTIAL && process.env.FIGMA_TEST_FILE_KEY);

// Second file, where the FIGMA_TEST_CREDENTIAL session has view-only access
// (not editor), in an organization that enables the inspect panel for
// viewers. Confirmed by running against a real session (see
// adr/ADR-panel-reader-bridge.md): in that case Figma shows a completely
// different properties panel ("inspection mode", inspectionPropertyRow)
// than the edit panel (x-y-inputs-row/transform-width/consumed-style-panel).
const RUN_VIEW_MODE = Boolean(process.env.FIGMA_TEST_CREDENTIAL && process.env.FIGMA_TEST_VIEW_FILE_KEY);

// Third file, still not confirmed against a real session: a user with
// view-only permission on a file whose organization does NOT enable the
// inspect panel (see spec: "Get a specific node with no data panel
// available"). Stays skipped until a real file of that kind is found to
// validate it — that state can't be forced from the outside.
const RUN_NO_PANEL_MODE = Boolean(process.env.FIGMA_TEST_CREDENTIAL && process.env.FIGMA_TEST_NO_PANEL_FILE_KEY);

// FIGMA_TEST_HIDDEN_TEXT_NODE_ID is a top-level ancestor to fetch from
// (the tree needs to be walked down to the target node — see the test's
// own comment on fetchNode below); FIGMA_TEST_HIDDEN_TEXT_PARENT_ID is the
// specific descendant known to have a hidden TEXT child (one that never
// appears in the layers panel tree — see readHiddenTextChild's comment and
// adr/ADR-pending-decisions.md). Separate env vars from FIGMA_TEST_VIEW_*
// so this doesn't force every other view-mode test to point at this
// specific node.
const RUN_HIDDEN_TEXT_MODE = Boolean(
  process.env.FIGMA_TEST_CREDENTIAL &&
    process.env.FIGMA_TEST_HIDDEN_TEXT_FILE_KEY &&
    process.env.FIGMA_TEST_HIDDEN_TEXT_PARENT_ID
);

describe.skipIf(!RUN_EDIT_MODE)("get_figma_information: Get a specific node from a Figma design (real browser, edit mode)", () => {
  it("fetches real node data, not a stub", async () => {
    const gateway = new PlaywrightFigmaNodeSource();
    const session = { credential: process.env.FIGMA_TEST_CREDENTIAL! };

    const result = await gateway.fetchNode(process.env.FIGMA_TEST_FILE_KEY!, process.env.FIGMA_TEST_NODE_ID!, session);

    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      expect(result.value.id).toBe(process.env.FIGMA_TEST_NODE_ID);
      expect(result.value.type).toBeTruthy();
      // The edit panel does expose position/size as direct inputs.
      expect(result.value.position.x).not.toBeNull();
      expect(result.value.size.width).not.toBeNull();
    }

    writeResult("fetch-node-edit-mode.json", result);
  }, 10 * 60 * 1000);
});

describe.skipIf(!RUN_EDIT_MODE)("get_figma_information: Get the nodes of the default page in a Figma design (real browser, edit mode)", () => {
  it("fetches the default page with at least one top-level node", async () => {
    const gateway = new PlaywrightFigmaNodeSource();
    const session = { credential: process.env.FIGMA_TEST_CREDENTIAL! };

    const result = await gateway.fetchDefaultPage(process.env.FIGMA_TEST_FILE_KEY!, session);

    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      expect(result.value.type).toBe("CANVAS");
      expect(result.value.children.length).toBeGreaterThan(0);
    }

    writeResult("fetch-default-page-edit-mode.json", result);
  }, 10 * 60 * 1000);
});

describe.skipIf(!RUN_VIEW_MODE)("get_figma_information: Get a specific node from a Figma design with read-only permission (real browser, inspection mode)", () => {
  it("fetches real node data via InspectionPanelReader, not just name/type/visible", async () => {
    const gateway = new PlaywrightFigmaNodeSource();
    const session = { credential: process.env.FIGMA_TEST_CREDENTIAL! };

    const result = await gateway.fetchNode(process.env.FIGMA_TEST_VIEW_FILE_KEY!, process.env.FIGMA_TEST_VIEW_NODE_ID!, session);

    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      expect(result.value.id).toBe(process.env.FIGMA_TEST_VIEW_NODE_ID);
      expect(result.value.type).toBeTruthy();
      // The inspection panel exposes Width/Height as plain text, even for
      // nodes with auto-layout Fill/Hug (unlike the edit panel). Confirmed
      // by running against a real session, across several nodes (root,
      // nested, instance, free shape): it never exposes X/Y — position
      // stays null in this mode always.
      expect(result.value.position.x).toBeNull();
      expect(result.value.size.width).not.toBeNull();
    }

    writeResult("fetch-node-view-mode.json", result);
  }, 10 * 60 * 1000);
});

describe.skipIf(!RUN_NO_PANEL_MODE)("get_figma_information: Get a specific node with no data panel available (real browser)", () => {
  it("returns incomplete-node-data status without walking the tree", async () => {
    const gateway = new PlaywrightFigmaNodeSource();
    const session = { credential: process.env.FIGMA_TEST_CREDENTIAL! };

    const result = await gateway.fetchNode(process.env.FIGMA_TEST_NO_PANEL_FILE_KEY!, process.env.FIGMA_TEST_NO_PANEL_NODE_ID!, session);

    expect(result.status).toBe("incomplete-node-data");

    writeResult("fetch-node-no-panel-mode.json", result);
  }, 60 * 1000);
});

function findNode(node: RawFigmaNode, id: string): RawFigmaNode | null {
  if (node.id === id) return node;
  for (const child of node.children) {
    const found = findNode(child, id);
    if (found) return found;
  }
  return null;
}

describe.skipIf(!RUN_HIDDEN_TEXT_MODE)("get_figma_information: Get a node whose TEXT child never appears in the layers panel (real browser)", () => {
  it("adds the hidden TEXT child as a real node via the Enter/Escape drill-down, with its own styles read", async () => {
    const gateway = new PlaywrightFigmaNodeSource();
    const session = { credential: process.env.FIGMA_TEST_CREDENTIAL! };

    // FIGMA_TEST_HIDDEN_TEXT_NODE_ID must be an ancestor of the node with
    // the hidden TEXT child (e.g. the tree's root), not that node itself —
    // fetchNode needs the layers panel tree expanded down to it, which
    // only happens by walking from an ancestor already visible as a
    // top-level row (same limitation as any other deep node lookup in this
    // gateway, not specific to this mechanism).
    const result = await gateway.fetchNode(
      process.env.FIGMA_TEST_HIDDEN_TEXT_FILE_KEY!,
      process.env.FIGMA_TEST_HIDDEN_TEXT_NODE_ID!,
      session
    );

    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      const parent = findNode(result.value, process.env.FIGMA_TEST_HIDDEN_TEXT_PARENT_ID!);
      expect(parent).not.toBeNull();
      // The hidden child is added as a real node under children — not
      // folded into the parent's own characters/styles.
      expect(parent?.children).toHaveLength(1);
      const child = parent?.children[0];
      // Not comparing against the literal string on purpose — the test
      // file's design content can change independently of this test.
      expect(child?.characters).toBeTruthy();
      expect(child?.styles.typography).toBeTruthy();
    }

    writeResult("fetch-node-hidden-text-mode.json", result);
  }, 10 * 60 * 1000);
});
