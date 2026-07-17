import { describe, it, expect } from "vitest";
import { PlaywrightFigmaGateway } from "./playwright-figma-gateway";

// Requiere una sesión real (FIGMA_TEST_CREDENTIAL, obtenida corriendo el
// test de PlaywrightLogin una vez) y un archivo de Figma conocido
// (FIGMA_TEST_FILE_KEY / FIGMA_TEST_NODE_ID) para comparar contra datos
// reales. No hay un fixture "golden" definido todavía — eso es un
// prerequisito pendiente, no algo que este test pueda resolver solo.
const RUN = Boolean(process.env.FIGMA_TEST_CREDENTIAL && process.env.FIGMA_TEST_FILE_KEY);

describe.skipIf(!RUN)("obtener_informacion_figma: Obtener un nodo puntual de un diseño de Figma (browser real)", () => {
  it("trae datos reales del nodo, no un stub", async () => {
    const gateway = new PlaywrightFigmaGateway();
    const session = { credential: process.env.FIGMA_TEST_CREDENTIAL! };

    const result = await gateway.fetchNode(process.env.FIGMA_TEST_NODE_ID!, session);

    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      expect(result.value.id).toBe(process.env.FIGMA_TEST_NODE_ID);
      expect(result.value.type).toBeTruthy();
    }
  }, 60 * 1000);
});

describe.skipIf(!RUN)("obtener_informacion_figma: Obtener los nodos de la página por defecto de un diseño de Figma (browser real)", () => {
  it("trae la página por defecto con al menos un nodo de nivel superior", async () => {
    const gateway = new PlaywrightFigmaGateway();
    const session = { credential: process.env.FIGMA_TEST_CREDENTIAL! };

    const result = await gateway.fetchDefaultPage(process.env.FIGMA_TEST_FILE_KEY!, session);

    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      expect(result.value.type).toBe("CANVAS");
      expect(result.value.children.length).toBeGreaterThan(0);
    }
  }, 60 * 1000);
});
