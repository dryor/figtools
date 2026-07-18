import { describe, it, expect } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PlaywrightFigmaGateway } from "./playwright-figma-gateway";

// Todavía no hay un fixture "golden" definido para comparar contra datos
// reales, así que cada corrida deja el resultado completo en disco (después
// de los asserts, para no ensuciar el resultado con un test ya fallido) para
// poder inspeccionarlo a mano.
const OUTPUT_DIR = join(process.cwd(), "tmp", "e2e-output");

function writeResult(fileName: string, result: unknown): void {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  writeFileSync(join(OUTPUT_DIR, fileName), JSON.stringify(result, null, 2));
}

// Requiere una sesión real (FIGMA_TEST_CREDENTIAL, obtenida corriendo el
// test de PlaywrightLogin una vez) y un archivo de Figma conocido
// (FIGMA_TEST_FILE_KEY / FIGMA_TEST_NODE_ID) para comparar contra datos
// reales. No hay un fixture "golden" definido todavía — eso es un
// prerequisito pendiente, no algo que este test pueda resolver solo.
const RUN_EDIT_MODE = Boolean(process.env.FIGMA_TEST_CREDENTIAL && process.env.FIGMA_TEST_FILE_KEY);

// Segundo archivo, donde la sesión de FIGMA_TEST_CREDENTIAL tiene acceso de
// solo view (no editor), en una organización que habilita el panel de
// inspección para viewers. Confirmado corriendo contra una sesión real (ver
// adr/ADR-panel-reader-bridge.md): en ese caso Figma muestra un panel de
// propiedades completamente distinto ("modo inspección",
// inspectionPropertyRow) del panel de edición
// (x-y-inputs-row/transform-width/consumed-style-panel).
const RUN_VIEW_MODE = Boolean(process.env.FIGMA_TEST_CREDENTIAL && process.env.FIGMA_TEST_VIEW_FILE_KEY);

// Tercer archivo, todavía sin confirmar contra una sesión real: un usuario
// con permiso de solo view en un archivo cuya organización NO habilita el
// panel de inspección (ver spec: "Obtener un nodo puntual sin panel de
// datos disponible"). Queda como skip hasta encontrar un archivo real de
// ese tipo para validarlo — no se puede forzar ese estado desde afuera.
const RUN_NO_PANEL_MODE = Boolean(process.env.FIGMA_TEST_CREDENTIAL && process.env.FIGMA_TEST_NO_PANEL_FILE_KEY);

describe.skipIf(!RUN_EDIT_MODE)("obtener_informacion_figma: Obtener un nodo puntual de un diseño de Figma (browser real, modo edición)", () => {
  it("trae datos reales del nodo, no un stub", async () => {
    const gateway = new PlaywrightFigmaGateway();
    const session = { credential: process.env.FIGMA_TEST_CREDENTIAL! };

    const result = await gateway.fetchNode(process.env.FIGMA_TEST_FILE_KEY!, process.env.FIGMA_TEST_NODE_ID!, session);

    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      expect(result.value.id).toBe(process.env.FIGMA_TEST_NODE_ID);
      expect(result.value.type).toBeTruthy();
      // El panel de edición sí expone position/size como inputs directos.
      expect(result.value.position.x).not.toBeNull();
      expect(result.value.size.width).not.toBeNull();
    }

    writeResult("fetch-node-edit-mode.json", result);
  }, 10 * 60 * 1000);
});

describe.skipIf(!RUN_EDIT_MODE)("obtener_informacion_figma: Obtener los nodos de la página por defecto de un diseño de Figma (browser real, modo edición)", () => {
  it("trae la página por defecto con al menos un nodo de nivel superior", async () => {
    const gateway = new PlaywrightFigmaGateway();
    const session = { credential: process.env.FIGMA_TEST_CREDENTIAL! };

    const result = await gateway.fetchDefaultPage(process.env.FIGMA_TEST_FILE_KEY!, session);

    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      expect(result.value.type).toBe("CANVAS");
      expect(result.value.children.length).toBeGreaterThan(0);
    }

    writeResult("fetch-default-page-edit-mode.json", result);
  }, 10 * 60 * 1000);
});

describe.skipIf(!RUN_VIEW_MODE)("obtener_informacion_figma: Obtener un nodo puntual de un diseño de Figma con permiso de solo lectura (browser real, modo inspección)", () => {
  it("trae datos reales del nodo vía InspectionPanelReader, no solo name/type/visible", async () => {
    const gateway = new PlaywrightFigmaGateway();
    const session = { credential: process.env.FIGMA_TEST_CREDENTIAL! };

    const result = await gateway.fetchNode(process.env.FIGMA_TEST_VIEW_FILE_KEY!, process.env.FIGMA_TEST_VIEW_NODE_ID!, session);

    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      expect(result.value.id).toBe(process.env.FIGMA_TEST_VIEW_NODE_ID);
      expect(result.value.type).toBeTruthy();
      // El panel de inspección expone Width/Height como texto plano — a
      // diferencia del panel de edición, acá también deberían resolver
      // width/height los nodos con auto-layout Fill/Hug (ver
      // adr/ADR-panel-reader-bridge.md).
      expect(result.value.position.x).not.toBeNull();
      expect(result.value.size.width).not.toBeNull();
    }

    writeResult("fetch-node-view-mode.json", result);
  }, 10 * 60 * 1000);
});

describe.skipIf(!RUN_NO_PANEL_MODE)("obtener_informacion_figma: Obtener un nodo puntual sin panel de datos disponible (browser real)", () => {
  it("devuelve status incomplete-node-data sin recorrer el árbol", async () => {
    const gateway = new PlaywrightFigmaGateway();
    const session = { credential: process.env.FIGMA_TEST_CREDENTIAL! };

    const result = await gateway.fetchNode(process.env.FIGMA_TEST_NO_PANEL_FILE_KEY!, process.env.FIGMA_TEST_NO_PANEL_NODE_ID!, session);

    expect(result.status).toBe("incomplete-node-data");

    writeResult("fetch-node-no-panel-mode.json", result);
  }, 60 * 1000);
});
