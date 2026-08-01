import { describe, it, expect, vi } from "vitest";
import { createFigmaScraperCore } from "./core";
import type { RawFigmaNode } from "./model";
import { createFakeSessionStore, createFakeInteractiveLogin, createFakeGateway } from "./testing/fakes";

const VALID_SESSION = { credential: "cookie-jar-abc" };

const rawNode: RawFigmaNode = {
  id: "1:1", name: "Frame", type: "FRAME",
  position: { x: 0, y: 0 }, size: { width: 1, height: 1 },
  visible: true, styles: {}, image: null, children: [],
};

describe("manage_figma_session: Log in interactively with no previous session", () => {
  it("triggers the login, saves the session, and completes the original request", async () => {
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

describe("manage_figma_session: Reuse an existing session", () => {
  it("doesn't trigger login if a valid session is already saved", async () => {
    const sessionStore = createFakeSessionStore(VALID_SESSION);
    const interactiveLogin = createFakeInteractiveLogin(VALID_SESSION);
    const gateway = createFakeGateway({ fetchNode: () => ({ status: "ok", value: rawNode }) });
    const core = createFigmaScraperCore({ sessionStore, interactiveLogin, gateway });

    await core.resolveUrl("https://www.figma.com/design/X?node-id=1-1");

    expect(interactiveLogin.calls).toBe(0);
  });
});

describe("manage_figma_session: Log in again even though the current session is still valid", () => {
  it("reauthenticates, saves the new session via sessionStore, and returns it", async () => {
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

describe("manage_figma_session: The session expires during a request", () => {
  it("re-loguea y reintenta, devolviendo el resultado original en vez de un error", async () => {
    const NEW_SESSION = { credential: "renewed" };
    const sessionStore = createFakeSessionStore(VALID_SESSION);
    const interactiveLogin = createFakeInteractiveLogin(NEW_SESSION);

    let attempt = 0;
    const fetchNode = vi.fn(() => {
      attempt++;
      return attempt === 1 ? { status: "session-expired" as const } : { status: "ok" as const, value: rawNode };
    });
    const gateway = createFakeGateway({ fetchNode });
    const core = createFigmaScraperCore({ sessionStore, interactiveLogin, gateway });

    const result = await core.resolveUrl("https://www.figma.com/design/X?node-id=1-1", { icons: { enabled: true } });

    expect(interactiveLogin.calls).toBe(1);
    expect(attempt).toBe(2);
    expect(sessionStore.current).toEqual(NEW_SESSION);
    expect(result.ok).toBe(true);

    // The retry uses the renewed session but keeps the same fetch options
    // as the first attempt — nothing gets dropped or reset in between.
    expect(fetchNode).toHaveBeenNthCalledWith(1, "X", "1:1", {
      session: VALID_SESSION,
      image: { enabled: false, format: "PNG" },
      icons: { enabled: true },
    });
    expect(fetchNode).toHaveBeenNthCalledWith(2, "X", "1:1", {
      session: NEW_SESSION,
      image: { enabled: false, format: "PNG" },
      icons: { enabled: true },
    });
  });
});
