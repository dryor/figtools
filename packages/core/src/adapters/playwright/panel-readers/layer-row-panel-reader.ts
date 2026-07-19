import type { Locator } from "playwright";
import type { PanelReader } from "./panel-reader";

// name/type/visible are read from the layers panel row, not from the
// properties panel — confirmed identical in edit and inspection mode
// (same row testid, same object_row--disabled class). EditModePanelReader
// and InspectionPanelReader extend this class and only implement
// readPosition/readSize/readStyles, which do differ by mode.
export abstract class LayerRowPanelReader implements Partial<PanelReader> {
  async readName(row: Locator): Promise<string> {
    return (await row.locator(".object_row--rowName--GaDj-").textContent()) ?? "";
  }

  async readType(row: Locator): Promise<string> {
    return (await row.locator('[role="img"]').first().getAttribute("aria-label")) ?? "";
  }

  // The whole row (not rowContent, where the testid lives) gains a class
  // matching "object_row--disabled" when the layer is hidden in Figma
  // (visibility icon off). Confirmed by comparing the HTML of a hidden
  // node ("pokeball") against a visible sibling.
  async readVisible(row: Locator): Promise<boolean> {
    const wrapperClass = await row.evaluate((el) => {
      const wrapper = el.closest('[data-testid="layer-row-with-children"]') ?? el.parentElement;
      return wrapper?.className ?? "";
    });
    return !wrapperClass.includes("object_row--disabled");
  }
}
