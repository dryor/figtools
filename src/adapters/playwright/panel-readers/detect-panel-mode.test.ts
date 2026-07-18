import { describe, it, expect } from "vitest";
import { detectPanelMode } from "./detect-panel-mode";

// Prueba solo la lógica de decisión (qué modo se elige dado qué selectores
// están presentes), no si esos selectores existen realmente en el DOM de
// Figma — eso solo lo confirma el test e2e contra una sesión real.
function fakeDom(present: string[]) {
  return {
    async hasSelector(selector: string): Promise<boolean> {
      return present.includes(selector);
    },
  };
}

describe("obtener_informacion_figma: Detectar el modo de panel disponible", () => {
  it("elige inspection cuando el panel de inspección está presente", async () => {
    const dom = fakeDom(["properties-inspection-panel"]);
    expect(await detectPanelMode(dom)).toBe("inspection");
  });

  it("elige edit cuando el panel de edición está presente", async () => {
    const dom = fakeDom(["x-y-inputs-row"]);
    expect(await detectPanelMode(dom)).toBe("edit");
  });

  it("prioriza inspection si ambos paneles quedaran presentes a la vez", async () => {
    const dom = fakeDom(["properties-inspection-panel", "x-y-inputs-row"]);
    expect(await detectPanelMode(dom)).toBe("inspection");
  });

  it("elige none cuando ningún panel conocido está presente", async () => {
    const dom = fakeDom([]);
    expect(await detectPanelMode(dom)).toBe("none");
  });
});
