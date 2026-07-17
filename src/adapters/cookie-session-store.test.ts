import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CookieSessionStore } from "./cookie-session-store";

describe("gestionar_sesion_figma: SessionStore persiste entre instancias", () => {
  let dir: string;
  let filePath: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "figma-session-"));
    filePath = join(dir, "session.json");
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("getSession devuelve null si nunca se guardó nada", async () => {
    const store = new CookieSessionStore(filePath);
    expect(await store.getSession()).toBeNull();
  });

  it("saveSession seguido de getSession devuelve la misma sesión, incluso desde otra instancia", async () => {
    const writer = new CookieSessionStore(filePath);
    await writer.saveSession({ credential: "abc123" });

    const reader = new CookieSessionStore(filePath);
    expect(await reader.getSession()).toEqual({ credential: "abc123" });
  });

  it("saveSession reemplaza la sesión anterior", async () => {
    const store = new CookieSessionStore(filePath);
    await store.saveSession({ credential: "old" });
    await store.saveSession({ credential: "new" });

    expect(await store.getSession()).toEqual({ credential: "new" });
  });
});
