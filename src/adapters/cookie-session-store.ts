import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { homedir } from "node:os";
import type { FigmaSession, SessionStore } from "../figma/ports";

const DEFAULT_PATH = join(homedir(), ".figma-scraper", "session.json");

export class CookieSessionStore implements SessionStore {
  constructor(private readonly filePath: string = DEFAULT_PATH) {}

  async getSession(): Promise<FigmaSession | null> {
    try {
      const raw = await readFile(this.filePath, "utf-8");
      return JSON.parse(raw) as FigmaSession;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw err;
    }
  }

  async saveSession(session: FigmaSession): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, JSON.stringify(session), "utf-8");
  }
}
