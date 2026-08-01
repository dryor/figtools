import type { Page } from "playwright";
import type { ImageExportFormat } from "../../../figma/ports";

// Figma types confirmed or expected to have SVG as an export option.
// The type strings are what Figma shows in the inspection panel (lowercase
// comparison). Needs validation against a real session — update
// image-svg-investigation.md §1 once confirmed.
export function canExportAsSvg(type: string): boolean {
  const lower = type.toLowerCase();
  return (
    lower.includes("vector") ||
    lower.includes("boolean") ||
    lower.includes("star") ||
    lower.includes("ellipse") ||
    lower.includes("polygon") ||
    lower.includes("line")
  );
}

export class FigmaAssetCapturer {
  async captureImage(page: Page, format: ImageExportFormat): Promise<Buffer | null> {
    return this.captureFromExportPanel(page, format);
  }

  // Returns null when the downloaded content doesn't contain an <svg> tag
  // (e.g. an unexpected binary or empty response).
  async captureSvgCode(page: Page): Promise<string | null> {
    const buffer = await this.captureFromExportPanel(page, "SVG");
    if (!buffer) return null;
    const text = buffer.toString("utf8");
    return text.includes("<svg") ? text : null;
  }

  // Uses Figma's export panel to download the currently selected node.
  // Confirmed selectors from exploring the live DOM (2026-07-31):
  //   - Add button:    [aria-label="Add export settings"]
  //   - Remove button: [aria-label="Remove"] (last one in panel, most recently added)
  //   - Download btn:  button with text starting "Export" inside export-inspection-panel
  //   - Format switch: button with text "PNG" → click → floating overlay
  //                    [data-fpl-floating-overlay] with [role="option"] entries:
  //                    PNG, JPEG, SVG, PDF
  // Adds a format entry, downloads, then removes it to leave the node clean.
  // try/finally around the download ensures the Remove always runs — even on
  // timeout — to prevent accumulated dangling export entries across a full
  // tree traversal.
  private async captureFromExportPanel(page: Page, format: ImageExportFormat | "SVG"): Promise<Buffer | null> {
    const propertiesPanel = page.locator('[data-testid="properties-panel"]');
    const exportPanel = page.locator('[data-testid="export-inspection-panel"]');

    try {
      await propertiesPanel.evaluate((el) => (el.scrollTop = el.scrollHeight));
      await page.waitForTimeout(300);

      const addBtn = page.locator('[aria-label="Add export settings"]').first();
      if ((await addBtn.count()) === 0) return null;
      await addBtn.click();
      await page.waitForTimeout(300);

      // Use last() so we target the entry we just added, not pre-existing ones.
      const removeBtn = exportPanel.locator('[aria-label="Remove"]').last();
      const removeMaterialized = await removeBtn.waitFor({ timeout: 3000 }).then(() => true).catch(() => false);
      if (!removeMaterialized) return null;

      try {
        if (format !== "PNG") {
          // Default format after Add is PNG; open the dropdown and pick
          // whichever format was requested (PNG never needs this branch,
          // since it's already the state left by Add).
          const fmtBtn = exportPanel.locator("button").filter({ hasText: "PNG" }).last();
          if ((await fmtBtn.count()) === 0) return null;
          // Set up the overlay wait BEFORE clicking so a fast-appearing
          // overlay can't slip past us between the click and the observer.
          const overlay = page.locator('[data-fpl-floating-overlay="true"]');
          const overlayWait = overlay.waitFor({ state: "visible", timeout: 4000 });
          await fmtBtn.click();
          const overlayVisible = await overlayWait.then(() => true).catch(() => false);
          if (!overlayVisible) return null;
          const formatOption = overlay.locator('[role="option"]').filter({ hasText: format }).first();
          if ((await formatOption.count()) === 0) {
            await page.keyboard.press("Escape");
            return null;
          }
          await formatOption.click();
          // Wait for the overlay to close before proceeding.
          try { await overlay.waitFor({ state: "detached", timeout: 3000 }); } catch {}
        }

        const downloadPromise = page.waitForEvent("download", { timeout: 15000 });
        const exportBtn = exportPanel.locator("button").filter({ hasText: /^Export/ }).first();
        if ((await exportBtn.count()) === 0) return null;
        await exportBtn.click();

        const download = await downloadPromise;
        const downloadPath = await download.path();
        if (!downloadPath) return null;
        const { readFile } = await import("node:fs/promises");
        return await readFile(downloadPath);
      } finally {
        // Always clean up the export entry we added, regardless of success or failure.
        try { await removeBtn.click({ timeout: 3000 }); } catch {}
      }
    } catch {
      return null;
    }
  }
}
