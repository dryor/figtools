import { describe, it, expect } from "vitest";
import { PlaywrightLogin } from "./playwright-login";

// Login real e interactivo: un humano tiene que completarlo a mano en el
// browser que se abre. No corre en CI ni por default — solo si se pide
// explícitamente con tiempo para hacerlo.
const RUN = process.env.FIGMA_E2E_LOGIN === "1";

describe.skipIf(!RUN)("gestionar_sesion_figma: Iniciar sesión de forma interactiva sin sesión previa (browser real)", () => {
  it("devuelve una sesión con credential no vacío tras completar el login a mano", async () => {
    const login = new PlaywrightLogin();

    const session = await login.authenticate();

    expect(typeof session.credential).toBe("string");
    expect(session.credential.length).toBeGreaterThan(0);
  }, 5 * 60 * 1000);
});
