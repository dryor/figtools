import type { PanelMode } from "./panel-reader";

export interface DomInspector {
  hasSelector(selector: string): Promise<boolean>;
}

// properties-inspection-panel (view mode) and x-y-inputs-row (edit mode)
// never coexist in the real DOM — each is exclusive to its corresponding
// properties panel — but inspection is checked first in case that ever
// changes: prefer the richer-data panel under any ambiguity. See
// adr/ADR-panel-reader-bridge.md.
export async function detectPanelMode(dom: DomInspector): Promise<PanelMode> {
  if (await dom.hasSelector("properties-inspection-panel")) return "inspection";
  if (await dom.hasSelector("x-y-inputs-row")) return "edit";
  return "none";
}
