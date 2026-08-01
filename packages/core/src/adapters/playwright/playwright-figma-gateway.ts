import { chromium, type Page, type Locator } from "playwright";
import type { FigmaSession, FigmaNodeSource, FigmaFetchResult } from "../../figma/ports";
import type { RawFigmaNode } from "../../figma/model";
import type { PanelReader } from "./panel-readers/panel-reader";
import { detectPanelMode } from "./panel-readers/detect-panel-mode";
import { createPanelReader } from "./panel-readers/create-panel-reader";
import { diffRowIds } from "./layer-snapshot-diff";

// Selectors confirmed by running against a real figma.com session (see
// .env: FIGMA_TEST_CREDENTIAL / FIGMA_TEST_FILE_KEY, and FIGMA_TEST_VIEW_*
// for inspection mode). Layers panel rows have the nodeId as a PREFIX of
// the testid ("{nodeId}-layers-panel-row"). Each panel mode's own
// selectors live in panel-readers/ (see adr/ADR-panel-reader-bridge.md).
const SELECTORS = {
  layerRow: (nodeId: string) => `[data-testid="objects-panel"] [data-testid="${nodeId}-layers-panel-row"]`,
};

// Deciding when to attempt the Enter/Escape drill-down for a hidden TEXT
// child (see readHiddenTextChild) matters for performance, not just
// correctness: a real tree has 100+ nodes, most of them leaves, and every
// leaf would pay the attempt's cost if it ran unconditionally. Restricting
// it to "no children found by the normal mechanism, and the active reader
// confirmed the mechanism works in its mode" reuses a signal readNode
// already computes for free (childIds from expandAndListChildren) instead
// of adding a new DOM query — the only real trade-off left is that every
// leaf node in a mode that supports the mechanism still pays one attempt,
// which is accepted here for lack of a confirmed cheaper signal (e.g. by
// node type) — see adr/ADR-pending-decisions.md. Not gated on the node's
// own `characters` being null: a node can have real children AND a
// separately hidden TEXT child (unconfirmed combination, see
// readHiddenTextChild's "limits of the evidence"), so childIds being
// empty is the only signal used, not whether this node itself is TEXT.
export function shouldAttemptHiddenTextRead(params: {
  childIds: string[];
  supportsHiddenTextChild: boolean;
}): boolean {
  return params.childIds.length === 0 && params.supportsHiddenTextChild;
}

export class PlaywrightFigmaGateway implements FigmaNodeSource {
  async fetchNode(fileKey: string, nodeId: string, session: FigmaSession): Promise<FigmaFetchResult<RawFigmaNode>> {
    const url = `https://www.figma.com/design/${fileKey}?node-id=${nodeId.replace(":", "-")}`;
    return this.withPage(session, url, async (page) => {
      const readTree = await this.startReading(page, nodeId);
      if (!readTree) return { status: "incomplete-node-data" };

      const node = await readTree(nodeId);
      return node ? { status: "ok", value: node } : { status: "not-found-or-no-access" };
    });
  }

  async fetchDefaultPage(fileKey: string, session: FigmaSession): Promise<FigmaFetchResult<RawFigmaNode>> {
    const url = `https://www.figma.com/design/${fileKey}`;
    return this.withPage(session, url, async (page) => {
      // The layers panel doesn't expose its own row for the CANVAS node: it
      // only shows the top-level nodes (frames/groups) of the active page.
      // There's no way to read that node directly from the DOM, so it's
      // synthesized here: the active page's name (PagesRowWrapper) plus
      // the top-level nodes (the lowest indentation level among the rows
      // visible without expanding anything) as children.
      const pageName = (await page.locator('[aria-current="page"]').first().textContent()) ?? "";
      const topLevelIds = await this.listTopLevelNodeIds(page);
      if (topLevelIds.length === 0) return { status: "not-found-or-no-access" };

      const readTree = await this.startReading(page, topLevelIds[0]);
      if (!readTree) return { status: "incomplete-node-data" };

      const children: RawFigmaNode[] = [];
      for (const nodeId of topLevelIds) {
        const child = await readTree(nodeId);
        if (child) children.push(child);
      }

      return {
        status: "ok",
        value: {
          id: fileKey,
          name: pageName,
          type: "CANVAS",
          // The CANVAS node is synthetic (see comment above): there's no
          // real position/size to read from the DOM for it.
          position: { x: null, y: null },
          size: { width: null, height: null },
          visible: true,
          styles: {},
          image: null,
          svgCode: null,
          characters: null,
          children,
        },
      };
    });
  }

