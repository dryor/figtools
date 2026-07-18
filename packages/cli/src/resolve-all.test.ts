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
  it("asegura la sesión antes de resolver cualquier URL", async () => {
    const core = createFakeCore();

    await resolveAll(core, ["https://www.figma.com/design/ABC"]);

    expect(core.ensureSession).toHaveBeenCalledTimes(1);
  });

  it("asegura la sesión exactamente una vez sin importar cuántas URLs se resuelvan", async () => {
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

  it("devuelve el resultado de cada URL emparejado con su URL de origen", async () => {
    const core = createFakeCore();
    const urls = ["https://www.figma.com/design/AAA", "https://www.figma.com/design/BBB"];

    const resolutions = await resolveAll(core, urls);

    expect(resolutions).toHaveLength(2);
    expect(resolutions[0].url).toBe(urls[0]);
    expect(resolutions[1].url).toBe(urls[1]);
  });

  it("todas las URLs resuelven correctamente cuando el core no falla", async () => {
    const core = createFakeCore();
    const urls = ["https://www.figma.com/design/AAA", "https://www.figma.com/design/BBB"];

    const resolutions = await resolveAll(core, urls);

    expect(resolutions.every((r) => r.result.ok)).toBe(true);
  });

  it("el fallo de una URL no impide obtener el resultado de las demás", async () => {
    const failingError: FigmaScraperError = { code: "NOT_FOUND_OR_NO_ACCESS", message: "no existe" };
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

  it("reporta el código y mensaje de error de la URL que falló", async () => {
    const failingError: FigmaScraperError = { code: "AUTHENTICATION_FAILED", message: "sesión inválida" };
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

  it("no llama a resolveUrl para ninguna URL si ensureSession falla", async () => {
    const sessionError: FigmaScraperError = { code: "AUTHENTICATION_FAILED", message: "no se pudo iniciar sesión" };
    const core = createFakeCore({
      ensureSession: vi.fn(async (): Promise<Result<FigmaSession, FigmaScraperError>> => ({
        ok: false,
        error: sessionError,
      })),
    });

    await resolveAll(core, ["https://www.figma.com/design/AAA", "https://www.figma.com/design/BBB"]);

    expect(core.resolveUrl).not.toHaveBeenCalled();
  });

  it("marca todas las URLs con el error de sesión si ensureSession falla", async () => {
    const sessionError: FigmaScraperError = { code: "AUTHENTICATION_FAILED", message: "no se pudo iniciar sesión" };
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
