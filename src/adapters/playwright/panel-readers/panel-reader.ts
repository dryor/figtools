import type { Locator } from "playwright";
import type { CommonStyles, TypographyStyles } from "../../../figma/model";

// Cada método recibe la fila del layers panel y/o el panel de propiedades ya
// seleccionados; el PanelReader no navega ni hace click, solo lee. Ver
// adr/ADR-panel-reader-bridge.md.
export interface PanelReader {
  readName(row: Locator): Promise<string>;
  readType(row: Locator): Promise<string>;
  readVisible(row: Locator): Promise<boolean>;
  readPosition(panel: Locator): Promise<{ x: number | null; y: number | null }>;
  readSize(panel: Locator): Promise<{ width: number | null; height: number | null }>;
  readStyles(panel: Locator): Promise<CommonStyles & { typography?: TypographyStyles }>;
}

// "none": ni el panel de edición ni el de inspección quedaron presentes en
// el DOM tras cargar la página — no hay ningún PanelReader para ese caso.
export type PanelMode = "edit" | "inspection" | "none";
