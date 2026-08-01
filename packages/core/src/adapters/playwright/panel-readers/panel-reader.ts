import type { Locator } from "playwright";
import type { CommonStyles, TypographyStyles, Position, Size } from "../../../figma/model";

// Each method receives the already-selected layers panel row and/or
// properties panel; the PanelReader doesn't navigate or click, it only
// reads. See adr/ADR-panel-reader-bridge.md.
export interface PanelReader {
  readName(row: Locator): Promise<string>;
  readType(row: Locator): Promise<string>;
  readVisible(row: Locator): Promise<boolean>;
  readPosition(panel: Locator): Promise<Position>;
  readSize(panel: Locator): Promise<Size>;
  readStyles(panel: Locator): Promise<CommonStyles & { typography?: TypographyStyles }>;
  // A TEXT node's literal content. null for any other node type, or when
  // it can't be read.
  readCharacters(panel: Locator): Promise<string | null>;
  // Whether this reader's mode supports the Enter/Escape drill-down used
  // to reveal a hidden TEXT child that never appears in the layers panel
  // tree (confirmed in inspection mode; never verified in edit mode, see
  // EditModePanelReader.supportsHiddenTextChild). Optional so a reader
  // that doesn't implement it is treated as unsupported by the gateway,
  // not as a type error.
  supportsHiddenTextChild?(): boolean;
}

// "none": neither the edit panel nor the inspection panel ended up
// present in the DOM after loading the page — there's no PanelReader for
// that case.
export type PanelMode = "edit" | "inspection" | "none";