  // The properties panel doesn't exist until a real node is selected —
  // detectPanelMode has nothing to inspect before the first click
  // (confirmed: fetchDefaultPage without this order always returned
  // "none", even when the file did have a panel available). That's why
  // the seed node is clicked here, the mode is only detected once that's
  // on screen, and the resulting PanelReader is reused for the rest of
  // the tree — the mode doesn't change across nodes of the same loaded
  // page.
  private async startReading(
    page: Page,
    seedNodeId: string
  ): Promise<((nodeId: string) => Promise<RawFigmaNode | null>) | null> {
    const seedRow = page.locator(SELECTORS.layerRow(seedNodeId));
    if ((await seedRow.count()) === 0) return null;
    await seedRow.click();

    const mode = await detectPanelMode({ hasSelector: (selector) => this.hasSelector(page, selector) });
    if (mode === "none") return null;

    const reader = createPanelReader(mode);
    return (nodeId: string) => this.readNode(page, nodeId, reader);
  }

  private async hasSelector(page: Page, selector: string): Promise<boolean> {
    return (await page.locator(`[data-testid="${selector}"]`).count()) > 0;
  }

  // Same aria-level-based approach as expandAndListChildren (see its
  // comment): the old indentation-by-hashed-class counting stopped
  // matching after a Figma deploy.
  private async listTopLevelNodeIds(page: Page): Promise<string[]> {
    return page.evaluate(() => {
      const objectsPanel = document.querySelector('[data-testid="objects-panel"]');
      if (!objectsPanel) return [];
      const treeRows = Array.from(
        objectsPanel.querySelectorAll('[role="row"][data-testid="layer-row-with-children"]')
      ) as HTMLElement[];

      const rows = treeRows.map((r) => {
        const content = r.querySelector('[data-testid$="-layers-panel-row"]') as HTMLElement | null;
        const testid = content?.getAttribute("data-testid") ?? "";
        const level = Number(r.getAttribute("aria-level") ?? "0");
        return { testid, level };
      });
      if (rows.length === 0) return [];

      const minLevel = Math.min(...rows.map((r) => r.level));
      return rows
        .filter((r) => r.level === minLevel)
        .map((r) => r.testid.replace(/-layers-panel-row$/, ""));
    });
  }

  private async withPage(
    session: FigmaSession,
    url: string,
    run: (page: Page) => Promise<FigmaFetchResult<RawFigmaNode>>
  ): Promise<FigmaFetchResult<RawFigmaNode>> {
    // headless:true triggers Figma's WAF (403 "The request could not be
    // satisfied" via CloudFront) even with valid session cookies; in
    // headed mode the same session responds 200. Confirmed by running
    // both modes against a real session.
    const browser = await chromium.launch({ headless: false });
    try {
      const context = await browser.newContext();
      await context.addCookies(JSON.parse(session.credential));
      const page = await context.newPage();

      const response = await page.goto(url);
      if (response && (response.status() === 401 || response.status() === 403)) {
        return { status: "session-expired" };
      }
      if (response && response.status() === 404) {
        return { status: "not-found-or-no-access" };
      }

      // properties-panel exists in the DOM even with no selection; what
      // marks the file as done loading is that the layers panel already
      // has at least one row.
      await page.waitForSelector('[data-testid$="-layers-panel-row"]');
      return await run(page);
    } finally {
      await browser.close();
    }
  }

