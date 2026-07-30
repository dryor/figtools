import type { Locator } from "playwright";
import type { PanelReader } from "./panel-reader";

// name/type/visible are read from the layers panel row, not from the
// properties panel — confirmed identical in edit and inspection mode
// (same row testid, same object_row--disabled class). EditModePanelReader
// and InspectionPanelReader extend this class and only implement
// readPosition/readSize/readStyles, which do differ by mode.
export abstract class LayerRowPanelReader implements Partial<PanelReader> {
  async readName(row: Locator): Promise<string> {
    // Figma's CSS-module class names are hashed per build and can't be
    // relied on (e.g. "object_row--rowName--GaDj-" stopped matching after a
    // Figma deploy). The name is instead the text-bearing div inside the
    // row's gridcell, confirmed stable across real sessions.
    return (await row.locator('[role="gridcell"] > div').first().textContent()) ?? "";
  }

  // The type icon isn't inside the row itself — it's a sibling gridcell
  // under the same row container (confirmed after a Figma deploy moved it
  // out of the row; previously `row.locator('[role="img"]')` found it
  // directly inside the row).
  //
  // `data-fpl-row-container` is a fixed Figma namespace attribute
  // (`data-fpl-*`), not a hashed CSS-module class — confirmed stable in
  // the same real-session audit that replaced the hashed classes in
  // inspection-panel-reader.ts with `[class*="..."]` prefix matches.
  // Re-classified from "fragile" to "stable" on that basis: the remaining
  // risk here is the `ancestor::` navigation itself (how many levels
  // separate the row from this container), not the attribute's name.
  async readType(row: Locator): Promise<string> {
    const container = row.locator("xpath=ancestor::*[@data-fpl-row-container]");
    return (await container.locator('[role="img"]').first().getAttribute("aria-label")) ?? "";
  }

  // The whole row (not rowContent, where the testid lives) gains a class
  // matching "object_row--disabled" when the layer is hidden in Figma
  // (visibility icon off). Confirmed by comparing the HTML of a hidden
  // node ("pokeball") against a visible sibling.
  //
  // Known risk, not resolved: "object_row--disabled" is still a
  // CSS-module class name, same family as the ones already found broken
  // and replaced with `[class*="..."]` prefix matches elsewhere in this
  // session. Couldn't confirm a prefix-match replacement here because no
  // hidden node was available to inspect against a real session this
  // time — TODO: switch to checking the class list for a
  // "object_row--disabled" substring match (already effectively what
  // `.includes()` does) or a `[class*="object_row--disabled"]` locator
  // once a real hidden node is available to verify against.
  async readVisible(row: Locator): Promise<boolean> {
    const wrapperClass = await row.evaluate((el) => {
      const wrapper = el.closest('[data-testid="layer-row-with-children"]') ?? el.parentElement;
      return wrapper?.className ?? "";
    });
    return !wrapperClass.includes("object_row--disabled");
  }
}
