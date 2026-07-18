import type { Locator } from "playwright";
import type { PanelReader } from "./panel-reader";

// name/type/visible se leen de la fila del layers panel, no del panel de
// propiedades — confirmado idéntico en modo edición e inspección (mismo
// testid de fila, misma clase object_row--disabled). EditModePanelReader e
// InspectionPanelReader extienden esta clase y solo implementan
// readPosition/readSize/readStyles, que sí difieren por modo.
export abstract class LayerRowPanelReader implements Partial<PanelReader> {
  async readName(row: Locator): Promise<string> {
    return (await row.locator(".object_row--rowName--GaDj-").textContent()) ?? "";
  }

  async readType(row: Locator): Promise<string> {
    return (await row.locator('[role="img"]').first().getAttribute("aria-label")) ?? "";
  }

  // La fila entera (no rowContent, que es donde vive el testid) gana una
  // clase con el patrón "object_row--disabled" cuando la capa está oculta en
  // Figma (ícono de visibilidad apagado). Confirmado comparando el HTML de
  // un nodo oculto ("pokeball") contra un hermano visible.
  async readVisible(row: Locator): Promise<boolean> {
    const wrapperClass = await row.evaluate((el) => {
      const wrapper = el.closest('[data-testid="layer-row-with-children"]') ?? el.parentElement;
      return wrapper?.className ?? "";
    });
    return !wrapperClass.includes("object_row--disabled");
  }
}