  private async readNode(page: Page, nodeId: string, reader: PanelReader): Promise<RawFigmaNode | null> {
    const row = page.locator(SELECTORS.layerRow(nodeId));
    if ((await row.count()) === 0) return null;
    await row.click();
    // The properties panel doesn't always finish re-rendering by the time
    // the next read starts — confirmed intermittently on a real tree: the
    // same full traversal sometimes read a node's styles as completely
    // empty (cornerRadius/fills both missing) despite both being present
    // moments later on a retry, most often right after a node whose
    // sibling just went through the Enter/Escape hidden-text drill-down
    // (readHiddenTextChild), which leaves the panel in extra flux. A short
    // fixed wait here is cheaper than adding a stability check to every
    // individual read* method.
    await page.waitForTimeout(150);

    const panel = page.locator('[data-testid="properties-panel"]');
    const name = await reader.readName(row);
    const type = await reader.readType(row);
    const visible = await reader.readVisible(row);
    const { x, y } = await reader.readPosition(panel);
    const { width, height } = await reader.readSize(panel);
    const styles = await reader.readStyles(panel);
    const characters = await reader.readCharacters(panel);

    const childIds = await this.expandAndListChildren(page, nodeId);

    const children: RawFigmaNode[] = [];
    for (const childId of childIds) {
      const child = await this.readNode(page, childId, reader);
      if (child) children.push(child);
    }

    // childIds has to be known before deciding whether to attempt this —
    // see shouldAttemptHiddenTextRead's comment for why it's gated this
    // way instead of running unconditionally on every leaf.
    if (
      shouldAttemptHiddenTextRead({
        childIds,
        supportsHiddenTextChild: reader.supportsHiddenTextChild?.() ?? false,
      })
    ) {
      const hiddenChild = await this.readHiddenTextChild(page, nodeId, reader);
      if (hiddenChild) children.push(hiddenChild);
    }

    return {
      id: nodeId,
      name,
      type,
      position: { x, y },
      size: { width, height },
      visible,
      styles,
      image: null,
      svgCode: null,
      characters,
      children,
    };
  }

  // Confirmed in a real session on two different nodes (a parent with no
  // caret in the layers panel tree, whose TEXT child never shows up there
  // even after retrying expandAndListChildren's full budget): pressing
  // Enter with the parent row selected drills Figma's own canvas
  // selection into that hidden child, without needing screen coordinates
  // (the double-click-on-canvas approach considered earlier was rejected
  // for being less stable than this — it depends on x/y position, zoom,
  // and scroll). Confirmed on a real node ("Heading 1" → hidden TEXT child
  // "Empresa Inc."): the revealed child exposes its own full panel —
  // Layout (its own width/height, distinct from the parent's), Content,
  // Typography, and Colors — not just Content, so this reads the same
  // fields readNode reads for any other node (name/type/size/styles/
  // characters), reusing the same PanelReader already in use instead of
  // duplicating panel logic.
  //
  // Escape does NOT restore the parent's selection — confirmed: it
  // deselects everything (selection reads null afterwards) — so the
  // explicit re-click on the parent's own row at the end isn't defensive,
  // it's required for the caller's DFS to keep working from where it left
  // off. The reveal itself is ephemeral: after Escape + navigating away,
  // the child goes back to being absent from the layers panel tree, so
  // its full data has to be read *now*, while it's still selected — there
  // won't be a second chance to reach it via a normal readNode(childId)
  // recursion later.
  //
  // Limits of the evidence: only verified with exactly one hidden TEXT
  // child per parent. Untested: a parent with more than one hidden TEXT
  // child, or a mix of hidden TEXT and non-TEXT children under a parent
  // with no caret — this mechanism doesn't attempt to distinguish those
  // cases and would only ever capture one child.
  private async readHiddenTextChild(
    page: Page,
    parentNodeId: string,
    reader: PanelReader
  ): Promise<RawFigmaNode | null> {
    await page.keyboard.press("Enter");

    let selectedRow: Locator;
    let childId: string;
    try {
      selectedRow = page.locator('[data-fpl-selected="true"] [data-testid$="-layers-panel-row"]');
      await selectedRow.waitFor({ timeout: 500 });
      const testid = await selectedRow.getAttribute("data-testid");
      if (!testid) return null;
      childId = testid.replace(/-layers-panel-row$/, "");
    } catch {
      return null;
    }

    const panel = page.locator('[data-testid="properties-panel"]');
    const name = await reader.readName(selectedRow);
    const type = await reader.readType(selectedRow);
    const visible = await reader.readVisible(selectedRow);
    const { x, y } = await reader.readPosition(panel);
    const { width, height } = await reader.readSize(panel);
    const styles = await reader.readStyles(panel);
    const characters = await reader.readCharacters(panel);

    await page.keyboard.press("Escape");
    await page.locator(SELECTORS.layerRow(parentNodeId)).click();

    return {
      id: childId,
      name,
      type,
      position: { x, y },
      size: { width, height },
      visible,
      styles,
      image: null,
      svgCode: null,
      characters,
      children: [],
    };
  }

