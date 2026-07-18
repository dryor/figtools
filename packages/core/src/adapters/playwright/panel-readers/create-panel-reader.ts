import type { PanelReader } from "./panel-reader";
import { EditModePanelReader } from "./edit-mode-panel-reader";
import { InspectionPanelReader } from "./inspection-panel-reader";

export function createPanelReader(mode: "edit" | "inspection"): PanelReader {
  return mode === "inspection" ? new InspectionPanelReader() : new EditModePanelReader();
}
