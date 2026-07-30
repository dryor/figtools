import { chromium, type Page } from "playwright";
import type { FigmaSession, FigmaGateway, FigmaFetchResult } from "../../figma/ports";
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

  // The expand caret is only visible/clickable after hovering (confirmed
  // against a real session). Children are identified by diffing which row
  // IDs exist before vs. after expansion — see adr/ADR-layers-virtualization.md.
  private async expandAndListChildren(page: Page, nodeId: string): Promise<string[]> {
    const row = page.locator(SELECTORS.layerRow(nodeId));
    await row.hover();
    const caret = row.locator('[data-testid="layers-panel-expand-caret"]');
    if ((await caret.count()) === 0) return [];

    const before = await this.snapshotRowIds(page);
    await caret.click({ force: true });
    await page.waitForTimeout(300);
    const after = await this.snapshotRowIds(page);

    return diffRowIds(before, Array.from(after));
  }

  private async snapshotRowIds(page: Page): Promise<Set<string>> {
    const ids = await page.evaluate(() => {
      const panel = document.querySelector('[data-testid="objects-panel"]');
      if (!panel) return [];
      return Array.from(panel.querySelectorAll('[data-testid$="-layers-panel-row"]'))
        .map((el) => el.getAttribute("data-testid")?.replace(/-layers-panel-row$/, "") ?? "")
        .filter(Boolean);
    });
    return new Set(ids);
  }
}