  // The layers panel is virtualized: a collapsed node's children don't
  // exist in the DOM until it's expanded. The expand caret sits in a
  // sibling gridcell under the row's ancestor `[role="row"]`, not inside
  // the row element itself (confirmed after a Figma deploy restructured
  // the panel — hover-based visibility and a plain `row.locator(...)`
  // stopped finding it). That same ancestor row also carries `aria-level`
  // directly, which replaces the old approach of counting indentation
  // divs by a hashed CSS-module class: it stops at the first row whose
  // level is less than or equal to the parent's.
  //
  // aria-expanded flipping to "true" doesn't mean the child rows are in
  // the DOM yet — confirmed by tracing a real node where aria-expanded and
  // data-fpl-tree-row-expanded both read "true" immediately after the
  // click, but the row with the next tree index (its actual child) took
  // longer to render and was still missing from the DOM moments later.
  // Since the caret's presence already means the node has at least one
  // child, an empty read straight after expanding is never treated as
  // final — it's retried with a short wait between attempts, up to a
  // fixed budget, until a non-empty result shows up (or the budget runs
  // out, which only happens if something else is actually broken).
  private async expandAndListChildren(page: Page, nodeId: string): Promise<string[]> {
    const row = page.locator(SELECTORS.layerRow(nodeId));
    // `role="row"` is a standard ARIA attribute, not a hashed CSS-module
    // class — this selector is stable on that front (same "stable" bar
    // used to reclassify `data-fpl-row-container` in
    // layer-row-panel-reader.ts). The remaining risk is the `ancestor::`
    // navigation itself, not the attribute name.
    const treeRow = row.locator("xpath=ancestor::*[@role='row']");
    const caret = treeRow.locator('[data-testid="layers-panel-expand-caret"]');
    if ((await caret.count()) === 0) return [];

    let childIds: string[] = [];
    for (let attempt = 0; attempt < 8; attempt++) {
      if ((await treeRow.getAttribute("aria-expanded")) !== "true") {
        await caret.click({ force: true });
      }
      await page.waitForTimeout(200);
      childIds = await this.readChildIds(page, nodeId);
      if (childIds.length > 0) break;
    }
    return childIds;
  }

  private async readChildIds(page: Page, nodeId: string): Promise<string[]> {
    return page.evaluate((currentTestId) => {
      const treeRows = Array.from(
        document.querySelectorAll('[role="row"][data-testid="layer-row-with-children"]')
      ) as HTMLElement[];

      const rows = treeRows
        .map((r) => {
          const content = r.querySelector('[data-testid$="-layers-panel-row"]') as HTMLElement | null;
          const testid = content?.getAttribute("data-testid") ?? "";
          const level = Number(r.getAttribute("aria-level") ?? "0");
          const index = Number(r.getAttribute("data-fpl-tree-row-index") ?? "0");
          return { testid, level, index };
        })
        .sort((a, b) => a.index - b.index);

      const parentIndex = rows.findIndex((r) => r.testid === `${currentTestId}-layers-panel-row`);
      if (parentIndex === -1) return [];
      const parentLevel = rows[parentIndex].level;

      const childIds: string[] = [];
      for (let i = parentIndex + 1; i < rows.length; i++) {
        if (rows[i].level <= parentLevel) break;
        if (rows[i].level === parentLevel + 1) {
          childIds.push(rows[i].testid.replace(/-layers-panel-row$/, ""));
        }
      }
      return childIds;
    }, nodeId);
  }
}
