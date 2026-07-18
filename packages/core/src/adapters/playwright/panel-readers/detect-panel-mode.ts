import type { PanelMode } from "./panel-reader";

export interface PanelModeDom {
  hasSelector(selector: string): Promise<boolean>;
}

// properties-inspection-panel (modo view) y x-y-inputs-row (modo edición)
// nunca coexisten en el DOM real — cada uno es exclusivo del panel de
// propiedades correspondiente — pero inspection se chequea primero por si
// alguna vez cambiara: preferir el panel más rico en datos ante cualquier
// ambigüedad. Ver adr/ADR-panel-reader-bridge.md.
export async function detectPanelMode(dom: PanelModeDom): Promise<PanelMode> {
  if (await dom.hasSelector("properties-inspection-panel")) return "inspection";
  if (await dom.hasSelector("x-y-inputs-row")) return "edit";
  return "none";
}
