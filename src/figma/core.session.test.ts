import { describe, it, expect } from "vitest";
import { createFigmaScraperCore } from "./core";
import type { RawFigmaNode } from "./model";
import { createFakeSessionStore, createFakeInteractiveLogin, createFakeGateway } from "./testing/fakes";

const VALID_SESSION = { credential: "cookie-jar-abc" };

const rawNode: RawFigmaNode = {
  id: "1:1", name: "Frame", type: "FRAME",
  position: { x: 0, y: 0 }, size: { width: 1, height: 1 },
  styles: {}, image: null, children: [],
};

describe("gestionar_sesion_figma: Iniciar sesión de forma interactiva sin sesión previa", () => {
  it("dispara el login, guarda la sesión, y completa la solicitud original", async () => {
    const sessionStore = createFakeSessionStore(null);
    const interactiveLogin = createFakeInteractiveLogin(VALID_SESSION);
    const gateway = createFakeGateway({ fetchNode: () => ({ status: "ok", value: rawNode }) });
    const core = createFigmaScraperCore({ sessionStore, interactiveLogin, gateway });

    const result = await core.resolveUrl("https://www.figma.com/design/X?node-id=1-1");

    expect(interactiveLogin.calls).toBe(1);
    expect(sessionStore.current).toEqual(VALID_SESSION);
    expect(result.ok).toBe(true);
  });
});

describe("gestionar_sesion_figma: Reutilizar una sesión existente", () => {
  it("no dispara login si ya hay una sesión válida guardada", async () => {
    const sessionStore = createFakeSessionStore(VALID_SESSION);
    const interactiveLogin = createFakeInteractiveLogin(VALID_SESSION);
    const gateway = createFakeGateway({ fetchNode: () => ({ status: "ok", value: rawNode }) });
    const core = createFigmaScraperCore({ sessionStore, interactiveLogin, gateway });

    await core.resolveUrl("https://www.figma.com/design/X?node-id=1-1");

    expect(interactiveLogin.calls).toBe(0);
  });
});

describe("gestionar_sesion_figma: Iniciar sesión de nuevo aunque la sesión actual siga siendo válida", () => {
  it("reautentica, guarda la sesión nueva vía sessionStore, y la devuelve", async () => {
    const NEW_SESSION = { credential: "new-cookie-jar" };
    const sessionStore = createFakeSessionStore(VALID_SESSION);
    const interactiveLogin = createFakeInteractiveLogin(NEW_SESSION);
    const gateway = createFakeGateway({});
    const core = createFigmaScraperCore({ sessionStore, interactiveLogin, gateway });

    const result = await core.reauthenticate();

    expect(interactiveLogin.calls).toBe(1);
    expect(result).toEqual({ ok: true, value: NEW_SESSION });
    expect(sessionStore.current).toEqual(NEW_SESSION);
  });
});

describe("gestionar_sesion_figma: La sesión expira durante una solicitud", () => {
  it("re-loguea y reintenta, devolviendo el resultado original en vez de un error", async () => {
    const NEW_SESSION = { credential: "renewed" };
    const sessionStore = createFakeSessionStore(VALID_SESSION);
    const interactiveLogin = createFakeInteractiveLogin(NEW_SESSION);

    let attempt = 0;
    const gateway = createFakeGateway({
      fetchNode: () => {
        attempt++;
        return attempt === 1 ? { status: "session-expired" } : { status: "ok", value: rawNode };
      },
    });
    const core = createFigmaScraperCore({ sessionStore, interactiveLogin, gateway });

    const result = await core.resolveUrl("https://www.figma.com/design/X?node-id=1-1");

    expect(interactiveLogin.calls).toBe(1);
    expect(attempt).toBe(2);
    expect(sessionStore.current).toEqual(NEW_SESSION);
    expect(result.ok).toBe(true);
  });
});
