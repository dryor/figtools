import { chromium, type Page } from "playwright";
import type { FigmaSession, FigmaGateway, FigmaFetchResult } from "../../figma/ports";
import type { RawFigmaNode } from "../../figma/model";
import type { PanelReader } from "./panel-readers/panel-reader";
import { detectPanelMode } from "./panel-readers/detect-panel-mode";
import { createPanelReader } from "./panel-readers/create-panel-reader";

// Selectors confirmed by running against a real figma.com session (see
// .env: FIGMA_TEST_CREDENTIAL / FIGMA_TEST_FILE_KEY, and FIGMA_TEST_VIEW_*
// for inspection mode). Layers panel rows have the nodeId as a PREFIX of
// the testid ("{nodeId}-layers-panel-row"). Each panel mode's own
// selectors live in panel-readers/ (see adr/ADR-panel-reader-bridge.md).
const SELECTORS = {
  layerRow: (nodeId: string) => `[data-testid="objects-panel"] [data-testid="${nodeId}-layers-panel-row"]`,
};

export interface LayerPanelRow {
  testid: string;
  indents: number;
  y: number;
}

// The layers panel is virtualized: a collapsed node's children don't exist
// in the DOM until it's expanded. There's no data-node-id or explicit
// hierarchy in the markup — the only signal available is each row's
// indentation level, read after expanding the parent.
//
// Indentation isn't always parentIndents + 1: confirmed by running against
// a real session (see adr/ADR-pending-decisions.md), a `List Item`
// (Instance) nests its children one level deeper, but `Pikachu` (also an
// Instance, nested inside that List Item) reveals its own child (`image`)
// at the SAME indentation level as itself, not one level deeper. Requiring
// exactly `parentIndents + 1` made every Instance whose content doesn't
// nest a level deeper come back with no children at all, silently
// truncating the tree.
//
// The rule that holds for both observed cases: take whatever indentation
// the first row after the parent has (whether that's parentIndents or
// parentIndents + 1) as the children's level, and accept every contiguous
// row at that same level as a child — stopping only once indentation drops
// below the parent's (back up to a sibling or ancestor).
//
// Known limitation: when children sit at the SAME indentation as the
// parent, a sibling of the parent immediately following the last real
// child (also at parentIndents) is indistinguishable from one more child —
// indentation alone can't tell them apart. Not resolvable without a real
// parent/child signal in the DOM, which Figma doesn't expose.
export function findChildIds(rows: LayerPanelRow[], parentTestId: string): string[] {
  const sorted = [...rows].sort((a, b) => a.y - b.y);
  const parentIndex = sorted.findIndex((r) => r.testid === `${parentTestId}-layers-panel-row`);
  if (parentIndex === -1) return [];
  const parentIndents = sorted[parentIndex].indents;

  const nextRow = sorted[parentIndex + 1];
  if (!nextRow || nextRow.indents < parentIndents) return [];
  const childIndents = nextRow.indents;

  const childIds: string[] = [];
  for (let i = parentIndex + 1; i < sorted.length; i++) {
    if (sorted[i].indents < parentIndents) break;
    if (sorted[i].indents === childIndents) {
      childIds.push(sorted[i].testid.replace(/-layers-panel-row$/, ""));
    }
  }
  return childIds;
}

export class PlaywrightFigmaGateway implements FigmaGateway {
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

  private async listTopLevelNodeIds(page: Page): Promise<string[]> {
    return page.evaluate(() => {
      const objectsPanel = document.querySelector('[data-testid="objects-panel"]');
      if (!objectsPanel) return [];
      const wrappers = Array.from(objectsPanel.querySelectorAll('[style*="translate3d"]')).filter((w) =>
        w.querySelector(':scope > [data-testid$="-layers-panel-row"]')
      ) as HTMLElement[];

      const rows = wrappers.map((w) => {
        const content = w.querySelector(':scope > [data-testid$="-layers-panel-row"]') as HTMLElement;
        const testid = content.getAttribute("data-testid") ?? "";
        const indents = content.querySelectorAll(".object_row--indent--ZzXY2").length;
        return { testid, indents };
      });
      if (rows.length === 0) return [];

      const minIndent = Math.min(...rows.map((r) => r.indents));
      return rows
        .filter((r) => r.indents === minIndent)
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

    const panel = page.locator('[data-testid="properties-panel"]');
    const name = await reader.readName(row);
    const type = await reader.readType(row);
    const visible = await reader.readVisible(row);
    const { x, y } = await reader.readPosition(panel);
    const { width, height } = await reader.readSize(panel);
    const styles = await reader.readStyles(panel);

    const childIds = await this.expandAndListChildren(page, nodeId);

    const children: RawFigmaNode[] = [];
    for (const childId of childIds) {
      const child = await this.readNode(page, childId, reader);
      if (child) children.push(child);
    }

    return {
      id: nodeId,
      name,
      type,
      position: { x, y },
      size: { width, height },
      visible,
      styles,
      // Requires Figma's image export API; that flow was never designed,
      // so it's left unresolved for now.
      image: null,
      children,
    };
  }

  // The expand caret only becomes visible/clickable after hovering over
  // the row (confirmed by running against a real session). Indentation
  // parsing itself lives in findChildIds — see its comment for why it
  // isn't a flat parentIndents + 1 check.
  private async expandAndListChildren(page: Page, nodeId: string): Promise<string[]> {
    const row = page.locator(SELECTORS.layerRow(nodeId));
    await row.hover();
    const caret = row.locator('[data-testid="layers-panel-expand-caret"]');
    if ((await caret.count()) === 0) return [];
    await caret.click({ force: true });
    await page.waitForTimeout(300);

    const rows = await page.evaluate((): LayerPanelRow[] => {
      const objectsPanel = document.querySelector('[data-testid="objects-panel"]');
      if (!objectsPanel) return [];
      const wrappers = Array.from(objectsPanel.querySelectorAll('[style*="translate3d"]')).filter((w) =>
        w.querySelector(':scope > [data-testid$="-layers-panel-row"]')
      ) as HTMLElement[];

      return wrappers.map((w) => {
        const content = w.querySelector(':scope > [data-testid$="-layers-panel-row"]') as HTMLElement;
        const testid = content.getAttribute("data-testid") ?? "";
        const indents = content.querySelectorAll(".object_row--indent--ZzXY2").length;
        const yMatch = w.style.transform.match(/translate3d\([^,]+,\s*([^,]+)/);
        const y = yMatch ? parseFloat(yMatch[1]) : 0;
        return { testid, indents, y };
      });
    });

    return findChildIds(rows, nodeId);
  }
}
