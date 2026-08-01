import { describe, it, expect, vi } from "vitest";
import type { FigmaScraperCore, FigmaScrapeResult, FigmaScraperError, FigmaSession, Result } from "@figtools/core";
import { resolveAll } from "./resolve-all";

function createFakeNode(id: string): FigmaScrapeResult {
  return {
    id,
    name: id,
    type: "Frame",
    position: { x: 0, y: 0 },
    size: { width: 100, height: 100 },
    visible: true,
    styles: {},
    image: null,
    children: [],
  };
}

const fakeSession: FigmaSession = { credential: "fake-credential" };

function createFakeCore(overrides: Partial<FigmaScraperCore> = {}): FigmaScraperCore {
  return {
    ensureSession: vi.fn(async (): Promise<Result<FigmaSession, FigmaScraperError>> => ({ ok: true, value: fakeSession })),
    reauthenticate: vi.fn(async (): Promise<Result<FigmaSession, FigmaScraperError>> => ({ ok: true, value: fakeSession })),
    resolveUrl: vi.fn(async (url: string): Promise<Result<FigmaScrapeResult, FigmaScraperError>> => ({
      ok: true,
      value: createFakeNode(url),
    })),
    ...overrides,
  };
}

describe("resolveAll", () => {
  it("secures the session before resolving any URL", async () => {
    const core = createFakeCore();

    await resolveAll(core, ["https://www.figma.com/design/ABC"]);

    expect(core.ensureSession).toHaveBeenCalledTimes(1);
  });

  it("secures the session exactly once regardless of how many URLs are resolved", async () => {
    const core = createFakeCore();
    const urls = [
      "https://www.figma.com/design/AAA",
      "https://www.figma.com/design/BBB",
      "https://www.figma.com/design/CCC",
    ];

    await resolveAll(core, urls);

    expect(core.ensureSession).toHaveBeenCalledTimes(1);
    expect(core.resolveUrl).toHaveBeenCalledTimes(3);
  });

  it("returns each URL's result paired with its source URL", async () => {
    const core = createFakeCore();
    const urls = ["https://www.figma.com/design/AAA", "https://www.figma.com/design/BBB"];

    const resolutions = await resolveAll(core, urls);

    expect(resolutions).toHaveLength(2);
    expect(resolutions[0].url).toBe(urls[0]);
    expect(resolutions[1].url).toBe(urls[1]);
  });

  it("all URLs resolve successfully when the core doesn't fail", async () => {
    const core = createFakeCore();
    const urls = ["https://www.figma.com/design/AAA", "https://www.figma.com/design/BBB"];

    const resolutions = await resolveAll(core, urls);

    expect(resolutions.every((r) => r.result.ok)).toBe(true);
  });

  it("one URL failing doesn't prevent getting the others' results", async () => {
    const failingError: FigmaScraperError = { code: "NOT_FOUND_OR_NO_ACCESS", message: "doesn't exist" };
    const core = createFakeCore({
      resolveUrl: vi.fn(async (url: string): Promise<Result<FigmaScrapeResult, FigmaScraperError>> => {
        if (url.includes("BBB")) return { ok: false, error: failingError };
        return { ok: true, value: createFakeNode(url) };
      }),
    });
    const urls = [
      "https://www.figma.com/design/AAA",
      "https://www.figma.com/design/BBB",
      "https://www.figma.com/design/CCC",
    ];

    const resolutions = await resolveAll(core, urls);

    const [aaa, bbb, ccc] = resolutions;
    expect(aaa.result.ok).toBe(true);
    expect(bbb.result.ok).toBe(false);
    expect(ccc.result.ok).toBe(true);
  });

  it("reports the code and error message of the URL that failed", async () => {
    const failingError: FigmaScraperError = { code: "AUTHENTICATION_FAILED", message: "invalid session" };
    const core = createFakeCore({
      resolveUrl: vi.fn(async (): Promise<Result<FigmaScrapeResult, FigmaScraperError>> => ({
        ok: false,
        error: failingError,
      })),
    });

    const [resolution] = await resolveAll(core, ["https://www.figma.com/design/AAA"]);

    expect(resolution.result.ok).toBe(false);
    if (!resolution.result.ok) {
      expect(resolution.result.error).toEqual(failingError);
    }
  });

  it("doesn't call resolveUrl for any URL if ensureSession fails", async () => {
    const sessionError: FigmaScraperError = { code: "AUTHENTICATION_FAILED", message: "couldn't log in" };
    const core = createFakeCore({
      ensureSession: vi.fn(async (): Promise<Result<FigmaSession, FigmaScraperError>> => ({
        ok: false,
        error: sessionError,
      })),
    });

    await resolveAll(core, ["https://www.figma.com/design/AAA", "https://www.figma.com/design/BBB"]);

    expect(core.resolveUrl).not.toHaveBeenCalled();
  });

  it("forwards the given opts to core.resolveUrl for every URL", async () => {
    const core = createFakeCore();
    const opts = { image: { enabled: true, format: "JPEG" as const }, icons: { enabled: true } };
    const urls = ["https://www.figma.com/design/AAA", "https://www.figma.com/design/BBB"];

    await resolveAll(core, urls, opts);

    expect(core.resolveUrl).toHaveBeenNthCalledWith(1, urls[0], opts);
    expect(core.resolveUrl).toHaveBeenNthCalledWith(2, urls[1], opts);
  });

  it("marks all URLs with the session error if ensureSession fails", async () => {
    const sessionError: FigmaScraperError = { code: "AUTHENTICATION_FAILED", message: "couldn't log in" };
    const core = createFakeCore({
      ensureSession: vi.fn(async (): Promise<Result<FigmaSession, FigmaScraperError>> => ({
        ok: false,
        error: sessionError,
      })),
    });
    const urls = ["https://www.figma.com/design/AAA", "https://www.figma.com/design/BBB"];

    const resolutions = await resolveAll(core, urls);

    expect(resolutions).toHaveLength(2);
    for (const resolution of resolutions) {
      expect(resolution.result.ok).toBe(false);
      if (!resolution.result.ok) {
        expect(resolution.result.error).toEqual(sessionError);
      }
    }
  });
});
