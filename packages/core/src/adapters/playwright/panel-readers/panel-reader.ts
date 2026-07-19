import type { Locator } from "playwright";
import type { CommonStyles, TypographyStyles } from "../../../figma/model";

// Each method receives the already-selected layers panel row and/or
// properties panel; the PanelReader doesn't navigate or click, it only
// reads. See adr/ADR-panel-reader-bridge.md.
export interface PanelReader {
  readName(row: Locator): Promise<string>;
  readType(row: Locator): Promise<string>;
  readVisible(row: Locator): Promise<boolean>;
  readPosition(panel: Locator): Promise<{ x: number | null; y: number | null }>;
  readSize(panel: Locator): Promise<{ width: number | null; height: number | null }>;
  readStyles(panel: Locator): Promise<CommonStyles & { typography?: TypographyStyles }>;
}

// "none": neither the edit panel nor the inspection panel ended up
// present in the DOM after loading the page — there's no PanelReader for
// that case.
export type PanelMode = "edit" | "inspection" | "none";
