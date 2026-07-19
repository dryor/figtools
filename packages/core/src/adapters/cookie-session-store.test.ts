import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CookieSessionStore } from "./cookie-session-store";

describe("manage_figma_session: SessionStore persists across instances", () => {
  let dir: string;
  let filePath: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "figma-session-"));
    filePath = join(dir, "session.json");
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("getSession returns null if nothing was ever saved", async () => {
    const store = new CookieSessionStore(filePath);
    expect(await store.getSession()).toBeNull();
  });

  it("saveSession followed by getSession returns the same session, even from a different instance", async () => {
    const writer = new CookieSessionStore(filePath);
    await writer.saveSession({ credential: "abc123" });

    const reader = new CookieSessionStore(filePath);
    expect(await reader.getSession()).toEqual({ credential: "abc123" });
  });

  it("saveSession replaces the previous session", async () => {
    const store = new CookieSessionStore(filePath);
    await store.saveSession({ credential: "old" });
    await store.saveSession({ credential: "new" });

    expect(await store.getSession()).toEqual({ credential: "new" });
  });
});
